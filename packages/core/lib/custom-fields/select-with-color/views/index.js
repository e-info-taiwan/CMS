"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.controller = exports.Field = exports.Cell = exports.CardValue = void 0;
var _react = require("react");
var _core = require("@keystone-ui/core");
var _fields = require("@keystone-ui/fields");
var _segmentedControl = require("@keystone-ui/segmented-control");
var _button = require("@keystone-ui/button");
var _components = require("@keystone-6/core/admin-ui/components");
/** @jsxRuntime classic */
/** @jsx jsx */

// eslint-disable-next-line @typescript-eslint/no-unused-vars

const Field = ({
  field,
  value,
  onChange,
  autoFocus,
  forceValidation
}) => {
  const [hasChanged, setHasChanged] = (0, _react.useState)(false);
  const validationMessage = (hasChanged || forceValidation) && !validate(value, field.isRequired) ? (0, _core.jsx)(_core.Text, {
    color: "red600",
    size: "small"
  }, field.label, " is required") : null;
  const colorSpan = (color = 'transparent') => ({
    alignItems: 'center',
    display: 'flex',
    ':before': {
      backgroundColor: color,
      borderRadius: 8,
      content: '" "',
      display: 'block',
      marginRight: 8,
      height: 20,
      width: 20
    }
  });
  return (0, _core.jsx)(_fields.FieldContainer, {
    as: field.displayMode === 'select' ? 'div' : 'fieldset'
  }, field.displayMode === 'select' ? (0, _core.jsx)(_react.Fragment, null, (0, _core.jsx)(_fields.FieldLabel, {
    htmlFor: field.path
  }, field.label), (0, _core.jsx)(_fields.FieldDescription, {
    id: `${field.path}-description`
  }, field.description), (0, _core.jsx)(_fields.Select, {
    id: field.path,
    isClearable: true,
    autoFocus: autoFocus,
    options: field.options,
    isDisabled: onChange === undefined,
    onChange: newVal => {
      onChange === null || onChange === void 0 || onChange({
        ...value,
        value: newVal
      });
      setHasChanged(true);
    },
    value: value.value,
    "aria-describedby": field.description === null ? undefined : `${field.path}-description`,
    portalMenu: true,
    styles: {
      option: (styles, {
        data
      }) => {
        if (field.shouldShowColorSpan) {
          const color = data.color;
          return {
            ...styles,
            ...colorSpan(color)
          };
        } else {
          return styles;
        }
      },
      singleValue: (styles, {
        data
      }) => {
        if (field.shouldShowColorSpan) {
          const color = data.color;
          return {
            ...styles,
            ...colorSpan(color)
          };
        } else {
          return styles;
        }
      }
    }
  }), validationMessage) : field.displayMode === 'radio' ? (0, _core.jsx)(_react.Fragment, null, (0, _core.jsx)(_fields.FieldLabel, {
    as: "legend"
  }, field.label), (0, _core.jsx)(_fields.FieldDescription, {
    id: `${field.path}-description`
  }, field.description), (0, _core.jsx)(_core.Stack, {
    gap: "small",
    marginTop: 'small'
  }, field.options.map(option => {
    var _value$value;
    return (0, _core.jsx)(_fields.Radio, {
      style: field.shouldShowColorSpan ? {
        ...colorSpan(option.color),
        alignItems: 'center'
      } : {
        alignItems: 'center'
      },
      key: option.value,
      value: option.value,
      checked: ((_value$value = value.value) === null || _value$value === void 0 ? void 0 : _value$value.value) === option.value,
      onChange: event => {
        if (event.target.checked) {
          onChange === null || onChange === void 0 || onChange({
            ...value,
            value: option
          });
          setHasChanged(true);
        }
      }
    }, option.label);
  }), value.value !== null && onChange !== undefined && !field.isRequired && (0, _core.jsx)(_button.Button, {
    onClick: () => {
      onChange({
        ...value,
        value: null
      });
      setHasChanged(true);
    }
  }, "Clear")), validationMessage) : (0, _core.jsx)(_react.Fragment, null, (0, _core.jsx)(_fields.FieldLabel, {
    as: "legend"
  }, field.label), (0, _core.jsx)(_fields.FieldDescription, {
    id: `${field.path}-description`
  }, field.description), (0, _core.jsx)(_core.Stack, {
    across: true,
    gap: "small",
    align: "center"
  }, (0, _core.jsx)(_segmentedControl.SegmentedControl, {
    segments: field.options.map(x => x.label),
    selectedIndex: value.value ? field.options.findIndex(x => x.value === value.value.value) : undefined,
    isReadOnly: onChange === undefined,
    onChange: index => {
      onChange === null || onChange === void 0 || onChange({
        ...value,
        value: field.options[index]
      });
      setHasChanged(true);
    }
  }), value.value !== null && onChange !== undefined && !field.isRequired && (0, _core.jsx)(_button.Button, {
    onClick: () => {
      onChange({
        ...value,
        value: null
      });
      setHasChanged(true);
    }
  }, "Clear")), validationMessage));
};
exports.Field = Field;
const Cell = ({
  item,
  field,
  linkTo
}) => {
  const value = item[field.path] + '';
  const option = field.options.find(x => x.value === value);
  const label = option === null || option === void 0 ? void 0 : option.label;
  const color = option === null || option === void 0 ? void 0 : option.color;
  const ColorSpan = () => (0, _core.jsx)("span", {
    style: {
      display: 'inline-block',
      verticalAlign: 'bottom',
      width: '20px',
      height: '20px',
      borderRadius: '8px',
      marginRight: '8px',
      backgroundColor: color ?? 'transparent'
    }
  });
  return linkTo ? (0, _core.jsx)(_components.CellLink, linkTo, field.shouldShowColorSpan && (0, _core.jsx)(ColorSpan, null), label) : (0, _core.jsx)(_components.CellContainer, null, field.shouldShowColorSpan && (0, _core.jsx)(ColorSpan, null), " ", label);
};
exports.Cell = Cell;
Cell.supportsLinkTo = true;
const CardValue = ({
  item,
  field
}) => {
  const value = item[field.path] + '';
  const option = field.options.find(x => x.value === value);
  const label = option === null || option === void 0 ? void 0 : option.label;
  const color = option === null || option === void 0 ? void 0 : option.color;
  const ColorSpan = () => (0, _core.jsx)("span", {
    style: {
      display: 'inline-block',
      verticalAlign: 'bottom',
      width: '20px',
      height: '20px',
      borderRadius: '8px',
      marginRight: '8px',
      backgroundColor: color ?? 'transparent'
    }
  });
  return (0, _core.jsx)(_fields.FieldContainer, null, (0, _core.jsx)(_fields.FieldLabel, null, field.label), field.shouldShowColorSpan && (0, _core.jsx)(ColorSpan, null), label);
};
exports.CardValue = CardValue;
function validate(value, isRequired) {
  if (isRequired) {
    // if you got null initially on the update screen, we want to allow saving
    // since the user probably doesn't have read access control
    if (value.kind === 'update' && value.initial === null) {
      return true;
    }
    return value.value !== null;
  }
  return true;
}
const controller = config => {
  var _config$fieldMeta$def;
  const optionsWithStringValues = config.fieldMeta.options.map(x => ({
    label: x.label,
    value: x.value.toString(),
    color: x.color
  }));

  // Transform from string value to type appropriate value
  const t = v => v === null ? null : config.fieldMeta.type === 'integer' ? parseInt(v) : v;
  const stringifiedDefault = (_config$fieldMeta$def = config.fieldMeta.defaultValue) === null || _config$fieldMeta$def === void 0 ? void 0 : _config$fieldMeta$def.toString();
  return {
    path: config.path,
    label: config.label,
    description: config.description,
    graphqlSelection: config.path,
    defaultValue: {
      kind: 'create',
      value: optionsWithStringValues.find(x => x.value === stringifiedDefault) ?? null
    },
    type: config.fieldMeta.type,
    displayMode: config.fieldMeta.displayMode,
    shouldShowColorSpan: config.fieldMeta.shouldShowColorSpan,
    isRequired: config.fieldMeta.isRequired,
    options: optionsWithStringValues,
    deserialize: data => {
      for (const option of config.fieldMeta.options) {
        if (option.value === data[config.path]) {
          const stringifiedOption = {
            label: option.label,
            value: option.value.toString(),
            color: option.color
          };
          return {
            kind: 'update',
            initial: stringifiedOption,
            value: stringifiedOption
          };
        }
      }
      return {
        kind: 'update',
        initial: null,
        value: null
      };
    },
    serialize: value => {
      var _value$value2;
      return {
        [config.path]: t(((_value$value2 = value.value) === null || _value$value2 === void 0 ? void 0 : _value$value2.value) ?? null)
      };
    },
    validate: value => validate(value, config.fieldMeta.isRequired),
    filter: {
      Filter(props) {
        return (0, _core.jsx)(_fields.MultiSelect, {
          onChange: props.onChange,
          options: optionsWithStringValues,
          value: props.value,
          autoFocus: true
        });
      },
      graphql: ({
        type,
        value: options
      }) => ({
        [config.path]: {
          [type === 'not_matches' ? 'notIn' : 'in']: options.map(x => t(x.value))
        }
      }),
      Label({
        type,
        value
      }) {
        if (!value.length) {
          return type === 'not_matches' ? `is set` : `has no value`;
        }
        if (value.length > 1) {
          const values = value.map(i => i.label).join(', ');
          return type === 'not_matches' ? `is not in [${values}]` : `is in [${values}]`;
        }
        const optionLabel = value[0].label;
        return type === 'not_matches' ? `is not ${optionLabel}` : `is ${optionLabel}`;
      },
      types: {
        matches: {
          label: 'Matches',
          initialValue: []
        },
        not_matches: {
          label: 'Does not match',
          initialValue: []
        }
      }
    }
  };
};
exports.controller = controller;