import { AuthenticationMiddleware } from '../src/services/AuthenticationMiddleware';
import { AuthCredentials } from '../src/types';

describe('AuthenticationMiddleware', () => {
  let middleware: AuthenticationMiddleware;
  let testCredentials: AuthCredentials;

  beforeEach(() => {
    middleware = new AuthenticationMiddleware();
    testCredentials = {
      username: 'admin',
      password: '123456',
    };
  });

  describe('setCredentials and clearCredentials', () => {
    it('should set credentials correctly', () => {
      middleware.setCredentials(testCredentials);
      
      // Test by validating a correct request
      const validRequest = createHttpRequestWithAuth('admin', '123456');
      const result = middleware.validateRequest(validRequest);
      
      expect(result.isValid).toBe(true);
    });

    it('should clear credentials correctly', () => {
      middleware.setCredentials(testCredentials);
      middleware.clearCredentials();
      
      const validRequest = createHttpRequestWithAuth('admin', '123456');
      const result = middleware.validateRequest(validRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.body).toBe('Authentication not configured');
    });
  });

  describe('validateRequest', () => {
    beforeEach(() => {
      middleware.setCredentials(testCredentials);
    });

    it('should return 500 when credentials are not configured', () => {
      const unconfiguredMiddleware = new AuthenticationMiddleware();
      const request = createHttpRequestWithAuth('admin', '123456');
      
      const result = unconfiguredMiddleware.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.statusText).toBe('Internal Server Error');
      expect(result.body).toBe('Authentication not configured');
    });

    it('should return 401 when no Authorization header is present', () => {
      const request = createHttpRequestWithoutAuth();
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.statusText).toBe('Unauthorized');
      expect(result.headers['WWW-Authenticate']).toBe('Basic realm="Web Control"');
      expect(result.body).toBe('Authentication required');
    });

    it('should return 401 when Authorization header has invalid format', () => {
      const request = createHttpRequestWithInvalidAuth();
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.statusText).toBe('Unauthorized');
      expect(result.headers['WWW-Authenticate']).toBe('Basic realm="Web Control"');
      expect(result.body).toBe('Invalid authentication format');
    });

    it('should return 401 when credentials are incorrect', () => {
      const request = createHttpRequestWithAuth('admin', 'wrongpassword');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.statusText).toBe('Unauthorized');
      expect(result.headers['WWW-Authenticate']).toBe('Basic realm="Web Control"');
      expect(result.body).toBe('Invalid credentials');
    });

    it('should return 401 when username is incorrect', () => {
      const request = createHttpRequestWithAuth('wronguser', '123456');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.statusText).toBe('Unauthorized');
    });

    it('should return 200 when credentials are correct', () => {
      const request = createHttpRequestWithAuth('admin', '123456');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.statusText).toBe('OK');
      expect(result.headers).toEqual({});
      expect(result.body).toBe('');
    });

    it('should handle case-insensitive Authorization header', () => {
      const request = [
        'GET / HTTP/1.1',
        'Host: localhost:8080',
        'authorization: Basic YWRtaW46MTIzNDU2', // admin:123456
        '',
        '',
      ].join('\r\n');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle Authorization header with extra whitespace', () => {
      const request = [
        'GET / HTTP/1.1',
        'Host: localhost:8080',
        'Authorization:   Basic   YWRtaW46MTIzNDU2   ', // admin:123456 with extra spaces
        '',
        '',
      ].join('\r\n');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('static methods', () => {
    describe('generateRandomPassword', () => {
      it('should generate a 6-digit password', () => {
        const password = AuthenticationMiddleware.generateRandomPassword();
        
        expect(password).toMatch(/^\d{6}$/);
        expect(password.length).toBe(6);
        expect(parseInt(password, 10)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(password, 10)).toBeLessThanOrEqual(999999);
      });

      it('should generate different passwords on multiple calls', () => {
        const passwords = new Set();
        
        // Generate 100 passwords and check they're mostly unique
        for (let i = 0; i < 100; i++) {
          passwords.add(AuthenticationMiddleware.generateRandomPassword());
        }
        
        // Should have high uniqueness (allow for some collisions due to randomness)
        expect(passwords.size).toBeGreaterThan(90);
      });
    });

    describe('createAuthCredentials', () => {
      it('should create credentials with admin username and 6-digit password', () => {
        const credentials = AuthenticationMiddleware.createAuthCredentials();
        
        expect(credentials.username).toBe('admin');
        expect(credentials.password).toMatch(/^\d{6}$/);
        expect(credentials.password.length).toBe(6);
      });

      it('should create different credentials on multiple calls', () => {
        const credentials1 = AuthenticationMiddleware.createAuthCredentials();
        const credentials2 = AuthenticationMiddleware.createAuthCredentials();
        
        expect(credentials1.username).toBe(credentials2.username);
        expect(credentials1.password).not.toBe(credentials2.password);
      });
    });
  });

  describe('base64 decoding', () => {
    beforeEach(() => {
      middleware.setCredentials(testCredentials);
    });

    it('should handle standard base64 encoded credentials', () => {
      // admin:123456 = YWRtaW46MTIzNDU2
      const request = createHttpRequestWithEncodedAuth('YWRtaW46MTIzNDU2');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle base64 with padding', () => {
      // admin:test = YWRtaW46dGVzdA==
      middleware.setCredentials({ username: 'admin', password: 'test' });
      const request = createHttpRequestWithEncodedAuth('YWRtaW46dGVzdA==');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle invalid base64 encoding', () => {
      const request = createHttpRequestWithEncodedAuth('invalid-base64!@#');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.body).toBe('Invalid authentication format');
    });

    it('should handle base64 without colon separator', () => {
      // "adminpassword" without colon = YWRtaW5wYXNzd29yZA==
      const request = createHttpRequestWithEncodedAuth('YWRtaW5wYXNzd29yZA==');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.body).toBe('Invalid authentication format');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      middleware.setCredentials(testCredentials);
    });

    it('should handle empty request', () => {
      const result = middleware.validateRequest('');
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('should handle malformed HTTP request', () => {
      const result = middleware.validateRequest('not-an-http-request');
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('should handle request with only Authorization header', () => {
      const request = 'Authorization: Basic YWRtaW46MTIzNDU2';
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle credentials with special characters', () => {
      const specialCredentials = { username: 'admin', password: 'p@ss:w0rd!' };
      middleware.setCredentials(specialCredentials);
      
      // admin:p@ss:w0rd! = YWRtaW46cEBzczp3MHJkIQ==
      const request = createHttpRequestWithEncodedAuth('YWRtaW46cEBzczp3MHJkIQ==');
      
      const result = middleware.validateRequest(request);
      
      expect(result.isValid).toBe(true);
    });
  });
});

// Helper functions for creating test HTTP requests

function createHttpRequestWithAuth(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const encoded = btoa(credentials);
  
  return [
    'GET / HTTP/1.1',
    'Host: localhost:8080',
    `Authorization: Basic ${encoded}`,
    '',
    '',
  ].join('\r\n');
}

function createHttpRequestWithEncodedAuth(encodedCredentials: string): string {
  return [
    'GET / HTTP/1.1',
    'Host: localhost:8080',
    `Authorization: Basic ${encodedCredentials}`,
    '',
    '',
  ].join('\r\n');
}

function createHttpRequestWithoutAuth(): string {
  return [
    'GET / HTTP/1.1',
    'Host: localhost:8080',
    '',
    '',
  ].join('\r\n');
}

function createHttpRequestWithInvalidAuth(): string {
  return [
    'GET / HTTP/1.1',
    'Host: localhost:8080',
    'Authorization: Bearer invalid-token',
    '',
    '',
  ].join('\r\n');
}

// Polyfill btoa for test environment if not available
if (typeof btoa === 'undefined') {
  global.btoa = function (str: string): string {
    return Buffer.from(str, 'binary').toString('base64');
  };
}