"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.enumFilters = enumFilters;
var _core = require("@keystone-6/core");
// yes, these two types have the fields but they're semantically different types
// (even though, yes, having EnumFilter by defined as EnumNullableFilter<Enum>, would be the same type but names would show up differently in editors for example)

function enumFilters(enumType) {
  const optional = _core.graphql.inputObject({
    name: `Custom${enumType.graphQLType.name}NullableFilter`,
    fields: () => ({
      equals: _core.graphql.arg({
        type: enumType
      }),
      in: _core.graphql.arg({
        type: _core.graphql.list(_core.graphql.nonNull(enumType))
      }),
      notIn: _core.graphql.arg({
        type: _core.graphql.list(_core.graphql.nonNull(enumType))
      }),
      not: _core.graphql.arg({
        type: optional
      })
    })
  });
  const required = _core.graphql.inputObject({
    name: `Custom${enumType.graphQLType.name}Filter`,
    fields: () => ({
      equals: _core.graphql.arg({
        type: enumType
      }),
      in: _core.graphql.arg({
        type: _core.graphql.list(_core.graphql.nonNull(enumType))
      }),
      notIn: _core.graphql.arg({
        type: _core.graphql.list(_core.graphql.nonNull(enumType))
      }),
      not: _core.graphql.arg({
        type: optional
      })
    })
  });
  const many = _core.graphql.inputObject({
    name: `Custom${enumType.graphQLType.name}NullableListFilter`,
    fields: () => ({
      // can be null
      equals: _core.graphql.arg({
        type: _core.graphql.list(_core.graphql.nonNull(enumType))
      }),
      // can be null
      has: _core.graphql.arg({
        type: enumType
      }),
      hasEvery: _core.graphql.arg({
        type: _core.graphql.list(_core.graphql.nonNull(enumType))
      }),
      hasSome: _core.graphql.arg({
        type: _core.graphql.list(_core.graphql.nonNull(enumType))
      }),
      isEmpty: _core.graphql.arg({
        type: enumType
      })
    })
  });
  return {
    optional,
    required,
    many
  };
}