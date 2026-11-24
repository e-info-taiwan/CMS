const test = require('node:test')
const assert = require('node:assert/strict')
const { createSecurityTelemetry } = require('./security-telemetry')

async function harness(identity) {
  const rows = []
  const telemetry = createSecurityTelemetry({ secret: 'test-secret', service: 'cms-prod', write: s => rows.push(JSON.parse(s)) })
  const execution = await (await telemetry.plugin.requestDidStart()).executionDidStart()
  const resolve = (field, error, parent = 'Mutation', nested = false) => {
    const end = execution.willResolveField({ context: { session: identity ? { data: { email: identity } } : null }, info: { fieldName: field, parentType: { name: parent }, path: { prev: nested ? {} : undefined } } })
    if (end) end(error)
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
