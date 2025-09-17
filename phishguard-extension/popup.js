class PhishGuardPopup {
  constructor() {
    this.currentTab = null;
    this.settings = {
      enableNotifications: true,
      enableAutoBlock: true,
      enableLinkScanning: true
    };
    this.apiConfig = {
      enabled: false,
      endpoint: '',
      apiKey: '',
      timeout: 5000
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.getCurrentTab();
    await this.loadStats();
    await this.analyzeCurrentSite();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['settings', 'apiConfig']);
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      }
      if (result.apiConfig) {
        this.apiConfig = { ...this.apiConfig, ...result.apiConfig };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ 
        settings: this.settings,
        apiConfig: this.apiConfig
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
    }
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStats' });
      if (response && response.stats) {
        this.updateStatsDisplay(response.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async analyzeCurrentSite() {
    if (!this.currentTab || !this.currentTab.url) {
      document.getElementById('currentSiteUrl').textContent = 'No active tab';
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'analyzeUrl', 
        url: this.currentTab.url 
      });
      
      if (response && response.riskScore) {
        this.updateCurrentSiteDisplay(this.currentTab.url, response.riskScore);
      }
    } catch (error) {
      console.error('Error analyzing current site:', error);
    }
  }

  updateStatsDisplay(stats) {
    document.getElementById('phishingCount').textContent = stats.phishingUrls || 0;
    document.getElementById('legitimateCount').textContent = stats.legitimateUrls || 0;
    document.getElementById('totalBlocked').textContent = stats.blockedUrls || 0;
  }

  updateCurrentSiteDisplay(url, riskScore) {
    const urlElement = document.getElementById('currentSiteUrl');
    const riskValueElement = document.getElementById('riskValue');
    const riskReasonsElement = document.getElementById('riskReasons');

    // Truncate long URLs
    const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
    urlElement.textContent = displayUrl;
    urlElement.title = url;

    // Update risk score
    const riskPercentage = Math.round(riskScore.score * 100);
    riskValueElement.textContent = `${riskPercentage}%`;
    
    // Update risk score styling
    const riskScoreElement = document.getElementById('currentRiskScore');
    riskScoreElement.className = 'risk-score';
    
    if (riskPercentage >= 70) {
      riskScoreElement.classList.add('high-risk');
    } else if (riskPercentage >= 40) {
      riskScoreElement.classList.add('medium-risk');
    } else {
      riskScoreElement.classList.add('low-risk');
    }

    // Update risk reasons
    if (riskScore.reasons && riskScore.reasons.length > 0) {
      riskReasonsElement.innerHTML = `
        <div class="risk-reasons-list">
          <strong>Reasons:</strong>
          <ul>
            ${riskScore.reasons.map(reason => `<li>${reason}</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      riskReasonsElement.innerHTML = '<div class="risk-reasons-list">No suspicious indicators detected</div>';
    }
  }

  setupEventListeners() {
    // Scan current page button
    document.getElementById('scanCurrentPage').addEventListener('click', () => {
      this.scanCurrentPage();
    });

    // Report phishing button
    document.getElementById('reportPhishing').addEventListener('click', () => {
      this.reportPhishing();
    });

    // Report false positive button
    document.getElementById('reportFalsePositive').addEventListener('click', () => {
      this.reportFalsePositive();
    });

    // Settings checkboxes
    document.getElementById('enableNotifications').addEventListener('change', (e) => {
      this.settings.enableNotifications = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('enableAutoBlock').addEventListener('change', (e) => {
      this.settings.enableAutoBlock = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('enableLinkScanning').addEventListener('change', (e) => {
      this.settings.enableLinkScanning = e.target.checked;
      this.saveSettings();
    });

    // API settings
    document.getElementById('enableApi').addEventListener('change', (e) => {
      this.apiConfig.enabled = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('apiEndpoint').addEventListener('input', (e) => {
      this.apiConfig.endpoint = e.target.value;
    });

    document.getElementById('apiKey').addEventListener('input', (e) => {
      this.apiConfig.apiKey = e.target.value;
    });

    document.getElementById('apiTimeout').addEventListener('input', (e) => {
      this.apiConfig.timeout = parseInt(e.target.value) || 5000;
    });

    document.getElementById('testApiConnection').addEventListener('click', () => {
      this.testApiConnection();
    });

    document.getElementById('saveApiConfig').addEventListener('click', () => {
      this.saveApiConfig();
    });

    // Footer links
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });

    document.getElementById('settingsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showSettings();
    });

    document.getElementById('aboutLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showAbout();
    });

    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showFeedback();
    });
  }

  updateUI() {
    // Update settings checkboxes
    document.getElementById('enableNotifications').checked = this.settings.enableNotifications;
    document.getElementById('enableAutoBlock').checked = this.settings.enableAutoBlock;
    document.getElementById('enableLinkScanning').checked = this.settings.enableLinkScanning;
    
    // Update API settings
    document.getElementById('enableApi').checked = this.apiConfig.enabled;
    document.getElementById('apiEndpoint').value = this.apiConfig.endpoint;
    document.getElementById('apiKey').value = this.apiConfig.apiKey;
    document.getElementById('apiTimeout').value = this.apiConfig.timeout;
  }

  async scanCurrentPage() {
    if (!this.currentTab) {
      this.showMessage('No active tab found', 'error');
      return;
    }

    // Check if the current tab is accessible
    if (this.currentTab.url.startsWith('chrome://') || 
        this.currentTab.url.startsWith('chrome-extension://') ||
        this.currentTab.url.startsWith('moz-extension://') ||
        this.currentTab.url.startsWith('edge://') ||
        this.currentTab.url.startsWith('about:')) {
      this.showMessage('Cannot scan browser internal pages', 'error');
      return;
    }

    try {
      // First, try to analyze the URL directly through the background script
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeUrl',
        url: this.currentTab.url
      });

      if (response && response.riskScore) {
        this.showMessage('Page analysis completed', 'success');
        this.updateCurrentSiteDisplay(this.currentTab.url, response.riskScore);
        
        // Try to inject content script for additional scanning
        try {
          await chrome.scripting.executeScript({
            target: { tabId: this.currentTab.id },
            function: () => {
              if (window.PhishGuard) {
                window.PhishGuard.analyzeCurrentPage();
              }
            }
          });
        } catch (injectionError) {
          console.log('Content script injection failed, but URL analysis completed:', injectionError.message);
        }
      } else {
        this.showMessage('Unable to analyze this page', 'error');
      }
    } catch (error) {
      console.error('Error scanning current page:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Frame with ID 0 is showing error page')) {
        this.showMessage('Cannot scan error pages or blocked content', 'error');
      } else if (error.message.includes('Cannot access')) {
        this.showMessage('Cannot access this page (may be restricted)', 'error');
      } else {
        this.showMessage('Error scanning page: ' + error.message, 'error');
      }
    }
  }

  async reportPhishing() {
    if (!this.currentTab || !this.currentTab.url) {
      this.showMessage('No active tab found', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'reportPhishing',
        url: this.currentTab.url
      });

      if (response && response.success) {
        this.showMessage('Phishing URL reported successfully', 'success');
        await this.loadStats(); 
      } else {
        this.showMessage('Error reporting phishing URL', 'error');
      }
    } catch (error) {
      console.error('Error reporting phishing:', error);
      this.showMessage('Error reporting phishing URL', 'error');
    }
  }

  async reportFalsePositive() {
    if (!this.currentTab || !this.currentTab.url) {
      this.showMessage('No active tab found', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'reportFalsePositive',
        url: this.currentTab.url
      });

      if (response && response.success) {
        this.showMessage('False positive reported successfully', 'success');
        await this.loadStats(); 
      } else {
        this.showMessage('Error reporting false positive', 'error');
      }
    } catch (error) {
      console.error('Error reporting false positive:', error);
      this.showMessage('Error reporting false positive', 'error');
    }
  }

  showMessage(message, type = 'info') {
    // Create a temporary message element
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 3000);
  }

  showHelp() {
    chrome.tabs.create({
      url: 'https://github.com/ksh-20/phisguard'
    });
  }

  showSettings() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
  }

  showAbout() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('about.html')
    });
  }

  showFeedback() {
    chrome.tabs.create({
      url: 'https://github.com/ksh-20/phisguard'
    });
  }

  async testApiConnection() {
    if (!this.apiConfig.endpoint) {
      this.showMessage('Please enter an API endpoint first', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testApiConnection'
      });

      if (response.success) {
        this.showMessage('API connection successful!', 'success');
      } else {
        this.showMessage(`API connection failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('Error testing API connection:', error);
      this.showMessage('Error testing API connection', 'error');
    }
  }

  async saveApiConfig() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateApiConfig',
        config: this.apiConfig
      });

      if (response.success) {
        this.showMessage('API configuration saved successfully!', 'success');
      } else {
        this.showMessage('Error saving API configuration', 'error');
      }
    } catch (error) {
      console.error('Error saving API configuration:', error);
      this.showMessage('Error saving API configuration', 'error');
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PhishGuardPopup();
});