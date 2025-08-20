// Mock react-native-tcp-socket before importing services
jest.mock('react-native-tcp-socket', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn((options, callback) => {
      if (callback) callback();
    }),
    close: jest.fn(),
  })),
}));

import { webServerService } from '../services';
import { WebServerService } from '../services/WebServerService';

describe('WebServerService Integration', () => {
  it('should export webServerService singleton instance', () => {
    expect(webServerService).toBeInstanceOf(WebServerService);
  });

  it('should have all required methods', () => {
    expect(typeof webServerService.startServer).toBe('function');
    expect(typeof webServerService.stopServer).toBe('function');
    expect(typeof webServerService.getServerStatus).toBe('function');
    expect(typeof webServerService.getAuthCredentials).toBe('function');
    expect(typeof webServerService.generateAuthCredentials).toBe('function');
    expect(typeof webServerService.updateActiveConnections).toBe('function');
  });

  it('should have correct initial state', () => {
    const status = webServerService.getServerStatus();
    expect(status.isRunning).toBe(false);
    expect(status.activeConnections).toBe(0);
  });
});