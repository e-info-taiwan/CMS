import type { KeystoneContext } from '@keystone-6/core/types'
import { GraphQLError } from 'graphql'
import { toVectorLiteral } from './tag-embedding'
import envVar from '../environment-variables'

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
  const postId = Number(postIdInput)
  if (!Number.isFinite(postId)) {
    throw new GraphQLError('文章 id 無效', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  await getPostTitleOrThrow(context, postId)

  const sourceRow = (await context.prisma.$queryRawUnsafe(
    `SELECT "titleEmbedding"
     FROM "Post"
     WHERE id = $1
     LIMIT 1`,
    postId
  )) as Array<{ titleEmbedding: number[] | null }>
  const sourceEmbedding = sourceRow[0]?.titleEmbedding
  if (!Array.isArray(sourceEmbedding) || sourceEmbedding.length === 0) {
    return []
  }

  const rows = (await context.prisma.$queryRawUnsafe(
    `SELECT id,
            ("titleEmbedding" <=> CAST($1 AS vector)) AS distance
     FROM "RssArticle"
     WHERE "titleEmbedding" IS NOT NULL
       AND ("titleEmbedding" <=> CAST($1 AS vector)) <= $2
     ORDER BY distance ASC
     LIMIT $3`,
    toVectorLiteral(sourceEmbedding),
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
