/** Which hosted services this process should actually talk to. Blank env vars stay on the booth path. */

export function spacetimeConfig() {
  const uri = process.env.NEXT_PUBLIC_SPACETIMEDB_URI?.trim() ?? ""
  const database = process.env.NEXT_PUBLIC_SPACETIMEDB_DATABASE?.trim() ?? ""
  if (!uri || !database) return null
  return { uri, database }
}

export function neonUrl() {
  const url = process.env.NEON_DATABASE_URL?.trim() ?? ""
  return url || null
}

export function tigerUrl() {
  const url = process.env.TIGER_DATABASE_URL?.trim() ?? ""
  return url || null
}
