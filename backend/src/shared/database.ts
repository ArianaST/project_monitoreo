import path from 'path'
import dotenv from 'dotenv'
import { Pool, QueryResult } from 'pg'

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  override: true,
  debug: true,
})

const connectionString = process.env.DATABASE_URL?.trim()

if (!connectionString) {
  throw new Error('DATABASE_URL no está definido en backend/.env')
}

const parsed = new URL(connectionString)

console.log('DB host:', parsed.host)
console.log('DB user:', decodeURIComponent(parsed.username))
console.log('DB protocol:', parsed.protocol)

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
})

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de conexiones:', err)
})

export async function query(
  text: string,
  params?: unknown[]
): Promise<QueryResult> {
  const result = await pool.query(text, params)
  return result
}

export default pool