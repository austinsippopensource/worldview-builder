// React 19 calls window.dispatchEvent to report uncaught errors.
// The Node test environment doesn't have window, so we provide a stub.
if (typeof global.window === 'undefined') {
  global.window = {};
}
if (typeof global.window.dispatchEvent === 'undefined') {
  global.window.dispatchEvent = () => false;
}
