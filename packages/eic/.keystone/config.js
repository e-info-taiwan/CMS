"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default
});
module.exports = __toCommonJS(keystone_exports);
var import_core11 = require("@keystone-6/core");

// lists/Post.ts
var import_lilith_core = require("@mirrormedia/lilith-core");
var import_core = require("@keystone-6/core");
var import_fields = require("@keystone-6/core/fields");

// environment-variables.ts
var {
  IS_UI_DISABLED,
  ACCESS_CONTROL_STRATEGY,
  PREVIEW_SERVER_ORIGIN,
  DATABASE_PROVIDER,
  DATABASE_URL,
  SESSION_SECRET,
  SESSION_MAX_AGE,
  GCS_BUCKET,
  FILES_BASE_URL,
  FILES_STORAGE_PATH,
  IMAGES_BASE_URL,
  IMAGES_STORAGE_PATH,
  MEMORY_CACHE_TTL,
  MEMORY_CACHE_SIZE,
  GCS_BASE_URL,
  INVALID_CDN_CACHE_SERVER_URL
} = process.env;
var environment_variables_default = {
  isUIDisabled: IS_UI_DISABLED === "true",
  memoryCacheTtl: Number.isNaN(Number(MEMORY_CACHE_TTL)) ? 3e5 : Number(MEMORY_CACHE_TTL),
  memoryCacheSize: Number.isNaN(Number(MEMORY_CACHE_SIZE)) ? 300 : Number(MEMORY_CACHE_SIZE),
  accessControlStrategy: ACCESS_CONTROL_STRATEGY || "cms",
  // the value could be one of 'cms', 'gql' or 'preview'
  previewServerOrigin: PREVIEW_SERVER_ORIGIN || "http://localhost:3001",
  database: {
    provider: DATABASE_PROVIDER === "sqlite" ? "sqlite" /* Sqlite */ : "postgresql" /* Postgres */,
    url: DATABASE_URL || "postgres://hcchien@localhost:5432/eic"
  },
  session: {
    secret: SESSION_SECRET || "default_session_secret_and_it_should_be_more_than_32_characters",
    maxAge: typeof SESSION_MAX_AGE === "string" && parseInt(SESSION_MAX_AGE) || 60 * 60 * 24 * 1
    // 1 days
  },
  gcs: {
    bucket: GCS_BUCKET || "static-vision-tw-dev"
  },
  files: {
    baseUrl: FILES_BASE_URL || "/files",
    storagePath: FILES_STORAGE_PATH || "public/files"
  },
  images: {
    baseUrl: IMAGES_BASE_URL || "/images",
    gcsBaseUrl: GCS_BASE_URL || "https://statics-readr-tw-dev.readr.tw",
    storagePath: IMAGES_STORAGE_PATH || "public/images"
  },
  invalidateCDNCacheServerURL: INVALID_CDN_CACHE_SERVER_URL
};

