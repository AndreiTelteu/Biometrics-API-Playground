/**
 * ResponseViewer - Enhanced API response display with JSON formatting and syntax highlighting
 * Handles formatted API output, response timing, status information, and error details
 */
class ResponseViewer {
    constructor() {
        this.init();
    }
    
    init() {
        this.responseContent = document.getElementById('responseContent');
        this.addResponseStyles();
    }
    
    /**
     * Display successful API response with formatted JSON and metadata
     * @param {Object} response - The response object containing data, timing, and status
     */
    displayResponse(response) {
        if (!this.responseContent) return;
        
        const startTime = response.startTime || Date.now();
        const endTime = response.endTime || Date.now();
        const duration = response.duration || (endTime - startTime);
        const statusCode = response.statusCode || (response.success ? 200 : 500);
        const contentType = response.contentType || 'application/json';
        
        const responseHtml = `
            <div class="response-data">
                <div class="response-meta">
                    <div class="response-status-line">
                        <span class="response-status ${response.success ? 'success' : 'error'}">
                            ${statusCode} ${this.getStatusText(statusCode)}
                        </span>
                        <span class="response-content-type">${contentType}</span>
                    </div>
                    <div class="response-timing-line">
                        <span class="response-timing">
                            <strong>Duration:</strong> ${duration}ms
                        </span>
                        <span class="response-size">
                            <strong>Size:</strong> ${this.formatSize(JSON.stringify(response.data || response).length)}
                        </span>
                        <span class="response-timestamp">
                            ${new Date(response.timestamp || Date.now()).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div class="response-body-container">
                    <div class="response-body-header">
                        <span>Response Body</span>
                        <button class="copy-response-btn" onclick="responseViewer.copyToClipboard(this)" title="Copy response">
                            📋 Copy
                        </button>
                    </div>
                    <pre class="response-body" data-language="json">${this.formatJsonWithSyntaxHighlighting(response.data || response)}</pre>
                </div>
            </div>
        `;
        
        this.responseContent.innerHTML = responseHtml;
    }
    
    /**
     * Display error response with detailed error information and stack traces
     * @param {Object|string} error - Error object or error message
     * @param {Object} metadata - Additional error metadata (timing, status, etc.)
     */
    displayError(error, metadata = {}) {
        if (!this.responseContent) return;
        
        const duration = metadata.duration || 0;
        const statusCode = metadata.statusCode || 500;
        const timestamp = metadata.timestamp || Date.now();
        
        // Parse error details
        let errorMessage = '';
        let stackTrace = '';
        let errorDetails = {};
        
        if (typeof error === 'object' && error !== null) {
            errorMessage = error.message || error.error || 'Unknown error';
            stackTrace = error.stack || error.stackTrace || '';
            errorDetails = { ...error };
            delete errorDetails.message;
            delete errorDetails.stack;
            delete errorDetails.stackTrace;
        } else {
            errorMessage = String(error);
        }
        
        const errorHtml = `
            <div class="response-data error-response">
                <div class="response-meta">
                    <div class="response-status-line">
                        <span class="response-status error">
                            ${statusCode} ${this.getStatusText(statusCode)}
                        </span>
                        <span class="response-content-type">application/json</span>
                    </div>
                    <div class="response-timing-line">
                        <span class="response-timing">
                            <strong>Duration:</strong> ${duration}ms
                        </span>
                        <span class="response-timestamp">
                            ${new Date(timestamp).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div class="error-details">
                    <div class="error-message">
                        <div class="error-section-header">
                            <span>❌ Error Message</span>
                        </div>
                        <pre class="error-content">${this.escapeHtml(errorMessage)}</pre>
                    </div>
                    ${Object.keys(errorDetails).length > 0 ? `
                        <div class="error-additional">
                            <div class="error-section-header">
                                <span>📋 Error Details</span>
                                <button class="copy-response-btn" onclick="responseViewer.copyToClipboard(this)" title="Copy error details">
                                    📋 Copy
                                </button>
                            </div>
                            <pre class="error-content" data-language="json">${this.formatJsonWithSyntaxHighlighting(errorDetails)}</pre>
                        </div>
                    ` : ''}
                    ${stackTrace ? `
                        <div class="error-stack">
                            <div class="error-section-header">
                                <span>🔍 Stack Trace</span>
                                <button class="copy-response-btn" onclick="responseViewer.copyToClipboard(this)" title="Copy stack trace">
                                    📋 Copy
                                </button>
                            </div>
                            <pre class="error-content stack-trace">${this.escapeHtml(stackTrace)}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        this.responseContent.innerHTML = errorHtml;
    }
    
