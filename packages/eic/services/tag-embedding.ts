import { GoogleGenAI } from '@google/genai'
import envVar from '../environment-variables'

type TagEmbeddings = {
  textEmbedding3Small: number[] | null
}

export type SimilarTag = {
  id: number
  name: string
  brief: string | null
  distance: number
  similarity: number
}

type PrismaLike = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>
}

const isFiniteNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item))

export const toVectorLiteral = (values: number[] | null) => {
  if (!values) {
    return null
  }

  return `[${values.join(',')}]`
}

const normalizeDistance = (value: unknown) => {
  const distance = Number(value)
  return Number.isFinite(distance) ? distance : null
}

const getTagEmbeddingConfig = () => envVar.tagEmbedding
const EMBEDDING_CACHE_TTL_MS = 60_000

export class TagEmbeddingService {
  private ai: GoogleGenAI | null = null
  private embeddingCache = new Map<
    string,
    {
      expiresAt: number
      embedding: number[]
    }
  >()

  private initializeGenAI(): GoogleGenAI {
    const config = getTagEmbeddingConfig()
    if (!config.vertex.project) {
      throw new Error('TAG_VERTEX_PROJECT_NOT_CONFIGURED')
    }
    if (!config.vertex.location) {
      throw new Error('TAG_VERTEX_LOCATION_NOT_CONFIGURED')
    }

    if (!this.ai) {
      this.ai = new GoogleGenAI({
        vertexai: true,
        project: config.vertex.project,
        location: config.vertex.location,
        apiVersion: 'v1',
      })
    }

    return this.ai
  }

  async generateVertexEmbedding(term: string): Promise<number[]> {
    const config = getTagEmbeddingConfig()
    const cacheKey = [
      config.vertex.model,
      config.vertex.outputDimensionality,
      term,
    ].join(':')
    const cached = this.embeddingCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return [...cached.embedding]
    }

    const ai = this.initializeGenAI()

    const response = await ai.models.embedContent({
      model: config.vertex.model,
      contents: [term],
      config: {
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: config.vertex.outputDimensionality,
        autoTruncate: true,
      },
    })

    const embedding = response.embeddings?.[0]?.values
    if (!isFiniteNumberArray(embedding)) {
      throw new Error('TAG_VERTEX_EMBEDDING_RESPONSE_INVALID')
    }

    if (embedding.length !== config.vertex.outputDimensionality) {
      throw new Error(
        `TAG_VERTEX_EMBEDDING_DIMENSION_INVALID_${embedding.length}`
      )
    }

    this.embeddingCache.set(cacheKey, {
      expiresAt: Date.now() + EMBEDDING_CACHE_TTL_MS,
      embedding,
    })

    return embedding
  }

  async generate(term: string): Promise<TagEmbeddings> {
    const textEmbedding3Small = await this.generateVertexEmbedding(term)

    return {
      textEmbedding3Small,
    }
  }

  async findSimilarTags({
    prisma,
    embedding,
    excludeId,
  }: {
    prisma: PrismaLike
    embedding: number[]
    excludeId?: number
  }): Promise<SimilarTag[]> {
    const config = getTagEmbeddingConfig()
    const vector = toVectorLiteral(embedding)
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id,
              name,
              brief,
              "textEmbedding3Small" <=> CAST($1 AS vector) AS distance
       FROM "Tag"
       WHERE "textEmbedding3Small" IS NOT NULL
         AND ($2::integer IS NULL OR id != $2::integer)
       ORDER BY distance ASC
       LIMIT $3`,
      vector,
      Number.isFinite(excludeId) ? excludeId : null,
      config.similarityCheck.limit
    )) as Array<{
      id: number
      name: string
      brief: string | null
      distance: unknown
    }>

    return rows
      .map((row) => {
        const distance = normalizeDistance(row.distance)
        if (distance === null) {
          return null
        }
        return {
          id: row.id,
          name: row.name,
          brief: row.brief,
          distance,
          similarity: 1 - distance,
        }
      })
      .filter((row): row is SimilarTag => Boolean(row))
  }
}

export const tagEmbeddingService = new TagEmbeddingService()
