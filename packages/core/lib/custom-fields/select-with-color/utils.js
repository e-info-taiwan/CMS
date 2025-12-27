"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assertReadIsNonNullAllowed = assertReadIsNonNullAllowed;
exports.getResolvedIsNullable = getResolvedIsNullable;
exports.upcase = exports.humanize = void 0;
function getResolvedIsNullable(validation, db) {
  if ((db === null || db === void 0 ? void 0 : db.isNullable) === false) {
    return false;
  }
  if ((db === null || db === void 0 ? void 0 : db.isNullable) === undefined && validation !== null && validation !== void 0 && validation.isRequired) {
    return false;
  }
  return true;
}
function assertReadIsNonNullAllowed(meta, config, resolvedIsNullable) {
  var _config$graphql;
  if (!resolvedIsNullable) return;
  if (!((_config$graphql = config.graphql) !== null && _config$graphql !== void 0 && (_config$graphql = _config$graphql.isNonNull) !== null && _config$graphql !== void 0 && _config$graphql.read)) return;
  throw new Error(`The field at ${meta.listKey}.${meta.fieldKey} sets graphql.isNonNull.read: true, but not validation.isRequired: true, or db.isNullable: false\n` + `Set validation.isRequired: true, or db.isNullable: false, or graphql.isNonNull.read: false`);
}

/**
 * Converts the first character of a string to uppercase.
 * @param {String} str The string to convert.
 * @returns The new string
 */
const upcase = str => str.slice(0, 1).toUpperCase() + str.slice(1);

/**
 * Turns a passed in string into
 * a human readable label
 * @param {String} str The string to convert.
 * @returns The new string
 */
exports.upcase = upcase;
const humanize = str => {
  return str.replace(/([a-z])([A-Z]+)/g, '$1 $2').split(/\s|_|-/).filter(i => i).map(upcase).join(' ');
};
exports.humanize = humanize;