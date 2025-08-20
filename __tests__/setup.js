/**
 * Test setup for React Native components
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-tcp-socket
jest.mock('react-native-tcp-socket', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn((options, callback) => {
      if (callback) callback();
    }),
    close: jest.fn(),
  })),
}));