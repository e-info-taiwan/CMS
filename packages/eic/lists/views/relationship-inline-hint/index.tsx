import { Fragment, useState } from 'react'
import { Box, Stack, useTheme } from '@keystone-ui/core'
import { FieldContainer } from '@keystone-ui/fields'
import { Button } from '@keystone-ui/button'
import { DrawerController } from '@keystone-ui/modals'
import type { FieldProps, ListMeta } from '@keystone-6/core/types'
import {
  Field as BaseField,
  Cell,
  CardValue,
  controller,
} from '@keystone-6/core/fields/types/relationship/views'
import { RelationshipSelect } from '@keystone-6/core/fields/types/relationship/views/RelationshipSelect'
import { Link } from '@keystone-6/core/admin-ui/router'
import { useKeystone, useList } from '@keystone-6/core/admin-ui/context'
import { CreateItemDrawer } from '@keystone-6/core/admin-ui/components'

export { Cell, CardValue, controller }

function LinkToRelatedItems({
  itemId,
  value,
  list,
  refFieldKey,
}: {
  itemId: string | null
  value: FieldProps<typeof controller>['value'] & { kind: 'many' | 'one' }
  list: ListMeta
  refFieldKey?: string
}) {
  function constructQuery({
    refFieldKey: rfk,
    itemId: iid,
    val,
  }: {
    refFieldKey?: string
    itemId: string | null
    val: FieldProps<typeof controller>['value'] & { kind: 'many' | 'one' }
  }) {
    if (!!rfk && iid) {
      return `!${rfk}_matches="${iid}"`
    }
    return `!id_in="${(val?.value as { id: string; label: string }[])
      .slice(0, 100)
      .map(({ id }) => id)
      .join(',')}"`
  }
  const commonProps = {
    size: 'small' as const,
    tone: 'active' as const,
    weight: 'link' as const,
  }

  if (value.kind === 'many') {
    const query = constructQuery({ refFieldKey, itemId, val: value })
    return (
      <Button {...commonProps} as={Link} href={`/${list.path}?${query}`}>
        View related {list.plural}
      </Button>
    )
  }

  return (
    <Button
      {...commonProps}
      as={Link}
      href={`/${list.path}/${value.value?.id}`}
    >
      View {list.singular} details
    </Button>
  )
}

/**
 * 有 `ui.description` 時：標題與說明同一列，說明為紅色（其餘交回 Keystone 預設 Field）。
 * cards / count 模式仍用預設排版。
 */
export const Field = (props: FieldProps<typeof controller>) => {
  const { field, autoFocus, value, onChange } = props
  const theme = useTheme()
  const keystone = useKeystone()
  const foreignList = useList(field.refListKey)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const authenticatedItem = keystone.authenticatedItem

  if (!field.description) {
    return <BaseField {...props} />
  }

  if (value.kind === 'cards-view' || value.kind === 'count') {
    return <BaseField {...props} />
  }

  const hintId = `${field.path}-description`
  /** 紅色用 inline style，避免 legend / Emotion 合併導致子層 color 被覆蓋 */
  const hintColorHex = '#dc2626'

  return (
    <FieldContainer as="fieldset">
      <Box
        as="legend"
        css={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          columnGap: theme.spacing.small,
          rowGap: theme.spacing.xsmall,
          marginBottom: theme.spacing.xsmall,
          fontWeight: theme.typography.fontWeight.semibold,
          minWidth: 120,
          padding: 0,
          border: 'none',
        }}
      >
        <span css={{ color: theme.fields.labelColor }}>{field.label}</span>
        <span
          id={hintId}
          style={{ color: hintColorHex }}
          css={{
            fontSize: '0.9em',
            fontWeight: 400,
          }}
        >
          {field.description}
        </span>
      </Box>
      <Fragment>
        <Stack gap="medium">
          <RelationshipSelect
            controlShouldRenderValue
            aria-describedby={hintId}
            autoFocus={autoFocus}
            isDisabled={onChange === undefined}
            labelField={field.refLabelField}
            searchFields={field.refSearchFields}
            list={foreignList}
            portalMenu
            state={
              value.kind === 'many'
                ? {
                    kind: 'many',
                    value: value.value,
                    onChange(newItems) {
                      onChange?.({
                        ...value,
                        value: newItems,
                      })
                    },
                  }
                : {
                    kind: 'one',
                    value: value.value,
                    onChange(newVal) {
                      if (value.kind === 'one') {
                        onChange?.({
                          ...value,
                          value: newVal,
                        })
                      }
                    },
                  }
            }
            orderBy={[{ id: 'desc' }]}
          />
          <Stack across gap="small">
            {onChange !== undefined && !field.hideCreate && (
              <Button
                size="small"
                disabled={isDrawerOpen}
                onClick={() => {
                  setIsDrawerOpen(true)
                }}
              >
                Create related {foreignList.singular}
              </Button>
            )}
            {onChange !== undefined &&
              authenticatedItem.state === 'authenticated' &&
              authenticatedItem.listKey === field.refListKey &&
              (value.kind === 'many'
                ? value.value.find((x) => x.id === authenticatedItem.id) ===
                  undefined
                : value.value?.id !== authenticatedItem.id) && (
                <Button
                  size="small"
                  onClick={() => {
                    const val = {
                      label: authenticatedItem.label,
                      id: authenticatedItem.id,
                    }
                    if (value.kind === 'many') {
                      onChange({
                        ...value,
                        value: [...value.value, val],
                      })
                    } else {
                      onChange({
                        ...value,
                        value: val,
                      })
                    }
                  }}
                >
                  {value.kind === 'many' ? 'Add ' : 'Set as '}
                  {authenticatedItem.label}
                </Button>
              )}
            {!!(value.kind === 'many'
              ? value.value.length
              : value.kind === 'one' && value.value) && (
              <LinkToRelatedItems
                itemId={value.id}
                refFieldKey={field.refFieldKey}
                list={foreignList}
                value={value}
              />
            )}
          </Stack>
        </Stack>
        {onChange !== undefined && (
          <DrawerController isOpen={isDrawerOpen}>
            <CreateItemDrawer
              listKey={foreignList.key}
              onClose={() => {
                setIsDrawerOpen(false)
              }}
              onCreate={(val) => {
                setIsDrawerOpen(false)
                if (value.kind === 'many') {
                  onChange({
                    ...value,
                    value: [...value.value, val],
                  })
                } else if (value.kind === 'one') {
                  onChange({
                    ...value,
                    value: val,
                  })
                }
              }}
            />
          </DrawerController>
        )}
      </Fragment>
    </FieldContainer>
  )
}
