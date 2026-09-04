import { GraphQLError } from 'graphql'
import type { KeystoneContext } from '@keystone-6/core/types'
import envVar from '../environment-variables'
import { tagEmbeddingService } from './tag-embedding'

const ALLOWED_ROLES = new Set(['admin', 'moderator', 'editor'])

export async function checkTagNameSimilarity(
  context: KeystoneContext,
  name: string
) {
  const role = (context.session?.data as { role?: string } | undefined)?.role
  if (!role || !ALLOWED_ROLES.has(role)) {
    throw new GraphQLError('沒有檢查標籤相似度的權限', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new GraphQLError('請先輸入標籤名稱', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  const { similarityCheck } = envVar.tagEmbedding
  if (!envVar.featureToggle.tagVector || !similarityCheck.enabled) {
    return {
      enabled: false,
      distanceThreshold: similarityCheck.distanceThreshold,
      similarTags: [],
    }
  }

  const embedding = await tagEmbeddingService.generateVertexEmbedding(
    normalizedName
  )
  const candidates = await tagEmbeddingService.findSimilarTags({
    prisma: context.prisma,
    embedding,
  })

  return {
    enabled: true,
    distanceThreshold: similarityCheck.distanceThreshold,
    similarTags: candidates.filter(
      (tag) => tag.distance <= similarityCheck.distanceThreshold
    ),
  }
}
