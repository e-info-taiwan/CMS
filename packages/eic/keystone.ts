import { config, graphql } from '@keystone-6/core'
import { listDefinition as lists } from './lists'
import appConfig from './config'
import { createPreviewMiniApp } from './express-mini-apps/preview/app'
import envVar from './environment-variables'
import express from 'express'
import { createAuth } from '@keystone-6/auth'
import { statelessSessions } from '@keystone-6/core/session'
import { ACL } from './type'

const { withAuth } = createAuth({
  listKey: 'User',
  identityField: 'email',
  sessionData: 'name role',
  secretField: 'password',
  initFirstItem: {
    // If there are no items in the database, keystone will ask you to create
    // a new user, filling in these fields.
    fields: ['name', 'email', 'password', 'role'],
  },
})

const session = statelessSessions(appConfig.session)

export default withAuth(
  config({
    db: {
      provider: appConfig.database.provider,
      url: appConfig.database.url,
      idField: {
        kind: 'autoincrement',
      },
    },
    ui: {
      // If `isDisabled` is set to `true` then the Admin UI will be completely disabled.
      isDisabled: envVar.isUIDisabled,
      // For our starter, we check that someone has session data before letting them see the Admin UI.
      isAccessAllowed: (context) => !!context.session?.data,
    },
    lists,
    session,
    // For RSS feed generation for querying posts by rssTarget with where clause
    extendGraphqlSchema: graphql.extend((base) => ({
      query: {
        postsForRssTarget: graphql.field({
          type: graphql.nonNull(graphql.list(base.object('Post'))),
          args: {
            rssTarget: graphql.arg({
              type: graphql.nonNull(graphql.String),
            }),
          },
          resolve: async (_source, { rssTarget }, context) => {
            // PostgreSQL: WHERE rssTargets @> '["yahoo"]'::jsonb
            const targetsJson = JSON.stringify([rssTarget])
            const rows = (await context.prisma.$queryRaw`
              SELECT id FROM "Post"
              WHERE "rssTargets"::jsonb @> ${targetsJson}::jsonb
            `) as { id: number }[]
            const ids = rows.map((r) => r.id)
            if (ids.length === 0) {
              return []
            }
            const posts = await context.db.Post.findMany({
              where: { id: { in: ids } },
              orderBy: { publishTime: 'desc' },
            })
            return posts
          },
        }),
      },
    })),
    storage: {
      files: {
        kind: 'local',
        type: 'file',
        storagePath: appConfig.files.storagePath,
        serverRoute: {
          path: '/files',
        },
        generateUrl: (path) => `/files${path}`,
      },
      images: {
        kind: 'local',
        type: 'image',
        storagePath: appConfig.images.storagePath,
        serverRoute: {
          path: '/images',
        },
        generateUrl: (path) => `/images${path}`,
      },
    },
    server: {
      healthCheck: {
        path: '/health_check',
        data: { status: 'healthy' },
      },
      extendExpressApp: (app, context) => {
        // This middleware is available in Express v4.16.0 onwards
        // Set to 50mb because DraftJS Editor playload could be really large
        const jsonBodyParser = express.json({ limit: '50mb' })
        app.use(jsonBodyParser)

        // Check if the request is sent by an authenticated user
        if (envVar.accessControlStrategy === ACL.CMS) {
          // Serve robots.txt only in CMS domain to block all crawlers.
          app.get('/robots.txt', (_, res) => {
            res.type('text/plain')
            res.send(`User-agent: *
Disallow: /`)
          })

          app.use(
            createPreviewMiniApp({
              previewServer: envVar.previewServer,
              keystoneContext: context,
            })
          )
        }
      },
    },
  })
)
