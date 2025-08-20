/**
 * Web Control Interface JavaScript
 * Handles tab management, endpoint configuration, action buttons, and WebSocket communication
 */

class WebControlApp {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.currentOperation = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // Initialize components
        this.tabManager = new TabManager();
        this.endpointConfigPanel = new EndpointConfigPanel();
        this.actionButtons = new ActionButtons(this);
        this.logsViewer = new LogsViewer();
        this.responseViewer = new ResponseViewer();
        
        this.init();
    }
    
    init() {
        this.setupWebSocket();
        this.setupEventListeners();
        this.loadSavedConfiguration();
    }
    
    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.websocket = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleConnectionError();
        }
    }
    
    setupWebSocketHandlers() {
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            this.requestInitialState();
        };
        
        this.websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.attemptReconnect();
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleConnectionError();
        };
    }
    
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'operation-start':
                this.handleOperationStart(message);
                break;
            case 'operation-complete':
                this.handleOperationComplete(message);
                break;
            case 'log-update':
                // Handle both single log entries and batch updates
                if (Array.isArray(message.data)) {
                    message.data.forEach(logEntry => {
                        this.logsViewer.addLogEntry(logEntry);
                    });
                } else {
                    this.logsViewer.addLogEntry(message.data);
                }
                break;
            case 'state-sync':
                this.handleStateSync(message.data);
                break;
            case 'config-update':
                this.handleConfigUpdate(message.data);
                break;
            case 'logs-batch':
                // Handle batch log updates for better performance
                if (message.data && Array.isArray(message.data.logs)) {
                    message.data.logs.forEach(logEntry => {
                        this.logsViewer.addLogEntry(logEntry);
                    });
                }
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }
    
    handleOperationStart(message) {
        this.currentOperation = message.data.operation;
        this.actionButtons.setLoading(message.data.operation, true);
        this.responseViewer.showLoading();
        this.updateOperationStatus('loading');
    }
    
    handleOperationComplete(message) {
        this.currentOperation = null;
        this.actionButtons.setLoading(message.data.operation, false);
        this.responseViewer.displayResponse(message.data.result);
        this.updateOperationStatus('connected');
    }
    
    handleStateSync(state) {
        // Update UI with current app state
        this.endpointConfigPanel.updateFromState(state);
    }
    
    handleConfigUpdate(config) {
        // Handle configuration updates from mobile app
        this.endpointConfigPanel.updateConfiguration(config);
    }
    
    updateConnectionStatus(connected) {
        const statusElements = document.querySelectorAll('.status-indicator');
        statusElements.forEach(element => {
            element.className = `status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`;
        });
        
        if (connected) {
            this.logsViewer.addLogEntry({
                level: 'info',
                message: 'Connected to mobile app',
                timestamp: new Date().toISOString(),
                source: 'web-control'
            });
        } else {
            this.logsViewer.addLogEntry({
                level: 'error',
                message: 'Connection to mobile app lost',
                timestamp: new Date().toISOString(),
                source: 'web-control'
            });
        }
    }
    
    updateOperationStatus(status) {
        const responseStatus = document.getElementById('responseStatus');
        if (responseStatus) {
            responseStatus.className = `status-indicator status-${status}`;
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            this.logsViewer.addLogEntry({
                level: 'warn',
                message: `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
                timestamp: new Date().toISOString(),
                source: 'web-control'
            });
            
            setTimeout(() => {
                this.setupWebSocket();
            }, delay);
        } else {
            this.logsViewer.addLogEntry({
                level: 'error',
                message: 'Failed to reconnect after maximum attempts. Please refresh the page.',
                timestamp: new Date().toISOString(),
                source: 'web-control'
            });
        }
    }
    
    handleConnectionError() {
        this.updateConnectionStatus(false);
        this.logsViewer.addLogEntry({
            level: 'error',
            message: 'WebSocket connection error occurred',
            timestamp: new Date().toISOString(),
            source: 'web-control'
        });
    }
    
    requestInitialState() {
        if (this.isConnected) {
            this.sendMessage({
                type: 'get-state',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }
    
    setupEventListeners() {
        // Clear logs button
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                this.logsViewer.clearLogs();
            });
        }
        
        // Window resize handler for mobile detection
        window.addEventListener('resize', () => {
            this.checkDeviceType();
        });
    }
    
    checkDeviceType() {
        const mobileMessage = document.getElementById('mobileMessage');
        const mainContainer = document.getElementById('mainContainer');
        
        if (this.isMobileDevice()) {
            mobileMessage.style.display = 'flex';
            mainContainer.style.display = 'none';
        } else {
            mobileMessage.style.display = 'none';
            mainContainer.style.display = 'flex';
        }
    }
    
    isMobileDevice() {
        return window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    loadSavedConfiguration() {
        // Load any saved configuration from localStorage
        const savedConfig = localStorage.getItem('webControlConfig');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                this.endpointConfigPanel.loadConfiguration(config);
            } catch (error) {
                console.warn('Failed to load saved configuration:', error);
            }
        }
    }
    
    saveConfiguration() {
        const config = this.endpointConfigPanel.getConfiguration();
        localStorage.setItem('webControlConfig', JSON.stringify(config));
    }
}

/**
 * TabManager - Handles switching between validation and enrollment tabs
 */
class TabManager {
    constructor() {
        this.activeTab = 'validation';
        this.init();
    }
    
    init() {
        this.setupTabClickHandlers();
    }
    
    setupTabClickHandlers() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }
    
    switchTab(tabName) {
        if (this.activeTab === tabName) return;
        
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Remove active class from all tabs and contents
        tabs.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to target tab and content
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}Tab`);
        
        if (targetTab && targetContent) {
            targetTab.classList.add('active');
            targetContent.classList.add('active');
            this.activeTab = tabName;
        }
    }
    
    getActiveTab() {
        return this.activeTab;
    }
}

/**
 * EndpointConfigPanel - Manages all configuration options from mobile app
 */
class EndpointConfigPanel {
    constructor() {
        this.validationConfig = {
            url: '',
            method: 'POST',
            headers: {},
            payload: {}
        };
        
        this.enrollmentConfig = {
            url: '',
            method: 'POST',
            headers: {},
            payload: {}
        };
        
        this.init();
    }
    
    init() {
        this.setupConfigurationHandlers();
        this.loadDefaultValues();
    }
    
    setupConfigurationHandlers() {
        // Validation configuration
        const validationUrl = document.getElementById('validationUrl');
        const validationMethod = document.getElementById('validationMethod');
        const validationHeaders = document.getElementById('validationHeaders');
        const validationPayload = document.getElementById('validationPayload');
        
        if (validationUrl) {
            validationUrl.addEventListener('input', (e) => {
                this.validationConfig.url = e.target.value;
                this.saveConfiguration();
            });
        }
        
        if (validationMethod) {
            validationMethod.addEventListener('change', (e) => {
                this.validationConfig.method = e.target.value;
                this.saveConfiguration();
            });
        }
        
        if (validationHeaders) {
            validationHeaders.addEventListener('input', (e) => {
                try {
                    this.validationConfig.headers = JSON.parse(e.target.value || '{}');
                    e.target.style.borderColor = '#ddd';
                } catch (error) {
                    e.target.style.borderColor = '#e74c3c';
                }
                this.saveConfiguration();
            });
        }
        
        if (validationPayload) {
            validationPayload.addEventListener('input', (e) => {
                try {
                    this.validationConfig.payload = JSON.parse(e.target.value || '{}');
                    e.target.style.borderColor = '#ddd';
                } catch (error) {
                    e.target.style.borderColor = '#e74c3c';
                }
                this.saveConfiguration();
            });
        }
        
        // Enrollment configuration
        const enrollmentUrl = document.getElementById('enrollmentUrl');
        const enrollmentMethod = document.getElementById('enrollmentMethod');
        const enrollmentHeaders = document.getElementById('enrollmentHeaders');
        const enrollmentPayload = document.getElementById('enrollmentPayload');
        
        if (enrollmentUrl) {
            enrollmentUrl.addEventListener('input', (e) => {
                this.enrollmentConfig.url = e.target.value;
                this.saveConfiguration();
            });
        }
        
        if (enrollmentMethod) {
            enrollmentMethod.addEventListener('change', (e) => {
                this.enrollmentConfig.method = e.target.value;
                this.saveConfiguration();
            });
        }
        
        if (enrollmentHeaders) {
            enrollmentHeaders.addEventListener('input', (e) => {
                try {
                    this.enrollmentConfig.headers = JSON.parse(e.target.value || '{}');
                    e.target.style.borderColor = '#ddd';
                } catch (error) {
                    e.target.style.borderColor = '#e74c3c';
                }
                this.saveConfiguration();
            });
        }
        
        if (enrollmentPayload) {
            enrollmentPayload.addEventListener('input', (e) => {
                try {
                    this.enrollmentConfig.payload = JSON.parse(e.target.value || '{}');
                    e.target.style.borderColor = '#ddd';
                } catch (error) {
                    e.target.style.borderColor = '#e74c3c';
                }
                this.saveConfiguration();
            });
        }
    }
    
    loadDefaultValues() {
        // Set default headers
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        const validationHeaders = document.getElementById('validationHeaders');
        const enrollmentHeaders = document.getElementById('enrollmentHeaders');
        
        if (validationHeaders && !validationHeaders.value) {
            validationHeaders.value = JSON.stringify(defaultHeaders, null, 2);
            this.validationConfig.headers = defaultHeaders;
        }
        
        if (enrollmentHeaders && !enrollmentHeaders.value) {
            enrollmentHeaders.value = JSON.stringify(defaultHeaders, null, 2);
            this.enrollmentConfig.headers = defaultHeaders;
        }
    }
    
    getConfiguration(type = null) {
        if (type === 'validation') {
            return this.validationConfig;
        } else if (type === 'enrollment') {
            return this.enrollmentConfig;
        }
        
        return {
            validation: this.validationConfig,
            enrollment: this.enrollmentConfig
        };
    }
    
    loadConfiguration(config) {
        if (config.validation) {
            this.validationConfig = { ...this.validationConfig, ...config.validation };
            this.updateValidationUI();
        }
        
        if (config.enrollment) {
            this.enrollmentConfig = { ...this.enrollmentConfig, ...config.enrollment };
            this.updateEnrollmentUI();
        }
    }
    
    updateValidationUI() {
        const urlInput = document.getElementById('validationUrl');
        const methodSelect = document.getElementById('validationMethod');
        const headersTextarea = document.getElementById('validationHeaders');
        const payloadTextarea = document.getElementById('validationPayload');
        
        if (urlInput) urlInput.value = this.validationConfig.url || '';
        if (methodSelect) methodSelect.value = this.validationConfig.method || 'POST';
        if (headersTextarea) headersTextarea.value = JSON.stringify(this.validationConfig.headers || {}, null, 2);
        if (payloadTextarea) payloadTextarea.value = JSON.stringify(this.validationConfig.payload || {}, null, 2);
    }
    
    updateEnrollmentUI() {
        const urlInput = document.getElementById('enrollmentUrl');
        const methodSelect = document.getElementById('enrollmentMethod');
        const headersTextarea = document.getElementById('enrollmentHeaders');
        const payloadTextarea = document.getElementById('enrollmentPayload');
        
        if (urlInput) urlInput.value = this.enrollmentConfig.url || '';
        if (methodSelect) methodSelect.value = this.enrollmentConfig.method || 'POST';
        if (headersTextarea) headersTextarea.value = JSON.stringify(this.enrollmentConfig.headers || {}, null, 2);
        if (payloadTextarea) payloadTextarea.value = JSON.stringify(this.enrollmentConfig.payload || {}, null, 2);
    }
    
    updateFromState(state) {
        // Update configuration from mobile app state
        if (state.endpointConfig) {
            this.loadConfiguration(state.endpointConfig);
        }
    }
    
    updateConfiguration(config) {
        // Handle configuration updates from mobile app
        this.loadConfiguration(config);
    }
    
    saveConfiguration() {
        // Trigger save in main app
        if (window.webControlApp) {
            window.webControlApp.saveConfiguration();
        }
    }
    
    validateConfiguration(type) {
        const config = this.getConfiguration(type);
        
        if (!config.url) {
            throw new Error(`${type} URL is required`);
        }
        
        try {
            new URL(config.url);
        } catch (error) {
            throw new Error(`Invalid ${type} URL format`);
        }
        
        if (typeof config.headers !== 'object') {
            throw new Error(`Invalid ${type} headers format`);
        }
        
        if (typeof config.payload !== 'object') {
            throw new Error(`Invalid ${type} payload format`);
        }
        
        return true;
    }
}

/**
 * ActionButtons - Handles executing biometric operations
 */
class ActionButtons {
    constructor(app) {
        this.app = app;
        this.loadingStates = {
            enroll: false,
            validate: false,
            deleteKeys: false
        };
        
        this.init();
    }
    
    init() {
        this.setupButtonHandlers();
    }
    
    setupButtonHandlers() {
        const enrollBtn = document.getElementById('enrollBtn');
        const validateBtn = document.getElementById('validateBtn');
        const deleteKeysBtn = document.getElementById('deleteKeysBtn');
        
        if (enrollBtn) {
            enrollBtn.addEventListener('click', () => {
                this.executeOperation('enroll');
            });
        }
        
        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                this.executeOperation('validate');
            });
        }
        
        if (deleteKeysBtn) {
            deleteKeysBtn.addEventListener('click', () => {
                this.executeOperation('deleteKeys');
            });
        }
    }
    
    async executeOperation(operation) {
        if (!this.app.isConnected) {
            this.showError('Not connected to mobile app');
            return;
        }
        
        if (this.app.currentOperation) {
            this.showError('Another operation is already in progress');
            return;
        }
        
        try {
            let config = null;
            
            if (operation === 'enroll') {
                this.app.endpointConfigPanel.validateConfiguration('enrollment');
                config = this.app.endpointConfigPanel.getConfiguration('enrollment');
            } else if (operation === 'validate') {
                this.app.endpointConfigPanel.validateConfiguration('validation');
                config = this.app.endpointConfigPanel.getConfiguration('validation');
            }
            
            const message = {
                type: 'execute-operation',
                data: {
                    operation: operation,
                    config: config,
                    timestamp: new Date().toISOString()
                }
            };
            
            this.app.sendMessage(message);
            this.setLoading(operation, true);
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    setLoading(operation, loading) {
        this.loadingStates[operation] = loading;
        
        const buttonMap = {
            enroll: 'enrollBtn',
            validate: 'validateBtn',
            deleteKeys: 'deleteKeysBtn'
        };
        
        const spinnerMap = {
            enroll: 'enrollSpinner',
            validate: 'validateSpinner',
            deleteKeys: 'deleteSpinner'
        };
        
        const button = document.getElementById(buttonMap[operation]);
        const spinner = document.getElementById(spinnerMap[operation]);
        
        if (button && spinner) {
            button.disabled = loading;
            spinner.style.display = loading ? 'inline-block' : 'none';
            
            if (loading) {
                button.classList.add('loading');
            } else {
                button.classList.remove('loading');
            }
        }
    }
    
    showError(message) {
        // Show error in logs
        this.app.logsViewer.addLogEntry({
            level: 'error',
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // Show error in response viewer
        this.app.responseViewer.displayError(message);
    }
    
    isOperationInProgress() {
        return Object.values(this.loadingStates).some(loading => loading);
    }
}

/**
 * LogsViewer - Handles real-time log display with filtering and search
 */
class LogsViewer {
    constructor() {
        this.maxLogEntries = 1000;
        this.logEntries = [];
        this.filteredEntries = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.isPaused = false;
        this.pendingEntries = [];
        this.init();
    }
    
    init() {
        this.logsContent = document.getElementById('logsContent');
        this.logLevelFilter = document.getElementById('logLevelFilter');
        this.logSearchInput = document.getElementById('logSearchInput');
        this.pauseLogsBtn = document.getElementById('pauseLogsBtn');
        this.pauseLogsIcon = document.getElementById('pauseLogsIcon');
        
        this.setupAutoScroll();
        this.setupFilterControls();
        this.setupSearchControls();
        this.setupPauseControls();
    }
    
    addLogEntry(logEntry) {
        // Ensure log entry has required fields
        const normalizedEntry = {
            level: logEntry.level || 'info',
            message: logEntry.message || '',
            timestamp: logEntry.timestamp || new Date().toISOString(),
            source: logEntry.source || 'app',
            ...logEntry
        };
        
        this.logEntries.push(normalizedEntry);
        
        // Limit log entries to prevent memory issues
        if (this.logEntries.length > this.maxLogEntries) {
            this.logEntries = this.logEntries.slice(-this.maxLogEntries);
            this.refreshFilteredEntries();
        }
        
        if (this.isPaused) {
            this.pendingEntries.push(normalizedEntry);
            this.updatePendingIndicator();
        } else {
            if (this.matchesCurrentFilter(normalizedEntry)) {
                this.renderLogEntry(normalizedEntry);
                this.scrollToBottom();
            }
        }
    }
    
    setupFilterControls() {
        if (this.logLevelFilter) {
            this.logLevelFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
            });
        }
    }
    
    setupSearchControls() {
        if (this.logSearchInput) {
            let searchTimeout;
            this.logSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 300); // Debounce search
            });
        }
    }
    
    setupPauseControls() {
        if (this.pauseLogsBtn) {
            this.pauseLogsBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.pauseLogsBtn && this.pauseLogsIcon) {
            if (this.isPaused) {
                this.pauseLogsBtn.classList.add('active');
                this.pauseLogsIcon.textContent = '▶️';
                this.pauseLogsBtn.title = 'Resume auto-scroll';
            } else {
                this.pauseLogsBtn.classList.remove('active');
                this.pauseLogsIcon.textContent = '⏸️';
                this.pauseLogsBtn.title = 'Pause auto-scroll';
                
                // Process pending entries
                this.processPendingEntries();
            }
        }
    }
    
    processPendingEntries() {
        if (this.pendingEntries.length > 0) {
            this.pendingEntries.forEach(entry => {
                if (this.matchesCurrentFilter(entry)) {
                    this.renderLogEntry(entry);
                }
            });
            this.pendingEntries = [];
            this.scrollToBottom();
            this.updatePendingIndicator();
        }
    }
    
    updatePendingIndicator() {
        // Update pause button to show pending count
        if (this.pauseLogsBtn && this.isPaused && this.pendingEntries.length > 0) {
            this.pauseLogsBtn.title = `Resume auto-scroll (${this.pendingEntries.length} pending)`;
        }
    }
    
    matchesCurrentFilter(logEntry) {
        // Check level filter
        if (this.currentFilter !== 'all' && logEntry.level !== this.currentFilter) {
            return false;
        }
        
        // Check search term
        if (this.searchTerm && !logEntry.message.toLowerCase().includes(this.searchTerm)) {
            return false;
        }
        
        return true;
    }
    
    applyFilters() {
        this.refreshFilteredEntries();
        this.renderAllLogs();
    }
    
    refreshFilteredEntries() {
        this.filteredEntries = this.logEntries.filter(entry => this.matchesCurrentFilter(entry));
    }
    
    renderAllLogs() {
        if (!this.logsContent) return;
        
        // Clear current content
        this.logsContent.innerHTML = '';
        
        if (this.filteredEntries.length === 0) {
            this.logsContent.innerHTML = `
                <div style="color: #718096; text-align: center; padding: 2rem;">
                    ${this.logEntries.length === 0 ? 'No logs yet.' : 'No logs match current filter.'}
                </div>
            `;
            return;
        }
        
        // Render filtered entries (limit to recent entries for performance)
        const recentEntries = this.filteredEntries.slice(-500);
        recentEntries.forEach(entry => {
            this.renderLogEntry(entry);
        });
        
        this.scrollToBottom();
    }
    
    renderLogEntry(logEntry) {
        if (!this.logsContent) return;
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${logEntry.level || 'info'}`;
        logElement.dataset.timestamp = logEntry.timestamp;
        logElement.dataset.level = logEntry.level;
        
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const level = (logEntry.level || 'info').toUpperCase();
        const source = logEntry.source ? `[${logEntry.source}]` : '';
        
        // Highlight search term if present
        let message = this.escapeHtml(logEntry.message);
        if (this.searchTerm) {
            const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
            message = message.replace(regex, '<mark>$1</mark>');
        }
        
        logElement.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-level">[${level}]</span>
            ${source ? `<span class="log-source">${source}</span>` : ''}
            <span class="log-message">${message}</span>
        `;
        
        // Add CSS for log styling if not already added
        this.addLogStyles();
        
        this.logsContent.appendChild(logElement);
    }
    
    addLogStyles() {
        if (document.getElementById('logStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'logStyles';
        style.textContent = `
            .log-entry {
                margin-bottom: 0.25rem;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.8rem;
                line-height: 1.4;
                padding: 0.125rem 0;
                border-left: 3px solid transparent;
                padding-left: 0.5rem;
                transition: background-color 0.2s ease;
            }
            
            .log-entry:hover {
                background-color: rgba(255, 255, 255, 0.05);
            }
            
            .log-timestamp {
                color: #718096;
                font-size: 0.75rem;
            }
            
            .log-level {
                font-weight: bold;
                margin: 0 0.5rem;
                font-size: 0.75rem;
                padding: 0.125rem 0.25rem;
                border-radius: 2px;
                display: inline-block;
                min-width: 50px;
                text-align: center;
            }
            
            .log-source {
                color: #a0aec0;
                font-size: 0.75rem;
                margin-right: 0.5rem;
            }
            
            .log-info {
                border-left-color: #4299e1;
            }
            
            .log-info .log-level {
                color: #4299e1;
                background-color: rgba(66, 153, 225, 0.1);
            }
            
            .log-error {
                border-left-color: #f56565;
            }
            
            .log-error .log-level {
                color: #f56565;
                background-color: rgba(245, 101, 101, 0.1);
            }
            
            .log-warn {
                border-left-color: #ed8936;
            }
            
            .log-warn .log-level {
                color: #ed8936;
                background-color: rgba(237, 137, 54, 0.1);
            }
            
            .log-debug {
                border-left-color: #9f7aea;
            }
            
            .log-debug .log-level {
                color: #9f7aea;
                background-color: rgba(159, 122, 234, 0.1);
            }
            
            .log-message {
                color: #e2e8f0;
                word-wrap: break-word;
            }
            
            .log-message mark {
                background-color: #ffd700;
                color: #333;
                padding: 0.125rem 0.25rem;
                border-radius: 2px;
            }
            
            /* Scrollbar styling for logs */
            .logs-content::-webkit-scrollbar {
                width: 8px;
            }
            
            .logs-content::-webkit-scrollbar-track {
                background: #2d3748;
            }
            
            .logs-content::-webkit-scrollbar-thumb {
                background: #4a5568;
                border-radius: 4px;
            }
            
            .logs-content::-webkit-scrollbar-thumb:hover {
                background: #718096;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    clearLogs() {
        this.logEntries = [];
        this.filteredEntries = [];
        this.pendingEntries = [];
        
        if (this.logsContent) {
            this.logsContent.innerHTML = `
                <div style="color: #718096; text-align: center; padding: 2rem;">
                    Logs cleared. New entries will appear here.
                </div>
            `;
        }
        
        // Reset filters
        if (this.logLevelFilter) {
            this.logLevelFilter.value = 'all';
            this.currentFilter = 'all';
        }
        
        if (this.logSearchInput) {
            this.logSearchInput.value = '';
            this.searchTerm = '';
        }
        
        // Add a log entry indicating logs were cleared
        this.addLogEntry({
            level: 'info',
            message: 'Logs cleared by user',
            timestamp: new Date().toISOString(),
            source: 'web-control'
        });
    }
    
    setupAutoScroll() {
        this.shouldAutoScroll = true;
        
        if (this.logsContent) {
            this.logsContent.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = this.logsContent;
                this.shouldAutoScroll = scrollTop + clientHeight >= scrollHeight - 10;
                
                // Update pause button state based on scroll position
                if (this.shouldAutoScroll && this.isPaused) {
                    // User scrolled to bottom while paused, auto-resume
                    this.togglePause();
                }
            });
        }
    }
    
    scrollToBottom() {
        if (this.shouldAutoScroll && this.logsContent && !this.isPaused) {
            this.logsContent.scrollTop = this.logsContent.scrollHeight;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Method to get current log statistics
    getLogStats() {
        const stats = {
            total: this.logEntries.length,
            filtered: this.filteredEntries.length,
            pending: this.pendingEntries.length,
            levels: {}
        };
        
        this.logEntries.forEach(entry => {
            const level = entry.level || 'info';
            stats.levels[level] = (stats.levels[level] || 0) + 1;
        });
        
        return stats;
    }
    
    // Method to export logs
    exportLogs(format = 'json') {
        const logsToExport = this.filteredEntries.length > 0 ? this.filteredEntries : this.logEntries;
        
        if (format === 'json') {
            return JSON.stringify(logsToExport, null, 2);
        } else if (format === 'text') {
            return logsToExport.map(entry => {
                const timestamp = new Date(entry.timestamp).toLocaleString();
                const level = (entry.level || 'info').toUpperCase();
                const source = entry.source ? `[${entry.source}]` : '';
                return `[${timestamp}] [${level}] ${source} ${entry.message}`;
            }).join('\n');
        }
        
        return logsToExport;
    }
}

/**
 * ResponseViewer - Handles API response display
 */
class ResponseViewer {
    constructor() {
        this.init();
    }
    
    init() {
        this.responseContent = document.getElementById('responseContent');
    }
    
    displayResponse(response) {
        if (!this.responseContent) return;
        
        const responseHtml = `
            <div class="response-data">
                <div class="response-meta">
                    <span class="response-status ${response.success ? 'success' : 'error'}">
                        ${response.success ? 'SUCCESS' : 'ERROR'}
                    </span>
                    <span class="response-timing">
                        ${response.duration ? `${response.duration}ms` : ''}
                    </span>
                    <span class="response-timestamp">
                        ${new Date(response.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                </div>
                <pre class="response-body">${this.formatJson(response.data || response)}</pre>
            </div>
        `;
        
        this.responseContent.innerHTML = responseHtml;
        this.addResponseStyles();
    }
    
    displayError(error) {
        if (!this.responseContent) return;
        
        const errorHtml = `
            <div class="response-data">
                <div class="response-meta">
                    <span class="response-status error">ERROR</span>
                    <span class="response-timestamp">
                        ${new Date().toLocaleTimeString()}
                    </span>
                </div>
                <pre class="response-body error">${this.escapeHtml(error)}</pre>
            </div>
        `;
        
        this.responseContent.innerHTML = errorHtml;
        this.addResponseStyles();
    }
    
    showLoading() {
        if (!this.responseContent) return;
        
        this.responseContent.innerHTML = `
            <div class="response-loading">
                <div class="spinner"></div>
                <span>Executing operation...</span>
            </div>
        `;
    }
    
    formatJson(data) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            return JSON.stringify(data, null, 2);
        } catch (error) {
            return String(data);
        }
    }
    
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
                display: flex;
                gap: 1rem;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid #e1e5e9;
                margin-bottom: 1rem;
                font-size: 0.8rem;
            }
            
            .response-status {
                font-weight: bold;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-size: 0.75rem;
            }
            
            .response-status.success {
                background-color: #d4edda;
                color: #155724;
            }
            
            .response-status.error {
                background-color: #f8d7da;
                color: #721c24;
            }
            
            .response-timing {
                color: #666;
            }
            
            .response-timestamp {
                color: #666;
                margin-left: auto;
            }
            
            .response-body {
                flex: 1;
                margin: 0;
                padding: 0;
                background: transparent;
                border: none;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.85rem;
                line-height: 1.4;
                overflow-y: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            .response-body.error {
                color: #e74c3c;
            }
            
            .response-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                gap: 1rem;
                color: #666;
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.webControlApp = new WebControlApp();
});