import { list } from '@keystone-6/core'
import {
  text,
  relationship,
  integer,
  checkbox,
  select,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

async function computeFinalRelationshipIds({
  operation,
  item,
  resolvedData,
  fieldKey,
  listKey,
  context,
}: {
  operation: 'create' | 'update' | 'delete'
  item: Record<string, unknown> | undefined
  resolvedData: Record<string, unknown>
  fieldKey: 'categories' | 'columnCategoryTags'
  listKey: 'categories' | 'columnCategoryTags'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Keystone list hooks context
  context: any
}): Promise<number[]> {
  const input = resolvedData[fieldKey] as
    | {
        set?: Array<{ id: string | number }>
        connect?: Array<{ id: string | number }>
        disconnect?: Array<{ id: string | number }>
      }
    | undefined

  if (input?.set) {
    return input.set
      .map(({ id }) => Number(id))
      .filter((id) => !Number.isNaN(id))
  }

  let existingIds: number[] = []
  if (operation === 'update' && item?.id != null) {
    const section = await context.prisma.Section.findUnique({
      where: { id: Number(item.id) },
      select: { [listKey]: { select: { id: true } } },
    })
    existingIds = ((section?.[listKey] as Array<{ id: number }>) || []).map(
      ({ id }) => Number(id)
    )
  }

  const result = new Set(existingIds)
  for (const rel of input?.connect || []) {
    result.add(Number(rel.id))
  }
  for (const rel of input?.disconnect || []) {
    result.delete(Number(rel.id))
  }
  return [...result].filter((id) => !Number.isNaN(id))
}

const listConfigurations = list({
  fields: {
    slug: text({
      label: 'slug',
      validation: {
        isRequired: true,
        match: {
          regex: /^[a-zA-Z0-9]+$/,
          explanation: 'slug 限輸入英文或數字',
        },
      },
    }),
    name: text({
      label: '名稱',
      validation: { isRequired: true },
    }),
    style: select({
      label: '列表頁樣式',
      defaultValue: 'default',
      options: [
        { label: '一般文章列表頁', value: 'default' },
        { label: '專欄列表頁', value: 'column' },
      ],
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: 'Photos 首圖',
      ui: {
        views: './lists/views/relationship-inline-hint',
        description: '（建議圖片比例 1200x420）',
      },
    }),
    description: text({
      label: '描述',
    }),
    showInHeader: checkbox({
      label: '顯示於Header',
      defaultValue: false,
    }),
    sortOrder: integer({
      label: '排序',
    }),
    categories: relationship({
      ref: 'Category.section',
      many: true,
      label: '包含的中分類',
      ui: {
        labelField: 'name',
        views: './lists/views/section/categories-broadcast',
      },
    }),
    columnCategoryTags: relationship({
      ref: 'Category',
      many: true,
      label: '專欄列表標籤顯示（只適用於專欄列表頁樣式）',
      ui: {
        labelField: 'name',
        views: './lists/views/section/column-category-tags',
      },
    }),
    posts: relationship({
      ref: 'Post.section',
      many: true,
      label: '相關文章',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'slug', 'style', 'showInHeader', 'sortOrder'],
      initialSort: {
        field: 'sortOrder',
        direction: 'ASC',
      },
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
  hooks: {
    validateInput: async ({
      operation,
      item,
      resolvedData,
      addValidationError,
      context,
    }) => {
      const finalCategoryIds = await computeFinalRelationshipIds({
        operation,
        item: item as Record<string, unknown> | undefined,
        resolvedData: resolvedData as Record<string, unknown>,
        fieldKey: 'categories',
        listKey: 'categories',
        context,
      })
      const finalTagIds = await computeFinalRelationshipIds({
        operation,
        item: item as Record<string, unknown> | undefined,
        resolvedData: resolvedData as Record<string, unknown>,
        fieldKey: 'columnCategoryTags',
        listKey: 'columnCategoryTags',
        context,
      })

      if (finalTagIds.some((id) => !finalCategoryIds.includes(id))) {
        addValidationError(
          '「專欄列表標籤顯示」裡的中分類，必須都已出現在「包含的中分類」中。'
        )
      }
    },
  },
})

export default utils.addTrackingFields(listConfigurations)
