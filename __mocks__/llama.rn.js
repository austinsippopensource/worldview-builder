/**
 * Mock for llama.rn — the native on-device LLM inference library.
 * Tests that need to control completion output should mock useLlama() directly.
 */
module.exports = {
  initLlama: jest.fn().mockResolvedValue({
    completion: jest.fn().mockResolvedValue({ timings: {} }),
    stopCompletion: jest.fn(),
  }),
};
