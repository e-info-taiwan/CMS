'use strict'

const { Client } = require('pg')
const { setTimeout: delay } = require('node:timers/promises')

const MODEL = 'clip-ViT-B-32'
const BUCKET = 'statics-e-info-prod'
const log = value => console.log(JSON.stringify(value))

function options(env = process.env) {
  function integer(name, fallback, max) {
    const value = Number(env[name] ?? fallback)
    if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}`)
    return value
  }
  const mode = env.BACKFILL_MODE || 'check'
  if (!['check', 'apply'].includes(mode)) throw new Error('Invalid BACKFILL_MODE')
  return { mode, maxItems: integer('BACKFILL_MAX_ITEMS', 50, 200000),
    batchSize: integer('BACKFILL_BATCH_SIZE', 250, 500),
    maxSeconds: integer('BACKFILL_MAX_SECONDS', 3000, 25200),
    expectedDatabase: env.BACKFILL_EXPECTED_DATABASE || 'eic-prod' }
}

// Old lab seeds used generation=0. A current object created before the lab row
// was seeded proves that its contents have not been replaced since vectorizing.
function sourceMatches(row, metadata) {
  if (!metadata || metadata.bucket !== BUCKET || metadata.name !== row.object_name) return false
  if (row.object_name !== `images/${row.image_file_id}-w480.${row.source_format}`) return false
  if (BigInt(row.generation) > 0n) return String(metadata.generation) === String(row.generation)
  const created = Date.parse(metadata.timeCreated)
  const seeded = new Date(row.created_at).getTime()
  return Number.isFinite(created) && Number.isFinite(seeded) && created <= seeded
}

function vectorIsValid(literal) {
  let values
  try { values = JSON.parse(literal) } catch { return false }
  return Array.isArray(values) && values.length === 512 && values.every(Number.isFinite)
}

async function writeBatch(db, updates) {
  if (!updates.length) return 0
  const result = await db.query(`
    UPDATE "Photo" p SET "imageVector"=u.vector::vector,
      "imageVectorStatus"='success', "imageVectorFailReason"=NULL,
      "imageVectorUpdatedAt"=NOW()
    FROM jsonb_to_recordset($1::jsonb) AS u(id integer, file_id text, extension text, vector text)
    WHERE p.id=u.id AND p."imageFile_id"=u.file_id
      AND p."imageFile_extension"=u.extension AND p."imageVector" IS NULL`, [JSON.stringify(updates)])
  return result.rowCount
}

async function mapConcurrent(items, count, fn) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(count, items.length) }, async () => {
    while (next < items.length) await fn(items[next++])
  }))
}

async function run(source, target, metadataFor, cfg, signal = new AbortController().signal) {
  const deadline = Date.now() + cfg.maxSeconds * 1000
  await source.query('SET default_transaction_read_only=on')
  await source.query('SET statement_timeout=60000')
  await target.query('SET statement_timeout=60000')
  await target.query('SET lock_timeout=3000')
  const sourceDb = (await source.query('SELECT current_database() AS name')).rows[0].name
  const targetDb = (await target.query('SELECT current_database() AS name')).rows[0].name
  if (sourceDb !== 'image_vector_lab' || targetDb !== cfg.expectedDatabase) throw new Error('Unexpected database identity')
  let locked = false
  const counts = { event: 'vector_import_complete', mode: cfg.mode, scanned: 0, matched: 0,
    alreadyPresent: 0, noMatchingPhoto: 0, eligible: 0, imported: 0, changed: 0,
    staleSource: 0, invalidVector: 0, failed: 0, nextCursor: '0', exhausted: false }
  try {
    if (cfg.mode === 'check') await target.query('SET default_transaction_read_only=on')
    else {
      locked = (await target.query('SELECT pg_try_advisory_lock(62130923, 2) AS acquired')).rows[0].acquired
      if (!locked) throw new Error('Another photo backfill is running')
    }
    const end = (await source.query('SELECT COALESCE(MAX(id),0)::text AS id FROM vector_lab_images')).rows[0].id
    while (!signal.aborted && Date.now() < deadline && counts.scanned < cfg.maxItems) {
      const size = Math.min(cfg.batchSize, cfg.maxItems - counts.scanned)
      // Check mode never reads the vector payload or calls GCS/AI.
      const columns = cfg.mode === 'apply' ? ', embedding::text AS vector' : ''
      const rows = (await source.query(`SELECT id::text,image_file_id,object_name,source_format,
        generation::text,created_at${columns} FROM vector_lab_images
        WHERE id > $1 AND id <= $2 AND vector_status='succeeded'
          AND model_version=$3 AND embedding IS NOT NULL AND vector_dims(embedding)=512
        ORDER BY id LIMIT $4`, [counts.nextCursor, end, MODEL, size])).rows
      if (!rows.length) { counts.exhausted = true; break }
      const photos = (await target.query(`SELECT id,"imageFile_id" AS file_id,
        "imageFile_extension" AS extension,"imageVector" IS NOT NULL AS present
        FROM "Photo" WHERE "imageFile_id"=ANY($1::text[])`, [rows.map(r => r.image_file_id)])).rows
      const byFile = new Map()
      for (const photo of photos) {
        const key = `${photo.file_id}.${photo.extension}`
        if (!byFile.has(key)) byFile.set(key, [])
        byFile.get(key).push(photo)
      }
      const updates = []
      await mapConcurrent(rows, 12, async row => {
        if (signal.aborted) throw new Error('Execution interrupted')
        const matches = byFile.get(`${row.image_file_id}.${row.source_format}`) || []
        counts.matched += matches.length
        if (!matches.length) { counts.noMatchingPhoto++; return }
        const missing = matches.filter(photo => !photo.present)
        counts.alreadyPresent += matches.length - missing.length
        counts.eligible += missing.length
        if (cfg.mode === 'check' || !missing.length) return
        if (!vectorIsValid(row.vector)) { counts.invalidVector++; return }
        let metadata
        try { metadata = await metadataFor(row.object_name, signal) } catch {
          counts.failed++; log({ event: 'source_read_failed', labId: row.id }); return
        }
        if (!sourceMatches(row, metadata)) { counts.staleSource++; return }
        for (const photo of missing) updates.push({ id: photo.id, file_id: photo.file_id,
          extension: photo.extension, vector: row.vector })
      })
      if (cfg.mode === 'apply') {
        const written = await writeBatch(target, updates)
        counts.imported += written
        counts.changed += updates.length - written
      }
      counts.scanned += rows.length
      counts.nextCursor = rows.at(-1).id
      log({ ...counts, event: 'vector_import_batch' })
      if (rows.length < size) { counts.exhausted = true; break }
    }
    log(counts)
    return counts
  } finally {
    if (locked) await target.query('SELECT pg_advisory_unlock(62130923, 2)')
  }
}

function gcsMetadataReader() {
  let token, expires = 0, tokenRequest
  async function getToken(signal) {
    if (token && Date.now() < expires) return token
    if (!tokenRequest) tokenRequest = (async () => {
      const result = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
        headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) })
      if (!result.ok) throw new Error('Metadata credentials unavailable')
      const body = await result.json()
      token = body.access_token; expires = Date.now() + (body.expires_in - 120) * 1000
      return token
    })().finally(() => { tokenRequest = undefined })
    return tokenRequest
  }
  return async (object, signal) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const auth = await getToken(signal)
      let result
      try {
        result = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(object)}?fields=bucket,name,generation,timeCreated`, {
          headers: { Authorization: `Bearer ${auth}` }, signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) })
      } catch (error) {
        if (signal.aborted || attempt === 2) throw error
        await delay(500 * (attempt + 1), undefined, { signal }); continue
      }
      if (result.status === 404) return null
      if (result.ok) return result.json()
      if (result.status === 401) expires = 0
      if (![401, 408, 429, 500, 502, 503, 504].includes(result.status) || attempt === 2) throw new Error(`Storage status ${result.status}`)
      await result.body?.cancel()
      await delay(500 * (attempt + 1), undefined, { signal })
    }
  }
}

