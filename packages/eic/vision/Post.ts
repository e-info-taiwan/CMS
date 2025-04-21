import { list, graphql } from '@keystone-6/core'
import {
  text,
  integer,
  relationship,
  select,
  json,
  timestamp,
  virtual,
  checkbox,
} from '@keystone-6/core/fields'

import {
  allowRoles,
  admin,
  moderator,
  //editor,
  //owner,
} from '../../utils/accessControl'
import { addTrackingFields } from '../../utils/trackingHandler'
import { RichTextEditor } from '../../customFields/rich-text-editor'
import { CustomRelationship } from '../../customFields/CustomRelationship'
import draftConverter from '../../customFields/rich-text-editor/draft-to-api-data/draft-converter'
import envVar from '../../environment-variables'

enum UserRole {
  Admin = 'admin',
  Moderator = 'moderator',
  Editor = 'editor',
  Contributor = 'contributor',
}

enum PostStatus {
  Published = 'published',
  Draft = 'draft',
  Scheduled = 'scheduled',
  Archived = 'archived',
}

type Session = {
  data: {
    id: string
    role: UserRole
  }
}

function filterPosts({ session }: { session: Session }) {
  switch (envVar.accessControlStrategy) {
    case 'gql': {
      // Only expose `published` posts
      return { status: { equals: PostStatus.Published } }
    }
    case 'preview': {
      // Expose all posts, including `published`, `draft` and `archived` posts
      return true
    }
    case 'cms':
    default: {
      //  TODO grant access permission if needed
      //  return session?.data?.role === UserRole.Admin ||
      //    session?.data?.role === UserRole.Editor

      // Expose all posts, including `published`, `draft` and `archived` posts if user logged in
      return Boolean(session?.data?.role)
    }
  }
}