// lists/Post.ts
var { allowRoles, admin, moderator, editor } = import_lilith_core.utils.accessControl;
var listConfigurations = (0, import_core.list)({
  fields: {
    slug: (0, import_fields.text)({
      label: "\u7DB2\u5740\u540D\u7A31\uFF08\u82F1\u6587\uFF09"
    }),
    sortOrder: (0, import_fields.integer)({
      label: "\u6392\u5217\u9806\u5E8F"
    }),
    name: (0, import_fields.text)({
      label: "\u6A19\u984C",
      validation: { isRequired: true }
    }),
    subtitle: (0, import_fields.text)({
      label: "\u526F\u6A19",
      validation: { isRequired: false },
      db: {
        isNullable: true
      }
    }),
    state: (0, import_fields.select)({
      label: "\u72C0\u614B",
      options: [
        { label: "draft", value: "draft" },
        { label: "published", value: "published" },
        { label: "scheduled", value: "scheduled" },
        { label: "archived", value: "archived" },
        { label: "invisible", value: "invisible" }
      ],
      defaultValue: "draft",
      isIndexed: true
    }),
    publishTime: (0, import_fields.timestamp)({
      isIndexed: true,
      label: "\u767C\u4F48\u65E5\u671F"
    }),
    categories: (0, import_fields.relationship)({
      ref: "Category.relatedPost",
      label: "\u5206\u985E",
      many: true,
      ui: {
        labelField: "title"
      }
    }),
    writers: (0, import_fields.relationship)({
      ref: "Author.posts",
      many: true,
      label: "\u4F5C\u8005",
      ui: {
        labelField: "name"
      }
    }),
    photographers: (0, import_fields.relationship)({
      many: true,
      label: "\u651D\u5F71",
      ref: "Author",
      ui: {
        labelField: "name"
      }
    }),
    cameraOperators: (0, import_fields.relationship)({
      label: "\u5F71\u97F3",
      many: true,
      ref: "Author",
      ui: {
        labelField: "name"
      }
    }),
    designers: (0, import_fields.relationship)({
      label: "\u8A2D\u8A08",
      many: true,
      ref: "Author",
      ui: {
        labelField: "name"
      }
    }),
    engineers: (0, import_fields.relationship)({
      many: true,
      label: "\u5DE5\u7A0B",
      ref: "Author",
      ui: {
        labelField: "name"
      }
    }),
    dataAnalysts: (0, import_fields.relationship)({
      many: true,
      label: "\u8CC7\u6599\u5206\u6790",
      ref: "Author",
      ui: {
        labelField: "name"
      }
    }),
    otherByline: (0, import_fields.text)({
      validation: { isRequired: false },
      label: "\u4F5C\u8005\uFF08\u5176\u4ED6\uFF09",
      db: {
        isNullable: true
      }
    }),
    leadingEmbeddedCode: (0, import_fields.text)({
      label: "Leading embedded code",
      ui: { displayMode: "textarea" }
    }),
    heroVideo: (0, import_fields.relationship)({
      label: "Leading Video",
      ref: "Video"
    }),
    heroImage: (0, import_fields.relationship)({
      label: "\u9996\u5716",
      ref: "Photo"
    }),
    heroCaption: (0, import_fields.text)({
      label: "\u9996\u5716\u5716\u8AAA",
      validation: { isRequired: false },
      db: {
        isNullable: true
      }
    }),
    heroImageSize: (0, import_fields.select)({
      label: "\u9996\u5716\u5C3A\u5BF8",
      options: [
        { label: "extend", value: "extend" },
        { label: "normal", value: "normal" },
        { label: "small", value: "small" }
      ],
      defaultValue: "normal"
    }),
    summary: import_lilith_core.customFields.richTextEditor({
      label: "\u91CD\u9EDE\u6458\u8981",
      disabledButtons: ["header-three", "header-four"],
      website: "readr"
    }),
    // brief: customFields.richTextEditor({
    //   label: '前言',
    //   disabledButtons: [],
    //   website: 'readr',
    // }),
    content: import_lilith_core.customFields.richTextEditor({
      label: "\u5167\u6587",
      disabledButtons: ["header-three", "header-four"],
      website: "readr"
    }),
    tags: (0, import_fields.relationship)({
      ref: "Tag.posts",
      many: true,
      label: "\u6A19\u7C64"
    }),
    wordCount: (0, import_fields.integer)({
      label: "\u5B57\u6578"
    }),
    readingTime: (0, import_fields.integer)({
      label: "\u95B1\u8B80\u6642\u9593"
    }),
    relatedPosts: (0, import_fields.relationship)({
      ref: "Post",
      many: true,
      label: "\u76F8\u95DC\u6587\u7AE0"
    }),
    ogTitle: (0, import_fields.text)({
      validation: { isRequired: false },
      label: "FB\u5206\u4EAB\u6A19\u984C",
      db: {
        isNullable: true
      }
    }),
    ogDescription: (0, import_fields.text)({
      label: "FB\u5206\u4EAB\u8AAA\u660E",
      validation: { isRequired: false },
      db: {
        isNullable: true
      }
    }),
    ogImage: (0, import_fields.relationship)({
      label: "FB\u5206\u4EAB\u7E2E\u5716",
      ref: "Photo"
    }),
    isFeatured: (0, import_fields.checkbox)({
      label: "\u7F6E\u9802"
    }),
    css: (0, import_fields.text)({
      ui: { displayMode: "textarea" },
      label: "CSS"
    }),
    summaryApiData: (0, import_fields.json)({
      label: "\u8CC7\u6599\u5EAB\u4F7F\u7528",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" }
      }
    }),
    // briefApiData: json({
    //   label: '資料庫使用',
    //   ui: {
    //     createView: { fieldMode: 'hidden' },
    //     itemView: { fieldMode: 'hidden' },
    //   },
    // }),
    apiData: (0, import_fields.json)({
      label: "\u8CC7\u6599\u5EAB\u4F7F\u7528",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" }
      }
    }),
    actionlistApiData: (0, import_fields.json)({
      label: "\u8CC7\u6599\u5EAB\u4F7F\u7528",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" }
      }
    }),
    citationApiData: (0, import_fields.json)({
      label: "\u8CC7\u6599\u5EAB\u4F7F\u7528",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" }
      }
    })
  },
  ui: {
    labelField: "name",
    listView: {
      initialColumns: ["id", "slug", "state"],
      initialSort: { field: "publishTime", direction: "DESC" },
      pageSize: 50
    }
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin)
    }
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: "PUBLIC" }
  },
  hooks: {
    resolveInput: async ({ resolvedData }) => {
      const { summary, content, actionList, citation } = resolvedData;
      if (content) {
        resolvedData.apiData = import_lilith_core.customFields.draftConverter.convertToApiData(content).toJS();
      }
      if (summary) {
        resolvedData.summaryApiData = import_lilith_core.customFields.draftConverter.convertToApiData(summary).toJS();
      }
      if (actionList) {
        resolvedData.actionlistApiData = import_lilith_core.customFields.draftConverter.convertToApiData(actionList).toJS();
      }
      if (citation) {
        resolvedData.citationApiData = import_lilith_core.customFields.draftConverter.convertToApiData(citation).toJS();
      }
      return resolvedData;
    }
  }
});
var extendedListConfigurations = import_lilith_core.utils.addTrackingFields(listConfigurations);
if (typeof environment_variables_default.invalidateCDNCacheServerURL === "string") {
  extendedListConfigurations = import_lilith_core.utils.invalidateCacheAfterOperation(
    extendedListConfigurations,
    `${environment_variables_default.invalidateCDNCacheServerURL}/story`,
    (item, originalItem) => ({
      slug: originalItem?.id ?? item?.id
    })
  );
}
var Post_default = import_lilith_core.utils.addManualOrderRelationshipFields(
  [
    {
      fieldName: "manualOrderOfWriters",
      fieldLabel: "\u4F5C\u8005\u624B\u52D5\u6392\u5E8F\u7D50\u679C",
      targetFieldName: "writers",
      targetListName: "Author",
      targetListLabelField: "name"
    },
    {
      fieldName: "manualOrderOfPhotographers",
      fieldLabel: "\u651D\u5F71\u624B\u52D5\u6392\u5E8F\u7D50\u679C",
      targetFieldName: "photographers",
      targetListName: "Author",
      targetListLabelField: "name"
    },
    {
      fieldName: "manualOrderOfCameraOperators",
      fieldLabel: "\u5F71\u97F3\u624B\u52D5\u6392\u5E8F\u7D50\u679C",
      targetFieldName: "cameraOperators",
      targetListName: "Author",
      targetListLabelField: "name"
    },
    {
      fieldName: "manualOrderOfDesigners",
      fieldLabel: "\u8A2D\u8A08\u624B\u52D5\u6392\u5E8F\u7D50\u679C",
      targetFieldName: "designers",
      targetListName: "Author",
      targetListLabelField: "name"
    },
    {
      fieldName: "manualOrderOfEngineers",
      fieldLabel: "\u5DE5\u7A0B\u624B\u52D5\u6392\u5E8F\u7D50\u679C",
      targetFieldName: "engineers",
      targetListName: "Author",
      targetListLabelField: "name"
    },
    {
      fieldName: "manualOrderOfDataAnalysts",
      fieldLabel: "\u8CC7\u6599\u5206\u6790\u624B\u52D5\u6392\u5E8F\u7D50\u679C",
      targetFieldName: "dataAnalysts",
      targetListName: "Author",
      targetListLabelField: "name"
    },
    {
      fieldName: "manualOrderOfRelatedPosts",
      fieldLabel: "\u76F8\u95DC\u6587\u7AE0\u624B\u52D5\u6392\u5E8F\u7D50\u679C",
      targetFieldName: "relatedPosts",
      targetListName: "Post",
      targetListLabelField: "name"
    }
  ],
  extendedListConfigurations
);

