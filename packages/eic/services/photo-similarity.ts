import type { KeystoneContext } from '@keystone-6/core/types'
import envVar from '../environment-variables'

export async function findSimilarPhotos(
  context: KeystoneContext,
  photoIdInput: string | number
) {
  if (!envVar.featureToggle.photoVector) {
    return []
  }

  const photoId = Number(photoIdInput)
  if (!Number.isFinite(photoId)) {
    return []
  }

  const rows = (await context.prisma.$queryRawUnsafe(
    `SELECT target.id
     FROM "Photo" target
     JOIN "Photo" source ON source.id = $1
     WHERE target.id != source.id
       AND source."imageVector" IS NOT NULL
       AND target."imageVector" IS NOT NULL
       AND (target."imageVector" <=> source."imageVector") <= $2
     ORDER BY target."imageVector" <=> source."imageVector" ASC
     LIMIT $3`,
    photoId,
    envVar.photoSimilarity.maxDistance,
    envVar.photoSimilarity.resultLimit
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
