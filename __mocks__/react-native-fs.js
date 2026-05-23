/** Mock for react-native-fs — used only in ModelSetupScreen and SettingsScreen. */
module.exports = {
  DocumentDirectoryPath: '/mock/documents',
  downloadFile: jest.fn(() => ({ promise: Promise.resolve({ statusCode: 200 }) })),
  copyFile: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
  unlink: jest.fn(() => Promise.resolve()),
};
