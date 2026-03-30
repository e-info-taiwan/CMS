/** @jsxRuntime classic */
/** @jsx jsx */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Stack, Text } from '@keystone-ui/core'
import {
  FieldContainer,
  FieldDescription,
  FieldLabel,
  TextArea,
} from '@keystone-ui/fields'
import { CellContainer } from '@keystone-6/core/admin-ui/components'
import {
  CardValueComponent,
  CellComponent,
  FieldControllerConfig,
  FieldProps,
} from '@keystone-6/core/types'

const LABEL_KEYS = ['name', 'title', 'label'] as const

function formatManualOrderLines(parsed: unknown): string {
  if (!Array.isArray(parsed)) {
    return ''
  }
  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || !('id' in entry)) {
        return ''
      }
      const o = entry as Record<string, unknown>
      let label = ''
      for (const k of LABEL_KEYS) {
        const v = o[k]
        if (typeof v === 'string' && v.length > 0) {
          label = v
          break
        }
      }
      return `${label}(${o.id})`
    })
    .filter(Boolean)
    .join('\n')
}

export const Field = ({
  field,
  value,
  onChange,
  autoFocus,
  forceValidation,
}: FieldProps<typeof controller>) => {
  if (onChange === undefined) {
    let display = ''
    try {
      display = formatManualOrderLines(JSON.parse(value || 'null'))
    } catch {
      display = value || ''
    }
    return (
      <FieldContainer>
        <FieldLabel>{field.label}</FieldLabel>
        <FieldDescription id={`${field.path}-description`}>
          {field.description}
        </FieldDescription>
        <Stack gap="small">
          <Text
            as="div"
            css={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              padding: '0.5rem 0',
            }}
          >
            {display || '—'}
          </Text>
        </Stack>
      </FieldContainer>
    )
  }

  return (
    <FieldContainer>
      <FieldLabel htmlFor={field.path}>{field.label}</FieldLabel>
      <FieldDescription id={`${field.path}-description`}>
        {field.description}
      </FieldDescription>
      <Stack gap="small">
        <TextArea
          id={field.path}
          aria-describedby={
            field.description === null ? undefined : `${field.path}-description`
          }
          autoFocus={autoFocus}
          css={{
            fontFamily: 'monospace',
          }}
          onChange={(event) => onChange?.(event.target.value)}
          value={value}
        />
        {forceValidation && (
          <Text color="red600" size="small">
            Invalid JSON
          </Text>
        )}
      </Stack>
    </FieldContainer>
  )
}

export const Cell: CellComponent<typeof controller> = ({ field, item }) => {
  const raw = item[field.path]
  const display =
    raw == null
      ? ''
      : formatManualOrderLines(raw) || (typeof raw === 'string' ? raw : '')
  return (
    <CellContainer>
      <span css={{ whiteSpace: 'pre-wrap' }}>{display || '—'}</span>
    </CellContainer>
  )
}

export const CardValue: CardValueComponent<typeof controller> = ({
  field,
  item,
}) => {
  const raw = item[field.path]
  const display = formatManualOrderLines(raw)
  return (
    <FieldContainer>
      <FieldLabel>{field.label}</FieldLabel>
      <Text as="div" css={{ whiteSpace: 'pre-wrap' }}>
        {display || '—'}
      </Text>
    </FieldContainer>
  )
}

export const controller = (
  config: FieldControllerConfig<{ defaultValue: unknown }>
) => {
  return {
    path: config.path,
    label: config.label,
    description: config.description,
    graphqlSelection: config.path,
    defaultValue:
      config.fieldMeta.defaultValue === null
        ? ''
        : JSON.stringify(config.fieldMeta.defaultValue, null, 2),
    validate: (value: string) => {
      if (!value) return true
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    },
    deserialize: (data: Record<string, unknown>) => {
      const value = data[config.path]
      if (value === null) return ''
      return JSON.stringify(value, null, 2)
    },
    serialize: (value: string) => {
      if (!value) {
        return { [config.path]: null }
      }
      try {
        return { [config.path]: JSON.parse(value) }
      } catch {
        return { [config.path]: undefined }
      }
    },
  }
}