// lists/Tag.ts
var import_lilith_core2 = require("@mirrormedia/lilith-core");
var import_core2 = require("@keystone-6/core");
var import_fields2 = require("@keystone-6/core/fields");
var { allowRoles: allowRoles2, admin: admin2, moderator: moderator2, editor: editor2 } = import_lilith_core2.utils.accessControl;
var listConfigurations2 = (0, import_core2.list)({
  fields: {
    name: (0, import_fields2.text)({
      isIndexed: "unique",
      label: "\u6A19\u7C64\u540D\u7A31",
      validation: { isRequired: true }
    }),
    brief: (0, import_fields2.text)({
      label: "\u524D\u8A00",
      ui: { displayMode: "textarea" }
    }),
    heroVideo: (0, import_fields2.relationship)({
      ref: "Video",
      label: "Leading Video"
    }),
    state: (0, import_fields2.select)({
      defaultValue: "active",
      options: [
        { label: "inactive", value: "inactive" },
        { label: "active", value: "active" },
        { label: "archived", value: "archived" }
      ],
      label: "\u72C0\u614B"
    }),
    ogTitle: (0, import_fields2.text)({
      validation: { isRequired: false },
      label: "FB\u5206\u4EAB\u6A19\u984C"
    }),
    ogDescription: (0, import_fields2.text)({
      validation: { isRequired: false },
      label: "FB\u5206\u4EAB\u8AAA\u660E"
    }),
    ogImage: (0, import_fields2.relationship)({
      ref: "Photo",
      label: "FB\u5206\u4EAB\u7E2E\u5716"
    }),
    isFeatured: (0, import_fields2.checkbox)({
      label: "\u7F6E\u9802"
    }),
    posts: (0, import_fields2.relationship)({
      ref: "Post.tags",
      many: true,
      label: "\u76F8\u95DC\u6587\u7AE0"
    }),
    images: (0, import_fields2.relationship)({
      ref: "Photo.tags",
      many: true,
      label: "\u76F8\u95DC\u6A19\u7C64"
    })
  },
  access: {
    operation: {
      query: allowRoles2(admin2, moderator2, editor2),
      update: allowRoles2(admin2, moderator2),
      create: allowRoles2(admin2, moderator2),
      delete: allowRoles2(admin2)
    }
  }
});
var Tag_default = import_lilith_core2.utils.addTrackingFields(listConfigurations2);

