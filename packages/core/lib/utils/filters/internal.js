"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.postgresql = exports.mysql = void 0;
exports.resolveCommon = resolveCommon;
exports.resolveString = resolveString;
exports.sqlite = void 0;
var _postgresql = _interopRequireWildcard(require("./providers/postgresql"));
exports.postgresql = _postgresql;
var _sqlite = _interopRequireWildcard(require("./providers/sqlite"));
exports.sqlite = _sqlite;
var _mysql = _interopRequireWildcard(require("./providers/mysql"));
exports.mysql = _mysql;
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const objectEntriesButAssumeNoExtraProperties = Object.entries;
function internalResolveFilter(entries, mode) {
  const entry = entries.shift();
  if (entry === undefined) return {};
  const [key, val] = entry;
  if (val == null) {
    return {
      AND: [{
        [key]: val
      }, internalResolveFilter(entries, mode)]
    };
  }
  switch (key) {
    case 'equals':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
    case 'in':
    case 'contains':
    case 'startsWith':
    case 'endsWith':
      {
        return {
          AND: [{
            [key]: val,
            mode
          }, {
            not: null
          }, internalResolveFilter(entries, mode)]
        };
      }
    case 'notIn':
      {
        return {
          AND: [{
            NOT: [internalResolveFilter(objectEntriesButAssumeNoExtraProperties({
              in: val
            }), mode)]
          }, internalResolveFilter(entries, mode)]
        };
      }
    case 'not':
      {
        return {
          AND: [{
            NOT: [internalResolveFilter(objectEntriesButAssumeNoExtraProperties(val), mode)]
          }, internalResolveFilter(entries, mode)]
        };
      }
  }
}
function resolveCommon(val) {
  if (val === null) return null;
  return internalResolveFilter(objectEntriesButAssumeNoExtraProperties(val), undefined);
}
function resolveString(val) {
  if (val === null) return null;
  const {
    mode,
    ...rest
  } = val;
  return internalResolveFilter(objectEntriesButAssumeNoExtraProperties(rest), mode);
}