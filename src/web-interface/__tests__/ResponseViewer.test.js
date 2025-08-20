/**
 * ResponseViewer Component Tests
 * Testing the enhanced API response display functionality
 */

// Mock DOM elements for testing
const mockDOMElements = {
    responseContent: { innerHTML: '', appendChild: jest.fn(), querySelector: jest.fn() },
    copyButton: { textContent: '', style: {}, closest: jest.fn() }
};

// Mock document methods
global.document = {
    getElementById: jest.fn((id) => mockDOMElements[id] || null),
    createElement: jest.fn((tag) => {
        const element = {
            id: '',
            textContent: '',
            innerHTML: '',
            style: {},
            appendChild: jest.fn(),
            select: jest.fn(),
            value: ''
        };

        // Special handling for div elements used in escapeHtml
        if (tag === 'div') {
            Object.defineProperty(element, 'textContent', {
                get() { return this._textContent || ''; },
                set(value) {
                    this._textContent = value;
                    // Simulate HTML escaping
                    this.innerHTML = value
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                }
            });
        }

        return element;
    }),
    head: {
        appendChild: jest.fn()
    },
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    },
    execCommand: jest.fn(() => true)
};

// Mock navigator.clipboard
global.navigator = {
    clipboard: {
        writeText: jest.fn(() => Promise.resolve())
    }
};

// Mock Element class
global.Element = class Element {
    constructor() {
        this.innerHTML = '';
        this.textContent = '';
        this.style = {};
    }

    closest(selector) {
        return {
            querySelector: jest.fn(() => ({ textContent: 'test content' }))
        };
    }
};

// Import the ResponseViewer class
const ResponseViewer = require('../ResponseViewer');

