// Security telemetry contains no queries, variables, cookies, tokens or response data.
const { createHmac } = require('node:crypto')

function createSecurityTelemetry({ secret, service = process.env.K_SERVICE || 'cms', write = console.log }) {
  function principal(identity) {
    if (!identity) return 'anonymous'
    return 'account:' + createHmac('sha256', secret).update('watchdog-account-v1:' + String(identity).trim().toLowerCase()).digest('hex')
  }
  function emit(action, outcome, identity, resource) {
    try {
      write(JSON.stringify({
        severity: outcome === 'denied' || outcome === 'failure' ? 'WARNING' : 'INFO',
        watchdog: { version: 1, feed: 'application', action, outcome,
          principal: principal(identity), resource: service + '/' + resource },
      }))
    } catch { /* Logging must never change authorization or application behavior. */ }
  }
  const deniedCodes = new Set(['KS_ACCESS_DENIED', 'FORBIDDEN', 'UNAUTHENTICATED'])
  const plugin = {
    async requestDidStart() {
      return {
        async executionDidStart() {
          return {
            willResolveField({ context, contextValue, info }) {
              const ctx = contextValue || context
              if (!ctx || !info || info.path.prev) return
              const isMutation = info.parentType.name === 'Mutation'
              const identity = ctx.session?.data?.email || ctx.session?.data?.id
              const field = info.fieldName
              return (error, result) => {
                if (error) {
                  if (deniedCodes.has(error.extensions?.code)) emit('authorize', 'denied', identity, field)
                  return
                }
                if (!isMutation || result == null || result instanceof Error) return
                if (Array.isArray(result) && !result.some(x => x != null && !(x instanceof Error) && typeof x.then !== 'function')) return
                // Public member/newsletter actions are not inherently unauthorized.
                const sensitive = /^(create|update|delete)(User|Post|Photo|Tag|Category|Section|Config|Author|Ad|HomepagePick|Topic|Event|Job)(s|Many)?$/.test(field)
                if (identity) emit('admin-write', 'success', identity, field)
                else if (sensitive) emit('anonymous-write', 'success', null, field)
              }
            },
          }
        },
      }
    },
  }
  return { emit, plugin }
}

module.exports = { createSecurityTelemetry }
