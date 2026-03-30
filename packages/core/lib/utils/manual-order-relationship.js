"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _core = require("@keystone-6/core");
var _fields = require("@keystone-6/core/fields");
/** Item for order data */

/**
 * For `relationship` field, KeystoneJS won't take user input order into account.
 * Therefore, after the create/update operation is done,
 * the order of relationship items maybe not be the same order as the user input order.
 *
 * This function
 * - adds monitoring fields in the list
 * - adds virtual fields in the list. These virtual fields could return relationship items in order.
 * - decorate `list.hooks.resolveInput` to record the user input order in the monitoring fields
 *
 * For example, if we have two lists like
 *  ```
 *  const User = {
 *    fields: {
 *      name: text(),
 *    }
 *  }
 *
 *  const Post = {
 *    fields: {
 *      title: text(),
 *      content: text(),
 *      authors: relationship({ref: 'User', many: true})
 *    }
 *  }
 *  ```
 *
 *  if we want to snapshot the authors input order, we can use this function like
 *  ```
 *  const postList = addManualOrderRelationshipFields([
 *    {
 *      fieldName: 'manualOrderOfAuthors',
 *      fieldLabel: 'authors 手動排序結果',
 *      targetFieldName: 'authors', // the target field to record the user input order
 *      targetListName: 'User', // relationship list name
 *      targetListLabelField: 'name', // refer to `User.fields.name`
 *    }
 *  ])(Post)
 *  ```
 *
 *  `addManualOrderRelationshipFields` will create another JSON field `manualOrderOfAuthors` and virtual field `authorsInInputOrder` in the list,
 *  and decorate `list.hooks.resolveInput` to record the update/create operation,
 *  if the operation modifies the order of the relationship field.
 *
 *  `authorsInInputOrder` is a virtual field, which means its value is computed on-the-fly, not stored in the database. This virtual field combines relationship field `authors` and monitoring field `manualOrderOfAuthors` to sort the authors in specific input order.
 */
