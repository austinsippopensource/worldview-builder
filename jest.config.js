module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Map all native/third-party modules that can't run in Node to mock implementations.
  // These live in __mocks__/ at the project root and are pure JS so Jest can import them.
  moduleNameMapper: {
    '@react-native-async-storage/async-storage':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    'llama\\.rn': '<rootDir>/__mocks__/llama.rn.js',
    'react-native-fs': '<rootDir>/__mocks__/react-native-fs.js',
    'react-native-document-picker': '<rootDir>/__mocks__/react-native-document-picker.js',
    '@op-engineering/op-sqlite': '<rootDir>/__mocks__/@op-engineering/op-sqlite.js',
    'react-native-gesture-handler': '<rootDir>/__mocks__/react-native-gesture-handler.js',
  },
  // Extend the default RN transform pattern to also compile @react-navigation packages,
  // which ship ES module source that Node's CommonJS loader can't handle directly.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|react-native-safe-area-context' +
      '|react-native-gesture-handler' +
      '|react-native-screens' +
      '|react-native-vector-icons' +
      ')/)',
  ],
};
