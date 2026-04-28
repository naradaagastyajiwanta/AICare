// Local dev entry point — starts embedded PostgreSQL then the main app.
import { startEmbeddedPostgres } from './db/embedded.js'

await startEmbeddedPostgres()
await import('./index.js')