const listConfigurations = list({
  fields: {
    name: text({
      label: '標題',
      validation: {
        isRequired: true,
        length: {
          min: 1,
        },
      },
    }),
    hidden_title: checkbox({
      label: '文章頁隱藏標題',
    }),
    status: select({
      options: [
        { label: '出版', value: PostStatus.Published },
        { label: '草稿', value: PostStatus.Draft },
        { label: '排程', value: PostStatus.Scheduled },
        { label: '下架', value: PostStatus.Archived },
      ],
      // We want to make sure new posts start off as a draft when they are created
      defaultValue: 'draft',
      // fields also have the ability to configure their appearance in the Admin UI
      ui: {
        displayMode: 'segmented-control',
        listView: {
          fieldMode: 'read',
        },
      },
    }),
    slug: text({
      label: 'slug（Longform 網址）',
      isNullable: true,
      ui: {
        createView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
    weight: integer({
      label: '權重',
      defaultValue: 85,
    }),
    publishDate: timestamp({
      label: '發布日期（預設：現在時間）',
      defaultValue: { kind: 'now' },
      validation: {
        isRequired: true,
      },
    }),
    heroImage: CustomRelationship({
      label: '首圖',
      ref: 'Photo',
      ui: {
        hideCreate: true,
      },
      customConfig: {
        isImage: true,
      },
    }),
    heroStyle: select({
      label: '首圖樣式',
      options: [
        { label: '滿版', value: 'full' },
        { label: '一般', value: 'normal' },
      ],
      defaultValue: 'normal',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'hidden',
        },
      },
    }),
    heroVideo: text({
      label: '首圖影片',
    }),
    heroCaption: text({
      label: '首圖圖說',
    }),
    ref_authors: relationship({
      label: '作者',
      ref: 'Author.ref_posts',
      ui: {
        inlineEdit: { fields: ['name'] },
        createView: { fieldMode: 'hidden' },
        hideCreate: true,
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
    reporter: text({
      label: '記者（一般文章使用）',
      ui: { displayMode: 'textarea' },
    }),
    content: RichTextEditor({
      label: '內文',
    }),
    relatedPosts: CustomRelationship({
      label: '延伸閱讀',
      ref: 'Post',
      many: true,
      ui: {
        displayMode: 'select',
        hideCreate: true,
        labelField: 'name',
      },
    }),
    ref_events: relationship({
      label: '相關活動',
      ref: 'Event.ref_posts',
      ui: {
        inlineEdit: { fields: ['name'] },
        hideCreate: true,
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
    ref_polls: relationship({
      label: '相關投票',
      ref: 'Poll.ref_posts',
      ui: {
        inlineEdit: { fields: ['name'] },
        hideCreate: true,
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
    /*
    project: relationship({
      ref: 'Project.posts',
      ui: {
        itemView: { fieldMode: 'hidden' },
        hideCreate: true,
        inlineEdit: { fields: ['name'] },
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: false,
    }),
	*/
    group: relationship({
      label: '大分類（必選）',
      ref: 'Group.posts',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'hidden',
        },
      },
      many: false,
    }),
    category: relationship({
      label: '次分類（必選）',
      ref: 'Category.posts',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'hidden',
        },
      },
      many: false,
    }),
    classify: relationship({
      label: '小分類（必選）',
      ref: 'Classify.posts',
      ui: {
        displayMode: 'select',
        hideCreate: true,
      },
      many: false,
    }),
    sdg: relationship({
      ref: 'SDG.posts',
      ui: {
        inlineEdit: { fields: ['name'] },
        hideCreate: true,
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
    tags: relationship({
      ref: 'Tag.posts',
      ui: {
        inlineEdit: { fields: ['name'] },
        hideCreate: true,
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
    ogTitle: text({
      label: 'og title',
      ui: {
        createView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
    ogImage: CustomRelationship({
      label: 'og Image',
      ref: 'Photo',
      customConfig: {
        isImage: true,
      },
    }),
    copyright: select({
      options: [
        { label: '禁止轉載', value: 'reserved' },
        { label: '部分允許轉載', value: 'partial' },
      ],
      // We want to make sure new posts start off as a draft when they are created
      defaultValue: 'reserved',
      // fields also have the ability to configure their appearance in the Admin UI
      ui: {
        displayMode: 'segmented-control',
        listView: {
          fieldMode: 'read',
        },
      },
    }),
    type: select({
      options: [
        { label: '文章', value: 'article' },
        { label: 'Longform', value: 'project' },
      ],
      // We want to make sure new posts start off as a draft when they are created
      defaultValue: 'article',
      // fields also have the ability to configure their appearance in the Admin UI
      ui: {
        displayMode: 'segmented-control',
      },
    }),
    longform: relationship({
      label: 'Longform',
      ref: 'Longform',
      many: false,
      ui: {
        displayMode: 'cards',
        linkToItem: true,
        cardFields: [
          'slug',
          'titleSize',
          'titleColor',
          'subtitle',
          'subtitleSize',
          'subtitleColor',
          'headLogo',
          'heroMob',
          'author',
          'photographer',
          'social',
          'designer',
          'engineer',
          'director',
          'byline_title',
          'byline_name',
          'byline_title2',
          'byline_name2',
        ],
        inlineCreate: {
          fields: [
            'slug',
            'titleSize',
            'titleColor',
            'subtitle',
            'subtitleSize',
            'subtitleColor',
            'headLogo',
            'heroMob',
            'author',
            'photographer',
            'social',
            'designer',
            'engineer',
            'director',
            'byline_title',
            'byline_name',
            'byline_title2',
            'byline_name2',
          ],
        },
        inlineEdit: {
          fields: [
            'slug',
            'titleSize',
            'titleColor',
            'subtitle',
            'subtitleSize',
            'subtitleColor',
            'headLogo',
            'heroMob',
            'author',
            'photographer',
            'social',
            'designer',
            'engineer',
            'director',
            'byline_title',
            'byline_name',
            'byline_title2',
            'byline_name2',
          ],
        },
      },
    }),
    previewButton: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve: async (
          item: Record<string, unknown>,
          args,
          context
        ): Promise<string> => {
          console.log('type: ' + item?.type)
          if (item?.type == 'article') {
            return `/story/${item?.id}`
          } else {
            const longformId =
              typeof item?.longformId === 'number'
                ? item.longformId.toString()
                : null
            if (longformId === null) {
              return `/story/${item?.id}`
            }
            const longform = await context.query.Longform.findOne({
              where: { id: longformId },
              query: 'slug',
            })
            if (!longform?.slug) {
              return `/story/${item?.id}`
            }
            return `/project/${longform?.slug}`
          }
        },
      }),
      ui: {
        views: require.resolve('../../customFields/preview-button.tsx'),
      },
    }),
    apiData: json({
      label: '資料庫使用',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
  },
  ui: {
    labelField: 'name',
    listView: {
      initialColumns: ['name', 'publishDate', 'type', 'status'],
      initialSort: { field: 'publishDate', direction: 'DESC' },
      pageSize: 50,
    },
  },

  access: {
    operation: {
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
    filter: {
      query: filterPosts,
    },
  },
  hooks: {
    resolveInput: async ({ resolvedData, context }) => {
      const { content, classify } = resolvedData
      if (content) {
        resolvedData.apiData = draftConverter.convertToApiData(content).toJS()
      }
      // The following classify condition block is a WORKAROUND.
      // In the normalized database design,
      // the `post` will only have the relationship with the `classify`,
      // and it won't have the relationship with `group` or `category` directly.
      // It's the `classify` which will have the relationship with `category`
      // and `category` will have the relationship with `group`.
      // However, because we want to generate the GQL that supports to find
      // the posts under the certain group, or under the certain category.
      // We let the `post` to have the relationship with `group` and `category` in
      // this `post` list configuration.
      // But we hide `group` and `category` fields in the web UI,
      // and the values are also controlled by the following hook.
      if (classify) {
        if (classify?.disconnect === true) {
          resolvedData.group = {
            disconnect: true,
          }
          resolvedData.category = {
            disconnect: true,
          }
        } else if (classify?.connect?.id) {
          // Find category id and group id according to classify id
          const classifyItem = await context.query.Classify.findOne({
            where: { id: classify.connect.id },
            query: 'category { id group { id } }',
          })

          if (classifyItem?.category?.id) {
            resolvedData.category = {
              connect: {
                id: Number(classifyItem.category.id),
              },
            }
          }

          if (classifyItem?.category?.group?.id) {
            resolvedData.group = {
              connect: {
                id: Number(classifyItem.category.group.id),
              },
            }
          }
        }
      }

      return resolvedData
    },
    validateInput: async ({ operation, inputData, addValidationError }) => {
      if (operation == 'create') {
        if (
          inputData['type'] == 'project' &&
          inputData['longform']['disconnect'] == true
        ) {
          addValidationError('需要輸入 Longform 相關欄位')
        }
      }
      //if (operation == 'update') {
      //  if (
      //    inputData['type'] &&
      //    'disconnect' in inputData['longform'] &&
      //    inputData['longform']['disconnect'] == true
      //  ) {
      //    addValidationError('需要輸入 Longform 相關欄位')
      //  }
      //}
    },
    afterOperation: async ({
      operation,
      originalItem,
      item,
      resolvedData,
      context,
    }) => {
      if (operation == 'delete') {
        const orig_id = originalItem['id']
        const backupItem = originalItem
        delete backupItem['id']
        const fields = [
          'heroMob',
          'headLogo',
          'ogImage',
          'heroImage',
          'project',
          'group',
          'category',
          'classify',
          'createdBy',
          'updatedBy',
        ]
        fields.forEach(function (field) {
          const fieldId = field + 'Id'
          //console.log("id: " + fieldId)
          if (originalItem[fieldId] !== null) {
            const fieldValue = { connect: { id: originalItem[fieldId] } }
            backupItem[field] = fieldValue
          }
          delete backupItem[fieldId]
        })
        const new_post = await context.db.Post.createOne({
          data: backupItem,
        })
        //console.log(context.prisma)
        const update_post = await context.prisma.post.update({
          where: { id: new_post['id'] },
          data: {
            id: orig_id,
            status: 'archived',
          },
        })
        if (!update_post) {
          console.log(update_post, item, resolvedData)
        }
      }
    },
  },
})

export default addTrackingFields(listConfigurations)
