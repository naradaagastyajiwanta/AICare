import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://aicare:aicare_secret@localhost:5432/aicare',
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err)
})

export const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
}

export default pool
