/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-var-requires */
/* eslint-env jest, node */
// @ts-nocheck

const ORIGINAL_ENV = process.env

const mockGenerateContent = jest.fn()
const mockGenerateVertexEmbedding = jest.fn()
const mockFindSimilarTags = jest.fn()

beforeEach(() => {
  jest.resetModules()
  mockGenerateContent.mockReset()
  mockGenerateVertexEmbedding.mockReset()
  mockFindSimilarTags.mockReset()
  process.env = {
    ...ORIGINAL_ENV,
    FEATURE_TOGGLE_TAG_VECTOR: 'true',
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-test',
    TAG_SIMILARITY_DISTANCE_THRESHOLD: '0.08',
    TAG_SIMILARITY_CHECK_LIMIT: '5',
  }

  jest.doMock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
  }))

  jest.doMock('./tag-embedding', () => ({
    tagEmbeddingService: {
      generateVertexEmbedding: mockGenerateVertexEmbedding,
      findSimilarTags: mockFindSimilarTags,
    },
  }))
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

function createSession(role = 'editor') {
  return { data: { role }, itemId: 1 }
}

test('suggestPhotoTagsFromImageLabels translates labels and matches existing tags by exact Chinese name', async () => {
  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify({
      translations: [
        { label: 'Owl', translatedName: '貓頭鷹' },
        { label: 'Animal', translatedName: '動物' },
      ],
    }),
  })

  const findPhoto = jest.fn().mockResolvedValue({
    id: 12,
    imageLabelSuggestions: [
      { tag: 'owl', label: 'Owl', score: 0.91 },
      { tag: 'animal', label: 'Animal', score: 0.83 },
    ],
    tags: [],
  })
  const findTag = jest.fn().mockImplementation(({ where }) => {
    if (where.name === '貓頭鷹') {
      return Promise.resolve({ id: 7, name: '貓頭鷹' })
    }
    return Promise.resolve(null)
  })
  const context = {
    session: createSession(),
    prisma: {
      Photo: { findUnique: findPhoto },
      Tag: { findUnique: findTag },
    },
  }

  const {
    suggestPhotoTagsFromImageLabels,
  } = require('./photo-image-tag-suggestion')

  const result = await suggestPhotoTagsFromImageLabels(context, 12)

  expect(findPhoto).toHaveBeenCalledWith({
    where: { id: 12 },
    select: {
      id: true,
      imageLabelSuggestions: true,
      tags: { select: { id: true, name: true } },
    },
  })
  expect(mockGenerateContent).toHaveBeenCalledTimes(1)
  expect(mockGenerateVertexEmbedding).toHaveBeenCalledWith('動物')
  expect(result.candidates).toEqual([
    {
      sourceTag: 'owl',
      sourceLabel: 'Owl',
      translatedName: '貓頭鷹',
      score: 0.91,
      matchedTag: { id: '7', name: '貓頭鷹' },
      matchType: 'exact',
    },
    {
      sourceTag: 'animal',
      sourceLabel: 'Animal',
      translatedName: '動物',
      score: 0.83,
      matchedTag: null,
      matchType: 'none',
    },
  ])
  expect(result.matchedTags).toEqual([{ id: '7', name: '貓頭鷹' }])
})

test('suggestPhotoTagsFromImageLabels uses tag embedding fallback within the configured threshold', async () => {
  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify({
      translations: [{ label: 'Egret', translatedName: '白鷺' }],
    }),
  })
  mockGenerateVertexEmbedding.mockResolvedValue([0.1, 0.2])
  mockFindSimilarTags.mockResolvedValue([
    {
      id: 9,
      name: '小白鷺',
      brief: '',
      distance: 0.04,
      similarity: 0.96,
    },
  ])

  const context = {
    session: createSession(),
    prisma: {
      Photo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 12,
          imageLabelSuggestions: [{ tag: 'egret', label: 'Egret', score: 0.9 }],
          tags: [],
        }),
      },
      Tag: { findUnique: jest.fn().mockResolvedValue(null) },
    },
  }

  const {
    suggestPhotoTagsFromImageLabels,
  } = require('./photo-image-tag-suggestion')

  const result = await suggestPhotoTagsFromImageLabels(context, '12')

  expect(mockFindSimilarTags).toHaveBeenCalledWith({
    prisma: context.prisma,
    embedding: [0.1, 0.2],
  })
  expect(result.candidates).toEqual([
    {
      sourceTag: 'egret',
      sourceLabel: 'Egret',
      translatedName: '白鷺',
      score: 0.9,
      matchedTag: {
        id: '9',
        name: '小白鷺',
        distance: 0.04,
        similarity: 0.96,
      },
      matchType: 'embedding',
    },
  ])
})

test('applyPhotoImageLabelTags connects only matched tags that are not already related', async () => {
  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify({
      translations: [
        { label: 'Owl', translatedName: '貓頭鷹' },
        { label: 'Egret', translatedName: '白鷺' },
      ],
    }),
  })

  const updatePhoto = jest.fn().mockResolvedValue({
    id: 12,
    tags: [
      { id: 7, name: '貓頭鷹' },
      { id: 9, name: '白鷺' },
    ],
  })
  const context = {
    session: createSession(),
    prisma: {
      Photo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 12,
          imageLabelSuggestions: [
            { tag: 'owl', label: 'Owl', score: 0.91 },
            { tag: 'egret', label: 'Egret', score: 0.9 },
          ],
          tags: [{ id: 7, name: '貓頭鷹' }],
        }),
        update: updatePhoto,
      },
      Tag: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.name === '貓頭鷹') {
            return Promise.resolve({ id: 7, name: '貓頭鷹' })
          }
          if (where.name === '白鷺') {
            return Promise.resolve({ id: 9, name: '白鷺' })
          }
          return Promise.resolve(null)
        }),
      },
    },
  }

  const { applyPhotoImageLabelTags } = require('./photo-image-tag-suggestion')

  const result = await applyPhotoImageLabelTags(context, 12)

  expect(updatePhoto).toHaveBeenCalledWith({
    where: { id: 12 },
    data: {
      tags: {
        connect: [{ id: 9 }],
      },
    },
    select: {
      tags: { select: { id: true, name: true } },
    },
  })
  expect(result.appliedTags).toEqual([{ id: '9', name: '白鷺' }])
  expect(result.skippedExistingTags).toEqual([{ id: '7', name: '貓頭鷹' }])
})
