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
  distance: number | null
  similarity: number | null
  score: number
  relevanceTier?: 'strong' | 'weak'
  lexicalMatch?: boolean
  matchedEntities?: string[]
  matchedKeywords?: string[]
  matchedHints?: string[]
}

type AnalysisSource = {
  id: string
  title: string
}

type AnalysisPoint = {
  text: string
  sources?: AnalysisSource[]
}

type CoverageAnalysis = {
  overallAssessment?: string
  coveredAngles?: AnalysisPoint[]
  keyActors?: AnalysisPoint[]
  underexploredAngles?: string[]
}

type SuggestionPayload = {
  structured?: StructuredIdea
  queryText?: string
  weakMatch?: boolean
  results?: SuggestionResult[]
  analysis?: CoverageAnalysis | null
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

const formatDateShort = (value?: string) => {
  if (!value) return '未排程'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未排程'
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const getPublishTimestamp = (value?: string) => {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function SourceLinks({ sources }: { sources?: AnalysisSource[] }) {
  if (!sources || sources.length === 0) {
    return null
  }
  return (
    <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
      來源：
      {sources.map((source, index) => (
        <span key={source.id}>
          {index > 0 && '、'}
          <a href={`/posts/${source.id}`}>〈{source.title}〉</a>
        </span>
      ))}
    </div>
  )
}

function AnalysisPointCard({
  title,
  points,
}: {
  title: string
  points?: AnalysisPoint[]
}) {
  const list = points ?? []
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 18,
        background: '#fff',
      }}
    >
      <h3 style={{ fontSize: 16, margin: '0 0 10px' }}>{title}</h3>
      {list.length === 0 ? (
        <p style={{ color: '#9ca3af', margin: 0 }}>無</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, color: '#374151' }}>
          {list.map((point, index) => (
            <li key={index} style={{ marginBottom: 12, lineHeight: 1.5 }}>
              <div>{point.text}</div>
              <SourceLinks sources={point.sources} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AnalysisStringCard({
  title,
  items,
  accent,
}: {
  title: string
  items?: string[]
  accent?: boolean
}) {
  const list = items ?? []
  return (
    <div
      style={{
        border: `1px solid ${accent ? '#bfdbfe' : '#e5e7eb'}`,
        borderRadius: 8,
        padding: 18,
        background: accent ? '#eff6ff' : '#fff',
      }}
    >
      <h3 style={{ fontSize: 16, margin: '0 0 10px' }}>{title}</h3>
      {list.length === 0 ? (
        <p style={{ color: '#9ca3af', margin: 0 }}>無</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, color: '#374151' }}>
          {list.map((item, index) => (
            <li key={index} style={{ marginBottom: 6, lineHeight: 1.5 }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ResultCard({ result }: { result: SuggestionResult }) {
  const post = result.post
  const categories = post.categories?.map((item) => item.name)
  const tags = post.tags?.map((item) => item.name)
  return (
    <article
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
        <span style={{ color: '#4b5563', whiteSpace: 'nowrap' }}>
          {result.similarity != null
            ? formatPercent(result.similarity)
            : '實體命中'}
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
        {post.publishTime && <span>{formatDate(post.publishTime)}</span>}
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
        {result.lexicalMatch && (result.matchedEntities?.length ?? 0) > 0 && (
          <div>實體命中：{tagList(result.matchedEntities)}</div>
        )}
        <div>
          命中：{tagList(result.matchedKeywords)} /{' '}
          {tagList(result.matchedHints)}
        </div>
        <div>
          {result.distance != null
            ? `distance ${Math.round(result.distance * 1000) / 1000}`
            : 'distance —（字面命中，無向量距離）'}
          ，score {Math.round(result.score * 1000) / 1000}
        </div>
      </div>
    </article>
  )
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

  const results = payload?.results ?? []
  const weakMatch = Boolean(payload?.weakMatch)
  const analysis = payload?.analysis ?? null
  const byPublishDesc = (a: SuggestionResult, b: SuggestionResult) =>
    getPublishTimestamp(b.post.publishTime) -
    getPublishTimestamp(a.post.publishTime)
  const strongResults = useMemo(
    () => results.filter((r) => r.relevanceTier !== 'weak').sort(byPublishDesc),
    [results]
  )
  const weakResults = useMemo(
    () => results.filter((r) => r.relevanceTier === 'weak').sort(byPublishDesc),
    [results]
  )
  const hasAnalysis = Boolean(
    analysis &&
      (Boolean(analysis.overallAssessment) ||
        (analysis.coveredAngles?.length ?? 0) > 0 ||
        (analysis.keyActors?.length ?? 0) > 0 ||
        (analysis.underexploredAngles?.length ?? 0) > 0)
  )

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

        {payload && (
          <section style={{ marginTop: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                margin: '0 0 12px',
              }}
            >
              <h2 style={{ fontSize: 20, margin: 0 }}>相似內容</h2>
              {results.length > 0 && (
                <span style={{ color: '#6b7280', fontSize: 14 }}>
                  較相關 {strongResults.length} 篇、較不相關{' '}
                  {weakResults.length} 篇
                </span>
              )}
            </div>

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
              <>
                {weakMatch && (
                  <div
                    style={{
                      border: '1px solid #fde68a',
                      background: '#fffbeb',
                      color: '#92400e',
                      borderRadius: 8,
                      padding: '10px 14px',
                      marginBottom: 16,
                      fontSize: 14,
                    }}
                  >
                    沒有高度相關的既有文章，下面「較不相關」是語意上最接近的幾篇，僅供參考。
                  </div>
                )}

                {strongResults.length > 0 && (
                  <>
                    <h3
                      style={{
                        fontSize: 16,
                        margin: '8px 0 12px',
                        color: '#374151',
                      }}
                    >
                      時間軸（較相關，依發布時間）
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gap: 14,
                        paddingLeft: 24,
                        borderLeft: '2px solid #e5e7eb',
                        marginBottom: 28,
                      }}
                    >
                      {strongResults.map((result) => {
                        const post = result.post
                        return (
                          <div key={post.id} style={{ position: 'relative' }}>
                            <span
                              style={{
                                position: 'absolute',
                                left: -31,
                                top: 4,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: '#2563eb',
                                border: '2px solid #fff',
                                boxShadow: '0 0 0 1px #e5e7eb',
                              }}
                            />
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: 10,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  color: '#6b7280',
                                  fontSize: 13,
                                  minWidth: 96,
                                }}
                              >
                                {formatDateShort(post.publishTime)}
                              </span>
                              <a
                                href={`/posts/${post.id}`}
                                style={{ fontSize: 16 }}
                              >
                                {post.title}
                              </a>
                              <span style={{ color: '#9ca3af', fontSize: 13 }}>
                                {result.similarity != null
                                  ? formatPercent(result.similarity)
                                  : '實體命中'}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <h3
                      style={{
                        fontSize: 16,
                        margin: '0 0 12px',
                        color: '#374151',
                      }}
                    >
                      較相關（完整清單）
                    </h3>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
                      {strongResults.map((result) => (
                        <ResultCard key={result.post.id} result={result} />
                      ))}
                    </div>
                  </>
                )}

                {weakResults.length > 0 && (
                  <details open={strongResults.length === 0}>
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontSize: 16,
                        color: '#374151',
                        marginBottom: 12,
                      }}
                    >
                      較不相關（{weakResults.length} 篇，相關度較低）
                    </summary>
                    <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                      {weakResults.map((result) => (
                        <ResultCard key={result.post.id} result={result} />
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </section>
        )}

        {payload && results.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 20, margin: '0 0 12px' }}>完整分析</h2>
            {hasAnalysis && analysis ? (
              <div style={{ display: 'grid', gap: 16 }}>
                {analysis.overallAssessment && (
                  <div
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 18,
                      background: '#fff',
                      color: '#1f2937',
                      lineHeight: 1.6,
                    }}
                  >
                    {analysis.overallAssessment}
                  </div>
                )}
                <div
                  style={{
                    display: 'grid',
                    gap: 16,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  }}
                >
                  <AnalysisPointCard
                    title="過去報導的面向"
                    points={analysis.coveredAngles}
                  />
                  <AnalysisPointCard
                    title="涉入的機構與重要人物"
                    points={analysis.keyActors}
                  />
                  <AnalysisStringCard
                    title="尚未被充分探討的面向"
                    items={analysis.underexploredAngles}
                    accent
                  />
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 20,
                  background: '#fff',
                  color: '#6b7280',
                }}
              >
                AI 分析這次無法產生，可再按一次「報題建議」重試。
              </div>
            )}
          </section>
        )}
      </div>
    </PageContainer>
  )
}
