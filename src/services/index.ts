/**
 * Services module exports
 */

export { BiometricService, biometricService } from './BiometricService';
export { BiometricAPIService, biometricAPIService } from './BiometricAPIService';
export { WebServerService } from './WebServerService';
export { AuthenticationMiddleware } from './AuthenticationMiddleware';
export { WebSocketManager, webSocketManager } from './WebSocketManager';
export { WebControlBridge, webControlBridge } from './WebControlBridge';

// Create singleton instance of WebServerService
import { WebServerService } from './WebServerService';
export const webServerService = new WebServerService();

