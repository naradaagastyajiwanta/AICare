import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'pg-data')
const SCHEMA_FILE = join(__dirname, 'schema.sql')

export async function startEmbeddedPostgres() {
  const isFirstRun = !existsSync(DATA_DIR)

  const instance = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'aicare',
    password: 'aicare_secret',
    port: 5432,
    persistent: true,
  })

  if (isFirstRun) {
    await instance.initialise()
  }
  await instance.start()

  if (isFirstRun) {
    await instance.createDatabase('aicare')
    const schema = await readFile(SCHEMA_FILE, 'utf-8')
    const client = new pg.Client({
      host: 'localhost',
      port: 5432,
      user: 'aicare',
      password: 'aicare_secret',
      database: 'aicare',
    })
    await client.connect()
    await client.query(schema)
    await client.end()
    console.log('Database schema initialised.')
  }

  process.env.DATABASE_URL = 'postgresql://aicare:aicare_secret@localhost:5432/aicare'
  console.log('Embedded PostgreSQL started on port 5432')
}
