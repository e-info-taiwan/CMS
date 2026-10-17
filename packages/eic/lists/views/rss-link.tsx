import React from 'react'
import type { CellComponent, FieldProps } from '@keystone-6/core/types'
import { CellContainer } from '@keystone-6/core/admin-ui/components'
import { controller, Field as TextField, CardValue } from '@keystone-6/core/fields/types/text/views'
export { controller, CardValue }

const safeLink = (value: unknown) => {
  try {
    const url = new URL(String(value ?? ''))
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

export function Field(props: FieldProps<typeof controller>) {
  const href = safeLink(props.value.inner.kind === 'value' ? props.value.inner.value : '')
  return <>
    <TextField {...props} />
    {href && <p><a href={href} target="_blank" rel="noopener noreferrer">開啟原文</a></p>}
  </>
}

export const Cell: CellComponent = ({ item, field }) => {
  const href = safeLink(item[field.path])
  return <CellContainer>
    {href ? <a href={href} target="_blank" rel="noopener noreferrer">開啟原文</a> : '無有效連結'}
  </CellContainer>
}
Cell.supportsLinkTo = false