// lists/Category.ts
var import_lilith_core3 = require("@mirrormedia/lilith-core");
var import_core3 = require("@keystone-6/core");
var import_fields3 = require("@keystone-6/core/fields");
var { allowRoles: allowRoles3, admin: admin3, moderator: moderator3, editor: editor3 } = import_lilith_core3.utils.accessControl;
var listConfigurations3 = (0, import_core3.list)({
  fields: {
    slug: (0, import_fields3.text)({
      label: "\u540D\u7A31",
      validation: { isRequired: true },
      isIndexed: "unique"
    }),
    title: (0, import_fields3.text)({
      label: "\u4E2D\u6587\u540D\u7A31",
      validation: { isRequired: true }
    }),
    isFeatured: (0, import_fields3.checkbox)({
      label: "\u7F6E\u9802"
    }),
    state: (0, import_fields3.select)({
      isIndexed: true,
      options: [
        { label: "true", value: "true" },
        { label: "false", value: "false" }
      ]
    }),
    style: (0, import_fields3.select)({
      isIndexed: true,
      options: [
        { label: "feature", value: "feature" },
        { label: "listing", value: "listing" },
        { label: "tile", value: "tile" }
      ]
    }),
    heroImage: (0, import_fields3.relationship)({
      label: "\u9996\u5716",
      ref: "Photo"
    }),
    sortOrder: (0, import_fields3.integer)({
      defaultValue: 1,
      label: "\u6392\u5E8F"
    }),
    ogTitle: (0, import_fields3.text)({
      label: "FB\u5206\u4EAB\u6A19\u984C",
      validation: { isRequired: false }
    }),
    ogDescription: (0, import_fields3.text)({
      label: "FB\u5206\u4EAB\u8AAA\u660E",
      validation: { isRequired: false }
    }),
    ogImage: (0, import_fields3.relationship)({
      label: "FB\u5206\u4EAB\u7E2E\u5716",
      ref: "Photo"
    }),
    css: (0, import_fields3.text)({
      label: "CSS",
      ui: { displayMode: "textarea" }
    }),
    javascript: (0, import_fields3.text)({
      label: "javascript",
      ui: { displayMode: "textarea" }
    }),
    relatedPost: (0, import_fields3.relationship)({
      ref: "Post.categories",
      many: true
    })
  },
  access: {
    operation: {
      query: allowRoles3(admin3, moderator3, editor3),
      update: allowRoles3(admin3, moderator3),
      create: allowRoles3(admin3, moderator3),
      delete: allowRoles3(admin3)
    }
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: "PUBLIC" }
  }
});
var Category_default = import_lilith_core3.utils.addTrackingFields(listConfigurations3);

// config.ts
var database = {
  provider: environment_variables_default.database.provider,
  url: environment_variables_default.database.url
};
var session = {
  secret: environment_variables_default.session.secret,
  maxAge: environment_variables_default.session.maxAge
};
var storage = {
  gcpUrlBase: `https://storage.googleapis.com/${environment_variables_default.gcs.bucket}/`,
  webUrlBase: `https://storage.googleapis.com/${environment_variables_default.gcs.bucket}/`,
  bucket: environment_variables_default.gcs.bucket,
  filename: "original"
};
var googleCloudStorage = {
  origin: "https://storage.googleapis.com",
  bucket: environment_variables_default.gcs.bucket
};
var files = {
  baseUrl: environment_variables_default.files.baseUrl,
  storagePath: environment_variables_default.files.storagePath
};
var images = {
  baseUrl: environment_variables_default.images.baseUrl,
  gcsBaseUrl: environment_variables_default.images.gcsBaseUrl,
  storagePath: environment_variables_default.images.storagePath
};
var config_default = {
  database,
  session,
  storage,
  googleCloudStorage,
  files,
  images
};

// lists/Audio.ts
var import_lilith_core4 = require("@mirrormedia/lilith-core");
var import_core4 = require("@keystone-6/core");
var import_fields4 = require("@keystone-6/core/fields");
var { admin: admin4, allowRoles: allowRoles4, moderator: moderator4 } = import_lilith_core4.utils.accessControl;
var listConfigurations4 = (0, import_core4.list)({
  fields: {
    name: (0, import_fields4.text)({
      label: "\u6A19\u984C",
      validation: { isRequired: true }
    }),
    file: (0, import_fields4.file)({
      label: "\u6A94\u6848",
      storage: "files"
    }),
    description: (0, import_fields4.text)({
      label: "\u63CF\u8FF0",
      ui: {
        displayMode: "textarea"
      }
    }),
    // todo
    tags: (0, import_fields4.text)({
      label: "\u6A19\u7C64",
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        }
      }
    }),
    meta: (0, import_fields4.text)({
      label: "\u4E2D\u7E7C\u8CC7\u6599",
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        }
      }
    }),
    url: (0, import_fields4.virtual)({
      label: "\u6A94\u6848\u7DB2\u5740",
      field: import_core4.graphql.field({
        type: import_core4.graphql.String,
        async resolve(item) {
          const audioUrl = item.file_filename;
          return audioUrl ? `${config_default.googleCloudStorage.origin}/${config_default.googleCloudStorage.bucket}/files/${audioUrl}` : null;
        }
      })
    }),
    duration: (0, import_fields4.text)({
      label: "\u9577\u5EA6\uFF08\u79D2\uFF09",
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        }
      }
    })
  },
  access: {
    operation: {
      query: () => true,
      update: allowRoles4(admin4, moderator4),
      create: allowRoles4(admin4, moderator4),
      delete: allowRoles4(admin4)
    }
  },
  hooks: {
    // resolveInput: async ({ inputData, item, resolvedData }) => {
    //   // @ts-ignore: item might be undefined, should be handle properly
    //   gcsFileAdapter.startFileProcessingFlow(resolvedData, item, inputData)
    //   return resolvedData
    // },
    // beforeOperation: async ({ operation, item }) => {
    //   if (operation === 'delete' && item.file_filename) {
    //     gcsFileAdapter.startDeleteProcess(`${item.file_filename}`)
    //   }
    // },
  }
});
var Audio_default = import_lilith_core4.utils.addTrackingFields(listConfigurations4);

