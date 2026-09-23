const { test } = require('node:test')
const assert = require('node:assert/strict')
const { options, sourceMatches, vectorIsValid } = require('./photo-vector-import')
const row = { image_file_id: 'photo', object_name: 'images/photo-w480.jpg', source_format: 'jpg', generation: '123', created_at: '2026-08-01T00:00:00Z' }
const metadata = { bucket: 'statics-e-info-prod', name: row.object_name, generation: '123', timeCreated: '2026-07-31T00:00:00Z' }
test('source identity and generation must match; generation zero requires an object older than the lab seed', () => {
  assert.equal(sourceMatches(row, metadata), true)
  assert.equal(sourceMatches(row, { ...metadata, generation: '124' }), false)
  assert.equal(sourceMatches(row, { ...metadata, name: 'other' }), false)
  assert.equal(sourceMatches({ ...row, generation: '0' }, metadata), true)
  assert.equal(sourceMatches({ ...row, generation: '0' }, { ...metadata, timeCreated: '2026-08-02T00:00:00Z' }), false)
  assert.equal(sourceMatches({ ...row, generation: '0' }, { ...metadata, timeCreated: undefined }), false)
  assert.equal(sourceMatches(row, null), false)
})
test('defaults are read-only and invalid vectors/configuration are rejected', () => {
  assert.equal(options({}).mode, 'check')
  assert.throws(() => options({ BACKFILL_MODE: 'force' }))
  assert.equal(vectorIsValid('[1,2]'), false)
  assert.equal(vectorIsValid('invalid'), false)
  assert.equal(vectorIsValid(JSON.stringify(Array(512).fill(0.1))), true)
})
