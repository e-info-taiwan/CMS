"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.utils = exports.default = exports.customFields = void 0;
var accessControl = _interopRequireWildcard(require("./utils/accessControl"));
var _manualOrderRelationship = _interopRequireDefault(require("./utils/manual-order-relationship"));
var _trackingHandler = require("./utils/trackingHandler");
var _invalidateCacheAfterOperation = require("./utils/invalidate-cache-after-operation");
var _lilithDraftEditor = require("@mirrormedia/lilith-draft-editor");
var _richTextEditor = require("./custom-fields/rich-text-editor");
var _selectWithColor = require("./custom-fields/select-with-color");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
// @ts-ignore: no type definitions

const customFields = exports.customFields = {
  draftConverter: _lilithDraftEditor.draftConverter,
  richTextEditor: _richTextEditor.richTextEditor,
  selectWithColor: _selectWithColor.selectWithColor
};
const utils = exports.utils = {
  accessControl,
  addManualOrderRelationshipFields: _manualOrderRelationship.default,
  addTrackingFields: _trackingHandler.addTrackingFields,
  invalidateCacheAfterOperation: _invalidateCacheAfterOperation.invalidateCacheAfterOperation
};
var _default = exports.default = {
  customFields,
  utils
};