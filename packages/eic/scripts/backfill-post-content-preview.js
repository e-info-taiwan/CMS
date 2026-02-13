/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client')

const CONTENT_PREVIEW_LENGTH = 100
const BATCH_SIZE = 200

function extractContentPreview(
  contentApiData,
  length = CONTENT_PREVIEW_LENGTH
) {
  if (!Array.isArray(contentApiData)) {
    return null
  }

  const texts = []

  for (const block of contentApiData) {
    if (!block || typeof block !== 'object') {
      continue
    }
    const contents = block.content
    if (!Array.isArray(contents)) {
      continue
    }
    for (const c of contents) {
      if (typeof c === 'string') {
        texts.push(c)
      }
    }
    if (texts.join('').length >= length) {
      break
    }
  }

  if (texts.length === 0) {
    return null
  }

  const fullText = texts.join('').replace(/<[^>]+>/g, '')
  if (fullText.length <= length) {
    return fullText
  }
  return fullText.slice(0, length)
}

async function main() {
  const prisma = new PrismaClient()
  let cursor = null
  let updated = 0
  let scanned = 0
  let batches = 0
  let hasMore = true

  try {
    while (hasMore) {
      const posts = await prisma.post.findMany({
        where: {
          OR: [{ contentPreview: null }, { contentPreview: '' }],
        },
        select: {
          id: true,
          contentApiData: true,
          contentPreview: true,
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })

      if (posts.length === 0) {
        hasMore = false
        break
      }

      batches += 1
      console.log(
        `[backfill] batch=${batches} fetched=${posts.length} lastId=${
          posts[posts.length - 1].id
        }`
      )

      for (const post of posts) {
        scanned += 1
        const preview = extractContentPreview(post.contentApiData)
        await prisma.post.update({
          where: { id: post.id },
          data: {
            contentPreview: preview ?? null,
          },
        })
        updated += 1
        if (updated % 50 === 0) {
          console.log(
            `[backfill] progress scanned=${scanned} updated=${updated}`
          )
        }
      }

      cursor = posts[posts.length - 1].id
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log(
    `[backfill] scanned=${scanned} updated=${updated} length=${CONTENT_PREVIEW_LENGTH}`
  )
}

main().catch((error) => {
  console.error('[backfill] failed:', error)
  process.exit(1)
})
