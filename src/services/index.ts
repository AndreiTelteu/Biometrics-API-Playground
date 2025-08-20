/**
 * Services module exports
 */

export { BiometricService, biometricService } from './BiometricService';
export { BiometricAPIService, biometricAPIService } from './BiometricAPIService';
export { WebServerService } from './WebServerService';
export { AuthenticationMiddleware } from './AuthenticationMiddleware';
export { WebSocketManager } from './WebSocketManager';
export { WebControlBridge, webControlBridge } from './WebControlBridge';

// Create singleton instance of WebServerService
import { WebServerService } from './WebServerService';
export const webServerService = new WebServerService();

// Create singleton instance of WebSocketManager
import { WebSocketManager } from './WebSocketManager';
export const webSocketManager = new WebSocketManager();