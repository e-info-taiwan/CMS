'use strict'

const { setTimeout: sleep } = require('node:timers/promises')

function numberOption(env, name, fallback, min, max) {
  const value = Number(env[name] ?? fallback)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}: expected integer ${min}..${max}`)
  }
  return value
}

function options(env = process.env) {
  const mode = env.BACKFILL_MODE || 'check'
  if (!['check', 'apply'].includes(mode)) throw new Error('BACKFILL_MODE must be check or apply')
  if (Number(env.CLOUD_RUN_TASK_COUNT || 1) !== 1) throw new Error('This job requires tasks=1; overlapping executions are locked')
  const cfg = {
    mode,
    expectedDatabase: env.BACKFILL_EXPECTED_DATABASE || 'eic-prod',
    batchSize: numberOption(env, 'BACKFILL_BATCH_SIZE', 25, 1, 100),
    maxItems: numberOption(env, 'BACKFILL_MAX_ITEMS', 50, 1, 10000),
    startId: numberOption(env, 'BACKFILL_START_ID', 0, 0, 2147483647),
    endId: numberOption(env, 'BACKFILL_END_ID', 2147483647, 1, 2147483647),
    maxSeconds: numberOption(env, 'BACKFILL_MAX_SECONDS', 3000, 60, 3300),
    requestMs: numberOption(env, 'BACKFILL_REQUEST_TIMEOUT_MS', 45000, 1000, 120000),
    attempts: numberOption(env, 'BACKFILL_ATTEMPTS', 3, 1, 5),
    project: env.TAG_VERTEX_PROJECT || env.GOOGLE_CLOUD_PROJECT,
    location: env.TAG_VERTEX_LOCATION || 'asia-east1',
    model: env.TAG_VERTEX_EMBEDDING_MODEL || 'gemini-embedding-001',
  }
  if (cfg.startId >= cfg.endId) throw new Error('BACKFILL_START_ID must be less than BACKFILL_END_ID')
  if (cfg.maxSeconds * 1000 <= cfg.attempts * cfg.requestMs + 30000) throw new Error('BACKFILL_MAX_SECONDS must allow a complete item retry budget')
  return cfg
}

function retryable(error) {
  const status = Number(error?.status || error?.code)
  return [408, 429, 500, 502, 503, 504].includes(status) ||
    ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error?.code) ||
    ['AbortError', 'TimeoutError'].includes(error?.name)
}

async function retry(fn, count, signal, wait = sleep) {
  for (let attempt = 1; ; attempt++) {
    try { return await fn() } catch (error) {
      if (signal.aborted || attempt >= count || !retryable(error)) throw error
      await wait(Math.min(1000 * 2 ** (attempt - 1), 8000), undefined, { signal })
    }
  }
}

const updateSql = `UPDATE "Tag" SET "textEmbedding3Small" = $1::vector
  WHERE id = $2 AND name = $3 AND "textEmbedding3Small" IS NULL`

async function processTag(db, ai, tag, cfg, signal) {
  const response = await retry(() => ai.models.embedContent({
    model: cfg.model,
    contents: tag.name.trim(),
    config: {
      taskType: 'SEMANTIC_SIMILARITY', outputDimensionality: 1536, autoTruncate: true,
      httpOptions: { timeout: cfg.requestMs }, abortSignal: signal,
    },
  }), cfg.attempts, signal)
  const vector = response.embeddings?.[0]?.values
  if (!Array.isArray(vector) || vector.length !== 1536 || !vector.every(Number.isFinite)) {
    throw new Error('Invalid embedding dimension or values')
  }
  if (signal.aborted) throw signal.reason
  const result = await db.query(updateSql, [JSON.stringify(vector), tag.id, tag.name])
  return result.rowCount === 1 ? 'updated' : 'changed_or_already_filled'
}

const log = (event, data = {}) => console.log(JSON.stringify({ job: 'tag-embedding', event, ...data }))

async function run(db, aiFactory, cfg, signal) {
  const { rows: [identity] } = await db.query('SELECT current_database() AS database')
  if (identity.database !== cfg.expectedDatabase) throw new Error('Database does not match BACKFILL_EXPECTED_DATABASE')
  if (cfg.mode === 'check') await db.query('SET default_transaction_read_only = on')
  const { rows: [column] } = await db.query(`SELECT format_type(a.atttypid, a.atttypmod) AS type
    FROM pg_attribute a WHERE a.attrelid = '"Tag"'::regclass AND a.attname = 'textEmbedding3Small' AND NOT a.attisdropped`)
  if (column?.type !== 'vector(1536)') throw new Error('Tag embedding migration is missing or dimension is wrong')
  const { rows: [coverage] } = await db.query(`SELECT count(*) AS total,
    count("textEmbedding3Small") AS filled,
    count(*) FILTER (WHERE "textEmbedding3Small" IS NULL AND name IS NOT NULL AND btrim(name) <> '') AS eligible
    FROM "Tag"`)
  log('preflight', { mode: cfg.mode, coverage, model: cfg.model, dimension: 1536 })
  if (cfg.mode === 'check') return { checked: true }
  if (!cfg.project) throw new Error('TAG_VERTEX_PROJECT is required')

  const { rows: [lock] } = await db.query('SELECT pg_try_advisory_lock(62130923, 1) AS acquired')
  if (!lock.acquired) throw new Error('Another tag backfill execution is running')
  try {
    const ai = aiFactory()
    const { rows: [cutoff] } = await db.query('SELECT COALESCE(max(id), 0) AS id FROM "Tag"')
    const endId = Math.min(cfg.endId, cutoff.id)
    const stopAt = Date.now() + cfg.maxSeconds * 1000
    const summary = { processed: 0, updated: 0, skipped: 0, failed: 0, nextCursor: cfg.startId, endId }
    const reserveMs = cfg.attempts * cfg.requestMs + 30000
    while (!signal.aborted && summary.processed < cfg.maxItems && Date.now() + reserveMs < stopAt) {
      const { rows } = await db.query(`SELECT id, name FROM "Tag"
        WHERE id > $1 AND id <= $2 AND "textEmbedding3Small" IS NULL
        AND name IS NOT NULL AND btrim(name) <> '' ORDER BY id LIMIT $3`,
      [summary.nextCursor, endId, Math.min(cfg.batchSize, cfg.maxItems - summary.processed)])
      if (!rows.length) break
      for (const tag of rows) {
        if (signal.aborted || Date.now() + reserveMs >= stopAt) break
        summary.nextCursor = tag.id
        summary.processed++
        try {
          const status = await processTag(db, ai, tag, cfg, signal)
          summary[status === 'updated' ? 'updated' : 'skipped']++
          log('item', { id: tag.id, status })
        } catch (error) {
          summary.failed++
          // IDs and error categories only; never log a DSN, token, or article/tag content.
          log('item_failed', { id: tag.id, error: error.name, code: error.status || error.code || 'EMBEDDING_ERROR' })
        }
      }
    }
    log('summary', summary)
    if (signal.aborted) throw new Error('Job interrupted; completed rows are retained')
    if (summary.failed) throw new Error(`${summary.failed} tags failed; inspect item_failed logs and rerun missing rows`)
    return summary
  } finally {
    await db.query('SELECT pg_advisory_unlock(62130923, 1)')
  }
}

async function main() {
  const cfg = options()
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const { Client } = require('pg')
  const { GoogleGenAI } = require('@google/genai')
  const db = new Client({ connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000, statement_timeout: 30000, query_timeout: 35000,
    application_name: 'eic-tag-embedding-backfill' })
  const abort = new AbortController()
  const stop = () => abort.abort(new Error('SIGTERM'))
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
  db.on('error', stop)
  await db.connect()
  try {
    await run(db, () => new GoogleGenAI({ vertexai: true, project: cfg.project,
      location: cfg.location, apiVersion: 'v1', httpOptions: { timeout: cfg.requestMs } }), cfg, abort.signal)
  } finally { await db.end() }
}

if (require.main === module) main().catch(error => {
  log('fatal', { error: error.name, code: error.code || 'JOB_FAILED',
    // Our own validation messages are safe; client errors can include credentials.
    message: error.constructor === Error && !error.code ? error.message : 'See item status or database connectivity' })
  process.exitCode = 1
})

module.exports = { options, retry, retryable, processTag, run, updateSql }
