const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Client } = require('pg')
const { run, writeBatch } = require('./photo-vector-import')

test('real pgvector import: source read-only, generation guard, source replacement, existing vector preservation, resume and overlap lock',
  { skip: !process.env.BACKFILL_TEST_SOURCE_URL }, async () => {
    const srcUrl = new URL(process.env.BACKFILL_TEST_SOURCE_URL)
    const dstUrl = new URL(process.env.BACKFILL_TEST_DATABASE_URL)
    assert.equal(srcUrl.hostname, '127.0.0.1'); assert.equal(srcUrl.pathname, '/image_vector_lab')
    assert.equal(dstUrl.hostname, '127.0.0.1'); assert.equal(dstUrl.pathname, '/eic_backfill_test')
    const source = new Client({ connectionString: srcUrl.href })
    const target = new Client({ connectionString: dstUrl.href })
    const other = new Client({ connectionString: dstUrl.href })
    await source.connect(); await target.connect(); await other.connect()
    try {
      await source.query('CREATE EXTENSION IF NOT EXISTS vector')
      await source.query(`CREATE TABLE vector_lab_images (id bigint, image_file_id text, object_name text,
        source_format text, generation bigint, embedding vector(512), model_version text, vector_status text, created_at timestamptz)`)
      await target.query('CREATE SCHEMA import_target')
      await target.query('SET search_path=import_target,public')
      await other.query('SET search_path=import_target,public')
      await target.query(`CREATE TABLE "Photo" (id integer,"imageFile_id" text,"imageFile_extension" text,
        "imageVector" vector(512),"imageVectorStatus" text,"imageVectorFailReason" text,
        "imageVectorUpdatedAt" timestamp, phash text, "imageLabelStatus" text)`)
      const vector = JSON.stringify(Array(512).fill(0.1))
      for (let i = 1; i <= 4; i++) {
        await source.query(`INSERT INTO vector_lab_images VALUES ($1,$2,$3,'jpg',0,$4::vector,'clip-ViT-B-32','succeeded','2026-08-01')`,
          [i, `file${i}`, `images/file${i}-w480.jpg`, vector])
        await target.query(`INSERT INTO "Photo" VALUES ($1,$2,'jpg',NULL,'',NULL,NULL,'existing-hash','keep-labels')`, [i, `file${i}`])
      }
      const cfg = { mode: 'apply', expectedDatabase: 'eic_backfill_test', maxItems: 1, maxSeconds: 60, batchSize: 2 }
      const metadata = async name => ({ bucket: 'statics-e-info-prod', name, generation: '12', timeCreated: '2026-07-01' })
      await other.query('SELECT pg_advisory_lock(62130923,2)')
      await assert.rejects(run(source, target, metadata, cfg), /Another photo backfill/)
      await other.query('SELECT pg_advisory_unlock(62130923,2)')
      assert.equal((await run(source, target, metadata, cfg)).imported, 1)
      await assert.rejects(source.query('DELETE FROM vector_lab_images'), /read-only/)
      const raced = async name => {
        if (name.includes('file2')) return { ...(await metadata(name)), timeCreated: '2026-09-01' }
        if (name.includes('file3')) await other.query(`UPDATE "Photo" SET "imageFile_id"='replacement' WHERE id=3`)
        if (name.includes('file4')) await other.query(`UPDATE "Photo" SET "imageVector"=$1::vector WHERE id=4`, [JSON.stringify(Array(512).fill(0.2))])
        return metadata(name)
      }
      const result = await run(source, target, raced, { ...cfg, maxItems: 10 })
      assert.equal(result.staleSource, 1); assert.equal(result.changed, 2); assert.equal(result.imported, 0)
      assert.equal((await target.query(`SELECT count(*)::int AS n FROM "Photo" WHERE phash='existing-hash' AND "imageLabelStatus"='keep-labels'`)).rows[0].n, 4)
      assert.equal((await target.query(`SELECT count("imageVector")::int AS n FROM "Photo"`)).rows[0].n, 2)
      assert.equal(await writeBatch(target, [{ id: 1, file_id: 'file1', extension: 'png', vector }]), 0)
      const check = await run(source, target, () => assert.fail('GCS called in check'), { ...cfg, mode: 'check', maxItems: 10 })
      assert.equal(check.imported, 0)
      await assert.rejects(target.query('DELETE FROM "Photo"'), /read-only/)
    } finally { await Promise.all([source.end(), target.end(), other.end()]) }
  })