function orderFromRelationshipItems(related, labelField) {
  if (!Array.isArray(related)) {
    return [];
  }
  const out = [];
  for (const x of related) {
    if (!x || typeof x !== 'object' || !('id' in x)) {
      continue;
    }
    const o = x;
    out.push({
      id: String(o.id),
      [labelField]: o[labelField]
    });
  }
  return out;
}
function prismaDelegateForListKey(context, listKey) {
  const prisma = context.prisma;
  if (!prisma) {
    return null;
  }
  const camel = listKey.charAt(0).toLowerCase() + listKey.slice(1);
  return prisma[camel] ?? null;
}
function normalizeItemId(id) {
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    return Number(id);
  }
  return id;
}
function addManualOrderRelationshipFields(manualOrderFields = [], list, options) {
  var _list$hooks;
  manualOrderFields.forEach(mo => {
    var _list$fields;
    if (!((_list$fields = list.fields) !== null && _list$fields !== void 0 && _list$fields[mo.fieldName])) {
      list.fields[mo.fieldName] = (0, _fields.json)({
        label: mo.fieldLabel,
        ui: {
          itemView: {
            fieldMode: 'read'
          },
          createView: {
            fieldMode: 'hidden'
          },
          listView: {
            fieldMode: 'hidden'
          },
          ...(options !== null && options !== void 0 && options.manualOrderJsonViews ? {
            views: options.manualOrderJsonViews
          } : {})
        }
      });
    }

    // add virtual field definition
    addVirtualFieldToReturnItemsInInputOrder(list, mo);
  });

  // decorate `resolveInput` hook
  list.hooks = list.hooks || {};
  const originResolveInput = (_list$hooks = list.hooks) === null || _list$hooks === void 0 ? void 0 : _list$hooks.resolveInput;
  list.hooks.resolveInput = async props => {
    let resolvedData = props.resolvedData;
    if (typeof originResolveInput === 'function') {
      resolvedData = await originResolveInput(props);
    }
    const {
      item,
      context
    } = props;
    let parentRowLoaded = false;
    let parentRow = null;
    const ensureParentRow = async () => {
      if (parentRowLoaded) {
        return parentRow;
      }
      parentRowLoaded = true;
      if (!(options !== null && options !== void 0 && options.parentListKey) || !(item !== null && item !== void 0 && item.id)) {
        return null;
      }
      const delegate = prismaDelegateForListKey(context, options.parentListKey);
      if (!(delegate !== null && delegate !== void 0 && delegate.findUnique)) {
        return null;
      }
      const select = {};
      for (const mo of manualOrderFields) {
        select[mo.targetFieldName] = {
          select: {
            id: true,
            [mo.targetListLabelField]: true
          }
        };
      }
      try {
        const row = await delegate.findUnique({
          where: {
            id: normalizeItemId(item.id)
          },
          select
        });
        parentRow = row || null;
      } catch {
        parentRow = null;
      }
      return parentRow;
    };

    // check if create/update item has the fields
    // we want to monitor
    for (let i = 0; i < manualOrderFields.length; i++) {
      var _resolvedData;
      const {
        targetFieldName,
        fieldName,
        targetListName,
        targetListLabelField
      } = manualOrderFields[i];

      // if create/update operation creates/modifies the `${targetFieldName}` field
      if ((_resolvedData = resolvedData) !== null && _resolvedData !== void 0 && _resolvedData[targetFieldName]) {
        var _resolvedData$targetF, _item$targetFieldName, _resolvedData$targetF2, _resolvedData$targetF3;
        let currentOrder = [];

        // 檢查是否要清空所有欄位
        const isDisconnectAll = ((_resolvedData$targetF = resolvedData[targetFieldName]) === null || _resolvedData$targetF === void 0 || (_resolvedData$targetF = _resolvedData$targetF.disconnect) === null || _resolvedData$targetF === void 0 ? void 0 : _resolvedData$targetF.length) === (item === null || item === void 0 || (_item$targetFieldName = item[targetFieldName]) === null || _item$targetFieldName === void 0 ? void 0 : _item$targetFieldName.length);
        const isConnectEmpty = !((_resolvedData$targetF2 = resolvedData[targetFieldName]) !== null && _resolvedData$targetF2 !== void 0 && _resolvedData$targetF2.connect) || ((_resolvedData$targetF3 = resolvedData[targetFieldName]) === null || _resolvedData$targetF3 === void 0 ? void 0 : _resolvedData$targetF3.connect.length) === 0;

        // 如果是清空所有欄位，則使用 set 操作
        if (isDisconnectAll && isConnectEmpty) {
          resolvedData[targetFieldName] = {
            set: []
          };
          resolvedData[fieldName] = [];
        } else {
          var _resolvedData$targetF4;
          // 檢查是否有 set 操作
          if (((_resolvedData$targetF4 = resolvedData[targetFieldName]) === null || _resolvedData$targetF4 === void 0 ? void 0 : _resolvedData$targetF4.set) !== undefined) {
            const setItems = resolvedData[targetFieldName].set || [];
            if (setItems.length > 0) {
              // 如果有 set 操作，則使用 set 的順序
              const setIds = setItems.map(obj => obj.id.toString());
              const sfToSet = await context.db[targetListName].findMany({
                where: {
                  id: {
                    in: setIds
                  }
                }
              });
              for (const setItem of setItems) {
                const sf = sfToSet.find(obj => {
                  return `${obj.id}` === setItem.id.toString();
                });
                if (sf) {
                  currentOrder.push({
                    id: sf.id.toString(),
                    [targetListLabelField]: sf[targetListLabelField]
                  });
                }
              }
            }
          } else {
            var _resolvedData$targetF6;
            // update operation due to `item` not being `undefiend`
            if (item) {
              var _resolvedData$targetF5;
              let previousOrder = getOrderData(item[fieldName]);
              if (previousOrder.length === 0) {
                const row = await ensureParentRow();
                const rel = (row && row[targetFieldName]) ?? item[targetFieldName];
                previousOrder = orderFromRelationshipItems(rel, targetListLabelField);
              }

              // user disconnects/removes some relationship items.
              const disconnectIds = ((_resolvedData$targetF5 = resolvedData[targetFieldName]) === null || _resolvedData$targetF5 === void 0 || (_resolvedData$targetF5 = _resolvedData$targetF5.disconnect) === null || _resolvedData$targetF5 === void 0 ? void 0 : _resolvedData$targetF5.map(obj => obj.id.toString())) || [];

              // filtered out to-be-disconnected relationship items
              currentOrder = previousOrder.filter(({
                id
              }) => {
                return disconnectIds.indexOf(id) === -1;
              });
            }

            // user connects/adds some relationship item.
            const connectOrder = ((_resolvedData$targetF6 = resolvedData[targetFieldName]) === null || _resolvedData$targetF6 === void 0 ? void 0 : _resolvedData$targetF6.connect) || [];
            if (connectOrder.length > 0) {
              // Query relationship items from the database.
              // Therefore, we can have other fields to record in the monitoring field
              const connectedIds = connectOrder.map(obj => obj.id.toString());
              const sfToConnect = await context.db[targetListName].findMany({
                where: {
                  id: {
                    in: connectedIds
                  }
                }
              });

              // 使用 resolvedData 中的 connect 順序來排序
              for (const connectItem of connectOrder) {
                const sf = sfToConnect.find(obj => {
                  return `${obj.id}` === connectItem.id.toString();
                });
                if (sf) {
                  currentOrder.push({
                    id: sf.id.toString(),
                    [targetListLabelField]: sf[targetListLabelField]
                  });
                }
              }
            }
          }
        }
        // 更新 monitoring field
        resolvedData[fieldName] = currentOrder;
      } else {
        /* 表單未帶 relationship 變更（payload 為 falsy）時，manualOrder 快照可能仍為空：
         * update 其它欄位時從 DB 關聯補齊 JSON，後台排序欄位才與現有關聯一致。 */
        const op = props.operation;
        const snapshotEmpty = getOrderData(item === null || item === void 0 ? void 0 : item[fieldName]).length === 0;
        if (op === 'update' && item !== null && item !== void 0 && item.id && options !== null && options !== void 0 && options.parentListKey && snapshotEmpty) {
          const row = await ensureParentRow();
          const rel = (row && row[targetFieldName]) ?? (item === null || item === void 0 ? void 0 : item[targetFieldName]);
          const fromDb = orderFromRelationshipItems(rel, targetListLabelField);
          if (fromDb.length > 0) {
            resolvedData[fieldName] = fromDb;
          }
        }
      }
    }
    return resolvedData;
  };
  return list;
}

