import type { KeystoneContext } from '@keystone-6/core/types'
import envVar from '../environment-variables'

const PHASH_DUPLICATE_RESULT_LIMIT = 10
const EXACT_PHASH_MIN_DISTANCE = 0
const EXACT_PHASH_MAX_DISTANCE = 2
const NEAR_PHASH_MIN_DISTANCE = 3
const NEAR_PHASH_MAX_DISTANCE = 8

async function findPHashDuplicatePhotos(
  context: KeystoneContext,
  photoIdInput: string | number,
  minDistance: number,
  maxDistance: number
) {
  if (!envVar.featureToggle.photoVector) {
    return []
  }

  const photoId = Number(photoIdInput)
  if (!Number.isFinite(photoId)) {
    return []
  }

  const rows = (await context.prisma.$queryRawUnsafe(
    `SELECT id
     FROM (
       SELECT target.id,
              bit_count(
                ('x' || target.phash)::bit(64) #
                ('x' || source.phash)::bit(64)
              ) AS distance
       FROM "Photo" target
       JOIN "Photo" source ON source.id = $1
       WHERE target.id != source.id
         AND source.phash ~ '^[0-9a-fA-F]{16}$'
         AND target.phash ~ '^[0-9a-fA-F]{16}$'
     ) matched
     WHERE distance BETWEEN $2 AND $3
     ORDER BY distance ASC, id ASC
     LIMIT $4`,
    photoId,
    minDistance,
    maxDistance,
    PHASH_DUPLICATE_RESULT_LIMIT
  )) as Array<{ id: number }>
  const ids = rows.map((row) => Number(row.id)).filter(Number.isFinite)
  if (ids.length === 0) {
    return []
  }

  const photos = await context.db.Photo.findMany({
    where: { id: { in: ids } },
  })
  const mapped = new Map(photos.map((photo) => [Number(photo.id), photo]))

  return ids.map((id) => mapped.get(id)).filter(Boolean)
}

export function findExactPHashDuplicatePhotos(
  context: KeystoneContext,
  photoIdInput: string | number
) {
  return findPHashDuplicatePhotos(
    context,
    photoIdInput,
    EXACT_PHASH_MIN_DISTANCE,
    EXACT_PHASH_MAX_DISTANCE
  )
}

export function findNearPHashDuplicatePhotos(
  context: KeystoneContext,
  photoIdInput: string | number
) {
  return findPHashDuplicatePhotos(
    context,
    photoIdInput,
    NEAR_PHASH_MIN_DISTANCE,
    NEAR_PHASH_MAX_DISTANCE
  )
}
