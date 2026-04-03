import config from '../config'
// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list, graphql } from '@keystone-6/core'
import {
  file,
  image,
  text,
  relationship,
  virtual,
  json,
} from '@keystone-6/core/fields'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      label: '檔案名稱',
      validation: { isRequired: true },
    }),
    description: text({
      label: '檔案敘述',
    }),
    imageFile: image({
      storage: 'images',
    }),
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

          const rtn: Record<string, string> = {}
          const filename = item?.imageFile_id

          if (!filename) {
            return empty
          }

          const extension = item?.imageFile_extension
            ? '.' + item.imageFile_extension
            : ''

          const resizedTargets = ['w480', 'w800', 'w1200', 'w1600', 'w2400']

          resizedTargets.forEach((target) => {
            rtn[
              target
            ] = `${config.images.gcsBaseUrl}/images/${filename}-${target}${extension}`
          })

          rtn[
            'original'
          ] = `${config.images.gcsBaseUrl}/images/${filename}${extension}`
          return Object.assign(empty, rtn)
        },
      }),
      ui: {
        query: '{ original w480 w800 w1200 w1600 w2400 }',
      },
    }),
    resizedWebp: virtual({
      field: graphql.field({
        type: graphql.object<{
          original: string
          w480: string
          w800: string
          w1200: string
          w1600: string
          w2400: string
        }>()({
          name: 'ResizedWebPImages',
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

          const rtn: Record<string, string> = {}
          const filename = item?.imageFile_id

          if (!filename) {
            return empty
          }

          const extension = '.webP'

          const resizedTargets = ['w480', 'w800', 'w1200', 'w1600', 'w2400']

          resizedTargets.forEach((target) => {
            rtn[
              target
            ] = `${config.images.gcsBaseUrl}/images/${filename}-${target}${extension}`
          })

          rtn[
            'original'
          ] = `${config.images.gcsBaseUrl}/images/${filename}${extension}`
          return Object.assign(empty, rtn)
        },
      }),
      ui: {
        query: '{ original w480 w800 w1200 w1600 w2400 }',
      },
    }),
    phash: text({
      label: 'pHash',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
        listView: { fieldMode: 'read' },
      },
    }),
    exif: json({
      label: 'EXIF',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
        listView: { fieldMode: 'hidden' },
      },
    }),
    file: file({
      label: '檔案（建議長邊大於 2000 pixel）',
      storage: 'files',
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
    posts: relationship({
      ref: 'Post',
      many: true,
      label: '相關文章',
      ui: {
        itemView: { fieldMode: 'read' },
        createView: { fieldMode: 'hidden' },
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'imageFile'],
      initialSort: {
        // @ts-ignore: `updatedAt` field does exist
        field: 'updatedAt',
        direction: 'ASC',
      },
      pageSize: 50,
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
  hooks: {
    resolveInput: async ({ resolvedData, item }) => {
      // Check if this is a create or update operation that provides a new imageFile
      // We also check if it's uploaded recently
      const imageFileId = resolvedData?.imageFile?.id || item?.imageFile_id
      const imageFileExtension =
        resolvedData?.imageFile?.extension || item?.imageFile_extension

      // If a new image is provided, fetch phash and exif
      if (resolvedData.imageFile && imageFileId) {
        const processorUrl = process.env.IMAGE_PROCESS_ENDPOINT
        if (!processorUrl) {
          console.warn(
            '[Warning] IMAGE_PROCESS_ENDPOINT is not set. Skipping phash generation.'
          )
          return resolvedData
        }

        try {
          const extension = imageFileExtension ? `.${imageFileExtension}` : ''
          const imageUrl = `${config.images.gcsBaseUrl}/images/${imageFileId}${extension}`

          const response = await fetch(processorUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.phash) {
              resolvedData.phash = data.phash
            }
            if (data.exif) {
              resolvedData.exif = data.exif
            }
          } else {
            console.error(`Failed to fetch phash. Status: ${response.status}`)
          }
        } catch (error) {
          console.error('Failed to fetch phash and exif: ', error)
        }
      }
      return resolvedData
    },
    validateInput: async ({
      resolvedData,
      item,
      context,
      addValidationError,
    }) => {
      // Validate against duplicates
      const phash = resolvedData.phash || item?.phash
      if (phash && resolvedData.imageFile) {
        const id = item?.id
        const whereClause = { phash: { equals: phash } }

        const duplicates = await context.db.Photo.findMany({
          // @ts-ignore: TS checking might complain about dynamic where clause
          where: id
            ? { ...whereClause, id: { not: { equals: id } } }
            : whereClause,
        })

        if (duplicates && duplicates.length > 0) {
          addValidationError(
            `This image appears to be a duplicate. A similar image already exists (檔案名稱: ${duplicates[0].name}).`
          )
        }
      }
    },
  },
})

export default utils.addTrackingFields(listConfigurations)
