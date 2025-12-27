"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCardValue = createCardValue;
exports.createCell = createCell;
exports.createController = createController;
exports.createField = createField;
var _react = _interopRequireDefault(require("react"));
var _core = require("@keystone-ui/core");
var _fields = require("@keystone-ui/fields");
var _components = require("@keystone-6/core/admin-ui/components");
var _draftJs = require("draft-js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function createController(decorators) {
  return config => {
    var _config$fieldMeta, _config$fieldMeta2, _config$fieldMeta3;
    return {
      disabledButtons: ((_config$fieldMeta = config.fieldMeta) === null || _config$fieldMeta === void 0 ? void 0 : _config$fieldMeta.disabledButtons) ?? [],
      hideOnMobileButtons: ((_config$fieldMeta2 = config.fieldMeta) === null || _config$fieldMeta2 === void 0 ? void 0 : _config$fieldMeta2.hideOnMobileButtons) ?? [],
      presetColors: ((_config$fieldMeta3 = config.fieldMeta) === null || _config$fieldMeta3 === void 0 ? void 0 : _config$fieldMeta3.presetColors) ?? [],
      path: config.path,
      label: config.label,
      description: config.description,
      graphqlSelection: config.path,
      defaultValue: _draftJs.EditorState.createEmpty(decorators),
      deserialize: data => {
        const rawContentState = data[config.path];
        if (rawContentState === null) {
          return _draftJs.EditorState.createEmpty(decorators);
        }
        try {
          const contentState = (0, _draftJs.convertFromRaw)(rawContentState);
          const editorState = _draftJs.EditorState.createWithContent(contentState, decorators);
          return editorState;
        } catch (err) {
          console.error(err);
          return _draftJs.EditorState.createEmpty(decorators);
        }
      },
      serialize: editorState => {
        if (!editorState) {
          return {
            [config.path]: null
          };
        }
        try {
          const rawContentState = (0, _draftJs.convertToRaw)(editorState.getCurrentContent());
          return {
            [config.path]: rawContentState
          };
        } catch (err) {
          console.error(err);
          return {
            [config.path]: null
          };
        }
      }
    };
  };
}
function createField(RichTextEditor) {
  return ({
    field,
    value,
    onChange,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    autoFocus
  }) => {
    return /*#__PURE__*/_react.default.createElement(_fields.FieldContainer, null, /*#__PURE__*/_react.default.createElement(_fields.FieldLabel, null, field.label, /*#__PURE__*/_react.default.createElement(_core.Stack, null, /*#__PURE__*/_react.default.createElement(RichTextEditor, {
      disabledButtons: field.disabledButtons,
      hideOnMobileButtons: field.hideOnMobileButtons,
      presetColors: field.presetColors,
      editorState: value,
      onChange:
      // @ts-ignore: any
      editorState => onChange === null || onChange === void 0 ? void 0 : onChange(editorState)
    }))));
  };
}
function createCardValue() {
  return ({
    item,
    field
  }) => {
    return /*#__PURE__*/_react.default.createElement(_fields.FieldContainer, null, /*#__PURE__*/_react.default.createElement(_fields.FieldLabel, null, field.label), item[field.path]);
  };
}
function createCell() {
  const Cell = ({
    item,
    field,
    linkTo
  }) => {
    const value = item[field.path] + '';
    return linkTo ? /*#__PURE__*/_react.default.createElement(_components.CellLink, linkTo, value) : /*#__PURE__*/_react.default.createElement(_components.CellContainer, null, value);
  };
  Cell.supportsLinkTo = true;
  return Cell;
}