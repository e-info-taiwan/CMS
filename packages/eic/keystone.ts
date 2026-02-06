import { config } from '@keystone-6/core'
import { listDefinition as lists } from './lists'
import appConfig from './config'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { createPreviewMiniApp } from './express-mini-apps/preview/app'
import envVar from './environment-variables'
import express, { Request, Response, NextFunction } from 'express'
import { createAuth } from '@keystone-6/auth'
import { statelessSessions } from '@keystone-6/core/session'

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
      extendExpressApp: (app, commonContext) => {
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
