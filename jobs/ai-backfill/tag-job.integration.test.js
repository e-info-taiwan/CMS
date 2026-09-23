const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Client } = require('pg')
const { options, run } = require('./tag-job')

test('real pgvector: bounded apply, overlap lock, concurrent rename, resume and read-only check',
  { skip: !process.env.BACKFILL_TEST_DATABASE_URL }, async () => {
    const url = new URL(process.env.BACKFILL_TEST_DATABASE_URL)
    assert.equal(url.hostname, '127.0.0.1')
    assert.equal(url.pathname, '/eic_backfill_test')
    const db = new Client({ connectionString: url.href })
    const other = new Client({ connectionString: url.href })
    await db.connect(); await other.connect()
    try {
      await db.query('CREATE EXTENSION IF NOT EXISTS vector')
      await db.query('CREATE TABLE "Tag" (id SERIAL PRIMARY KEY, name text, "textEmbedding3Small" vector(1536))')
      await db.query(`INSERT INTO "Tag" (name) VALUES ('tree'),('river'),('mountain')`)
      const cfg = options({ BACKFILL_EXPECTED_DATABASE: 'eic_backfill_test', BACKFILL_MODE: 'apply',
        BACKFILL_MAX_ITEMS: '1', TAG_VERTEX_PROJECT: 'test' })
      const signal = new AbortController().signal
      let calls = 0
      const ai = () => ({ models: { embedContent: async () => {
        calls++
        return { embeddings: [{ values: Array(1536).fill(0.25) }] }
      } } })
      await other.query('SELECT pg_advisory_lock(62130923, 1)')
      await assert.rejects(run(db, ai, cfg, signal), /Another tag backfill/)
      await other.query('SELECT pg_advisory_unlock(62130923, 1)')
      const first = await run(db, ai, cfg, signal)
      assert.equal(first.updated, 1)
      assert.equal(calls, 1)
      const raced = () => ({ models: { embedContent: async () => {
        await other.query(`UPDATE "Tag" SET name='renamed river' WHERE id=2`)
        return { embeddings: [{ values: Array(1536).fill(0.5) }] }
      } } })
      const race = await run(db, raced, cfg, signal)
      assert.equal(race.skipped, 1)
      assert.equal((await db.query('SELECT "textEmbedding3Small" FROM "Tag" WHERE id=2')).rows[0].textEmbedding3Small, null)
      await run(db, ai, cfg, signal)
      await run(db, ai, cfg, signal)
      assert.equal((await db.query('SELECT count("textEmbedding3Small")::int AS n FROM "Tag"')).rows[0].n, 3)
      await run(db, () => assert.fail('AI called during check'), { ...cfg, mode: 'check' }, signal)
      await assert.rejects(db.query(`UPDATE "Tag" SET name='should fail' WHERE id=1`), /read-only/)
    } finally { await db.end(); await other.end() }
  })
