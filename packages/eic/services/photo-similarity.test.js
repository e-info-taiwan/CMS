/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-var-requires */
/* eslint-env jest, node */
// @ts-nocheck

const ORIGINAL_ENV = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...ORIGINAL_ENV,
    FEATURE_TOGGLE_PHOTO_VECTOR: 'true',
    PHOTO_SIMILARITY_MAX_DISTANCE: '0.22',
    PHOTO_SIMILARITY_RESULT_LIMIT: '4',
  }
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

test('findSimilarPhotos filters by max vector distance and preserves pgvector order', async () => {
  const { findSimilarPhotos } = require('./photo-similarity')
  const queryRawUnsafe = jest.fn().mockResolvedValue([{ id: 30 }, { id: 10 }])
  const photo10 = { id: '10', name: 'later in db result' }
  const photo30 = { id: '30', name: 'first by vector distance' }
  const findMany = jest.fn().mockResolvedValue([photo10, photo30])
  const context = {
    prisma: { $queryRawUnsafe: queryRawUnsafe },
    db: { Photo: { findMany } },
  }

  const result = await findSimilarPhotos(context, '123')

  expect(queryRawUnsafe).toHaveBeenCalledTimes(1)
  const [query, sourceId, maxDistance, resultLimit] =
    queryRawUnsafe.mock.calls[0]
  expect(query).toContain(
    '(target."imageVector" <=> source."imageVector") <= $2'
  )
  expect(query).toContain(
    'ORDER BY target."imageVector" <=> source."imageVector" ASC'
  )
  expect(query).toContain('LIMIT $3')
  expect(sourceId).toBe(123)
  expect(maxDistance).toBe(0.22)
  expect(resultLimit).toBe(4)
  expect(findMany).toHaveBeenCalledWith({ where: { id: { in: [30, 10] } } })
  expect(result).toEqual([photo30, photo10])
})

test('findSimilarPhotos returns no results when the photo vector feature is disabled', async () => {
  process.env.FEATURE_TOGGLE_PHOTO_VECTOR = 'false'
  const { findSimilarPhotos } = require('./photo-similarity')
  const queryRawUnsafe = jest.fn()
  const findMany = jest.fn()
  const context = {
    prisma: { $queryRawUnsafe: queryRawUnsafe },
    db: { Photo: { findMany } },
  }

  await expect(findSimilarPhotos(context, '123')).resolves.toEqual([])
  expect(queryRawUnsafe).not.toHaveBeenCalled()
  expect(findMany).not.toHaveBeenCalled()
})

test('findSimilarPhotos skips the Photo lookup when no rows pass the threshold', async () => {
  const { findSimilarPhotos } = require('./photo-similarity')
  const queryRawUnsafe = jest.fn().mockResolvedValue([])
  const findMany = jest.fn()
  const context = {
    prisma: { $queryRawUnsafe: queryRawUnsafe },
    db: { Photo: { findMany } },
  }

  await expect(findSimilarPhotos(context, '123')).resolves.toEqual([])
  expect(findMany).not.toHaveBeenCalled()
})