// lists/Video.ts
var import_lilith_core5 = require("@mirrormedia/lilith-core");
var import_core5 = require("@keystone-6/core");
var import_fields5 = require("@keystone-6/core/fields");
var { allowRoles: allowRoles5, admin: admin5, moderator: moderator5 } = import_lilith_core5.utils.accessControl;
var listConfigurations5 = (0, import_core5.list)({
  fields: {
    name: (0, import_fields5.text)({
      label: "\u6A19\u984C",
      validation: { isRequired: true }
    }),
    youtubeUrl: (0, import_fields5.text)({
      label: "Youtube\u7DB2\u5740"
    }),
    file: (0, import_fields5.file)({
      label: "\u6A94\u6848",
      storage: "files"
    }),
    coverPhoto: (0, import_fields5.relationship)({
      label: "\u9996\u5716",
      ref: "Photo",
      ui: {
        hideCreate: true
      }
    }),
    description: (0, import_fields5.text)({
      label: "\u63CF\u8FF0",
      ui: {
        displayMode: "textarea"
      }
    }),
    // todo
    tags: (0, import_fields5.text)({
      label: "\u6A19\u7C64",
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        }
      }
    }),
    meta: (0, import_fields5.text)({
      label: "\u4E2D\u7E7C\u8CC7\u6599",
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        }
      }
    }),
    url: (0, import_fields5.virtual)({
      label: "\u6A94\u6848\u7DB2\u5740",
      field: import_core5.graphql.field({
        type: import_core5.graphql.String,
        async resolve(item) {
          const videoUrl = item.file_filename;
          return videoUrl ? `${config_default.googleCloudStorage.origin}/${config_default.googleCloudStorage.bucket}/files/${videoUrl}` : null;
        }
      })
    }),
    duration: (0, import_fields5.text)({
      label: "\u5F71\u7247\u9577\u5EA6\uFF08\u79D2\uFF09",
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        }
      }
    })
  },
  access: {
    operation: {
      query: () => true,
      update: allowRoles5(admin5, moderator5),
      create: allowRoles5(admin5, moderator5),
      delete: allowRoles5(admin5)
    }
  },
  hooks: {
    // resolveInput: async ({ inputData, item, resolvedData }) => {
    //   // @ts-ignore: item might be undefined, should be handle properly
    //   gcsFileAdapter.startFileProcessingFlow(resolvedData, item, inputData)
    //   return resolvedData
    // },
    // beforeOperation: async ({ operation, item }) => {
    //   if (operation === 'delete' && item.file_filename) {
    //     gcsFileAdapter.startDeleteProcess(`${item.file_filename}`)
    //   }
    // },
  }
});
var Video_default = import_lilith_core5.utils.addTrackingFields(listConfigurations5);

// lists/EditorChoice.ts
var import_lilith_core6 = require("@mirrormedia/lilith-core");
var import_core6 = require("@keystone-6/core");
var import_fields6 = require("@keystone-6/core/fields");
var { allowRoles: allowRoles6, admin: admin6, moderator: moderator6, editor: editor4 } = import_lilith_core6.utils.accessControl;
var listConfigurations6 = (0, import_core6.list)({
  fields: {
    sortOrder: (0, import_fields6.integer)({
      label: "\u6392\u5E8F\u9806\u4F4D"
    }),
    name: (0, import_fields6.text)({
      label: "\u6A19\u984C"
    }),
    description: (0, import_fields6.text)({
      label: "\u63CF\u8FF0"
    }),
    choices: (0, import_fields6.relationship)({
      ref: "Post",
      many: false,
      label: "\u7CBE\u9078\u6587\u7AE0"
    }),
    link: (0, import_fields6.text)({
      label: "\u9023\u7D50"
    }),
    heroImage: (0, import_fields6.relationship)({
      label: "\u9996\u5716",
      ref: "Photo"
    }),
    state: (0, import_fields6.select)({
      defaultValue: "draft",
      options: [
        { label: "draft", value: "draft" },
        { label: "published", value: "published" },
        { label: "scheduled", value: "scheduled" },
        { label: "archived", value: "archived" },
        { label: "invisible", value: "invisible" }
      ],
      isIndexed: true,
      label: "\u72C0\u614B"
    })
  },
  access: {
    operation: {
      query: allowRoles6(admin6, moderator6, editor4),
      update: allowRoles6(admin6, moderator6),
      create: allowRoles6(admin6, moderator6),
      delete: allowRoles6(admin6)
    }
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: "PUBLIC" }
  }
});
var EditorChoice_default = import_lilith_core6.utils.addTrackingFields(listConfigurations6);

