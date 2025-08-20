import { WebServerService } from '../src/services/WebServerService';

describe('WebServerService Authentication Integration', () => {
  let webServerService: WebServerService;

  beforeEach(() => {
    webServerService = new WebServerService();
  });

  afterEach(async () => {
    try {
      await webServerService.stopServer();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Authentication Integration', () => {
    it('should require authentication for all requests', async () => {
      // Start the server
      const serverInfo = await webServerService.startServer();
      expect(serverInfo.isRunning).toBe(true);
      expect(serverInfo.password).toMatch(/^\d{6}$/);

      // Mock socket for testing
      const mockSocket = createMockSocket();
      
      // Simulate request without authentication
      const requestWithoutAuth = [
        'GET / HTTP/1.1',
        'Host: localhost:8080',
        '',
        '',
      ].join('\r\n');

      // Access private method for testing
      const handleHttpRequest = (webServerService as any).handleHttpRequest.bind(webServerService);
      handleHttpRequest(mockSocket, requestWithoutAuth);

      // Verify 401 response was sent
      expect(mockSocket.writtenData).toContain('HTTP/1.1 401 Unauthorized');
      expect(mockSocket.writtenData).toContain('WWW-Authenticate: Basic realm="Web Control"');
      expect(mockSocket.writtenData).toContain('Authentication required');
    });

    it('should accept requests with correct authentication', async () => {
      // Start the server
      const serverInfo = await webServerService.startServer();
      const credentials = webServerService.getAuthCredentials();
      
      expect(credentials).not.toBeNull();
      expect(credentials!.username).toBe('admin');
      expect(credentials!.password).toBe(serverInfo.password);

      // Mock socket for testing
      const mockSocket = createMockSocket();
      
      // Create request with correct authentication
      const authString = `${credentials!.username}:${credentials!.password}`;
      const encodedAuth = Buffer.from(authString).toString('base64');
      
      const requestWithAuth = [
        'GET / HTTP/1.1',
        'Host: localhost:8080',
        `Authorization: Basic ${encodedAuth}`,
        '',
        '',
      ].join('\r\n');

      // Access private method for testing
      const handleHttpRequest = (webServerService as any).handleHttpRequest.bind(webServerService);
      handleHttpRequest(mockSocket, requestWithAuth);

      // Verify 200 response was sent
      expect(mockSocket.writtenData).toContain('HTTP/1.1 200 OK');
      expect(mockSocket.writtenData).toContain('Web Control Server Running - Authenticated');
    });

    it('should reject requests with incorrect credentials', async () => {
      // Start the server
      await webServerService.startServer();

      // Mock socket for testing
      const mockSocket = createMockSocket();
      
      // Create request with incorrect authentication
      const wrongAuthString = 'admin:wrongpassword';
      const encodedAuth = Buffer.from(wrongAuthString).toString('base64');
      
      const requestWithWrongAuth = [
        'GET / HTTP/1.1',
        'Host: localhost:8080',
        `Authorization: Basic ${encodedAuth}`,
        '',
        '',
      ].join('\r\n');

      // Access private method for testing
      const handleHttpRequest = (webServerService as any).handleHttpRequest.bind(webServerService);
      handleHttpRequest(mockSocket, requestWithWrongAuth);

      // Verify 401 response was sent
      expect(mockSocket.writtenData).toContain('HTTP/1.1 401 Unauthorized');
      expect(mockSocket.writtenData).toContain('Invalid credentials');
    });

    it('should clear authentication when server stops', async () => {
      // Start the server
      await webServerService.startServer();
      
      let credentials = webServerService.getAuthCredentials();
      expect(credentials).not.toBeNull();

      // Stop the server
      await webServerService.stopServer();
      
      credentials = webServerService.getAuthCredentials();
      expect(credentials).toBeNull();
    });

    it('should generate new credentials when server restarts', async () => {
      // Start the server first time
      const serverInfo1 = await webServerService.startServer();
      const credentials1 = webServerService.getAuthCredentials();
      
      expect(credentials1).not.toBeNull();
      expect(credentials1!.password).toBe(serverInfo1.password);

      // Stop the server
      await webServerService.stopServer();

      // Start the server again
      const serverInfo2 = await webServerService.startServer();
      const credentials2 = webServerService.getAuthCredentials();
      
      expect(credentials2).not.toBeNull();
      expect(credentials2!.password).toBe(serverInfo2.password);
      
      // Passwords should be different
      expect(credentials1!.password).not.toBe(credentials2!.password);
    });

    it('should handle malformed authentication headers gracefully', async () => {
      // Start the server
      await webServerService.startServer();

      // Mock socket for testing
      const mockSocket = createMockSocket();
      
      // Create request with malformed authentication
      const requestWithMalformedAuth = [
        'GET / HTTP/1.1',
        'Host: localhost:8080',
        'Authorization: Bearer invalid-token',
        '',
        '',
      ].join('\r\n');

      // Access private method for testing
      const handleHttpRequest = (webServerService as any).handleHttpRequest.bind(webServerService);
      handleHttpRequest(mockSocket, requestWithMalformedAuth);

      // Verify 401 response was sent
      expect(mockSocket.writtenData).toContain('HTTP/1.1 401 Unauthorized');
      expect(mockSocket.writtenData).toContain('Invalid authentication format');
    });
  });
});

// Helper function to create a mock socket for testing
function createMockSocket() {
  let writtenData = '';
  
  return {
    writtenData: '',
    write: jest.fn((data: string) => {
      writtenData += data;
      return true;
    }),
    end: jest.fn(),
    get writtenData() {
      return writtenData;
    }
  };
}