/**
 *  This functiona adds the virtual field onto Keystone6 `list` object.
 *  For instance, if we want to use monitoring field `manualOrderOfAuthors`
 *  to monitor relationship field `authors` in the `post` list object.
 *
 *  We could write
 *  ```
 *    addVirtualFieldToReturnItemsInInputOrder(post, {
 *      fieldName: 'manualOrderOfAuthors', // monitoring field
 *      targetFieldName: 'authors', // monitored field
 *      targetListName: 'Author' // relationship list
 *    })
 *  ```
 *  after executing,
 *  `post` list will have `authorsInInputOrder` virtual field.
 *
 *  Return value of this virtual field will follow
 *  `graphql.list(lists.Author.types.output)` GraphQL schema.
 *
 *  And the GQL resolver will be defined in `resolve` function.
 */
function addVirtualFieldToReturnItemsInInputOrder(list, manualOrderField) {
  const virtualFieldName = `${manualOrderField.targetFieldName}InInputOrder`;
  list.fields[virtualFieldName] = (0, _fields.virtual)({
    field: lists => {
      var _lists$manualOrderFie;
      return _core.graphql.field({
        type: _core.graphql.list(lists === null || lists === void 0 || (_lists$manualOrderFie = lists[manualOrderField.targetListName]) === null || _lists$manualOrderFie === void 0 ? void 0 : _lists$manualOrderFie.types.output),
        async resolve(item, args, context) {
          var _context$db;
          const manualOrderFieldValue = (item === null || item === void 0 ? void 0 : item[manualOrderField.fieldName]) || [];
          if (!Array.isArray(manualOrderFieldValue)) {
            return [];
          }

          // collect ids from relationship items
          const ids = manualOrderFieldValue.map(value => value.id);

          // query items from database
          const unorderedItems = await ((_context$db = context.db) === null || _context$db === void 0 ? void 0 : _context$db[manualOrderField.targetListName].findMany({
            where: {
              id: {
                in: ids
              }
            }
          }));
          const orderedItems = [];

          // sort items according to input order
          manualOrderFieldValue.forEach(value => {
            const writer = unorderedItems.find(ui => `${ui === null || ui === void 0 ? void 0 : ui.id}` === `${value === null || value === void 0 ? void 0 : value.id}`);
            if (writer) {
              orderedItems.push(writer);
            }
          });
          return orderedItems;
        }
      });
    },
    ui: {
      // keystone somehow needs `ui.query` even we "hidden" the field in the next two lines.
      query: `{ id, ${manualOrderField.targetFieldName} }`,
      itemView: {
        fieldMode: 'hidden'
      },
      createView: {
        fieldMode: 'hidden'
      }
    }
  });
}
function getOrderData(items) {
  if (Array.isArray(items)) {
    return items.filter(isOrderItem);
  } else {
    return [];
  }
}
function isOrderItem(item) {
  return 'id' in item;
}
var _default = exports.default = addManualOrderRelationshipFields;