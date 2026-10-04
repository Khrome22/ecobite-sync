import { Pool } from "pg"
import { loadEnvFiles, statements } from "./sql-file.mjs"

loadEnvFiles()

const url = process.env.TIGER_DATABASE_URL?.trim()
if (!url) {
  console.error("TIGER_DATABASE_URL is empty. Put the Tiger Cloud connection string in .env.local, then run this again.")
  process.exit(1)
}

const local = /localhost|127\.0\.0\.1/.test(url)
const pool = new Pool({
  connectionString: url,
  ssl: local ? undefined : { rejectUnauthorized: false },
})

const steps = statements(new URL("../schema/tiger.sql", import.meta.url))
const client = await pool.connect()
try {
  for (const statement of steps) {
    try {
      await client.query(statement)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/already exists|already a hypertable/i.test(message)) {
        console.log(`Skipped (already applied): ${statement.slice(0, 72)}`)
        continue
      }
      throw error
    }
  }
} finally {
  client.release()
  await pool.end()
}
console.log(`Applied Tiger Data schema (${steps.length} statements).`)
