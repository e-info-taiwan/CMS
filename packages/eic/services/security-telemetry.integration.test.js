const test = require('node:test')
const assert = require('node:assert/strict')
const { ApolloServer } = require('@apollo/server')
const { GraphQLError } = require('graphql')
const { createSecurityTelemetry } = require('./security-telemetry')

test('actual Apollo 4 reads, denied queries and mutations retain their responses', async () => {
  const rows = []
  const t = createSecurityTelemetry({ secret: 'test', service: 'cms', write: s => rows.push(JSON.parse(s)) })
  const server = new ApolloServer({
    typeDefs: 'type User { id: ID! } type Query { health: String! users: [User] } type Mutation { createUser: User updatePost: User }',
    resolvers: { Query: { health: () => 'ok', users: () => { throw new GraphQLError('denied', { extensions: { code: 'KS_ACCESS_DENIED' } }) } }, Mutation: { createUser: () => ({ id: '1' }), updatePost: () => ({ id: '2' }) } },
    plugins: [t.plugin],
  })
  try {
    const read = await server.executeOperation({ query: '{ health }' }, { contextValue: {} })
    assert.equal(read.body.singleResult.errors, undefined)
    assert.equal(read.body.singleResult.data.health, 'ok')
    const denied = await server.executeOperation({ query: '{ users { id } }' }, { contextValue: {} })
    assert.equal(denied.body.singleResult.errors[0].extensions.code, 'KS_ACCESS_DENIED')
    const write = await server.executeOperation({ query: 'mutation { updatePost { id } }' }, { contextValue: { session: { data: { email: 'editor@example.com' } } } })
    assert.equal(write.body.singleResult.errors, undefined)
    await server.executeOperation({ query: 'mutation { createUser { id } }' }, { contextValue: {} })
    assert.deepEqual(rows.map(x => x.watchdog.action), ['authorize', 'admin-write', 'anonymous-write'])
  } finally { await server.stop() }
})
