// Mock react-native-tcp-socket before importing services
const mockServer = {
  listen: jest.fn((options, callback) => {
    if (callback) callback();
  }),
  close: jest.fn(),
};

jest.mock('react-native-tcp-socket', () => ({
  createServer: jest.fn(() => mockServer),
}));

import TcpSocket from 'react-native-tcp-socket';
import { WebServerService } from '../services/WebServerService';

describe('WebServerService TCP Integration', () => {
  let webServerService: WebServerService;

  beforeEach(() => {
    webServerService = new WebServerService();
    jest.clearAllMocks();
  });

  describe('TCP Socket Integration', () => {
    it('should create TCP server when starting', async () => {
      await webServerService.startServer(8080);
      
      expect(TcpSocket.createServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalledWith(
        { port: 8080, host: '0.0.0.0' },
        expect.any(Function)
      );
    });

    it('should close TCP server when stopping', async () => {
      await webServerService.startServer(8080);
      await webServerService.stopServer();
      
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should handle server start with port selection', async () => {
      const serverInfo = await webServerService.startServer();
      
      expect(serverInfo.isRunning).toBe(true);
      expect(serverInfo.port).toBeGreaterThanOrEqual(8080);
      expect(serverInfo.port).toBeLessThanOrEqual(8090);
      expect(serverInfo.url).toMatch(/^http:\/\/0\.0\.0\.0:\d+$/);
      expect(serverInfo.password).toMatch(/^\d{6}$/);
    });

    it('should update server status correctly', async () => {
      const serverInfo = await webServerService.startServer(8081);
      const status = webServerService.getServerStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.port).toBe(8081);
      expect(status.url).toBe('http://0.0.0.0:8081');
      expect(status.password).toBe(serverInfo.password);
      expect(status.startTime).toBeInstanceOf(Date);
      expect(status.activeConnections).toBe(0);
    });
  });
});