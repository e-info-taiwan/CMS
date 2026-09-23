const { test } = require('node:test')
const assert = require('node:assert/strict')
const { options, retry, processTag, run } = require('./tag-job')
const signal = new AbortController().signal

test('defaults to check and rejects invalid mode, concurrency and bounds', () => {
  assert.equal(options({}).mode, 'check')
  for (const env of [{ BACKFILL_MODE: 'typo' }, { CLOUD_RUN_TASK_COUNT: '2' }, { BACKFILL_MAX_ITEMS: '0' }]) {
    assert.throws(() => options(env))
  }
})
test('retries transient errors only, within the attempt budget', async () => {
  let calls = 0
  assert.equal(await retry(async () => { if (++calls < 3) throw { status: 429 }; return 9 }, 3, signal, async () => {}), 9)
  calls = 0
  await assert.rejects(retry(async () => { calls++; throw { status: 403 } }, 3, signal, async () => {}))
  assert.equal(calls, 1)
})
test('embedding update guards against concurrent rename or existing embedding', async () => {
  let captured
  const db = { query: async (...args) => { captured = args; return { rowCount: 0 } } }
  const ai = { models: { embedContent: async () => ({ embeddings: [{ values: Array(1536).fill(0.5) }] }) } }
  assert.equal(await processTag(db, ai, { id: 4, name: '樹木' }, options({}), signal), 'changed_or_already_filled')
  assert.match(captured[0], /name = \$3 AND "textEmbedding3Small" IS NULL/)
  assert.deepEqual(captured[1].slice(1), [4, '樹木'])
})
test('invalid model response never writes a vector', async () => {
  const ai = { models: { embedContent: async () => ({ embeddings: [{ values: [1] }] }) } }
  await assert.rejects(processTag({ query: () => assert.fail('unexpected write') }, ai, { id: 1, name: 'a' }, options({}), signal), /dimension/)
})
test('check uses read-only SQL and never instantiates AI or writes data', async () => {
  const queries = []
  const replies = [{ rows: [{ database: 'eic-prod' }] }, { rows: [] }, { rows: [{ type: 'vector(1536)' }] }, { rows: [{ total: '10', filled: '0', eligible: '10' }] }]
  const db = { query: async sql => { queries.push(sql); return replies.shift() } }
  assert.deepEqual(await run(db, () => assert.fail('unexpected AI'), options({}), signal), { checked: true })
  assert.equal(queries[1], 'SET default_transaction_read_only = on')
  assert.ok(queries.every(sql => !/UPDATE|INSERT|CREATE|DELETE/.test(sql)))
})
