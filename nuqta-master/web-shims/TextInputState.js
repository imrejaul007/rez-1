// Web shim for TextInputState
let _focusedInput = null;
export const currentlyFocusedField = () => _focusedInput;
export const currentlyFocusedInput = () => _focusedInput;
export const focusTextInput = (field) => {
  _focusedInput = field;
  if (field?.focus) field.focus();
};
export const blurTextInput = (field) => {
  if (_focusedInput === field) _focusedInput = null;
  if (field?.blur) field.blur();
};
export const registerInput = () => {};
export const unregisterInput = () => {};
export default {
  currentlyFocusedField,
  currentlyFocusedInput,
  focusTextInput,
  blurTextInput,
  registerInput,
  unregisterInput,
};
