import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${id}.${ext}`

  // Create bucket if it doesn't exist (no-op if already exists)
  await supabase.storage.createBucket('products', { public: true }).catch(() => {})

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path)

  const { error: patchError } = await supabase
    .from('products')
    .update({ image_url: publicUrl })
    .eq('id', id)

  if (patchError) return NextResponse.json({ error: patchError.message }, { status: 500 })

  return NextResponse.json({ url: publicUrl })
}