// lists/User.ts
var import_core7 = require("@keystone-6/core");
var import_lilith_core7 = require("@mirrormedia/lilith-core");
var import_fields7 = require("@keystone-6/core/fields");
var { allowRolesForUsers, admin: admin7, moderator: moderator7, editor: editor5 } = import_lilith_core7.utils.accessControl;
var listConfigurations7 = (0, import_core7.list)({
  fields: {
    name: (0, import_fields7.text)({
      label: "\u59D3\u540D",
      validation: { isRequired: true }
    }),
    email: (0, import_fields7.text)({
      label: "Email",
      validation: { isRequired: true },
      isIndexed: "unique",
      isFilterable: true
    }),
    password: (0, import_fields7.password)({
      label: "\u5BC6\u78BC",
      validation: { isRequired: true }
    }),
    role: (0, import_fields7.select)({
      label: "\u89D2\u8272\u6B0A\u9650",
      type: "string",
      options: [
        {
          label: "admin",
          value: "admin"
        },
        {
          label: "moderator",
          value: "moderator"
        },
        {
          label: "editor",
          value: "editor"
        },
        {
          label: "contributor",
          value: "contributor"
        }
      ],
      validation: { isRequired: true }
    }),
    isProtected: (0, import_fields7.checkbox)({
      defaultValue: false
    })
    // posts: relationship({ ref: 'Post.author', many: true }),
  },
  ui: {
    listView: {
      initialColumns: ["name", "role"]
    }
  },
  access: {
    operation: {
      query: allowRolesForUsers(admin7, moderator7, editor5),
      update: allowRolesForUsers(admin7, moderator7),
      create: allowRolesForUsers(admin7, moderator7),
      delete: allowRolesForUsers(admin7)
    }
  },
  hooks: {}
});
var User_default = listConfigurations7;

// lists/Author.ts
var import_lilith_core8 = require("@mirrormedia/lilith-core");
var import_core8 = require("@keystone-6/core");
var import_fields8 = require("@keystone-6/core/fields");
var { allowRoles: allowRoles7, admin: admin8, moderator: moderator8, editor: editor6 } = import_lilith_core8.utils.accessControl;
var listConfigurations8 = (0, import_core8.list)({
  fields: {
    name: (0, import_fields8.text)({
      isIndexed: true,
      label: "\u4F5C\u8005\u59D3\u540D",
      validation: { isRequired: true }
    }),
    name_en: (0, import_fields8.text)({
      label: "\u82F1\u6587\u59D3\u540D"
    }),
    title: (0, import_fields8.select)({
      label: "\u4E2D\u6587\u8077\u7A31",
      options: [
        { label: "\u7E3D\u7DE8\u8F2F", value: "editor in chief" },
        { label: "\u7522\u54C1\u7D93\u7406", value: "product manager" },
        { label: "\u8A2D\u8A08\u5E2B", value: "product designer" },
        { label: "\u8A18\u8005", value: "journalist" },
        { label: "\u793E\u7FA4", value: "social media editor" },
        { label: "\u524D\u7AEF\u5DE5\u7A0B\u5E2B", value: "front-end engineer" },
        { label: "\u5F8C\u7AEF\u5DE5\u7A0B\u5E2B", value: "back-end engineer" },
        { label: "\u5168\u7AEF\u5DE5\u7A0B\u5E2B", value: "full-stack engineer" },
        { label: "\u5C08\u984C\u88FD\u4F5C\u4EBA", value: "Feature Producer" },
        { label: "App\u5DE5\u7A0B\u5E2B", value: "App engineer" }
      ],
      defaultValue: "journalist"
    }),
    title_en: (0, import_fields8.select)({
      label: "\u82F1\u6587\u8077\u7A31",
      options: [
        { label: "\u7E3D\u7DE8\u8F2F", value: "editor in chief" },
        { label: "\u7522\u54C1\u7D93\u7406", value: "product manager" },
        { label: "\u8A2D\u8A08\u5E2B", value: "product designer" },
        { label: "\u8A18\u8005", value: "journalist" },
        { label: "\u793E\u7FA4", value: "social media editor" },
        { label: "\u524D\u7AEF\u5DE5\u7A0B\u5E2B", value: "front-end engineer" },
        { label: "\u5F8C\u7AEF\u5DE5\u7A0B\u5E2B", value: "back-end engineer" },
        { label: "\u5168\u7AEF\u5DE5\u7A0B\u5E2B", value: "full-stack engineer" },
        { label: "\u5C08\u984C\u88FD\u4F5C\u4EBA", value: "Feature Producer" },
        { label: "App\u5DE5\u7A0B\u5E2B", value: "App engineer" }
      ],
      defaultValue: "journalist"
    }),
    email: (0, import_fields8.text)({
      isIndexed: "unique",
      db: {
        isNullable: true
      }
    }),
    image: (0, import_fields8.relationship)({
      label: "\u7167\u7247",
      ref: "Photo"
    }),
    homepage: (0, import_fields8.text)({
      label: "\u500B\u4EBA\u9996\u9801",
      isIndexed: void 0
    }),
    sort: (0, import_fields8.integer)({
      label: "\u6392\u5E8F"
    }),
    isMember: (0, import_fields8.checkbox)({
      label: "\u5718\u968A\u6210\u54E1"
    }),
    special_number: (0, import_fields8.text)({
      label: "\u6578\u5B57"
    }),
    number_desc: (0, import_fields8.text)({
      label: "\u6578\u5B57\u8AAA\u660E\uFF08\u4E2D\u6587\uFF09"
    }),
    number_desc_en: (0, import_fields8.text)({
      label: "\u6578\u5B57\u8AAA\u660E\uFF08\u82F1\u6587\uFF09"
    }),
    facebook: (0, import_fields8.text)({
      isIndexed: void 0
    }),
    twitter: (0, import_fields8.text)({
      isIndexed: void 0
    }),
    instagram: (0, import_fields8.text)({
      isIndexed: true
    }),
    address: (0, import_fields8.text)({}),
    bio: (0, import_fields8.text)({
      label: "\u7C21\u4ECB"
    }),
    posts: (0, import_fields8.relationship)({
      ref: "Post.writers",
      many: true,
      label: "\u6587\u7AE0"
    })
  },
  access: {
    operation: {
      query: allowRoles7(admin8, moderator8, editor6),
      update: allowRoles7(admin8, moderator8),
      create: allowRoles7(admin8, moderator8),
      delete: allowRoles7(admin8)
    }
  }
});
var Author_default = import_lilith_core8.utils.addTrackingFields(listConfigurations8);