async function main() {
  const cfg = options()
  if (!process.env.DATABASE_URL || !process.env.LAB_DB_PASSWORD || !process.env.LAB_DB_USER) throw new Error('Missing database credentials')
  if (process.env.LAB_DB_HOST !== '/cloudsql/mimetic-sweep-456508-k4:us-central1:einfo-dev') throw new Error('Unexpected lab instance')
  const source = new Client({ host: process.env.LAB_DB_HOST, database: 'image_vector_lab',
    user: process.env.LAB_DB_USER, password: process.env.LAB_DB_PASSWORD,
    connectionTimeoutMillis: 20000 })
  const target = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 20000 })
  const controller = new AbortController()
  process.once('SIGTERM', () => controller.abort())
  process.once('SIGINT', () => controller.abort())
  try {
    await source.connect(); await target.connect()
    const result = await run(source, target, gcsMetadataReader(), cfg, controller.signal)
    if (result.failed || result.invalidVector || controller.signal.aborted) process.exitCode = 1
  } finally { await Promise.allSettled([source.end(), target.end()]) }
}

if (require.main === module) main().catch(error => {
  // Database errors can contain DSNs or credentials; expose only the class/code.
  log({ event: 'vector_import_error', name: error.name, code: error.code || 'UNKNOWN' })
  process.exitCode = 1
})
module.exports = { options, sourceMatches, vectorIsValid, writeBatch, run }
