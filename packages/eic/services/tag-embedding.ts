import envVar from '../environment-variables'

type TagEmbeddings = {
  textEmbedding3Small: number[] | null
  bgeM3Embedding: number[] | null
}

type TagEmbeddingModel = 'text-embedding-3-small' | 'bge-m3'

type EmbeddingApiResponse = {
  term?: string
  model?: string
  dimensions?: number
  embedding?: unknown
}

const isFiniteNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item))

const getEmbeddingEndpoint = () => {
  const origin = envVar.dataServices.origin.trim()
  if (!origin) {
    throw new Error('DATA_SERVICES_ORIGIN_NOT_CONFIGURED')
  }

  return new URL(envVar.dataServices.tagEmbeddingPath, origin).toString()
}

const parseEmbeddingResponse = (
  payload: EmbeddingApiResponse
): number[] | null => {
  return isFiniteNumberArray(payload.embedding) ? payload.embedding : null
}

export class TagEmbeddingService {
  private async generateByModel(
    term: string,
    model: TagEmbeddingModel
  ): Promise<number[] | null> {
    const endpoint = getEmbeddingEndpoint()

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        term,
        model,
      }),
    })

    if (!response.ok) {
      throw new Error(
        `TAG_EMBEDDING_REQUEST_FAILED_${model}_${response.status}`
      )
    }

    const payload = (await response.json()) as EmbeddingApiResponse
    const embedding = parseEmbeddingResponse(payload)

    if (!embedding) {
      throw new Error(`TAG_EMBEDDING_RESPONSE_INVALID_${model}`)
    }

    return embedding
  }

  async generate(term: string): Promise<TagEmbeddings> {
    const [textEmbedding3Small, bgeM3Embedding] = await Promise.all([
      this.generateByModel(term, 'text-embedding-3-small'),
      this.generateByModel(term, 'bge-m3'),
    ])

    return {
      textEmbedding3Small,
      bgeM3Embedding,
    }
  }
}

export const tagEmbeddingService = new TagEmbeddingService()
