/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GoogleGenAI } = require('@google/genai')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client')

const BATCH_SIZE = Number(process.env.TAG_EMBEDDING_BACKFILL_BATCH_SIZE || 100)
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
  if (!LOCATION) {
    throw new Error('TAG_VERTEX_LOCATION or GOOGLE_CLOUD_LOCATION is required')
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
  if (
    !Array.isArray(embedding) ||
    embedding.length !== EMBEDDING_DIMENSION ||
    !embedding.every(
      (item) => typeof item === 'number' && Number.isFinite(item)
    )
  ) {
    throw new Error('Invalid Vertex embedding response')
  }
  return embedding
}

/**
 * @param {PrismaClient} prisma
 * @param {number} cursor
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
async function fetchTags(prisma, cursor) {
  const whereClause = FORCE ? '' : 'AND "textEmbedding3Small" IS NULL'
  return prisma.$queryRawUnsafe(
    `SELECT id, name
     FROM "Tag"
     WHERE id > $1
       AND name IS NOT NULL
       AND btrim(name) != ''
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
  let scanned = 0
  let updated = 0
  let failed = 0
  let hasMore = true

  try {
    while (hasMore) {
      const tags = await fetchTags(prisma, cursor)
      if (tags.length === 0) {
        hasMore = false
        break
      }

      for (const tag of tags) {
        cursor = tag.id
        scanned += 1
        try {
          const embedding = await generateEmbedding(ai, tag.name.trim())
          if (!DRY_RUN) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Tag"
               SET "textEmbedding3Small" = CAST($1 AS vector)
               WHERE id = $2`,
              toVectorLiteral(embedding),
              tag.id
            )
          }
          updated += 1
          console.log(
            `[tag-embedding-backfill] ${DRY_RUN ? 'checked' : 'updated'} id=${
              tag.id
            } name=${tag.name}`
          )
        } catch (error) {
          failed += 1
          console.error(
            `[tag-embedding-backfill] failed id=${tag.id} name=${tag.name}`,
            error
          )
        }
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log(
    `[tag-embedding-backfill] scanned=${scanned} ${
      DRY_RUN ? 'wouldUpdate' : 'updated'
    }=${updated} failed=${failed} model=${EMBEDDING_MODEL} dimension=${EMBEDDING_DIMENSION}`
  )
}

main().catch((error) => {
  console.error('[tag-embedding-backfill] failed:', error)
  process.exit(1)
})
