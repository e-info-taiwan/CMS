/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-var-requires */
/* eslint-env jest, node */
// @ts-nocheck

test('normalizePhotoImageLabelSuggestions keeps valid unique suggestions ordered by score', () => {
  const {
    normalizePhotoImageLabelSuggestions,
  } = require('./photo-image-label-suggestions')

  const result = normalizePhotoImageLabelSuggestions(
    [
      {
        tag: ' owl ',
        label: 'Owl',
        score: 0.91,
        topicality: 0.8,
        source: 'google-cloud-vision',
      },
      {
        tag: 'owl',
        label: 'owl duplicate',
        score: 0.95,
        topicality: 0.7,
        source: 'google-cloud-vision',
      },
      {
        tag: 'Animal',
        label: 'Animal',
        score: 0.92,
        source: 'google-cloud-vision',
      },
      { tag: '', label: 'blank tag', score: 0.99 },
      { tag: 'low-score', label: 'Low Score', score: 'not-a-number' },
      null,
    ],
    10
  )

  expect(result).toEqual([
    {
      tag: 'owl',
      label: 'owl duplicate',
      score: 0.95,
      topicality: 0.7,
      source: 'google-cloud-vision',
    },
    {
      tag: 'animal',
      label: 'Animal',
      score: 0.92,
      source: 'google-cloud-vision',
    },
  ])
})
