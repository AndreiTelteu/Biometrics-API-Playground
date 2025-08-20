import { WebServerService } from '../services/WebServerService';

// Mock react-native-tcp-socket
jest.mock('react-native-tcp-socket', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn((options, callback) => {
      if (callback) callback();
    }),
    close: jest.fn(),
  })),
}));

describe('WebServerService', () => {
  let webServerService: WebServerService;

  beforeEach(() => {
    webServerService = new WebServerService();
    jest.clearAllMocks();
  });

  describe('generateAuthCredentials', () => {
    it('should generate credentials with admin username and 6-digit password', () => {
      const credentials = webServerService.generateAuthCredentials();
      
      expect(credentials.username).toBe('admin');
      expect(credentials.password).toMatch(/^\d{6}$/);
      expect(credentials.password.length).toBe(6);
    });

    it('should generate different passwords on multiple calls', () => {
      const credentials1 = webServerService.generateAuthCredentials();
      const credentials2 = webServerService.generateAuthCredentials();
      
      // While there's a small chance they could be the same, it's very unlikely
      expect(credentials1.password).not.toBe(credentials2.password);
    });
  });

  describe('getServerStatus', () => {
    it('should return initial server status as not running', () => {
      const status = webServerService.getServerStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.port).toBeNull();
      expect(status.url).toBeNull();
      expect(status.password).toBeNull();
      expect(status.startTime).toBeNull();
      expect(status.activeConnections).toBe(0);
    });
  });

  describe('getAuthCredentials', () => {
    it('should return null when server is not running', () => {
      const credentials = webServerService.getAuthCredentials();
      expect(credentials).toBeNull();
    });
  });

  describe('updateActiveConnections', () => {
    it('should update active connections count', () => {
      webServerService.updateActiveConnections(5);
      const status = webServerService.getServerStatus();
      
      expect(status.activeConnections).toBe(5);
    });
  });

  describe('startServer', () => {
    it('should throw error when server is already running', async () => {
      // Mock the server as already running
      await webServerService.startServer();
      
      await expect(webServerService.startServer()).rejects.toThrow('Server is already running');
    });
  });

  describe('stopServer', () => {
    it('should not throw error when server is not running', async () => {
      await expect(webServerService.stopServer()).resolves.not.toThrow();
    });
  });
});