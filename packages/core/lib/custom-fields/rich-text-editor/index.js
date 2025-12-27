"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.richTextEditor = void 0;
var _types = require("@keystone-6/core/types");
var _core = require("@keystone-6/core");
const richTextEditor = ({
  defaultValue = null,
  disabledButtons = [],
  hideOnMobileButtons = [],
  presetColors = [],
  website,
  ...config
} = {}) => meta => {
  var _config$db;
  if (!website) {
    throw Error('required property `website` was not provided in calling richTextEditor');
  }

  // @ts-ignore: no `isIndexed` property in config
  if ('isIndexed' in config && config.isIndexed === 'unique') {
    throw Error("isIndexed: 'unique' is not a supported option for field type textEditor");
  }

  // handle null value, ref: https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields#using-null-values
  const resolve = val => val === null && meta.provider === 'postgresql' ? 'DbNull' : val;
  return (0, _types.jsonFieldTypePolyfilledForSQLite)(meta.provider, {
    ...config,
    input: {
      create: {
        arg: _core.graphql.arg({
          type: _core.graphql.JSON
        }),
        resolve(val) {
          return resolve(val === undefined ? defaultValue : val);
        }
      },
      update: {
        arg: _core.graphql.arg({
          type: _core.graphql.JSON
        }),
        resolve
      }
    },
    output: _core.graphql.field({
      type: _core.graphql.JSON
    }),
    views: `@mirrormedia/lilith-core/lib/custom-fields/rich-text-editor/views/${website}`,
    getAdminMeta: () => ({
      defaultValue,
      disabledButtons,
      hideOnMobileButtons,
      presetColors
    })
  }, {
    default: defaultValue === null ? undefined : {
      kind: 'literal',
      value: JSON.stringify(defaultValue)
    },
    map: (_config$db = config.db) === null || _config$db === void 0 ? void 0 : _config$db.map
  });
};
exports.richTextEditor = richTextEditor;