import { config, graphql } from '@keystone-6/core'
import { listDefinition as lists } from './lists'
import appConfig from './config'
import { createPreviewMiniApp } from './express-mini-apps/preview/app'
import envVar from './environment-variables'
import { suggestAndApplyPostTags } from './services/ai-post-tags-suggestion'
import {
  findExactPHashDuplicatePhotos,
  findNearPHashDuplicatePhotos,
} from './services/photo-phash-duplicates'
import { findSimilarPhotos } from './services/photo-similarity'
import { findSimilarRssArticlesByPostTitle } from './services/post-title-similarity'
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

const extendPrismaSchemaWithTagVectors = (schema: string) => {
  let nextSchema = schema

  if (
    !nextSchema.includes('textEmbedding3Small Unsupported("vector(1536)")?') ||
    !nextSchema.includes('bgeM3Embedding     Unsupported("vector(1024)")?')
  ) {
    nextSchema = nextSchema.replace(
      /(model Tag \{[\s\S]*?heroImageId\s+Int\?\s+@map\("heroImage"\))/,
      `$1
  textEmbedding3Small Unsupported("vector(1536)")?
  bgeM3Embedding     Unsupported("vector(1024)")?`
    )
  }

  if (!nextSchema.includes('titleEmbedding Unsupported("vector(1536)")?')) {
    nextSchema = nextSchema.replace(
      /(model Post \{[\s\S]*?title\s+String\s+@default\(""\))/,
      `$1
  titleEmbedding                     Unsupported("vector(1536)")?`
    )
  }

  if (
    !nextSchema.includes('model RssArticle {') ||
    !nextSchema.includes(
      'titleEmbedding                     Unsupported("vector(1536)")?'
    )
  ) {
    nextSchema = nextSchema.replace(
      /(model RssArticle \{[\s\S]*?title\s+String\s+@default\(""\))/,
      `$1
  titleEmbedding                     Unsupported("vector(1536)")?`
    )
  }

  return nextSchema
}

export default withAuth(
  config({
    db: {
      provider: appConfig.database.provider,
      url: appConfig.database.url,
      idField: {
        kind: 'autoincrement',
      },
      extendPrismaSchema: extendPrismaSchemaWithTagVectors,
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
            // PostgreSQL: WHERE rssTargets @> '["yahoo"]'::jsonb，最多 25 篇以降低 DB 負載
            const targetsJson = JSON.stringify([rssTarget])
            const RSS_TARGET_LIMIT = 25
            const rows = (await context.prisma.$queryRaw`
              SELECT id FROM "Post"
              WHERE "rssTargets"::jsonb @> ${targetsJson}::jsonb
              ORDER BY "publishTime" DESC
              LIMIT ${RSS_TARGET_LIMIT}
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
        similarPhotos: graphql.field({
          type: graphql.nonNull(graphql.list(base.object('Photo'))),
          args: {
            id: graphql.arg({
              type: graphql.nonNull(graphql.ID),
            }),
          },
          resolve: async (_source, { id }, context) => {
            return findSimilarPhotos(context, id as string)
          },
        }),
        exactPHashDuplicatePhotos: graphql.field({
          type: graphql.nonNull(graphql.list(base.object('Photo'))),
          args: {
            id: graphql.arg({
              type: graphql.nonNull(graphql.ID),
            }),
          },
          resolve: async (_source, { id }, context) => {
            return findExactPHashDuplicatePhotos(context, id as string)
          },
        }),
        nearPHashDuplicatePhotos: graphql.field({
          type: graphql.nonNull(graphql.list(base.object('Photo'))),
          args: {
            id: graphql.arg({
              type: graphql.nonNull(graphql.ID),
            }),
          },
          resolve: async (_source, { id }, context) => {
            return findNearPHashDuplicatePhotos(context, id as string)
          },
        }),
        similarRssArticlesByPostTitle: graphql.field({
          type: graphql.nonNull(graphql.list(base.object('RssArticle'))),
          args: {
            id: graphql.arg({
              type: graphql.nonNull(graphql.ID),
            }),
          },
          resolve: async (_source, { id }, context) => {
            if (!envVar.featureToggle.postVector) {
              return []
            }
            return findSimilarRssArticlesByPostTitle(context, id as string)
          },
        }),
      },
      mutation: {
        suggestPostTagsWithAi: graphql.field({
          type: graphql.nonNull(graphql.JSON),
          args: {
            postId: graphql.arg({
              type: graphql.nonNull(graphql.ID),
            }),
          },
          resolve: async (_source, { postId }, context) => {
            if (
              !envVar.featureToggle.postVector ||
              !envVar.featureToggle.tagVector
            ) {
              throw new Error('AI 標籤建議功能目前已停用')
            }
            return suggestAndApplyPostTags(context, postId as string)
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