// lists/Image.ts
var import_lilith_core9 = require("@mirrormedia/lilith-core");
var import_core9 = require("@keystone-6/core");
var import_fields9 = require("@keystone-6/core/fields");
var { allowRoles: allowRoles8, admin: admin9, moderator: moderator9, editor: editor7 } = import_lilith_core9.utils.accessControl;
var listConfigurations9 = (0, import_core9.list)({
  db: {
    map: "Image"
  },
  fields: {
    name: (0, import_fields9.text)({
      label: "\u6A19\u984C",
      validation: { isRequired: true }
    }),
    imageFile: (0, import_fields9.image)({
      storage: "images"
    }),
    resized: (0, import_fields9.virtual)({
      field: import_core9.graphql.field({
        type: import_core9.graphql.object()({
          name: "ResizedImages",
          fields: {
            original: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w480: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w800: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w1200: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w1600: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w2400: import_core9.graphql.field({ type: import_core9.graphql.String })
          }
        }),
        resolve(item) {
          const empty = {
            original: "",
            w480: "",
            w800: "",
            w1200: "",
            w1600: "",
            w2400: ""
          };
          if (item?.urlOriginal) {
            return Object.assign(empty, {
              original: item.urlOriginal
            });
          }
          const rtn = {};
          const filename = item?.imageFile_id;
          if (!filename) {
            return empty;
          }
          const extension = item?.imageFile_extension ? "." + item.imageFile_extension : "";
          const width = typeof item?.imageFile_width === "number" ? item.imageFile_width : 0;
          const height = typeof item?.imageFile_height === "number" ? item.imageFile_height : 0;
          const resizedTargets = width >= height ? ["w480", "w800", "w1600", "w2400"] : ["w480", "w800", "w1200", "w1600"];
          resizedTargets.forEach((target) => {
            rtn[target] = `${config_default.images.gcsBaseUrl}/images/${filename}-${target}${extension}`;
          });
          rtn["original"] = `${config_default.images.gcsBaseUrl}/images/${filename}${extension}`;
          return Object.assign(empty, rtn);
        }
      }),
      ui: {
        query: "{ original w480 w800 w1200 w1600 w2400 }"
      }
    }),
    resizedWebp: (0, import_fields9.virtual)({
      field: import_core9.graphql.field({
        type: import_core9.graphql.object()({
          name: "ResizedWebPImages",
          fields: {
            original: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w480: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w800: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w1200: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w1600: import_core9.graphql.field({ type: import_core9.graphql.String }),
            w2400: import_core9.graphql.field({ type: import_core9.graphql.String })
          }
        }),
        resolve(item) {
          const empty = {
            original: "",
            w480: "",
            w800: "",
            w1200: "",
            w1600: "",
            w2400: ""
          };
          if (item?.urlOriginal) {
            return Object.assign(empty, {
              original: item.urlOriginal
            });
          }
          const rtn = {};
          const filename = item?.imageFile_id;
          if (!filename) {
            return empty;
          }
          const extension = ".webP";
          const width = typeof item?.imageFile_width === "number" ? item.imageFile_width : 0;
          const height = typeof item?.imageFile_height === "number" ? item.imageFile_height : 0;
          const resizedTargets = width >= height ? ["w480", "w800", "w1600", "w2400"] : ["w480", "w800", "w1200", "w1600"];
          resizedTargets.forEach((target) => {
            rtn[target] = `${config_default.images.gcsBaseUrl}/images/${filename}-${target}${extension}`;
          });
          rtn["original"] = `${config_default.images.gcsBaseUrl}/images/${filename}${extension}`;
          return Object.assign(empty, rtn);
        }
      }),
      ui: {
        query: "{ original w480 w800 w1200 w1600 w2400 }"
      }
    }),
    file: (0, import_fields9.file)({
      label: "\u6A94\u6848\uFF08\u5EFA\u8B70\u9577\u908A\u5927\u65BC 2000 pixel\uFF09",
      storage: "files",
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        },
        listView: {
          fieldMode: "read"
        }
      }
    }),
    tags: (0, import_fields9.relationship)({
      ref: "Tag.images",
      many: true,
      label: "\u76F8\u95DC\u6A19\u7C64",
      ui: {
        itemView: { fieldMode: "hidden" },
        createView: { fieldMode: "hidden" }
      }
    }),
    urlOriginal: (0, import_fields9.text)({
      ui: {
        createView: {
          fieldMode: "hidden"
        },
        itemView: {
          fieldMode: "read"
        },
        listView: {
          fieldMode: "read"
        }
      }
    })
  },
  ui: {
    listView: {
      initialColumns: ["name", "imageFile"],
      initialSort: {
        // @ts-ignore: `updatedAt` field does exist
        field: "updatedAt",
        direction: "ASC"
      },
      pageSize: 50
    }
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: "PUBLIC" }
  },
  access: {
    operation: {
      query: () => true,
      update: allowRoles8(admin9, moderator9, editor7),
      create: allowRoles8(admin9, moderator9, editor7),
      delete: allowRoles8(admin9)
    }
  }
});
var Image_default = import_lilith_core9.utils.addTrackingFields(listConfigurations9);

