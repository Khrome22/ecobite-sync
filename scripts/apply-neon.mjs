import { neon } from "@neondatabase/serverless"
import { loadEnvFiles, statements } from "./sql-file.mjs"

loadEnvFiles()

const url = process.env.NEON_DATABASE_URL?.trim()
if (!url) {
  console.error("NEON_DATABASE_URL is empty. Put the Neon connection string in .env.local, then run this again.")
  process.exit(1)
}

const sql = neon(url)
const steps = statements(new URL("../schema/neon.sql", import.meta.url))
for (const statement of steps) {
  await sql.query(statement)
}
console.log(`Applied ${steps.length} statements to Neon.`)
