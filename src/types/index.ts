/**
 * Main types export file for the Biometrics Playground app
 */

export * from './biometrics';
export * from './webserver';

// Re-export commonly used types for convenience
export type {
  BiometricStatus,
  EndpointConfig,
  OperationResult,
  LogEntry,
  AppState,
  BiometryType,
  HttpMethod,
  OperationType,
  OperationStatus,
} from './biometrics';

export type {
  ServerInfo,
  AuthCredentials,
  ServerStatus,
  WebControlState,
  AuthenticationResult,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketConnection,
  WebSocketManagerState,
  WebRequest,
  WebResponse,
  WebControlBridgeState,
  ActiveOperation,
  QueuedOperation,
  ConnectionInfo,
  ConfigurationChange,
  StateChangeListener,
  ErrorDetails,
  NetworkErrorDetails,
  ServerErrorDetails,
  ConnectionState,
  ReconnectionOptions,
  ConnectionListener,
} from './webserver';