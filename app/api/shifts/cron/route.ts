import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAndCloseShift } from '@/lib/shiftSummary'

// ── Actions ───────────────────────────────────────────────────────────────────
// open_am  — 07:00 Lima (12:00 UTC): close any active shift, open Turno AM
// open_pm  — 14:00 Lima (19:00 UTC): close active shift,    open Turno PM
// close_pm — 22:00 Lima (03:00 UTC): close active shift (Turno PM ends)

const SHIFT_NOTES = {
  am: 'Turno AM · Automático',
  pm: 'Turno PM · Automático',
}

export async function GET(req: NextRequest) {
  // ── Auth: accept CRON_SECRET from Vercel or a valid admin cookie ──
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron) {
    // Fallback: allow if running locally without a secret configured
    if (cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const action = req.nextUrl.searchParams.get('action')
  if (!action || !['open_am', 'open_pm', 'close_pm'].includes(action)) {
    return NextResponse.json({ error: 'action must be open_am | open_pm | close_pm' }, { status: 400 })
  }

  const supabase = await createClient()

  // ── Find active shift ──────────────────────────────────────────────────────
  const { data: active } = await supabase
    .from('shifts')
    .select('id, started_at, notes')
    .is('ended_at', null)
    .maybeSingle()

  // ── close_pm: just close, don't open a new one ─────────────────────────────
  if (action === 'close_pm') {
    if (!active) {
      return NextResponse.json({ ok: true, message: 'No active shift to close' })
    }
    const { error } = await computeAndCloseShift(supabase, active.id, active.started_at, null)
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ok: true, message: 'Turno PM closed' })
  }

  // ── open_am / open_pm: close existing shift first, then open new one ───────
  const note = action === 'open_am' ? SHIFT_NOTES.am : SHIFT_NOTES.pm

  if (active) {
    // Idempotency: if the shift already has the same note, skip open but don't fail
    if (active.notes === note) {
      return NextResponse.json({ ok: true, message: `Shift "${note}" already active` })
    }
    const { error } = await computeAndCloseShift(supabase, active.id, active.started_at, null)
    if (error) return NextResponse.json({ error }, { status: 500 })
  }

  const { data: newShift, error: openError } = await supabase
    .from('shifts')
    .insert({ started_by: null, notes: note })
    .select()
    .single()

  if (openError) return NextResponse.json({ error: openError.message }, { status: 500 })

  return NextResponse.json({ ok: true, shift: newShift })
}
