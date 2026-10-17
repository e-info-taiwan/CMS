import type { KeystoneContext } from '@keystone-6/core/types'
import { GraphQLError } from 'graphql'
import envVar from '../environment-variables'
import { tagEmbeddingService, toVectorLiteral } from './tag-embedding'

const normalizeTitle = (title: string) => title.replace(/\s+/g, ' ').trim()

async function getPostTitleOrThrow(context: KeystoneContext, postId: number) {
  const post = await context.prisma.Post.findUnique({
    where: { id: postId },
    select: { id: true, title: true },
  })

  if (!post) {
    throw new GraphQLError('找不到文章', { extensions: { code: 'NOT_FOUND' } })
  }

  const title = normalizeTitle(post.title ?? '')
  if (!title) {
    throw new GraphQLError('文章標題為空，無法比對相似文章', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  return title
}

export async function findSimilarRssArticlesByPostTitle(
  context: KeystoneContext,
  postIdInput: string | number
) {
  if (!envVar.featureToggle.postVector) {
    return []
  }

  const postId = Number(postIdInput)
  if (!Number.isFinite(postId)) {
    throw new GraphQLError('文章 id 無效', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  await getPostTitleOrThrow(context, postId)

  const rows = (await context.prisma.$queryRawUnsafe(
    `SELECT rss.id
     FROM "RssArticle" rss
     JOIN "Post" post ON post.id = $1
     WHERE post."titleEmbedding" IS NOT NULL
       AND rss."titleEmbedding" IS NOT NULL
       AND COALESCE(rss."publishedAt", rss."fetchedAt") >= ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei' - INTERVAL '3 months') AT TIME ZONE 'Asia/Taipei' AT TIME ZONE 'UTC')
       AND (rss."titleEmbedding" <=> post."titleEmbedding") <= $2
     ORDER BY rss."titleEmbedding" <=> post."titleEmbedding" ASC
     LIMIT $3`,
    postId,
    envVar.postTitleSimilarity.maxDistance,
    envVar.postTitleSimilarity.resultLimit
  )) as Array<{ id: number }>
  const ids = rows.map((row) => Number(row.id)).filter(Number.isFinite)
  if (ids.length === 0) {
    return []
  }

  const rssArticles = await context.db.RssArticle.findMany({
    where: { id: { in: ids } },
  })
  const mapped = new Map(
    rssArticles.map((article) => [Number(article.id), article])
  )

  return ids.map((id) => mapped.get(id)).filter(Boolean)
}


export async function checkRssTitleSimilarity(context: KeystoneContext, title: string) {
  const role = context.session?.data?.role
  if (!['admin', 'moderator', 'editor'].includes(role)) {
    throw new GraphQLError('沒有比對外部標題的權限', { extensions: { code: 'FORBIDDEN' } })
  }
  const normalized = title.replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length > 1000) {
    throw new GraphQLError('請輸入 1–1000 字的標題', { extensions: { code: 'BAD_USER_INPUT' } })
  }
  if (!envVar.featureToggle.postVector) return { enabled: false, articles: [] }
  const embedding = await tagEmbeddingService.generateVertexEmbedding(normalized)
  const rows = await context.prisma.$queryRawUnsafe(
    `SELECT id, "titleEmbedding" <=> CAST($1 AS vector) AS distance
     FROM "RssArticle" WHERE "titleEmbedding" IS NOT NULL
       AND COALESCE("publishedAt", "fetchedAt") >= ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei' - INTERVAL '3 months') AT TIME ZONE 'Asia/Taipei' AT TIME ZONE 'UTC')
       AND ("titleEmbedding" <=> CAST($1 AS vector)) <= $2
     ORDER BY "titleEmbedding" <=> CAST($1 AS vector) ASC, id ASC LIMIT $3`,
    toVectorLiteral(embedding), envVar.postTitleSimilarity.maxDistance,
    envVar.postTitleSimilarity.resultLimit
  ) as Array<{ id: number; distance: number }>
  const articles = await context.db.RssArticle.findMany({
    where: { id: { in: rows.map(row => String(row.id)) } },
  })
  const mapped = new Map(articles.map(article => [String(article.id), article]))
  return { enabled: true, articles: rows.flatMap(row => {
    const article = mapped.get(String(row.id))
    return article ? [{ id: article.id, title: article.title, source: article.source,
      link: article.link, publishedAt: article.publishedAt, distance: row.distance }] : []
  }) }
}
