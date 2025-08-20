import TcpSocket from 'react-native-tcp-socket';
import { AppState } from 'react-native';
import { ServerInfo, AuthCredentials, ServerStatus } from '../types';
import { AuthenticationMiddleware } from './AuthenticationMiddleware';
import { webControlBridge, WebRequest, WebResponse } from './WebControlBridge';
import { webSocketManager } from './WebSocketManager';
import { webControlStateManager } from './WebControlStateManager';
import { configurationPersistence } from './ConfigurationPersistence';
import { errorHandler, ServerErrorDetails } from '../utils/ErrorHandler';
import { networkResilience } from '../utils/NetworkResilience';

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
  private appStateSubscription: any = null;
  private isShuttingDown: boolean = false;
  private connectionCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly CONNECTION_CLEANUP_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.authMiddleware = new AuthenticationMiddleware();
    this.setupAppStateListener();
    this.setupErrorHandling();
  }

  /**
   * Starts the web server on an available port
   * @param preferredPort Optional preferred port number
   * @returns Promise resolving to server information
   */
  async startServer(preferredPort?: number): Promise<ServerInfo> {
    if (this.serverStatus.isRunning) {
      const error = new Error('Server is already running');
      errorHandler.handleServerError(error, 'Start server');
      throw error;
    }

    if (this.isShuttingDown) {
      const error = new Error('Server is shutting down, please wait');
      errorHandler.handleServerError(error, 'Start server');
      throw error;
    }

    try {
      let port = await this.findAvailablePortWithRetry(preferredPort);
      const credentials = this.generateAuthCredentials();

      // Configure authentication middleware
      this.authMiddleware.setCredentials(credentials);

      // Create TCP server with error handling
      this.server = TcpSocket.createServer((socket: any) => {
        this.handleConnectionWithErrorHandling(socket);
      });

      // Set up server error handlers
      this.setupServerErrorHandlers();

      // Try to start server with automatic port fallback
      port = await this.startServerWithPortFallback(port);

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

      // Start connection cleanup timer
      this.startConnectionCleanup();

      // Initialize WebSocket manager
      webSocketManager.initialize();
      
      // Update state manager with server status
      webControlStateManager.updateServerStatus(this.serverStatus);

      // Mark network as connected
      networkResilience.markConnected();

      console.log(`Web server started successfully on port ${port}`);

      return {
        port,
        url: this.serverStatus.url!,
        password: credentials.password,
        isRunning: true,
      };
    } catch (error) {
      let errorMessage = 'Unknown server error';
      
      try {
        const serverError = errorHandler.handleServerError(error, 'Start server');
        errorMessage = serverError?.userMessage || serverError?.message || String(error);
      } catch (handlerError) {
        // If error handler fails, use the original error
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      
      // Clean up any partial state
      await this.cleanupFailedStart();
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Stops the web server
   */
  async stopServer(): Promise<void> {
    if (!this.serverStatus.isRunning && !this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    try {
      console.log('Stopping web server...');

      // Stop connection cleanup timer
      this.stopConnectionCleanup();

      // Shutdown WebSocket manager first
      webSocketManager.shutdown();

      // Mark network as disconnected
      networkResilience.markDisconnected();

      // Close server with timeout and safe cleanup
      await this.stopServerWithTimeout();

      // Reset server status
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
      this.server = null;
      
      // Update state manager with server status
      webControlStateManager.updateServerStatus(this.serverStatus);

      console.log('Web server stopped successfully');
    } catch (error) {
      const serverError = errorHandler.handleServerError(error, 'Stop server');
      console.error('Error stopping server:', serverError.message);
      
      // Force cleanup even if there was an error
      this.forceCleanup();
      
      throw new Error(serverError.userMessage || serverError.message);
    } finally {
      this.isShuttingDown = false;
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
   * Finds an available port within the specified range (simplified to avoid socket issues)
   */
  private async findAvailablePort(preferredPort?: number): Promise<number> {
    // Skip port checking entirely to avoid React Native TCP socket issues
    // Let the server startup handle port conflicts with automatic fallback
    const targetPort = preferredPort || 8080;
    console.log(`Using target port: ${targetPort} (will fallback automatically if needed)`);
    return targetPort;
  }

  /**
   * Checks if a port is available (simplified version)
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const timeout = 500; // Very short timeout - 500ms
      let resolved = false;
      let testServer: any = null;
      let timeoutId: any = null;
      let isServerListening = false;
      
      const resolveOnce = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // Clean up test server safely
          if (testServer) {
            try {
              // Only close if the server is actually listening
              if (isServerListening) {
                testServer.close();
              }
            } catch (closeError) {
              // Ignore close errors - socket might already be closed
            }
            testServer = null;
          }
          
          resolve(result);
        }
      };

      // Set aggressive timeout to prevent hanging
      timeoutId = setTimeout(() => {
        resolveOnce(false);
      }, timeout);

      try {
        testServer = TcpSocket.createServer();
        
        // Handle server errors
        testServer.on('error', (error: any) => {
          isServerListening = false;
          resolveOnce(false);
        });

        // Handle successful listening
        testServer.listen({ port, host: '0.0.0.0' }, (error?: any) => {
          if (error) {
            isServerListening = false;
            resolveOnce(false);
          } else {
            isServerListening = true;
            resolveOnce(true);
          }
        });
      } catch (error) {
        resolveOnce(false);
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

      // Get current state from WebControlBridge and StateManager
      const bridgeState = webControlBridge.getAppState();
      const configurationState = webControlStateManager.getConfigurationForWeb();

      // Combine states
      const combinedState = {
        ...bridgeState,
        ...configurationState,
        serverStatus: this.serverStatus,
      };

      // Create response
      const response: WebResponse = {
        success: true,
        data: combinedState,
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

      // Handle different types of configuration updates
      if (requestData.type && requestData.config) {
        // Single endpoint configuration update
        if (!['enroll', 'validate'].includes(requestData.type)) {
          throw new Error('Invalid config type. Must be "enroll" or "validate"');
        }

        // Update configuration through WebControlBridge (which will persist it)
        await webControlBridge.updateConfiguration(requestData.type, requestData.config);

        // Create response
        const response: WebResponse = {
          success: true,
          data: { message: `${requestData.type} configuration updated successfully` },
          requestId,
          timestamp: new Date().toISOString(),
        };

        this.sendJsonResponse(socket, 200, response);
      } else if (requestData.configurations) {
        // Bulk configuration update from web interface
        await webControlStateManager.syncConfigurationFromWeb(requestData.configurations);

        // Create response
        const response: WebResponse = {
          success: true,
          data: { message: 'Configurations synchronized successfully' },
          requestId,
          timestamp: new Date().toISOString(),
        };

        this.sendJsonResponse(socket, 200, response);
      } else {
        throw new Error('Missing required fields: type and config, or configurations');
      }
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

  /**
   * Setup app state listener for automatic shutdown
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background, consider stopping server after delay
        setTimeout(() => {
          if (AppState.currentState === 'background') {
            this.handleAppBackground();
          }
        }, 5000); // 5 second delay to avoid stopping during brief background states
      }
    });
  }

  /**
   * Setup error handling for the service
   */
  private setupErrorHandling(): void {
    // Add error listener to handle server errors
    errorHandler.addErrorListener((error) => {
      if (error.code.startsWith('SERVER_')) {
        console.log(`Server error handled: ${error.code} - ${error.message}`);
      }
    });

    // Setup network resilience
    networkResilience.initialize({
      maxAttempts: 3,
      initialDelay: 2000,
      maxDelay: 10000,
    });
  }

  /**
   * Handle app going to background
   */
  private async handleAppBackground(): void {
    if (this.serverStatus.isRunning) {
      console.log('App went to background, stopping web server...');
      try {
        await this.stopServer();
      } catch (error) {
        console.error('Error stopping server on app background:', error);
      }
    }
  }

  /**
   * Find available port with simplified logic (no socket operations)
   */
  private async findAvailablePortWithRetry(preferredPort?: number): Promise<number> {
    console.log(`Finding available port, preferred: ${preferredPort || 'none'}`);

    // Skip all port checking to avoid React Native TCP socket ID issues
    // The startServerWithPortFallback method will handle port conflicts
    const targetPort = preferredPort || 8080;
    console.log(`Using target port: ${targetPort} (automatic fallback enabled)`);
    return targetPort;
  }

  /**
   * Start server with automatic port fallback
   */
  private async startServerWithPortFallback(initialPort: number): Promise<number> {
    const portsToTry = [initialPort, 8080, 8081, 8082, 8083, 8084, 8085];
    const uniquePorts = [...new Set(portsToTry)]; // Remove duplicates
    
    for (const port of uniquePorts) {
      try {
        console.log(`Attempting to start server on port ${port}...`);
        await this.startServerWithTimeout(port);
        console.log(`Server successfully started on port ${port}`);
        return port;
      } catch (error) {
        console.log(`Failed to start server on port ${port}:`, error);
        
        // If this isn't the last port, continue to next
        if (port !== uniquePorts[uniquePorts.length - 1]) {
          console.log(`Trying next port...`);
          
          // Clean up the current server instance safely
          await this.safeCleanupServer();
          
          // Recreate server for next attempt
          this.server = TcpSocket.createServer((socket: any) => {
            this.handleConnectionWithErrorHandling(socket);
          });
          this.setupServerErrorHandlers();
          
          continue;
        }
        
        // If this was the last port, throw the error
        throw new Error(`Failed to start server on any available port. Last error: ${error}`);
      }
    }
    
    throw new Error('No ports available for server startup');
  }

  /**
   * Start server with timeout
   */
  private async startServerWithTimeout(port: number): Promise<void> {
    const timeout = 5000; // 5 seconds (reduced timeout)

    return new Promise<void>((resolve, reject) => {
      let resolved = false;
      
      const resolveOnce = (error?: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      };

      const timeoutId = setTimeout(() => {
        console.log(`Server start timeout on port ${port}`);
        resolveOnce(new Error(`Server start timeout on port ${port}`));
      }, timeout);

      try {
        // Remove any existing error listeners to avoid duplicates
        if (this.server && typeof this.server.removeAllListeners === 'function') {
          this.server.removeAllListeners('error');
        }
        
        // Set up error handler before listening
        this.server.on('error', (error: any) => {
          console.log(`Server error on port ${port}:`, error.message);
          resolveOnce(error);
        });

        this.server.listen({ port, host: '0.0.0.0' }, (error: any) => {
          if (error) {
            console.log(`Server listen error on port ${port}:`, error.message);
            resolveOnce(error);
          } else {
            console.log(`Server successfully listening on port ${port}`);
            resolveOnce();
          }
        });
      } catch (error) {
        console.log(`Server setup error on port ${port}:`, error);
        resolveOnce(error);
      }
    });
  }

  /**
   * Stop server with timeout and safe cleanup
   */
  private async stopServerWithTimeout(): Promise<void> {
    if (!this.server) {
      return;
    }

    const timeout = 3000; // 3 seconds (reduced)

    return new Promise<void>(async (resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        console.warn('Server stop timeout, forcing safe cleanup');
        try {
          await this.safeCleanupServer();
        } catch (error) {
          console.error('Error during forced cleanup:', error);
        }
        resolve();
      }, timeout);

      try {
        // Use safe cleanup instead of direct close
        await this.safeCleanupServer();
        clearTimeout(timeoutId);
        resolve();
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error during server stop:', error);
        // Still resolve to avoid hanging
        resolve();
      }
    });
  }

  /**
   * Setup server error handlers
   */
  private setupServerErrorHandlers(): void {
    if (!this.server) return;

    this.server.on('error', (error: any) => {
      const serverError = errorHandler.handleServerError(error, 'Server operation');
      console.error('Server error:', serverError.message);
      
      // If it's a critical error, stop the server
      if (!serverError.recoverable) {
        this.handleCriticalServerError(serverError);
      }
    });

    this.server.on('close', () => {
      console.log('Server closed');
      if (this.serverStatus.isRunning && !this.isShuttingDown) {
        // Unexpected close
        console.warn('Server closed unexpectedly');
        this.handleUnexpectedServerClose();
      }
    });
  }

  /**
   * Handle connection with comprehensive error handling
   */
  private handleConnectionWithErrorHandling(socket: any): void {
    try {
      this.serverStatus.activeConnections++;

      // Set up socket error handlers
      socket.on('error', (error: any) => {
        const networkError = errorHandler.handleNetworkError(error, 'Socket connection');
        console.error(`Socket error: ${networkError.message}`);
        this.cleanupSocket(socket);
      });

      socket.on('timeout', () => {
        const error = new Error('Socket timeout');
        const networkError = errorHandler.handleNetworkError(error, 'Socket connection');
        console.warn(`Socket timeout: ${networkError.message}`);
        this.cleanupSocket(socket);
      });

      socket.on('close', () => {
        this.serverStatus.activeConnections = Math.max(0, this.serverStatus.activeConnections - 1);
      });

      // Set socket timeout
      socket.setTimeout(60000); // 60 seconds

      // Handle data with error handling
      socket.on('data', (data: any) => {
        try {
          const request = data.toString();
          this.handleHttpRequestWithErrorHandling(socket, request);
        } catch (error) {
          const appError = errorHandler.handleApplicationError(error, 'Request processing');
          console.error('Error handling request:', appError.message);
          this.sendErrorResponse(socket, 500, appError.userMessage || 'Internal Server Error');
        }
      });

    } catch (error) {
      const serverError = errorHandler.handleServerError(error, 'Connection handling');
      console.error('Error handling connection:', serverError.message);
      this.cleanupSocket(socket);
    }
  }

  /**
   * Handle HTTP request with comprehensive error handling
   */
  private handleHttpRequestWithErrorHandling(socket: any, request: string): void {
    try {
      console.log('Received HTTP request:', request.split('\r\n')[0]);

      // Validate authentication with error handling
      let authResult;
      try {
        authResult = this.authMiddleware.validateRequest(request);
      } catch (error) {
        const authError = errorHandler.handleApplicationError(error, 'Authentication');
        this.sendErrorResponse(socket, 500, authError.userMessage || 'Authentication error');
        return;
      }

      if (!authResult.isValid) {
        this.sendHttpResponse(
          socket,
          authResult.statusCode,
          authResult.body,
          authResult.headers,
        );
        return;
      }

      // Parse HTTP request with error handling
      let parsedRequest;
      try {
        parsedRequest = this.parseHttpRequest(request);
      } catch (error) {
        const parseError = errorHandler.handleApplicationError(error, 'Request parsing');
        this.sendErrorResponse(socket, 400, parseError.userMessage || 'Bad Request');
        return;
      }
      
      if (!parsedRequest) {
        this.sendErrorResponse(socket, 400, 'Invalid request format');
        return;
      }

      // Route the request with error handling
      this.routeRequestWithErrorHandling(socket, parsedRequest);
    } catch (error) {
      const appError = errorHandler.handleApplicationError(error, 'HTTP request handling');
      console.error('Error in HTTP request handling:', appError.message);
      this.sendErrorResponse(socket, 500, appError.userMessage || 'Internal Server Error');
    }
  }

  /**
   * Route requests with comprehensive error handling
   */
  private async routeRequestWithErrorHandling(socket: any, request: ParsedHttpRequest): Promise<void> {
    try {
      await this.routeRequest(socket, request);
    } catch (error) {
      const routingError = errorHandler.handleApplicationError(error, 'Request routing');
      console.error('Error routing request:', routingError.message);
      this.sendErrorResponse(socket, 500, routingError.userMessage || 'Internal Server Error');
    }
  }

  /**
   * Send standardized error response
   */
  private sendErrorResponse(socket: any, statusCode: number, message: string): void {
    try {
      const errorResponse = {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      };

      this.sendJsonResponse(socket, statusCode, errorResponse);
    } catch (error) {
      // Fallback to basic HTTP response if JSON response fails
      try {
        this.sendHttpResponse(socket, statusCode, message);
      } catch (fallbackError) {
        console.error('Failed to send error response:', fallbackError);
        // Last resort: close the socket
        this.cleanupSocket(socket);
      }
    }
  }

  /**
   * Clean up socket connection
   */
  private cleanupSocket(socket: any): void {
    try {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    } catch (error) {
      console.error('Error cleaning up socket:', error);
    }
    
    this.serverStatus.activeConnections = Math.max(0, this.serverStatus.activeConnections - 1);
  }

  /**
   * Handle critical server errors
   */
  private async handleCriticalServerError(error: ServerErrorDetails): void {
    console.error('Critical server error, stopping server:', error.message);
    
    try {
      await this.stopServer();
    } catch (stopError) {
      console.error('Error stopping server after critical error:', stopError);
      this.forceCleanup();
    }
  }

  /**
   * Handle unexpected server close
   */
  private handleUnexpectedServerClose(): void {
    console.warn('Server closed unexpectedly, cleaning up state');
    
    this.serverStatus.isRunning = false;
    this.serverStatus.activeConnections = 0;
    
    // Mark network as disconnected
    networkResilience.markDisconnected(new Error('Server closed unexpectedly'));
    
    // Shutdown WebSocket manager
    webSocketManager.shutdown();
  }

  /**
   * Safely cleanup server to avoid socket ID issues
   */
  private async safeCleanupServer(): Promise<void> {
    try {
      if (this.server) {
        // Remove all listeners first to prevent events during cleanup
        if (typeof this.server.removeAllListeners === 'function') {
          this.server.removeAllListeners();
        }
        
        // Close server with a small delay to allow cleanup
        this.server.close();
        
        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.server = null;
      }
    } catch (error) {
      console.error('Error during safe server cleanup:', error);
      // Force null the server reference even if cleanup failed
      this.server = null;
    }
  }

  /**
   * Clean up after failed server start
   */
  private async cleanupFailedStart(): void {
    try {
      await this.safeCleanupServer();
      
      this.authCredentials = null;
      this.authMiddleware.clearCredentials();
      
      this.serverStatus = {
        isRunning: false,
        port: null,
        url: null,
        password: null,
        startTime: null,
        activeConnections: 0,
      };
    } catch (error) {
      console.error('Error during cleanup after failed start:', error);
    }
  }

  /**
   * Force cleanup of all resources
   */
  private forceCleanup(): void {
    try {
      // Stop timers
      this.stopConnectionCleanup();
      
      // Close server
      if (this.server) {
        try {
          this.server.close();
        } catch (error) {
          console.error('Error force closing server:', error);
        }
        this.server = null;
      }
      
      // Reset state
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
      
      // Shutdown related services
      webSocketManager.shutdown();
      networkResilience.markDisconnected();
      
    } catch (error) {
      console.error('Error in force cleanup:', error);
    }
  }

  /**
   * Start connection cleanup timer
   */
  private startConnectionCleanup(): void {
    if (this.connectionCleanupTimer) {
      return;
    }

    this.connectionCleanupTimer = setInterval(() => {
      this.performConnectionCleanup();
    }, this.CONNECTION_CLEANUP_INTERVAL);
  }

  /**
   * Stop connection cleanup timer
   */
  private stopConnectionCleanup(): void {
    if (this.connectionCleanupTimer) {
      clearInterval(this.connectionCleanupTimer);
      this.connectionCleanupTimer = null;
    }
  }

  /**
   * Perform periodic connection cleanup
   */
  private performConnectionCleanup(): void {
    try {
      // This is a placeholder for connection cleanup logic
      // In a real implementation, this would check for stale connections
      if (this.serverStatus.activeConnections < 0) {
        this.serverStatus.activeConnections = 0;
      }
      
      console.log(`Connection cleanup: ${this.serverStatus.activeConnections} active connections`);
    } catch (error) {
      console.error('Error during connection cleanup:', error);
    }
  }

  /**
   * Cleanup on service destruction
   */
  async destroy(): Promise<void> {
    try {
      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      // Stop server if running
      if (this.serverStatus.isRunning) {
        await this.stopServer();
      }

      // Shutdown network resilience
      networkResilience.shutdown();

    } catch (error) {
      console.error('Error during WebServerService destruction:', error);
    }
  }
}
