import { useEffect } from 'react'
import type { FieldProps } from '@keystone-6/core/types'
import {
  Field as BaseField,
  Cell,
  CardValue,
  controller,
} from '@keystone-6/core/fields/types/relationship/views'
import { fieldFilterManager } from '../../shared/fieldFilterManager'

export { Cell, CardValue, controller }

export const Field = (props: FieldProps<typeof controller>) => {
  const { value } = props

  useEffect(() => {
    let ids: string[] = []
    if (value.kind === 'many' && Array.isArray(value.value)) {
      ids = value.value.map((x: { id: string }) => String(x.id)).filter(Boolean)
    } else if (value.kind === 'one' && value.value) {
      ids = [String(value.value.id)]
    }
    fieldFilterManager.updateField('categories', ids)
  }, [value])

  return <BaseField {...props} />
}
