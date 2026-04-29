/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GoogleGenAI } = require('@google/genai')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client')

const BATCH_SIZE = Number(process.env.RSS_EMBEDDING_BACKFILL_BATCH_SIZE || 100)
const EMBEDDING_MODEL =
  process.env.TAG_VERTEX_EMBEDDING_MODEL || 'gemini-embedding-001'
const EMBEDDING_DIMENSION = Number(
  process.env.TAG_VERTEX_EMBEDDING_DIMENSION || 1536
)
const PROJECT =
  process.env.TAG_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
const LOCATION =
  process.env.TAG_VERTEX_LOCATION ||
  process.env.GOOGLE_CLOUD_LOCATION ||
  'us-central1'
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

/**
 * @param {number[]} values
 */
const toVectorLiteral = (values) => `[${values.join(',')}]`

function createGenAI() {
  if (!PROJECT) {
    throw new Error('TAG_VERTEX_PROJECT or GOOGLE_CLOUD_PROJECT is required')
  }
  return new GoogleGenAI({
    vertexai: true,
    project: PROJECT,
    location: LOCATION,
    apiVersion: 'v1',
  })
}

/**
 * @param {GoogleGenAI} ai
 * @param {string} term
 */
async function generateEmbedding(ai, term) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [term],
    config: {
      taskType: 'SEMANTIC_SIMILARITY',
      outputDimensionality: EMBEDDING_DIMENSION,
      autoTruncate: true,
    },
  })
  const embedding = response.embeddings?.[0]?.values
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error('Invalid Vertex embedding response')
  }
  return embedding
}

/**
 * @param {PrismaClient} prisma
 * @param {number} cursor
 * @returns {Promise<Array<{id: number, title: string}>>}
 */
async function fetchRssArticles(prisma, cursor) {
  const whereClause = FORCE ? '' : 'AND "titleEmbedding" IS NULL'
  return prisma.$queryRawUnsafe(
    `SELECT id, title
     FROM "RssArticle"
     WHERE id > $1
       AND title IS NOT NULL
       AND btrim(title) != ''
       ${whereClause}
     ORDER BY id ASC
     LIMIT $2`,
    cursor,
    BATCH_SIZE
  )
}

async function main() {
  const prisma = new PrismaClient()
  const ai = createGenAI()
  let cursor = 0
  let hasMore = true

  try {
    while (hasMore) {
      const rows = await fetchRssArticles(prisma, cursor)
      if (rows.length === 0) {
        hasMore = false
        break
      }
      for (const row of rows) {
        cursor = row.id
        const embedding = await generateEmbedding(ai, String(row.title).trim())
        if (!DRY_RUN) {
          await prisma.$executeRawUnsafe(
            `UPDATE "RssArticle"
             SET "titleEmbedding" = CAST($1 AS vector)
             WHERE id = $2`,
            toVectorLiteral(embedding),
            row.id
          )
        }
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('[rss-title-embedding-backfill] failed:', error)
  process.exit(1)
})
