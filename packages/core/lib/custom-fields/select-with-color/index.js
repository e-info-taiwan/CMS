"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.selectWithColor = void 0;
var _inflection = _interopRequireDefault(require("inflection"));
var _utils = require("./utils");
var _types = require("@keystone-6/core/types");
var _core = require("@keystone-6/core");
var _filters = require("../../utils/filters");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// These are the max and min values available to a 32 bit signed integer
const MAX_INT = 2147483647;
const MIN_INT = -2147483648;
const selectWithColor = ({
  isIndexed,
  ui: {
    displayMode = 'select',
    ...ui
  } = {},
  defaultValue,
  validation,
  ...config
}) => meta => {
  var _config$db, _config$db2;
  const fieldLabel = config.label ?? (0, _utils.humanize)(meta.fieldKey);
  const resolvedIsNullable = (0, _utils.getResolvedIsNullable)(validation, config.db);
  (0, _utils.assertReadIsNonNullAllowed)(meta, config, resolvedIsNullable);
  const commonConfig = options => {
    const values = new Set(options.map(x => x.value));
    if (values.size !== options.length) {
      throw new Error(`The select field at ${meta.listKey}.${meta.fieldKey} has duplicate options, this is not allowed`);
    }
    const shouldShowColorSpan = options.reduce((prev, option) => Object.prototype.hasOwnProperty.call(option ?? {}, 'color') || prev, false);
    return {
      ...config,
      ui,
      hooks: {
        ...config.hooks,
        async validateInput(args) {
          var _config$hooks, _config$hooks$validat;
          const value = args.resolvedData[meta.fieldKey];
          if (value != null && !values.has(value)) {
            args.addValidationError(`${value} is not a possible value for ${fieldLabel}`);
          }
          if ((validation !== null && validation !== void 0 && validation.isRequired || resolvedIsNullable === false) && (value === null || value === undefined && args.operation === 'create')) {
            args.addValidationError(`${fieldLabel} is required`);
          }
          await ((_config$hooks = config.hooks) === null || _config$hooks === void 0 || (_config$hooks$validat = _config$hooks.validateInput) === null || _config$hooks$validat === void 0 ? void 0 : _config$hooks$validat.call(_config$hooks, args));
        }
      },
      __ksTelemetryFieldTypeName: '@mirror-media/custom-select',
      views: '@mirrormedia/lilith-core/lib/custom-fields/select-with-color/views',
      getAdminMeta: () => ({
        options,
        type: config.type ?? 'string',
        displayMode: displayMode,
        shouldShowColorSpan,
        defaultValue: defaultValue ?? null,
        isRequired: (validation === null || validation === void 0 ? void 0 : validation.isRequired) ?? false
      })
    };
  };
  const mode = resolvedIsNullable === false ? 'required' : 'optional';
  const commonDbFieldConfig = {
    mode,
    index: isIndexed === true ? 'index' : isIndexed || undefined,
    default: defaultValue === undefined ? undefined :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {
      kind: 'literal',
      value: defaultValue
    },
    map: (_config$db = config.db) === null || _config$db === void 0 ? void 0 : _config$db.map,
    extendPrismaSchema: (_config$db2 = config.db) === null || _config$db2 === void 0 ? void 0 : _config$db2.extendPrismaSchema
  };
  const resolveCreate = val => {
    if (val === undefined) {
      return defaultValue ?? null;
    }
    return val;
  };
  if (config.type === 'integer') {
    if (config.options.some(({
      value
    }) => !Number.isInteger(value) || value > MAX_INT || value < MIN_INT)) {
      throw new Error(`The select field at ${meta.listKey}.${meta.fieldKey} specifies integer values that are outside the range of a 32 bit signed integer`);
    }
    return (0, _types.fieldType)({
      kind: 'scalar',
      scalar: 'Int',
      ...commonDbFieldConfig
    })({
      ...commonConfig(config.options),
      input: {
        uniqueWhere: isIndexed === 'unique' ? {
          arg: _core.graphql.arg({
            type: _core.graphql.Int
          })
        } : undefined,
        where: {
          arg: _core.graphql.arg({
            type: _filters.filters[meta.provider].Int[mode]
          }),
          resolve: mode === 'required' ? undefined : _filters.filters.resolveCommon
        },
        create: {
          arg: _core.graphql.arg({
            type: _core.graphql.Int,
            defaultValue: typeof defaultValue === 'number' ? defaultValue : undefined
          }),
          resolve: resolveCreate
        },
        update: {
          arg: _core.graphql.arg({
            type: _core.graphql.Int
          })
        },
        orderBy: {
          arg: _core.graphql.arg({
            type: _types.orderDirectionEnum
          })
        }
      },
      output: _core.graphql.field({
        type: _core.graphql.Int
      })
    });
  }
  const options = config.options.map(option => {
    if (typeof option === 'string') {
      return {
        label: (0, _utils.humanize)(option),
        value: option
      };
    }
    return option;
  });
  if (config.type === 'enum') {
    const enumName = `${meta.listKey}${_inflection.default.classify(meta.fieldKey)}Type`;
    const graphQLType = _core.graphql.enum({
      name: enumName,
      values: _core.graphql.enumValues(options.map(x => x.value))
    });
    return (0, _types.fieldType)(meta.provider === 'sqlite' ? {
      kind: 'scalar',
      scalar: 'String',
      ...commonDbFieldConfig
    } : {
      kind: 'enum',
      values: options.map(x => x.value),
      name: enumName,
      ...commonDbFieldConfig
    })({
      ...commonConfig(options),
      input: {
        uniqueWhere: isIndexed === 'unique' ? {
          arg: _core.graphql.arg({
            type: graphQLType
          })
        } : undefined,
        where: {
          arg: _core.graphql.arg({
            type: _filters.filters[meta.provider].enum(graphQLType).optional
          }),
          resolve: mode === 'required' ? undefined : _filters.filters.resolveCommon
        },
        create: {
          arg: _core.graphql.arg({
            type: graphQLType,
            defaultValue: typeof defaultValue === 'string' ? defaultValue : undefined
          }),
          resolve: resolveCreate
        },
        update: {
          arg: _core.graphql.arg({
            type: graphQLType
          })
        },
        orderBy: {
          arg: _core.graphql.arg({
            type: _types.orderDirectionEnum
          })
        }
      },
      output: _core.graphql.field({
        type: graphQLType
      })
    });
  }
  return (0, _types.fieldType)({
    kind: 'scalar',
    scalar: 'String',
    ...commonDbFieldConfig
  })({
    ...commonConfig(options),
    input: {
      uniqueWhere: isIndexed === 'unique' ? {
        arg: _core.graphql.arg({
          type: _core.graphql.String
        })
      } : undefined,
      where: {
        arg: _core.graphql.arg({
          type: _filters.filters[meta.provider].String[mode]
        }),
        resolve: mode === 'required' ? undefined : _filters.filters.resolveString
      },
      create: {
        arg: _core.graphql.arg({
          type: _core.graphql.String,
          defaultValue: typeof defaultValue === 'string' ? defaultValue : undefined
        }),
        resolve: resolveCreate
      },
      update: {
        arg: _core.graphql.arg({
          type: _core.graphql.String
        })
      },
      orderBy: {
        arg: _core.graphql.arg({
          type: _types.orderDirectionEnum
        })
      }
    },
    output: _core.graphql.field({
      type: _core.graphql.String
    })
  });
};
exports.selectWithColor = selectWithColor;