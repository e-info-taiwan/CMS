// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { integer, relationship, select, text } from '@keystone-6/core/fields'

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
  fieldKey: 'classifies' | 'columnClassifyTags'
  listKey: 'classifies' | 'columnClassifyTags'
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
    const category = await context.prisma.Category.findUnique({
      where: { id: Number(item.id) },
      select: { [listKey]: { select: { id: true } } },
    })
    existingIds = ((category?.[listKey] as Array<{ id: number }>) || []).map(
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
    description: text({
      label: '簡介',
      ui: {
        displayMode: 'textarea',
      },
    }),
    sortOrder: integer({
      label: '排序',
      defaultValue: 1,
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
    }),
    heroImageCaption: text({
      label: '首圖圖說',
    }),
    posts: relationship({
      ref: 'Post.categories',
      many: true,
      label: '相關文章',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
    }),
    section: relationship({
      ref: 'Section.categories',
      many: false,
      label: '所屬大分類',
    }),
    classifies: relationship({
      ref: 'Classify.category',
      many: true,
      label: '包含的小分類',
      ui: {
        labelField: 'name',
        views: './lists/views/category/classifies-broadcast',
      },
    }),
    columnClassifyTags: relationship({
      ref: 'Classify',
      many: true,
      label: '專欄列表標籤顯示（只適用於專欄列表頁樣式）',
      ui: {
        labelField: 'name',
        views: './lists/views/category/column-classify-tags',
      },
    }),
    featuredPosts: relationship({
      ref: 'Post',
      many: true,
      label: '精選文章',
      ui: {
        hideCreate: true,
        linkToItem: false,
        views: './lists/views/sorted-relationship',
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'slug', 'sortOrder', 'section'],
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
      const finalClassifyIds = await computeFinalRelationshipIds({
        operation,
        item: item as Record<string, unknown> | undefined,
        resolvedData: resolvedData as Record<string, unknown>,
        fieldKey: 'classifies',
        listKey: 'classifies',
        context,
      })
      const finalTagIds = await computeFinalRelationshipIds({
        operation,
        item: item as Record<string, unknown> | undefined,
        resolvedData: resolvedData as Record<string, unknown>,
        fieldKey: 'columnClassifyTags',
        listKey: 'columnClassifyTags',
        context,
      })

      if (finalTagIds.some((id) => !finalClassifyIds.includes(id))) {
        addValidationError(
          '「專欄列表標籤顯示」裡的小分類，必須都已出現在「包含的小分類」中。'
        )
      }
    },
  },
})

// 使用 addManualOrderRelationshipFields 來記錄 featuredPosts 的新增順序
const listWithManualOrder = utils.addManualOrderRelationshipFields(
  [
    {
      fieldName: 'manualOrderOfFeaturedPosts',
      fieldLabel: '精選文章（按新增順序）',
      targetFieldName: 'featuredPosts',
      targetListName: 'Post',
      targetListLabelField: 'title',
    },
  ],
  listConfigurations,
  {
    parentListKey: 'Category',
    manualOrderJsonViews: './lists/views/manual-order-json-read',
  }
)

export default utils.addTrackingFields(listWithManualOrder)
