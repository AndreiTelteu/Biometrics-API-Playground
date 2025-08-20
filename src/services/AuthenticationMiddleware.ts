import { AuthCredentials } from '../types';

/**
 * HTTP Basic Authentication middleware for the web control server.
 * Handles credential validation and authentication header parsing.
 */
export class AuthenticationMiddleware {
  private credentials: AuthCredentials | null = null;

  /**
   * Sets the authentication credentials for the middleware
   * @param credentials The credentials to validate against
   */
  setCredentials(credentials: AuthCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Clears the authentication credentials
   */
  clearCredentials(): void {
    this.credentials = null;
  }

  /**
   * Validates an HTTP request for proper authentication
   * @param request The raw HTTP request string
   * @returns Object containing validation result and response details
   */
  validateRequest(request: string): AuthenticationResult {
    if (!this.credentials) {
      return {
        isValid: false,
        statusCode: 500,
        statusText: 'Internal Server Error',
        headers: {},
        body: 'Authentication not configured',
      };
    }

    const authHeader = this.extractAuthorizationHeader(request);
    
    if (!authHeader) {
      return {
        isValid: false,
        statusCode: 401,
        statusText: 'Unauthorized',
        headers: {
          'WWW-Authenticate': 'Basic realm="Web Control"',
        },
        body: 'Authentication required',
      };
    }

    const credentials = this.parseBasicAuthHeader(authHeader);
    
    if (!credentials) {
      return {
        isValid: false,
        statusCode: 401,
        statusText: 'Unauthorized',
        headers: {
          'WWW-Authenticate': 'Basic realm="Web Control"',
        },
        body: 'Invalid authentication format',
      };
    }

    if (!this.validateCredentials(credentials)) {
      return {
        isValid: false,
        statusCode: 401,
        statusText: 'Unauthorized',
        headers: {
          'WWW-Authenticate': 'Basic realm="Web Control"',
        },
        body: 'Invalid credentials',
      };
    }

    return {
      isValid: true,
      statusCode: 200,
      statusText: 'OK',
      headers: {},
      body: '',
    };
  }

  /**
   * Extracts the Authorization header from an HTTP request
   * @param request The raw HTTP request string
   * @returns The Authorization header value or null if not found
   */
  private extractAuthorizationHeader(request: string): string | null {
    const lines = request.split('\r\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase().startsWith('authorization:')) {
        return trimmedLine.substring('authorization:'.length).trim();
      }
    }
    
    return null;
  }

  /**
   * Parses HTTP Basic Authentication header
   * @param authHeader The Authorization header value
   * @returns Parsed credentials or null if invalid format
   */
  private parseBasicAuthHeader(authHeader: string): AuthCredentials | null {
    if (!authHeader.toLowerCase().startsWith('basic ')) {
      return null;
    }

    const encodedCredentials = authHeader.substring('basic '.length).trim();
    
    try {
      const decodedCredentials = this.base64Decode(encodedCredentials);
      const colonIndex = decodedCredentials.indexOf(':');
      
      if (colonIndex === -1) {
        return null;
      }

      const username = decodedCredentials.substring(0, colonIndex);
      const password = decodedCredentials.substring(colonIndex + 1);

      return { username, password };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates credentials against stored credentials
   * @param providedCredentials The credentials to validate
   * @returns True if credentials are valid, false otherwise
   */
  private validateCredentials(providedCredentials: AuthCredentials): boolean {
    if (!this.credentials) {
      return false;
    }

    return (
      providedCredentials.username === this.credentials.username &&
      providedCredentials.password === this.credentials.password
    );
  }

  /**
   * Decodes base64 string (React Native compatible implementation)
   * @param encoded The base64 encoded string
   * @returns The decoded string
   */
  private base64Decode(encoded: string): string {
    // React Native compatible base64 decoding
    // Using built-in atob if available, otherwise manual implementation
    if (typeof atob !== 'undefined') {
      return atob(encoded);
    }

    // Manual base64 decoding for React Native environments
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    // Remove any characters not in the base64 character set
    const cleanEncoded = encoded.replace(/[^A-Za-z0-9+/]/g, '');

    while (i < cleanEncoded.length) {
      const encoded1 = chars.indexOf(cleanEncoded.charAt(i++));
      const encoded2 = chars.indexOf(cleanEncoded.charAt(i++));
      const encoded3 = chars.indexOf(cleanEncoded.charAt(i++));
      const encoded4 = chars.indexOf(cleanEncoded.charAt(i++));

      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }

    return result;
  }

  /**
   * Generates a random 6-digit password
   * @returns A 6-digit numeric password as string
   */
  static generateRandomPassword(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Creates authentication credentials with admin username and random password
   * @returns New authentication credentials
   */
  static createAuthCredentials(): AuthCredentials {
    return {
      username: 'admin',
      password: AuthenticationMiddleware.generateRandomPassword(),
    };
  }
}

/**
 * Result of authentication validation
 */
export interface AuthenticationResult {
  isValid: boolean;
  statusCode: number;
  statusText: string;
  headers: { [key: string]: string };
  body: string;
}