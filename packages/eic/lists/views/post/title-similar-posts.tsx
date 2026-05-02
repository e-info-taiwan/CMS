import React from 'react'
import { useQuery, gql } from '@apollo/client'
import { FieldContainer, FieldLabel } from '@keystone-ui/fields'

const SIMILAR_POSTS_QUERY = gql`
  query GetSimilarRssArticlesByPostTitle($id: ID!) {
    similarRssArticlesByPostTitle(id: $id) {
      id
      title
      publishedAt
      source
      link
    }
  }
`

export function Field() {
  const isCreate =
    typeof window !== 'undefined' &&
    window.location.pathname.endsWith('/create')
  const itemId =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : null

  const { data, loading, error } = useQuery(SIMILAR_POSTS_QUERY, {
    variables: { id: itemId },
    skip: isCreate || !itemId,
  })

  if (isCreate || !itemId) {
    return null
  }

  if (loading) {
    return (
      <FieldContainer>
        <FieldLabel>外部 RSS 相似標題</FieldLabel>
        <div style={{ color: '#6b7280' }}>AI 比對中...</div>
      </FieldContainer>
    )
  }

  if (error) {
    return (
      <FieldContainer>
        <FieldLabel>外部 RSS 相似標題</FieldLabel>
        <div style={{ color: '#b91c1c' }}>查詢失敗：{error.message}</div>
      </FieldContainer>
    )
  }

  const posts = data?.similarRssArticlesByPostTitle || []
  if (posts.length === 0) {
    return (
      <FieldContainer>
        <FieldLabel>外部 RSS 相似標題</FieldLabel>
        <div style={{ color: '#6b7280' }}>目前沒有偵測到高相似標題。</div>
      </FieldContainer>
    )
  }

  return (
    <FieldContainer>
      <FieldLabel>外部 RSS 相似標題</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {posts.map(
          (post: {
            id: string
            title: string
            publishedAt?: string | null
            source?: string | null
            link?: string | null
          }) => (
            <a
              key={post.id}
              href={post.link || '#'}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: '8px 10px',
                color: '#111827',
                background: '#f9fafb',
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {post.title || `Post ${post.id}`}
              </div>
              <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                {post.source ? `${post.source} | ` : ''}
                RSS ID {post.id}
                {post.publishedAt
                  ? ` | ${new Date(post.publishedAt).toLocaleString()}`
                  : ''}
              </div>
            </a>
          )
        )}
      </div>
    </FieldContainer>
  )
}