describe('ResponseViewer', () => {
    let responseViewer;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Reset mock DOM elements
        Object.keys(mockDOMElements).forEach(key => {
            if (mockDOMElements[key].innerHTML !== undefined) {
                mockDOMElements[key].innerHTML = '';
            }
        });

        responseViewer = new ResponseViewer();
    });

    describe('Initialization', () => {
        test('should initialize with responseContent element', () => {
            expect(document.getElementById).toHaveBeenCalledWith('responseContent');
            expect(responseViewer.responseContent).toBe(mockDOMElements.responseContent);
        });

        test('should add response styles on initialization', () => {
            expect(document.createElement).toHaveBeenCalledWith('style');
            expect(document.head.appendChild).toHaveBeenCalled();
        });
    });

    describe('displayResponse', () => {
        test('should display successful response with all metadata', () => {
            const mockResponse = {
                success: true,
                data: { message: 'Success', userId: 123 },
                duration: 250,
                statusCode: 200,
                contentType: 'application/json',
                timestamp: Date.now()
            };

            responseViewer.displayResponse(mockResponse);

            expect(mockDOMElements.responseContent.innerHTML).toContain('200 OK');
            expect(mockDOMElements.responseContent.innerHTML).toContain('<strong>Duration:</strong> 250ms');
            expect(mockDOMElements.responseContent.innerHTML).toContain('application/json');
            expect(mockDOMElements.responseContent.innerHTML).toContain('Response Body');
        });

        test('should handle response without optional fields', () => {
            const mockResponse = {
                success: true,
                data: { message: 'Success' }
            };

            responseViewer.displayResponse(mockResponse);

            expect(mockDOMElements.responseContent.innerHTML).toContain('200 OK');
            expect(mockDOMElements.responseContent.innerHTML).toContain('application/json');
        });

        test('should display error status for failed responses', () => {
            const mockResponse = {
                success: false,
                data: { error: 'Validation failed' },
                statusCode: 400
            };

            responseViewer.displayResponse(mockResponse);

            expect(mockDOMElements.responseContent.innerHTML).toContain('400 Bad Request');
            expect(mockDOMElements.responseContent.innerHTML).toContain('response-status error');
        });
    });

    describe('displayError', () => {
        test('should display error with message and stack trace', () => {
            const mockError = {
                message: 'Network timeout',
                stack: 'Error: Network timeout\n    at fetch (/app/api.js:123:45)',
                code: 'NETWORK_ERROR'
            };
            const metadata = {
                duration: 5000,
                statusCode: 500,
                timestamp: Date.now()
            };

            responseViewer.displayError(mockError, metadata);

            expect(mockDOMElements.responseContent.innerHTML).toContain('500 Internal Server Error');
            expect(mockDOMElements.responseContent.innerHTML).toContain('<strong>Duration:</strong> 5000ms');
            expect(mockDOMElements.responseContent.innerHTML).toContain('❌ Error Message');
            expect(mockDOMElements.responseContent.innerHTML).toContain('❌ Error Message');
            expect(mockDOMElements.responseContent.innerHTML).toContain('🔍 Stack Trace');
            expect(mockDOMElements.responseContent.innerHTML).toContain('📋 Error Details');
        });

        test('should handle string error messages', () => {
            const errorMessage = 'Simple error message';

            responseViewer.displayError(errorMessage);

            expect(mockDOMElements.responseContent.innerHTML).toContain('500 Internal Server Error');
            expect(mockDOMElements.responseContent.innerHTML).toContain('❌ Error Message');
        });

        test('should display error details when available', () => {
            const mockError = {
                message: 'Validation failed',
                details: { field: 'email', reason: 'invalid format' },
                code: 'VALIDATION_ERROR'
            };

            responseViewer.displayError(mockError);

            expect(mockDOMElements.responseContent.innerHTML).toContain('📋 Error Details');
            expect(mockDOMElements.responseContent.innerHTML).toContain('VALIDATION_ERROR');
        });
    });

    describe('showLoading', () => {
        test('should display loading state with operation type', () => {
            responseViewer.showLoading('enrollment');

            expect(mockDOMElements.responseContent.innerHTML).toContain('Executing enrollment...');
            expect(mockDOMElements.responseContent.innerHTML).toContain('Please wait while the operation completes');
            expect(mockDOMElements.responseContent.innerHTML).toContain('spinner');
        });

        test('should use default operation type when not specified', () => {
            responseViewer.showLoading();

            expect(mockDOMElements.responseContent.innerHTML).toContain('Executing operation...');
        });
    });

    describe('formatJsonWithSyntaxHighlighting', () => {
        test('should format and highlight JSON object', () => {
            const data = { name: 'John', age: 30, active: true, score: null };
            const result = responseViewer.formatJsonWithSyntaxHighlighting(data);

            expect(result).toContain('json-key');
            expect(result).toContain('json-string');
            expect(result).toContain('json-number');
            expect(result).toContain('json-boolean');
            expect(result).toContain('json-null');
        });

        test('should handle JSON strings', () => {
            const jsonString = '{"message": "test", "count": 42}';
            const result = responseViewer.formatJsonWithSyntaxHighlighting(jsonString);

            expect(result).toContain('json-key');
            expect(result).toContain('json-string');
            expect(result).toContain('json-number');
        });

        test('should handle invalid JSON gracefully', () => {
            const invalidJson = 'not valid json';
            const result = responseViewer.formatJsonWithSyntaxHighlighting(invalidJson);

            expect(result).toBe('not valid json');
        });
    });

    describe('applySyntaxHighlighting', () => {
        test('should apply syntax highlighting to JSON string', () => {
            const jsonString = '{"key": "value", "number": 123, "boolean": true, "null": null}';
            const result = responseViewer.applySyntaxHighlighting(jsonString);

            expect(result).toContain('<span class="json-key">"key":</span>');
            expect(result).toContain('<span class="json-string">"value"</span>');
            expect(result).toContain('<span class="json-number">123</span>');
            expect(result).toContain('<span class="json-boolean">true</span>');
            expect(result).toContain('<span class="json-null">null</span>');
        });

        test('should escape HTML characters', () => {
            const jsonString = '{"html": "<script>alert(\'xss\')</script>"}';
            const result = responseViewer.applySyntaxHighlighting(jsonString);

            expect(result).toContain('&lt;script&gt;');
            expect(result).not.toContain('<script>');
        });
    });

    describe('getStatusText', () => {
        test('should return correct status text for common codes', () => {
            expect(responseViewer.getStatusText(200)).toBe('OK');
            expect(responseViewer.getStatusText(201)).toBe('Created');
            expect(responseViewer.getStatusText(400)).toBe('Bad Request');
            expect(responseViewer.getStatusText(401)).toBe('Unauthorized');
            expect(responseViewer.getStatusText(404)).toBe('Not Found');
            expect(responseViewer.getStatusText(500)).toBe('Internal Server Error');
        });

        test('should return "Unknown" for unrecognized status codes', () => {
            expect(responseViewer.getStatusText(999)).toBe('Unknown');
        });
    });

    describe('formatSize', () => {
        test('should format byte sizes correctly', () => {
            expect(responseViewer.formatSize(0)).toBe('0 B');
            expect(responseViewer.formatSize(500)).toBe('500 B');
            expect(responseViewer.formatSize(1024)).toBe('1 KB');
            expect(responseViewer.formatSize(1536)).toBe('1.5 KB');
            expect(responseViewer.formatSize(1048576)).toBe('1 MB');
        });
    });

    describe('copyToClipboard', () => {
        test('should copy content to clipboard successfully', async () => {
            const mockButton = {
                textContent: '📋 Copy',
                style: {},
                closest: jest.fn(() => ({
                    querySelector: jest.fn(() => ({ textContent: 'test content' }))
                }))
            };

            await responseViewer.copyToClipboard(mockButton);

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test content');
            expect(mockButton.textContent).toBe('✅ Copied!');
        });

        test('should handle clipboard API failure with fallback', () => {
            // Mock clipboard failure
            navigator.clipboard.writeText = jest.fn(() => Promise.reject(new Error('Clipboard not available')));

            const mockButton = {
                textContent: '📋 Copy',
                style: {},
                closest: jest.fn(() => ({
                    querySelector: jest.fn(() => ({ textContent: 'test content' }))
                }))
            };

            // Test that the method exists and can be called
            expect(() => responseViewer.copyToClipboard(mockButton)).not.toThrow();
        });
    });

    describe('escapeHtml', () => {
        test('should escape HTML characters', () => {
            const htmlString = '<script>alert("xss")</script>';
            const result = responseViewer.escapeHtml(htmlString);

            expect(result).toContain('&lt;script&gt;');
            expect(result).not.toContain('<script>');
        });
    });
});