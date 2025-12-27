"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addTrackingFields = addTrackingFields;
var _fields = require("@keystone-6/core/fields");
/**
  add additional fields and hooks into existed list.
  hooks: fill data into fields after save .
*/
function addTrackingFields(list) {
  var _list$hooks;
  // list's original hooks.resolveInput came from list
  const originalResolveInput = (_list$hooks = list.hooks) === null || _list$hooks === void 0 ? void 0 : _list$hooks.resolveInput;

  // custom hooks.resolveInput
  const newResolveInput = ({
    resolvedData,
    item,
    context,
    operation
  }) => {
    var _context$session;
    // fill additional fields with corresponding data
    fillAtTrackingField(resolvedData, item);
    const currentUserId = parseInt((_context$session = context.session) === null || _context$session === void 0 ? void 0 : _context$session.itemId);
    if (!currentUserId) return resolvedData;
    fillByTrackingField(currentUserId, resolvedData, item, operation);
    return resolvedData;
  };

  // add additional fields
  list.fields.createdAt = (0, _fields.timestamp)({
    label: '建立時間',
    ui: {
      createView: {
        fieldMode: 'hidden'
      },
      itemView: {
        fieldMode: 'read'
      }
    }
  });
  list.fields.updatedAt = (0, _fields.timestamp)({
    label: '更新時間',
    ui: {
      createView: {
        fieldMode: 'hidden'
      },
      itemView: {
        fieldMode: 'read'
      }
    }
  });
  list.fields.createdBy = (0, _fields.relationship)({
    label: '建立者',
    ref: 'User',
    ui: {
      createView: {
        fieldMode: 'hidden'
      },
      itemView: {
        fieldMode: 'read'
      }
    }
  });
  list.fields.updatedBy = (0, _fields.relationship)({
    label: '更新者',
    ref: 'User',
    ui: {
      createView: {
        fieldMode: 'hidden'
      },
      itemView: {
        fieldMode: 'read'
      }
    }
  });

  // add custom hooks
  // combine the original hook and the custom one
  list.hooks = {
    ...list.hooks,
    resolveInput: combineResolveInputHooks(originalResolveInput, newResolveInput)
  };
  return list;
}
/**
 * combine resolveInput functions
 */
function combineResolveInputHooks(...hooks) {
  // params is came from hooks : resolvedData, item...etc
  return async params => {
    const {
      resolvedData
    } = params;
    return hooks.reduce(async (promiseData, hook) => {
      const data = await promiseData;
      if (typeof hook === 'function') {
        return hook({
          ...params,
          resolvedData: data
        });
      } else {
        return data;
      }
    }, resolvedData);
  };
}

/**
 * Fill relationship's connect data (userId) into field,
 * if it's in create mode, put data into 'createdBy' field;
 * if it's in update mode, then put data into 'updatedBy' field.
 */
function fillByTrackingField(currentUserId, resolvedData, item, operation) {
  const relationshipData = {
    connect: {
      id: currentUserId
    }
  };

  // Note:
  // Although we'll put relationshipData into fields named "createdBy"/"updatedBy",
  // after saved data into db,
  // keystone 6 will do some 'magic-and-weird' process,
  // and then change field name to "created_byId"/"updated_byId"
  // (we can find that via console.log(item))
  // (that process won't affect field view in admin-ui)

  // so if we want to check byTracking's value,
  // we need to use key name "created_byId"/"updated_byId" instead of "createdBy"/"updatedBy"

  switch (operation) {
    case 'create':
      if (currentUserId) {
        resolvedData['createdBy'] = relationshipData;
      }
      break;
    case 'update':
      resolvedData['updatedBy'] = relationshipData;
      break;
    default:
      break;
  }
}

/**
 * Fill Date object into field,
 * if it's in create mode, put created time into 'createdAt' field;
 * if it's in update mode, then put updated time into 'updatedAt' field.
 */
function fillAtTrackingField(resolvedData, item) {
  if (item && item['createdAt']) {
    // update mode
    resolvedData['updatedAt'] = new Date();
  } else {
    // create mode
    resolvedData['createdAt'] = new Date();
  }
}