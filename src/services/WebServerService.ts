import TcpSocket from 'react-native-tcp-socket';
import { ServerInfo, AuthCredentials, ServerStatus } from '../types';
import { AuthenticationMiddleware } from './AuthenticationMiddleware';
import { webControlBridge, WebRequest, WebResponse } from './WebControlBridge';
import { webSocketManager } from './WebSocketManager';

/**
 * Parsed HTTP request structure
 */
interface ParsedHttpRequest {
  method: string;
  path: string;
  version: string;
  headers: { [key: string]: string };
  body: string;
}

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
        testServer.listen({ port, host: '0.0.0.0' }, (error?: any) => {
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

    socket.on('data', (data: any) => {
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
   * HTTP request handler with authentication and routing
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

    // Parse HTTP request
    const parsedRequest = this.parseHttpRequest(request);
    
    if (!parsedRequest) {
      this.sendHttpResponse(socket, 400, 'Bad Request');
      return;
    }

    // Route the request
    this.routeRequest(socket, parsedRequest);
  }

  /**
   * Parse HTTP request into structured format
   */
  private parseHttpRequest(request: string): ParsedHttpRequest | null {
    try {
      const lines = request.split('\r\n');
      const requestLine = lines[0];
      const [method, path, version] = requestLine.split(' ');

      // Parse headers
      const headers: { [key: string]: string } = {};
      let bodyStartIndex = -1;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === '') {
          bodyStartIndex = i + 1;
          break;
        }
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }

      // Parse body
      let body = '';
      if (bodyStartIndex > 0 && bodyStartIndex < lines.length) {
        body = lines.slice(bodyStartIndex).join('\r\n');
      }

      return {
        method: method.toUpperCase(),
        path,
        version,
        headers,
        body,
      };
    } catch (error) {
      console.error('Error parsing HTTP request:', error);
      return null;
    }
  }

  /**
   * Route HTTP requests to appropriate handlers
   */
  private async routeRequest(socket: any, request: ParsedHttpRequest): Promise<void> {
    try {
      const { method, path } = request;

      // GET / - Serve web interface
      if (method === 'GET' && path === '/') {
        await this.handleGetWebInterface(socket);
        return;
      }

      // GET /app.js - Serve JavaScript file
      if (method === 'GET' && path === '/app.js') {
        await this.handleGetAppJs(socket);
        return;
      }

      // GET /ResponseViewer.js - Serve ResponseViewer JavaScript file
      if (method === 'GET' && path === '/ResponseViewer.js') {
        await this.handleGetResponseViewerJs(socket);
        return;
      }

      // WebSocket upgrade request
      if (method === 'GET' && path === '/ws' && request.headers['upgrade'] === 'websocket') {
        await this.handleWebSocketUpgrade(socket, request);
        return;
      }

      // POST /api/enroll - Execute enrollment operation
      if (method === 'POST' && path === '/api/enroll') {
        await this.handleEnrollOperation(socket, request);
        return;
      }

      // POST /api/validate - Execute validation operation
      if (method === 'POST' && path === '/api/validate') {
        await this.handleValidateOperation(socket, request);
        return;
      }

      // POST /api/delete-keys - Execute delete keys operation
      if (method === 'POST' && path === '/api/delete-keys') {
        await this.handleDeleteKeysOperation(socket, request);
        return;
      }

      // GET /api/state - Get current app state
      if (method === 'GET' && path === '/api/state') {
        await this.handleGetState(socket);
        return;
      }

      // POST /api/config - Update configuration
      if (method === 'POST' && path === '/api/config') {
        await this.handleUpdateConfig(socket, request);
        return;
      }

      // 404 Not Found
      this.sendHttpResponse(socket, 404, 'Not Found');
    } catch (error) {
      console.error('Error routing request:', error);
      this.sendHttpResponse(socket, 500, 'Internal Server Error');
    }
  }

  /**
   * Handle GET / - Serve web interface HTML
   */
  private async handleGetWebInterface(socket: any): Promise<void> {
    try {
      // For now, serve a basic HTML response that loads the web interface
      // In a real implementation, this would load from the bundle
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Biometric Playground - Web Control</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .status { padding: 10px; background: #f0f0f0; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Biometric Playground - Web Control</h1>
        <div class="status">
            <p>Web control server is running and authenticated.</p>
            <p>Use the API endpoints to interact with the biometric system:</p>
            <ul>
                <li>POST /api/enroll - Execute enrollment</li>
                <li>POST /api/validate - Execute validation</li>
                <li>POST /api/delete-keys - Delete biometric keys</li>
                <li>GET /api/state - Get current app state</li>
                <li>POST /api/config - Update configuration</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
      
      this.sendHttpResponse(socket, 200, htmlContent, {
        'Content-Type': 'text/html; charset=utf-8',
      });
    } catch (error) {
      console.error('Error serving web interface:', error);
      this.sendHttpResponse(socket, 500, 'Failed to load web interface');
    }
  }

  /**
   * Handle GET /app.js - Serve JavaScript file
   */
  private async handleGetAppJs(socket: any): Promise<void> {
    try {
      // For now, serve a basic JavaScript response
      const jsContent = `
// Basic web control JavaScript
console.log('Web Control JavaScript loaded');

// WebSocket connection for real-time communication
let ws = null;

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host + '/ws';
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = function() {
            console.log('WebSocket connected');
        };
        
        ws.onmessage = function(event) {
            console.log('WebSocket message:', event.data);
        };
        
        ws.onclose = function() {
            console.log('WebSocket disconnected');
        };
        
        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    connectWebSocket();
});
`;
      
      this.sendHttpResponse(socket, 200, jsContent, {
        'Content-Type': 'application/javascript; charset=utf-8',
      });
    } catch (error) {
      console.error('Error serving app.js:', error);
      this.sendHttpResponse(socket, 500, 'Failed to load JavaScript file');
    }
  }

  /**
   * Handle GET /ResponseViewer.js - Serve ResponseViewer JavaScript file
   */
  private async handleGetResponseViewerJs(socket: any): Promise<void> {
    try {
      const jsContent = `
// ResponseViewer JavaScript
console.log('ResponseViewer JavaScript loaded');

class ResponseViewer {
    constructor() {
        this.container = null;
    }
    
    displayResponse(response) {
        console.log('Displaying response:', response);
    }
    
    showLoading() {
        console.log('Showing loading state');
    }
    
    displayError(error) {
        console.error('Displaying error:', error);
    }
}

window.ResponseViewer = ResponseViewer;
`;
      
      this.sendHttpResponse(socket, 200, jsContent, {
        'Content-Type': 'application/javascript; charset=utf-8',
      });
    } catch (error) {
      console.error('Error serving ResponseViewer.js:', error);
      this.sendHttpResponse(socket, 500, 'Failed to load ResponseViewer JavaScript file');
    }
  }

  /**
   * Handle WebSocket upgrade request
   */
  private async handleWebSocketUpgrade(socket: any, request: ParsedHttpRequest): Promise<void> {
    try {
      // Delegate WebSocket handling to WebSocketManager
      await webSocketManager.handleUpgrade(socket, request);
    } catch (error) {
      console.error('Error handling WebSocket upgrade:', error);
      this.sendHttpResponse(socket, 400, 'WebSocket upgrade failed');
    }
  }

  /**
   * Handle POST /api/enroll - Execute enrollment operation
   */
  private async handleEnrollOperation(socket: any, request: ParsedHttpRequest): Promise<void> {
    try {
      const requestData = this.parseJsonBody(request.body);
      const requestId = this.generateRequestId();

      // Create web request
      const webRequest: WebRequest = {
        action: 'enroll',
        payload: {
          endpointConfig: requestData.config,
        },
        requestId,
      };

      // Execute operation through WebControlBridge
      const result = await webControlBridge.executeEnrollment(requestData.config);

      // Create response
      const response: WebResponse = {
        success: result.success,
        data: result.data,
        error: result.success ? undefined : result.message,
        requestId,
        timestamp: new Date().toISOString(),
      };

      this.sendJsonResponse(socket, 200, response);
    } catch (error) {
      const errorResponse: WebResponse = {
        success: false,
        error: this.getErrorMessage(error),
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
      this.sendJsonResponse(socket, 500, errorResponse);
    }
  }

  /**
   * Handle POST /api/validate - Execute validation operation
   */
  private async handleValidateOperation(socket: any, request: ParsedHttpRequest): Promise<void> {
    try {
      const requestData = this.parseJsonBody(request.body);
      const requestId = this.generateRequestId();

      // Create web request
      const webRequest: WebRequest = {
        action: 'validate',
        payload: {
          endpointConfig: requestData.config,
        },
        requestId,
      };

      // Execute operation through WebControlBridge
      const result = await webControlBridge.executeValidation(requestData.config);

      // Create response
      const response: WebResponse = {
        success: result.success,
        data: result.data,
        error: result.success ? undefined : result.message,
        requestId,
        timestamp: new Date().toISOString(),
      };

      this.sendJsonResponse(socket, 200, response);
    } catch (error) {
      const errorResponse: WebResponse = {
        success: false,
        error: this.getErrorMessage(error),
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
      this.sendJsonResponse(socket, 500, errorResponse);
    }
  }

  /**
   * Handle POST /api/delete-keys - Execute delete keys operation
   */
  private async handleDeleteKeysOperation(socket: any, request: ParsedHttpRequest): Promise<void> {
    try {
      const requestId = this.generateRequestId();

      // Create web request
      const webRequest: WebRequest = {
        action: 'delete-keys',
        requestId,
      };

      // Execute operation through WebControlBridge
      const result = await webControlBridge.deleteKeys();

      // Create response
      const response: WebResponse = {
        success: result.success,
        data: result.data,
        error: result.success ? undefined : result.message,
        requestId,
        timestamp: new Date().toISOString(),
      };

      this.sendJsonResponse(socket, 200, response);
    } catch (error) {
      const errorResponse: WebResponse = {
        success: false,
        error: this.getErrorMessage(error),
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
      this.sendJsonResponse(socket, 500, errorResponse);
    }
  }

  /**
   * Handle GET /api/state - Get current app state
   */
  private async handleGetState(socket: any): Promise<void> {
    try {
      const requestId = this.generateRequestId();

      // Get current state from WebControlBridge
      const state = webControlBridge.getAppState();

      // Create response
      const response: WebResponse = {
        success: true,
        data: state,
        requestId,
        timestamp: new Date().toISOString(),
      };

      this.sendJsonResponse(socket, 200, response);
    } catch (error) {
      const errorResponse: WebResponse = {
        success: false,
        error: this.getErrorMessage(error),
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
      this.sendJsonResponse(socket, 500, errorResponse);
    }
  }

  /**
   * Handle POST /api/config - Update configuration
   */
  private async handleUpdateConfig(socket: any, request: ParsedHttpRequest): Promise<void> {
    try {
      const requestData = this.parseJsonBody(request.body);
      const requestId = this.generateRequestId();

      if (!requestData.type || !requestData.config) {
        throw new Error('Missing required fields: type and config');
      }

      if (!['enroll', 'validate'].includes(requestData.type)) {
        throw new Error('Invalid config type. Must be "enroll" or "validate"');
      }

      // Update configuration through WebControlBridge
      await webControlBridge.updateConfiguration(requestData.type, requestData.config);

      // Create response
      const response: WebResponse = {
        success: true,
        data: { message: `${requestData.type} configuration updated successfully` },
        requestId,
        timestamp: new Date().toISOString(),
      };

      this.sendJsonResponse(socket, 200, response);
    } catch (error) {
      const errorResponse: WebResponse = {
        success: false,
        error: this.getErrorMessage(error),
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
      this.sendJsonResponse(socket, 400, errorResponse);
    }
  }

  /**
   * Parse JSON body from request
   */
  private parseJsonBody(body: string): any {
    try {
      return body ? JSON.parse(body) : {};
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }

  /**
   * Send JSON response
   */
  private sendJsonResponse(socket: any, statusCode: number, data: any): void {
    const jsonBody = JSON.stringify(data, null, 2);
    this.sendHttpResponse(socket, statusCode, jsonBody, {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract error message from unknown error type
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
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
