import React from 'react'
import type { CellComponent } from '@keystone-6/core/types'
import { CellContainer } from '@keystone-6/core/admin-ui/components'
import { controller, Field, CardValue } from '@keystone-6/core/fields/types/text/views'

export { controller, Field, CardValue }

export const Cell: CellComponent = ({ item, field }) => {
  const text = String(item[field.path] ?? '')
  return <CellContainer>
    <div style={{ maxWidth: 320, whiteSpace: 'normal', lineHeight: 1.5 }}>
      {text ? `${text.slice(0, 120)}${text.length > 120 ? '…' : ''}` : '來源未提供內容'}
    </div>
  </CellContainer>
}
Cell.supportsLinkTo = false