    /**
     * Show loading state while operation is in progress
     * @param {string} operationType - Type of operation being executed
     */
    showLoading(operationType = 'operation') {
        if (!this.responseContent) return;
        
        this.responseContent.innerHTML = `
            <div class="response-loading">
                <div class="spinner"></div>
                <div class="loading-text">
                    <div>Executing ${operationType}...</div>
                    <div class="loading-subtext">Please wait while the operation completes</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Format JSON data with syntax highlighting
     * @param {*} data - Data to format
     * @returns {string} HTML string with syntax highlighting
     */
    formatJsonWithSyntaxHighlighting(data) {
        try {
            let jsonString;
            if (typeof data === 'string') {
                // Try to parse and re-stringify for consistent formatting
                try {
                    data = JSON.parse(data);
                    jsonString = JSON.stringify(data, null, 2);
                } catch {
                    jsonString = data;
                }
            } else {
                jsonString = JSON.stringify(data, null, 2);
            }
            
            // Apply syntax highlighting
            return this.applySyntaxHighlighting(jsonString);
        } catch (error) {
            return this.escapeHtml(String(data));
        }
    }
    
    /**
     * Apply basic syntax highlighting to JSON string
     * @param {string} jsonString - JSON string to highlight
     * @returns {string} HTML with syntax highlighting
     */
    applySyntaxHighlighting(jsonString) {
        return jsonString
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return `<span class="${cls}">${match}</span>`;
            });
    }
    
    /**
     * Get HTTP status text for status code
     * @param {number} statusCode - HTTP status code
     * @returns {string} Status text
     */
    getStatusText(statusCode) {
        const statusTexts = {
            200: 'OK',
            201: 'Created',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable'
        };
        return statusTexts[statusCode] || 'Unknown';
    }
    
    /**
     * Format byte size for display
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    /**
     * Copy response content to clipboard
     * @param {HTMLElement} button - The copy button that was clicked
     */
    copyToClipboard(button) {
        const container = button.closest('.response-body-container, .error-additional, .error-stack');
        const content = container.querySelector('pre').textContent;
        
        navigator.clipboard.writeText(content).then(() => {
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.style.backgroundColor = '#d4edda';
            button.style.color = '#155724';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
                button.style.color = '';
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        });
    }
    
    /**
     * Add enhanced CSS styles for response display
     */
    addResponseStyles() {
        if (document.getElementById('responseStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'responseStyles';
        style.textContent = `
            .response-data {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .response-meta {
                padding: 1rem;
                border-bottom: 1px solid #e1e5e9;
                background: #f8f9fa;
                font-size: 0.85rem;
            }
            
            .response-status-line {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 0.5rem;
            }
            
            .response-timing-line {
                display: flex;
                align-items: center;
                gap: 1.5rem;
                color: #666;
                font-size: 0.8rem;
            }
            
            .response-status {
                font-weight: bold;
                padding: 0.25rem 0.75rem;
                border-radius: 4px;
                font-size: 0.8rem;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }
            
            .response-status.success {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .response-status.error {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .response-content-type {
                background-color: #e9ecef;
                color: #495057;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-size: 0.75rem;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }
            
            .response-timestamp {
                margin-left: auto;
                font-style: italic;
            }
            
            .response-body-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .response-body-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: #f1f3f4;
                border-bottom: 1px solid #e1e5e9;
                font-weight: 600;
                font-size: 0.9rem;
            }
            
            .copy-response-btn {
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 3px;
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .copy-response-btn:hover {
                background: #f8f9fa;
                border-color: #667eea;
            }
            
            .response-body {
                flex: 1;
                margin: 0;
                padding: 1rem;
                background: #fafafa;
                border: none;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.85rem;
                line-height: 1.5;
                overflow-y: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            /* JSON Syntax Highlighting */
            .json-key {
                color: #0451a5;
                font-weight: 600;
            }
            
            .json-string {
                color: #a31515;
            }
            
            .json-number {
                color: #098658;
            }
            
            .json-boolean {
                color: #0000ff;
                font-weight: 600;
            }
            
            .json-null {
                color: #0000ff;
                font-weight: 600;
            }
            
            /* Error Response Styles */
            .error-response {
                background: #fff5f5;
            }
            
            .error-details {
                flex: 1;
                overflow-y: auto;
            }
            
            .error-message,
            .error-additional,
            .error-stack {
                margin-bottom: 1rem;
            }
            
            .error-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: #fed7d7;
                border-bottom: 1px solid #feb2b2;
                font-weight: 600;
                font-size: 0.9rem;
                color: #742a2a;
            }
            
            .error-content {
                margin: 0;
                padding: 1rem;
                background: #fffafa;
                border: none;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.85rem;
                line-height: 1.5;
                color: #e53e3e;
                white-space: pre-wrap;
                word-wrap: break-word;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .stack-trace {
                color: #744210;
                background: #fffbf0;
                border-left: 4px solid #ed8936;
            }
            
            /* Loading State */
            .response-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                gap: 1rem;
                color: #666;
                flex-direction: column;
            }
            
            .loading-text {
                text-align: center;
            }
            
            .loading-subtext {
                font-size: 0.85rem;
                color: #999;
                margin-top: 0.5rem;
            }
            
            /* Responsive adjustments */
            @media (max-width: 1200px) {
                .response-timing-line {
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                
                .response-timestamp {
                    margin-left: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponseViewer;
}