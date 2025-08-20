import TcpSocket from 'react-native-tcp-socket';
import { ServerInfo, AuthCredentials, ServerStatus } from '../types';
import { AuthenticationMiddleware } from './AuthenticationMiddleware';

/**
 * WebServerService manages the HTTP server lifecycle for the web control feature.
 * Provides server start/stop functionality with automatic port selection and conflict resolution.
 */
export class WebServerService {
  private serverStatus: ServerStatus = {
    isRunning: false,
    port: null,
    url: null,
    password: null,
    startTime: null,
    activeConnections: 0,
  };

  private authCredentials: AuthCredentials | null = null;
  private authMiddleware: AuthenticationMiddleware;
  private readonly DEFAULT_PORT_RANGE = { min: 8080, max: 8090 };
  private readonly MAX_PORT_ATTEMPTS = 10;
  private server: any = null;

  constructor() {
    this.authMiddleware = new AuthenticationMiddleware();
  }

  /**
   * Starts the web server on an available port
   * @param preferredPort Optional preferred port number
   * @returns Promise resolving to server information
   */
  async startServer(preferredPort?: number): Promise<ServerInfo> {
    if (this.serverStatus.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      const port = await this.findAvailablePort(preferredPort);
      const credentials = this.generateAuthCredentials();

      // Configure authentication middleware
      this.authMiddleware.setCredentials(credentials);

      // Create TCP server
      this.server = TcpSocket.createServer((socket: any) => {
        this.handleConnection(socket);
      });

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server.listen({ port, host: '0.0.0.0' }, (error: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Update server status
      this.serverStatus = {
        isRunning: true,
        port,
        url: `http://0.0.0.0:${port}`,
        password: credentials.password,
        startTime: new Date(),
        activeConnections: 0,
      };

      this.authCredentials = credentials;

      return {
        port,
        url: this.serverStatus.url!,
        password: credentials.password,
        isRunning: true,
      };
    } catch (error) {
      throw new Error(`Failed to start server: ${error}`);
    }
  }

  /**
   * Stops the web server
   */
  async stopServer(): Promise<void> {
    if (!this.serverStatus.isRunning) {
      return;
    }

    try {
      if (this.server) {
        this.server.close();
        this.server = null;
      }

      this.serverStatus = {
        isRunning: false,
        port: null,
        url: null,
        password: null,
        startTime: null,
        activeConnections: 0,
      };

      this.authCredentials = null;
      this.authMiddleware.clearCredentials();
    } catch (error) {
      throw new Error(`Failed to stop server: ${error}`);
    }
  }

  /**
   * Gets current server status
   */
  getServerStatus(): ServerStatus {
    return { ...this.serverStatus };
  }

  /**
   * Gets current authentication credentials
   */
  getAuthCredentials(): AuthCredentials | null {
    return this.authCredentials ? { ...this.authCredentials } : null;
  }

  /**
   * Generates random authentication credentials
   */
  generateAuthCredentials(): AuthCredentials {
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      username: 'admin',
      password,
    };
  }

  /**
   * Finds an available port within the specified range
   */
  private async findAvailablePort(preferredPort?: number): Promise<number> {
    if (preferredPort) {
      if (await this.isPortAvailable(preferredPort)) {
        return preferredPort;
      }
    }

    // Try ports in the default range
    for (
      let port = this.DEFAULT_PORT_RANGE.min;
      port <= this.DEFAULT_PORT_RANGE.max;
      port++
    ) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }

    // Try random ports if default range is exhausted
    for (let attempt = 0; attempt < this.MAX_PORT_ATTEMPTS; attempt++) {
      const randomPort = Math.floor(Math.random() * (65535 - 1024) + 1024);
      if (await this.isPortAvailable(randomPort)) {
        return randomPort;
      }
    }

    throw new Error('No available ports found');
  }

  /**
   * Checks if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      try {
        const testServer = TcpSocket.createServer();
        testServer.listen({ port, host: '0.0.0.0' }, (error: any) => {
          testServer.close();
          if (error) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Handles incoming TCP connections and converts them to HTTP
   */
  private handleConnection(socket: any): void {
    this.serverStatus.activeConnections++;

    socket.on('data', (data: Buffer) => {
      try {
        const request = data.toString();
        this.handleHttpRequest(socket, request);
      } catch (error) {
        console.error('Error handling request:', error);
        this.sendHttpResponse(socket, 500, 'Internal Server Error');
      }
    });

    socket.on('close', () => {
      this.serverStatus.activeConnections--;
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.serverStatus.activeConnections--;
    });
  }

  /**
   * HTTP request handler with authentication
   */
  private handleHttpRequest(socket: any, request: string): void {
    console.log('Received HTTP request:', request.split('\r\n')[0]);

    // Validate authentication
    const authResult = this.authMiddleware.validateRequest(request);

    if (!authResult.isValid) {
      this.sendHttpResponse(
        socket,
        authResult.statusCode,
        authResult.body,
        authResult.headers,
      );
      return;
    }

    // Authentication successful - handle the actual request
    // This will be expanded in later tasks for actual endpoint handling
    this.sendHttpResponse(
      socket,
      200,
      'Web Control Server Running - Authenticated',
    );
  }

  /**
   * Sends HTTP response through TCP socket
   */
  private sendHttpResponse(
    socket: any,
    statusCode: number,
    body: string,
    headers: { [key: string]: string } = {},
  ): void {
    const responseHeaders = [
      `HTTP/1.1 ${statusCode} ${this.getStatusText(statusCode)}`,
      'Content-Type: text/plain',
      'Connection: close',
      `Content-Length: ${body.length}`,
    ];

    // Add custom headers
    Object.entries(headers).forEach(([key, value]) => {
      responseHeaders.push(`${key}: ${value}`);
    });

    const response = [...responseHeaders, '', body].join('\r\n');

    socket.write(response);
    socket.end();
  }

  /**
   * Gets HTTP status text for status code
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: { [key: number]: string } = {
      200: 'OK',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
    };
    return statusTexts[statusCode] || 'Unknown';
  }

  /**
   * Updates active connection count
   */
  updateActiveConnections(count: number): void {
    this.serverStatus.activeConnections = count;
  }
}
