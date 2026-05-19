/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-var-requires */
/* eslint-env jest, node */
// @ts-nocheck

const ORIGINAL_ENV = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...ORIGINAL_ENV,
    FEATURE_TOGGLE_PHOTO_VECTOR: 'true',
  }
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

test('findExactPHashDuplicatePhotos returns only strict pHash matches', async () => {
  const { findExactPHashDuplicatePhotos } = require('./photo-phash-duplicates')
  const queryRawUnsafe = jest.fn().mockResolvedValue([{ id: 30 }, { id: 10 }])
  const photo10 = { id: '10', name: 'later db row' }
  const photo30 = { id: '30', name: 'closest phash row' }
  const findMany = jest.fn().mockResolvedValue([photo10, photo30])
  const context = {
    prisma: { $queryRawUnsafe: queryRawUnsafe },
    db: { Photo: { findMany } },
  }

  const result = await findExactPHashDuplicatePhotos(context, '123')

  expect(queryRawUnsafe).toHaveBeenCalledTimes(1)
  const [query, sourceId, minDistance, maxDistance, resultLimit] =
    queryRawUnsafe.mock.calls[0]
  expect(query).toContain('source.phash ~')
  expect(query).toContain('target.phash ~')
  expect(query).toContain('distance BETWEEN $2 AND $3')
  expect(query).toContain('ORDER BY distance ASC, id ASC')
  expect(sourceId).toBe(123)
  expect(minDistance).toBe(0)
  expect(maxDistance).toBe(2)
  expect(resultLimit).toBe(10)
  expect(findMany).toHaveBeenCalledWith({ where: { id: { in: [30, 10] } } })
  expect(result).toEqual([photo30, photo10])
})

test('findNearPHashDuplicatePhotos excludes exact matches and caps near matches at distance 8', async () => {
  const { findNearPHashDuplicatePhotos } = require('./photo-phash-duplicates')
  const queryRawUnsafe = jest.fn().mockResolvedValue([{ id: 88 }])
  const photo88 = { id: '88', name: 'near duplicate' }
  const findMany = jest.fn().mockResolvedValue([photo88])
  const context = {
    prisma: { $queryRawUnsafe: queryRawUnsafe },
    db: { Photo: { findMany } },
  }

  const result = await findNearPHashDuplicatePhotos(context, 123)

  const [, , minDistance, maxDistance, resultLimit] =
    queryRawUnsafe.mock.calls[0]
  expect(minDistance).toBe(3)
  expect(maxDistance).toBe(8)
  expect(resultLimit).toBe(10)
  expect(result).toEqual([photo88])
})

test('pHash duplicate queries return no results when photo vector feature is disabled', async () => {
  process.env.FEATURE_TOGGLE_PHOTO_VECTOR = 'false'
  const {
    findExactPHashDuplicatePhotos,
    findNearPHashDuplicatePhotos,
  } = require('./photo-phash-duplicates')
  const queryRawUnsafe = jest.fn()
  const findMany = jest.fn()
  const context = {
    prisma: { $queryRawUnsafe: queryRawUnsafe },
    db: { Photo: { findMany } },
  }

  await expect(findExactPHashDuplicatePhotos(context, '123')).resolves.toEqual(
    []
  )
  await expect(findNearPHashDuplicatePhotos(context, '123')).resolves.toEqual(
    []
  )
  expect(queryRawUnsafe).not.toHaveBeenCalled()
  expect(findMany).not.toHaveBeenCalled()
})
