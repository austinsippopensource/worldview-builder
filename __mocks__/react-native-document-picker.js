/** Mock for react-native-document-picker — used only in model setup/settings screens. */
module.exports = {
  pick: jest.fn(() => Promise.resolve([{ uri: '/mock/model.gguf', name: 'model.gguf' }])),
  types: { allFiles: '*/*' },
};
