const test = require('node:test')
const assert = require('node:assert/strict')
const { createSecurityTelemetry } = require('./security-telemetry')

async function harness(identity, version = 4) {
  const rows = []
  const telemetry = createSecurityTelemetry({ secret: 'test-secret', service: 'cms-prod', write: s => rows.push(JSON.parse(s)) })
  const execution = await (await telemetry.plugin.requestDidStart()).executionDidStart()
  const resolve = (field, error, parent = 'Mutation', nested = false) => {
    const end = execution.willResolveField({ [version === 4 ? 'contextValue' : 'context']: { session: identity ? { data: { email: identity } } : null }, info: { fieldName: field, parentType: { name: parent }, path: { prev: nested ? {} : undefined } } })
    if (end) end(error, { id: 1 })
  }
  return { telemetry, rows, resolve }
}

test('pseudonymizes accounts and records no supplied secrets or payloads', async () => {
  const { telemetry, rows } = await harness()
  telemetry.emit('login', 'failure', 'PERSON@example.com', 'google-oauth')
  telemetry.emit('login', 'success', 'person@example.com', 'google-oauth')
  assert.equal(rows[0].watchdog.principal, rows[1].watchdog.principal)
  assert.equal(JSON.stringify(rows).includes('person@example.com'), false)
  assert.equal(JSON.stringify(rows).includes('test-secret'), false)
})
test('records completed sensitive mutations and authorization denial', async () => {
  const { rows, resolve } = await harness('editor@example.com')
  resolve('updatePost')
  resolve('users', { extensions: { code: 'KS_ACCESS_DENIED' } }, 'Query')
  resolve('updatePost', new Error('database secret'))
  resolve('password', null, 'User', true)
  assert.deepEqual(rows.map(x => x.watchdog.action), ['admin-write', 'authorize'])
})
test('anonymous sensitive writes are distinct from allowed public operations', async () => {
  const { rows, resolve } = await harness()
  resolve('createUser')
  resolve('createMember')
  resolve('createNewsletter')
  assert.deepEqual(rows.map(x => x.watchdog.action), ['anonymous-write'])
})
test('logging failure cannot fail the application request', () => {
  const t = createSecurityTelemetry({ secret: 'test', write: () => { throw new Error('unavailable') } })
  assert.doesNotThrow(() => t.emit('login', 'failure', null, 'google-oauth'))
})

test('supports Apollo 3 context and Apollo 4 contextValue', async () => {
  for (const version of [3, 4]) {
    const { rows, resolve } = await harness('editor@example.com', version)
    resolve('updatePost')
    assert.equal(rows[0].watchdog.action, 'admin-write')
  }
})
test('missing context and non-write results never break GraphQL or assert a write', async () => {
  const rows = []
  const t = createSecurityTelemetry({ secret: 'test', write: s => rows.push(s) })
  const execution = await (await t.plugin.requestDidStart()).executionDidStart()
  const info = { fieldName: 'createUser', parentType: { name: 'Mutation' }, path: {} }
  assert.doesNotThrow(() => execution.willResolveField({ info }))
  const end = execution.willResolveField({ contextValue: {}, info })
  for (const result of [null, [], [new Error('denied')], [Promise.resolve(null)]]) end(null, result)
  assert.equal(rows.length, 0)
})