// lists/PageVariable.ts
var import_core10 = require("@keystone-6/core");
var import_lilith_core10 = require("@mirrormedia/lilith-core");
var import_fields10 = require("@keystone-6/core/fields");
var { allowRoles: allowRoles9, admin: admin10, moderator: moderator10, editor: editor8 } = import_lilith_core10.utils.accessControl;
var listConfigurations10 = (0, import_core10.list)({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    name: (0, import_fields10.text)({
      label: "\u6B04\u4F4D\u540D\u7A31",
      validation: { isRequired: true }
    }),
    relatedImage: (0, import_fields10.relationship)({
      label: "\u5716\u7247",
      ref: "Photo"
    }),
    value: import_lilith_core10.customFields.richTextEditor({
      label: "\u5167\u5BB9",
      disabledButtons: [],
      website: "readr"
    }),
    page: (0, import_fields10.select)({
      label: "\u6240\u5C6C\u9801\u9762",
      options: [
        { label: "\u95DC\u65BC\u6211\u5011", value: "about" },
        { label: "About Us", value: "about-en" },
        { label: "\u96B1\u79C1\u6B0A", value: "privacy" }
      ],
      defaultValue: "about",
      isIndexed: true
    }),
    url: (0, import_fields10.text)({
      label: "URL"
    })
  },
  access: {
    operation: {
      query: allowRoles9(admin10, moderator10, editor8),
      update: allowRoles9(admin10, moderator10),
      create: allowRoles9(admin10, moderator10),
      delete: allowRoles9(admin10)
    }
  }
});
var PageVariable_default = import_lilith_core10.utils.addTrackingFields(listConfigurations10);

// lists/index.ts
var listDefinition = {
  EditorChoice: EditorChoice_default,
  Photo: Image_default,
  Author: Author_default,
  PageVariable: PageVariable_default,
  Video: Video_default,
  AudioFile: Audio_default,
  Tag: Tag_default,
  Category: Category_default,
  User: User_default,
  Post: Post_default
};

// keystone.ts
var import_http_proxy_middleware = require("http-proxy-middleware");
var import_express = __toESM(require("express"));
var import_auth = require("@keystone-6/auth");
var import_session = require("@keystone-6/core/session");
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  sessionData: "name role",
  secretField: "password",
  initFirstItem: {
    // If there are no items in the database, keystone will ask you to create
    // a new user, filling in these fields.
    fields: ["name", "email", "password", "role"]
  }
});
var session2 = (0, import_session.statelessSessions)(config_default.session);
var keystone_default = withAuth(
  (0, import_core11.config)({
    db: {
      provider: config_default.database.provider,
      url: config_default.database.url,
      idField: {
        kind: "autoincrement"
      }
    },
    ui: {
      // If `isDisabled` is set to `true` then the Admin UI will be completely disabled.
      isDisabled: environment_variables_default.isUIDisabled,
      // For our starter, we check that someone has session data before letting them see the Admin UI.
      isAccessAllowed: (context) => !!context.session?.data
    },
    lists: listDefinition,
    session: session2,
    storage: {
      files: {
        kind: "local",
        type: "file",
        storagePath: config_default.files.storagePath,
        serverRoute: {
          path: "/files"
        },
        generateUrl: (path) => `/files${path}`
      },
      images: {
        kind: "local",
        type: "image",
        storagePath: config_default.images.storagePath,
        serverRoute: {
          path: "/images"
        },
        generateUrl: (path) => `/images${path}`
      }
    },
    server: {
      healthCheck: {
        path: "/health_check",
        data: { status: "healthy" }
      },
      extendExpressApp: (app, commonContext) => {
        const jsonBodyParser = import_express.default.json({ limit: "50mb" });
        app.use(jsonBodyParser);
        const authenticationMw = async (req, res, next) => {
          const context = await commonContext.withRequest(req, res);
          if (context?.session?.data?.role) {
            return next();
          }
          res.redirect("/signin");
        };
        const previewProxyMiddleware = (0, import_http_proxy_middleware.createProxyMiddleware)({
          target: environment_variables_default.previewServerOrigin,
          changeOrigin: true,
          onProxyRes: (proxyRes) => {
            proxyRes.headers["cache-control"] = "no-store";
          }
        });
        app.get("/story/:id", authenticationMw, previewProxyMiddleware);
        app.get("/event/:slug", authenticationMw, previewProxyMiddleware);
        app.get("/news/:id", authenticationMw, previewProxyMiddleware);
        app.use(
          "/_nuxt/*",
          (0, import_http_proxy_middleware.createProxyMiddleware)({
            target: environment_variables_default.previewServerOrigin,
            changeOrigin: true
          })
        );
      }
    }
  })
);
