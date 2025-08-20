export interface ServerInfo {
  port: number;
  url: string;
  password: string;
  isRunning: boolean;
}

export interface AuthCredentials {
  username: string; // Always "admin"
  password: string; // 6-digit random number
}

export interface ServerStatus {
  isRunning: boolean;
  port: number | null;
  url: string | null;
  password: string | null;
  startTime: Date | null;
  activeConnections: number;
}

export interface WebControlState {
  server: {
    isRunning: boolean;
    port: number;
    url: string;
    password: string;
  };
  connections: {
    activeConnections: number;
    lastActivity: Date;
  };
  operations: {
    currentOperation: string | null;
    isLoading: boolean;
    lastResult: any | null;
  };
}

export interface AuthenticationResult {
  isValid: boolean;
  statusCode: number;
  statusText: string;
  headers: { [key: string]: string };
  body: string;
}

// WebSocket message types and interfaces
export type WebSocketMessageType = 
  | 'operation-start'
  | 'operation-complete'
  | 'log-update'
  | 'state-sync'
  | 'config-update'
  | 'connection-established'
  | 'ping'
  | 'pong';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  data: any;
  operationId?: string;
  clientId?: string;
}

export interface WebSocketConnection {
  id: string;
  socket: any;
  isAlive: boolean;
  connectedAt: Date;
  lastActivity: Date;
}

export interface WebSocketManagerState {
  isActive: boolean;
  connections: Map<string, WebSocketConnection>;
  messageQueue: WebSocketMessage[];
  stats: {
    totalConnections: number;
    activeConnections: number;
    messagesSent: number;
    messagesReceived: number;
  };
}

// Additional interfaces for web control integration
export interface WebRequest {
  action: 'enroll' | 'validate' | 'delete-keys' | 'get-state' | 'update-config';
  payload?: {
    endpointConfig?: any;
    configType?: 'enroll' | 'validate';
    customPayload?: string;
  };
  requestId: string;
}

export interface WebResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId: string;
  timestamp: string;
}

export interface WebControlBridgeState {
  biometricStatus: any;
  keysExist: boolean;
  enrollEndpoint: any;
  validateEndpoint: any;
  operationStatus: any;
  logs: any[];
  isLoading: boolean;
}

export interface ActiveOperation {
  id: string;
  type: 'enroll' | 'validate' | 'delete-keys';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  progress?: number;
  endpoint?: string;
  clientId?: string;
}

export interface QueuedOperation {
  id: string;
  type: 'enroll' | 'validate' | 'delete-keys';
  config?: any;
  clientId: string;
  queuedAt: Date;
  priority: number;
}

export interface ConnectionInfo {
  id: string;
  connectedAt: Date;
  lastActivity: Date;
  operationsCount: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface ConfigurationChange {
  id: string;
  type: 'server-settings' | 'endpoint-config' | 'preferences';
  target: 'enroll' | 'validate' | 'server' | 'preferences';
  changes: any;
  timestamp: Date;
  source: 'web' | 'mobile';
  applied: boolean;
}

export interface StateChangeListener {
  onStateChanged: (state: any) => void;
  onOperationStatusChanged: (operation: ActiveOperation) => void;
  onConfigurationChanged: (change: ConfigurationChange) => void;
  onConnectionChanged: (connections: Map<string, ConnectionInfo>) => void;
}

export interface ErrorDetails {
  code: string;
  message: string;
  originalError?: any;
  timestamp: Date;
  context?: string;
  recoverable?: boolean;
  userMessage?: string;
}

export interface NetworkErrorDetails extends ErrorDetails {
  statusCode?: number;
  endpoint?: string;
  retryable?: boolean;
}

export interface ServerErrorDetails extends ErrorDetails {
  port?: number;
  operation?: string;
  serverState?: any;
}

export interface ConnectionState {
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isReconnecting: boolean;
}

export interface ReconnectionOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

export interface ConnectionListener {
  onConnected?: () => void;
  onDisconnected?: (error?: any) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onReconnectionFailed?: (error: any) => void;
}
