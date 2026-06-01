/**
 * Genera splash screens de iOS para la PWA de Gianfranco.
 * Uso: node scripts/generate-splashscreens.mjs
 */

import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir    = path.join(__dirname, '..', 'public', 'splashscreens')
fs.mkdirSync(outDir, { recursive: true })

// ── Device sizes (physical pixels, portrait) ──────────────────────────────────
const SIZES = [
  // Logical    Physical        DPR  Model(s)
  { w: 640,  h: 1136, dpr: 2 },  // iPhone SE 1ª gen
  { w: 750,  h: 1334, dpr: 2 },  // iPhone 8 / 7 / 6s
  { w: 1242, h: 2208, dpr: 3 },  // iPhone 8+ / 7+
  { w: 1125, h: 2436, dpr: 3 },  // iPhone X / XS / 11 Pro
  { w: 828,  h: 1792, dpr: 2 },  // iPhone XR / 11
  { w: 1242, h: 2688, dpr: 3 },  // iPhone XS Max / 11 Pro Max
  { w: 1080, h: 2340, dpr: 3 },  // iPhone 12 mini / 13 mini
  { w: 1170, h: 2532, dpr: 3 },  // iPhone 12 / 12 Pro / 13 / 14
  { w: 1284, h: 2778, dpr: 3 },  // iPhone 12 Pro Max / 13 Pro Max / 14 Plus
  { w: 1179, h: 2556, dpr: 3 },  // iPhone 14 Pro / 15 / 15 Pro
  { w: 1290, h: 2796, dpr: 3 },  // iPhone 14 Pro Max / 15 Plus / 15 Pro Max
  { w: 1536, h: 2048, dpr: 2 },  // iPad Air / Mini retina
  { w: 2048, h: 2732, dpr: 2 },  // iPad Pro 12.9"
]

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = '#0E2F33'  // same as PWA theme color
const FG      = '#F5F1E8'  // cream — same as icon stroke
const LOGO_W  = 200        // logical px (scaled by DPR)

// Build SVG splash for given physical dimensions
function buildSvg(w, h, dpr) {
  const logoSize  = LOGO_W * dpr
  const lx        = (w - logoSize) / 2
  const ly        = (h / 2)  - logoSize * 0.65  // slightly above center

  // Text size scales with DPR
  const titleSize = 32 * dpr
  const subtitleSize = 18 * dpr
  const titleY    = ly + logoSize + titleSize * 1.5
  const subtitleY = titleY + subtitleSize * 1.8

  // Inline the icon paths (two overlapping ellipses) directly so sharp can rasterize
  const strokeW = 7 * dpr

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <!-- Background -->
  <rect width="${w}" height="${h}" fill="${BG}"/>

  <!-- Logo: two overlapping ellipses (the app icon design) -->
  <g transform="translate(${lx}, ${ly})">
    <ellipse
      cx="${logoSize * 0.385}" cy="${logoSize * 0.5}"
      rx="${logoSize * 0.172}" ry="${logoSize * 0.234}"
      stroke="${FG}" stroke-width="${strokeW}" fill="none"
    />
    <ellipse
      cx="${logoSize * 0.617}" cy="${logoSize * 0.5}"
      rx="${logoSize * 0.172}" ry="${logoSize * 0.234}"
      stroke="${FG}" stroke-width="${strokeW}" fill="none"
    />
  </g>

  <!-- App name -->
  <text
    x="${w / 2}" y="${titleY}"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-weight="700"
    font-size="${titleSize}"
    fill="${FG}"
    text-anchor="middle"
    letter-spacing="${titleSize * 0.04}"
  >GIANFRANCO</text>

  <!-- Tagline -->
  <text
    x="${w / 2}" y="${subtitleY}"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-weight="400"
    font-size="${subtitleSize}"
    fill="${FG}66"
    text-anchor="middle"
    letter-spacing="${subtitleSize * 0.12}"
  >COFFEE ROASTERS</text>
</svg>`
}

// ── Generate ──────────────────────────────────────────────────────────────────
console.log('Generando splash screens…\n')

for (const { w, h, dpr } of SIZES) {
  const name = `splash-${w}x${h}.png`
  const svg  = buildSvg(w, h, dpr)

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, name))

  console.log(`  ✓  ${name.padEnd(24)}  ${w}×${h}  @${dpr}x`)
}

console.log('\n✅ Splash screens guardados en public/splashscreens/')
