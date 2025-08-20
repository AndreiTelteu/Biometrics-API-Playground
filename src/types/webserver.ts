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
