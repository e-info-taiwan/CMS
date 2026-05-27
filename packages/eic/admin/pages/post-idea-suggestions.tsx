import React, { useCallback, useMemo, useState } from 'react'
import { PageContainer } from '@keystone-6/core/admin-ui/components'
import { gql, useMutation } from '@keystone-6/core/admin-ui/apollo'
import { Button } from '@keystone-ui/button'
import { FieldContainer, FieldLabel, TextArea } from '@keystone-ui/fields'
import { useToasts } from '@keystone-ui/toast'

const SUGGEST_POST_IDEA = gql`
  mutation SuggestPostIdea($input: String!) {
    suggestPostIdea(input: $input)
  }
`

type StructuredIdea = {
  normalizedTitle?: string
  summary?: string
  keywords?: string[]
  entities?: string[]
  locations?: string[]
  timeScope?: string
  sectionHints?: string[]
  tagHints?: string[]
}

type SuggestionResult = {
  post: {
    id: string
    title: string
    subtitle?: string | null
    state?: string | null
    publishTime?: string
    contentPreview?: string | null
    section?: { name: string } | null
    categories?: { name: string }[]
    tags?: { name: string }[]
  }
  sourcePreview?: string
  distance: number
  similarity: number
  score: number
  matchedKeywords?: string[]
  matchedHints?: string[]
}

type SuggestionPayload = {
  structured?: StructuredIdea
  queryText?: string
  results?: SuggestionResult[]
}

const tagList = (items?: string[]) =>
  items && items.length > 0 ? items.join('、') : '無'

const formatPercent = (value: number) => `${Math.round(value * 1000) / 10}%`

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function PostIdeaSuggestionsPage() {
  const toasts = useToasts()
  const [input, setInput] = useState('')
  const [payload, setPayload] = useState<SuggestionPayload | null>(null)
  const [mutate, { loading }] = useMutation(SUGGEST_POST_IDEA)

  const canSubmit = useMemo(() => input.trim().length >= 4, [input])

  const run = useCallback(async () => {
    if (!canSubmit) return

    try {
      const { data } = await mutate({
        variables: { input: input.trim() },
      })
      const nextPayload = data?.suggestPostIdea as SuggestionPayload | undefined
      setPayload(nextPayload ?? null)
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : '請稍後再試'
      toasts.addToast({
        title: '報題建議失敗',
        message,
        tone: 'negative',
      })
    }
  }, [canSubmit, input, mutate, toasts])

  const structured = payload?.structured
  const results = payload?.results ?? []

  return (
    <PageContainer header={<h1>報題建議</h1>} title="報題建議">
      <div style={{ maxWidth: 1120, paddingBottom: 48 }}>
        <FieldContainer>
          <FieldLabel>目前發想</FieldLabel>
          <TextArea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="輸入尚未成形的題目、線索、關鍵字、想追的衝突或問題"
            style={{ minHeight: 180 }}
          />
        </FieldContainer>

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <Button
            tone="active"
            onClick={run}
            isDisabled={!canSubmit || loading}
          >
            {loading ? '整理與比對中...' : '報題建議'}
          </Button>
          <Button
            onClick={() => {
              setInput('')
              setPayload(null)
            }}
            isDisabled={loading && !input}
          >
            清除
          </Button>
        </div>

        {structured && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 20, margin: '0 0 12px' }}>提案結構</h2>
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 20,
                background: '#fff',
              }}
            >
              <h3 style={{ fontSize: 18, margin: '0 0 8px' }}>
                {structured.normalizedTitle}
              </h3>
              <p style={{ color: '#374151', margin: '0 0 14px' }}>
                {structured.summary}
              </p>
              <dl
                style={{
                  display: 'grid',
                  gap: 10,
                  gridTemplateColumns: '120px minmax(0, 1fr)',
                  margin: 0,
                }}
              >
                <dt>關鍵詞</dt>
                <dd style={{ margin: 0 }}>{tagList(structured.keywords)}</dd>
                <dt>實體</dt>
                <dd style={{ margin: 0 }}>{tagList(structured.entities)}</dd>
                <dt>地點</dt>
                <dd style={{ margin: 0 }}>{tagList(structured.locations)}</dd>
                <dt>時間範圍</dt>
                <dd style={{ margin: 0 }}>{structured.timeScope || '無'}</dd>
                <dt>分類提示</dt>
                <dd style={{ margin: 0 }}>
                  {tagList(structured.sectionHints)}
                </dd>
                <dt>標籤提示</dt>
                <dd style={{ margin: 0 }}>{tagList(structured.tagHints)}</dd>
              </dl>
            </div>
          </section>
        )}

        {payload && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 20, margin: '0 0 12px' }}>相似內容</h2>
            {results.length === 0 ? (
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 20,
                  background: '#fff',
                }}
              >
                沒有找到足夠接近的既有文章。
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {results.map((result) => {
                  const post = result.post
                  const categories = post.categories?.map((item) => item.name)
                  const tags = post.tags?.map((item) => item.name)
                  return (
                    <article
                      key={post.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: 18,
                        background: '#fff',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <h3 style={{ fontSize: 18, margin: 0 }}>
                          <a href={`/posts/${post.id}`}>{post.title}</a>
                        </h3>
                        <span
                          style={{ color: '#4b5563', whiteSpace: 'nowrap' }}
                        >
                          {formatPercent(result.similarity)}
                        </span>
                      </div>
                      <div
                        style={{
                          color: '#6b7280',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        {post.state && <span>{post.state}</span>}
                        {post.publishTime && (
                          <span>{formatDate(post.publishTime)}</span>
                        )}
                        {post.section?.name && <span>{post.section.name}</span>}
                      </div>
                      {(post.contentPreview || result.sourcePreview) && (
                        <p style={{ color: '#374151', margin: '12px 0 0' }}>
                          {post.contentPreview || result.sourcePreview}
                        </p>
                      )}
                      <div
                        style={{
                          color: '#6b7280',
                          display: 'grid',
                          gap: 6,
                          marginTop: 12,
                        }}
                      >
                        <div>分類：{tagList(categories)}</div>
                        <div>標籤：{tagList(tags)}</div>
                        <div>
                          命中：{tagList(result.matchedKeywords)} /{' '}
                          {tagList(result.matchedHints)}
                        </div>
                        <div>
                          distance {Math.round(result.distance * 1000) / 1000}
                          ，score {Math.round(result.score * 1000) / 1000}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </PageContainer>
  )
}
