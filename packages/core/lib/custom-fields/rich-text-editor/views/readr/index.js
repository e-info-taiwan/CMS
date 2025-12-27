"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.controller = exports.Field = exports.Cell = exports.CardValue = void 0;
var _utils = require("../utils");
var _readr = _interopRequireDefault(require("@mirrormedia/lilith-draft-editor/lib/website/readr"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// @ts-ignore: no type definitions

const {
  RichTextEditor,
  decorators
} = _readr.default.DraftEditor;
const Field = exports.Field = (0, _utils.createField)(RichTextEditor);
const Cell = exports.Cell = (0, _utils.createCell)();
const CardValue = exports.CardValue = (0, _utils.createCardValue)();
const controller = exports.controller = (0, _utils.createController)(decorators);