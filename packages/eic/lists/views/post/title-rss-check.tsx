import React, { useState } from 'react'
import { Button } from '@keystone-ui/button'
import { gql, useApolloClient } from '@keystone-6/core/admin-ui/apollo'
import type { FieldProps } from '@keystone-6/core/types'
import { CardValue, Cell, controller, Field as TextField } from '@keystone-6/core/fields/types/text/views'
export { CardValue, Cell, controller }

const CHECK = gql`query CheckRssTitle($title: String!) { checkRssTitleSimilarity(title: $title) }`
type Article = { id: string; title: string; source: string; link: string; publishedAt?: string; distance: number }
type Result = { enabled: boolean; articles: Article[] }

export function Field(props: FieldProps<typeof controller>) {
  const client = useApolloClient()
  const [loading, setLoading] = useState(false)
  const [checkedTitle, setCheckedTitle] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const title = props.value.inner.kind === 'value' ? props.value.inner.value.trim() : ''
  async function check() {
    setLoading(true)
    setError('')
    setResult(null)
    setCheckedTitle(title)
    try {
      const response = await client.query({ query: CHECK, variables: { title }, fetchPolicy: 'network-only' })
      setResult(response.data.checkRssTitleSimilarity)
    } catch (error) {
      setError(error instanceof Error ? error.message : '查詢失敗，請稍後重試')
    } finally { setLoading(false) }
  }
  const current = checkedTitle === title
  return <>
    <TextField {...props} />
    <Button onClick={check} isDisabled={!title || title.length > 1000 || loading} tone="active">
      {loading ? '比對中…' : '比對其他媒體標題'}
    </Button>
    {current && error && <p role="alert">{error}</p>}
    {current && result && !result.enabled && <p>外部標題比對尚未啟用。</p>}
    {current && result?.enabled && <div aria-live="polite">
      <p>比對範圍為近三個月已收集且完成向量處理的 RSS 標題；語意相近不代表重複報導。</p>
      {result.articles.length === 0 && <p>目前沒有找到高相似標題。</p>}
      {result.articles.map(article => <div key={article.id} style={{ margin: '8px 0' }}>
        <a href={/^https?:\/\//i.test(article.link) ? article.link : undefined} target="_blank" rel="noopener noreferrer">{article.title}</a>
        <div>{article.source}{article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString('zh-TW')}` : ''} · 相似度 {((1 - article.distance) * 100).toFixed(1)}%</div>
      </div>)}
    </div>}
  </>
}
