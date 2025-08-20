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
