/**
 * Services module exports
 */

export { BiometricService, biometricService } from './BiometricService';
export { BiometricAPIService, biometricAPIService } from './BiometricAPIService';
export { WebServerService } from './WebServerService';
export { AuthenticationMiddleware } from './AuthenticationMiddleware';

// Create singleton instance of WebServerService
import { WebServerService } from './WebServerService';
export const webServerService = new WebServerService();