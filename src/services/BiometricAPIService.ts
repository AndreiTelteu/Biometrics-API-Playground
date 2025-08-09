/**
 * BiometricAPIService - HTTP API service for backend communication
 * Handles enrollment and validation API calls with configurable endpoints
 */

import {
  EndpointConfig,
  OperationResult,
  APIResponse,
  NetworkError,
  ValidationResult,
} from '../types';

export class BiometricAPIService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  /**
   * Enroll a public key with the backend service
   */
  async enrollPublicKey(
    config: EndpointConfig,
    publicKey: string
  ): Promise<OperationResult> {
    try {
      // Validate configuration
      const validation = this.validateEndpointConfig(config);
      if (!validation.isValid) {
        return this.createErrorResult(
          `Invalid endpoint configuration: ${validation.errors.join(', ')}`
        );
      }

      // Prepare request body
      const requestBody = {
        publicKey,
        timestamp: new Date().toISOString(),
      };

      // Make API request
      const response = await this.makeRequest(config, requestBody);

      if (response.success) {
        return this.createSuccessResult(
          'Enrollment successful',
          response.data
        );
      } else {
        return this.createErrorResult(
          response.error || 'Enrollment failed',
          response.data
        );
      }
    } catch (error) {
      return this.createErrorResult(
        `Enrollment request failed: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Validate a signature with the backend service
   */
  async validateSignature(
    config: EndpointConfig,
    signature: string,
    payload: string
  ): Promise<OperationResult> {
    try {
      // Validate configuration
      const validation = this.validateEndpointConfig(config);
      if (!validation.isValid) {
        return this.createErrorResult(
          `Invalid endpoint configuration: ${validation.errors.join(', ')}`
        );
      }

      // Prepare request body
      const requestBody = {
        signature,
        payload,
        timestamp: new Date().toISOString(),
      };

      // Make API request
      const response = await this.makeRequest(config, requestBody);

      if (response.success) {
        return this.createSuccessResult(
          'Validation successful',
          response.data
        );
      } else {
        return this.createErrorResult(
          response.error || 'Validation failed',
          response.data
        );
      }
    } catch (error) {
      return this.createErrorResult(
        `Validation request failed: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  private async makeRequest(
    config: EndpointConfig,
    body?: any
  ): Promise<APIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const requestOptions: RequestInit = {
        method: config.method,
        headers: {
          ...this.DEFAULT_HEADERS,
          ...config.headers,
        },
        signal: controller.signal,
      };

      // Add body for methods that support it
      if (body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(config.url, requestOptions);
      clearTimeout(timeoutId);

      return await this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Handle HTTP response and parse JSON
   */
  private async handleResponse(response: Response): Promise<APIResponse> {
    try {
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        return {
          success: true,
          data,
          status: response.status,
        };
      } else {
        return {
          success: false,
          error: this.extractErrorMessage(data, response.status),
          data,
          status: response.status,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse response: ${this.getErrorMessage(error)}`,
        status: response.status,
      };
    }
  }

  /**
   * Extract error message from response data
   */
  private extractErrorMessage(data: any, status: number): string {
    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      // Try common error message fields
      const errorFields = ['error', 'message', 'errorMessage', 'detail'];
      for (const field of errorFields) {
        if (data[field] && typeof data[field] === 'string') {
          return data[field];
        }
      }
    }

    // Fallback to HTTP status message
    return `HTTP ${status}: ${this.getStatusText(status)}`;
  }

  /**
   * Get HTTP status text
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      408: 'Request Timeout',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return statusTexts[status] || 'Unknown Error';
  }

  /**
   * Validate endpoint configuration
   */
  private validateEndpointConfig(config: EndpointConfig): ValidationResult {
    const errors: string[] = [];

    // Validate URL
    if (!config.url || typeof config.url !== 'string') {
      errors.push('URL is required and must be a string');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('URL must be a valid URL format');
      }
    }

    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH'];
    if (!config.method || !validMethods.includes(config.method)) {
      errors.push(`HTTP method must be one of: ${validMethods.join(', ')}`);
    }

    // Validate headers if provided
    if (config.headers && typeof config.headers !== 'object') {
      errors.push('Headers must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create success operation result
   */
  private createSuccessResult(
    message: string,
    data?: any
  ): OperationResult {
    return {
      success: true,
      message,
      data,
      timestamp: new Date(),
    };
  }

  /**
   * Create error operation result
   */
  private createErrorResult(
    message: string,
    data?: any
  ): OperationResult {
    return {
      success: false,
      message,
      data,
      timestamp: new Date(),
    };
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
}

// Export singleton instance
export const biometricAPIService = new BiometricAPIService();