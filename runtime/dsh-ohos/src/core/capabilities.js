export function missingCapabilities(actual, required) {
  return required.filter((name) => actual[name] !== true);
}
