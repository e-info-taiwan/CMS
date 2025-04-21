import { list, graphql } from '@keystone-6/core'
import { image, text, virtual } from '@keystone-6/core/fields'

import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'
import { addTrackingFields } from '../../utils/trackingHandler'

import { CustomFile } from '../../customFields'
import { ImageFileAdapter } from '../../customFields/CustomFile/ImageFileAdapter'
import { googleCloudStorage } from '../../configs/config'

const imageFileAdapter = new ImageFileAdapter('image')

const listConfigurations = list({
  db: {
    map: 'Image',
  },
  fields: {
    name: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    imageFile: image(),
    resized: virtual({
      field: graphql.field({
        type: graphql.object<{
          original: string
          w480: string
          w800: string
          w1200: string
          w1600: string
          w2400: string
        }>()({
          name: 'ResizedImages',
          fields: {
            original: graphql.field({ type: graphql.String }),
            w480: graphql.field({ type: graphql.String }),
            w800: graphql.field({ type: graphql.String }),
            w1200: graphql.field({ type: graphql.String }),
            w1600: graphql.field({ type: graphql.String }),
            w2400: graphql.field({ type: graphql.String }),
          },
        }),
        resolve(item: Record<string, unknown>) {
          const empty = {
            original: '',
            w480: '',
            w800: '',
            w1200: '',
            w1600: '',
            w2400: '',
          }

          // For backward compatibility,
          // this image item is uploaded via `GCSFile` custom field.
          if (item?.urlOriginal) {
            return Object.assign(empty, {
              original: item.urlOriginal,
            })
          }

          const rtn = {}
          const filename = item?.imageFile_id

          if (!filename) {
            return empty
          }

          const extension = item?.imageFile_extension
            ? '.' + item.imageFile_extension
            : ''
          const width = item?.imageFile_width || 0
          const height = item?.imageFile_height || 0

          const resizedTargets =
            width >= height
              ? ['w480', 'w800', 'w1600', 'w2400']
              : ['w480', 'w800', 'w1200', 'w1600']

          resizedTargets.forEach((target) => {
            rtn[
              target
            ] = `${googleCloudStorage.origin}/${googleCloudStorage.bucket}/images/${filename}-${target}${extension}`
          })

          rtn[
            'original'
          ] = `${googleCloudStorage.origin}/${googleCloudStorage.bucket}/images/${filename}${extension}`
          return Object.assign(empty, rtn)
        },
      }),
      ui: {
        query: '{ original w480 w800 w1200 w1600 w2400 }',
      },
    }),
    file: CustomFile({
      label: '檔案（建議長邊大於 2000 pixel）',
      customConfig: {
        fileType: 'image',
      },
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'hidden',
        },
        listView: {
          fieldMode: 'hidden',
        },
      },
    }),
    urlOriginal: text({
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
        listView: {
          fieldMode: 'read',
        },
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'imageFile'],
      initialSort: { field: 'updatedAt', direction: 'ASC' },
      pageSize: 50,
    },
  },

  access: {
    operation: {
      query: () => true,
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
  hooks: {
    resolveInput: async ({ inputData, item, resolvedData }) => {
      await imageFileAdapter.startFileProcessingFlow(
        resolvedData,
        item,
        inputData
      )

      return resolvedData
    },
    // beforeOperation: async ({ operation, item }) => {
    //   if (operation === 'delete' && item.file_filename) {
    //     imageFileAdapter.startDeleteProcess(`${item.file_filename}`)
    //   }
    // },
  },
})

export default addTrackingFields(listConfigurations)
