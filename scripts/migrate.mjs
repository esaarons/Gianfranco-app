import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const DB_URL = process.argv[2]

if (!DB_URL) {
  console.error('Usage: node scripts/migrate.mjs "postgresql://postgres:[password]@db.afzphnqaryjwbebprlrv.supabase.co:5432/postgres"')
  process.exit(1)
}

const migrations = [
  '001_schema.sql',
  '002_seed_tables.sql',
  '003_seed_products.sql',
]

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })

async function run() {
  await client.connect()
  console.log('✅ Conectado a PostgreSQL\n')

  for (const file of migrations) {
    const sql = readFileSync(join(__dir, '../supabase/migrations', file), 'utf8')
    console.log(`⏳ Corriendo ${file}...`)
    try {
      await client.query(sql)
      console.log(`✅ ${file} completado\n`)
    } catch (err) {
      // Ignore "already exists" errors on re-runs
      if (err.message.includes('already exists')) {
        console.log(`⚠️  ${file} — tablas ya existen, saltando\n`)
      } else {
        console.error(`❌ Error en ${file}:`, err.message)
        process.exit(1)
      }
    }
  }

  await client.end()
  console.log('🎉 Migraciones completadas. Base de datos lista.')
}

run()
