class PhishGuardBackground {
  constructor() {
    this.knownPhishingUrls = new Set();
    this.knownLegitimateUrls = new Set();
    this.blockedUrls = new Set();
    this.apiConfig = {
      enabled: true,
      endpoint: 'http://127.0.0.1:8000/analyze',
      apiKey: '',
      timeout: 5000
    };
    this.init();
  }

  init() {
    this.loadStoredData();
    this.setupEventListeners();
    this.loadPhishingDatabase();
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get([
        'knownPhishingUrls',
        'knownLegitimateUrls',
        'blockedUrls',
        'settings',
        'apiConfig'
      ]);

      if (result.knownPhishingUrls) {
        this.knownPhishingUrls = new Set(result.knownPhishingUrls);
      }
      if (result.knownLegitimateUrls) {
        this.knownLegitimateUrls = new Set(result.knownLegitimateUrls);
      }
      if (result.blockedUrls) {
        this.blockedUrls = new Set(result.blockedUrls);
      }
      if (result.apiConfig) {
        this.apiConfig = { ...this.apiConfig, ...result.apiConfig };
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  }

  setupEventListeners() {
    // Monitor tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.analyzeUrl(tab.url, tabId);
      }
    });

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.showWelcomeNotification();
      }
    });

    // Handle messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async analyzeUrl(url, tabId) {
    try {
      // Skip analysis for restricted URLs
      if (this.isRestrictedUrl(url)) {
        console.log('Skipping analysis for restricted URL:', url);
        return;
      }

      // Check if URL is already known
      if (this.knownPhishingUrls.has(url)) {
        this.blockUrl(url, tabId, 'Known phishing URL');
        return;
      }

      if (this.knownLegitimateUrls.has(url)) {
        return; 
      }

      // Try API analysis first if enabled
      if (this.apiConfig.enabled && this.apiConfig.endpoint) {
        try {
          const apiResult = await this.analyzeUrlWithAPI(url);
          if (apiResult) {
            this.handleAPIResult(url, tabId, apiResult);
            return;
          }
        } catch (error) {
          console.warn('API analysis failed, falling back to local analysis:', error);
        }
      }

      // Fallback to local analysis
      const riskScore = this.calculateRiskScore(url);
      this.handleAnalysisResult(url, tabId, riskScore);
    } catch (error) {
      console.error('Error analyzing URL:', error);
    }
  }

  isRestrictedUrl(url) {
    const restrictedPatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^edge:\/\//,
      /^about:/,
      /^data:/,
      /^file:\/\//,
      /^javascript:/,
      /^blob:/
    ];
    
    return restrictedPatterns.some(pattern => pattern.test(url));
  }

  calculateRiskScore(url) {
    try {
      const urlObj = new URL(url);
      let score = 0;
      let reasons = [];

      // Check for suspicious TLDs
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.cc', '.click', '.download', '.online', '.site'];
      const tld = urlObj.hostname.split('.').pop();
      if (suspiciousTlds.some(suspiciousTld => urlObj.hostname.endsWith(suspiciousTld))) {
        score += 0.3;
        reasons.push('Suspicious TLD detected');
      }

      // Check for IP address instead of domain
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipPattern.test(urlObj.hostname)) {
        score += 0.2;
        reasons.push('IP address instead of domain name');
      }

      // Check URL length
      if (url.length > 100) {
        score += 0.1;
        reasons.push('Unusually long URL');
      }

      // Check for excessive subdomains
      const subdomainCount = urlObj.hostname.split('.').length - 2;
      if (subdomainCount > 3) {
        score += 0.15;
        reasons.push('Excessive subdomains');
      }

      // Check for suspicious characters
      const suspiciousChars = /[^\w\-\.]/;
      if (suspiciousChars.test(urlObj.hostname)) {
        score += 0.1;
        reasons.push('Suspicious characters in domain');
      }

      // Check for HTTPS
      if (urlObj.protocol !== 'https:') {
        score += 0.1;
        reasons.push('Not using HTTPS');
      }

      // Check for suspicious keywords in path
      const suspiciousKeywords = ['login', 'secure', 'account', 'verify', 'update', 'confirm', 'support', 'admin'];
      const path = urlObj.pathname.toLowerCase();
      for (const keyword of suspiciousKeywords) {
        if (path.includes(keyword)) {
          score += 0.05;
          reasons.push(`Suspicious keyword in URL: ${keyword}`);
        }
      }

      // Piracy/warez indicators (boost risk for known piracy patterns)
      const piracyHostIndicators = [
        'movierulz', 'cinevood', 'vegamovies', 'filmyzilla', '123movies',
        'tamilrockers', 'tamilmv', 'isaimini', 'khatrimaza', 'hdhub4u',
        'kuttymovies', 'bolly4u', 'mp4moviez', '9xmovies', 'extramovies'
      ];
      const piracyTlds = ['.skin', '.skin', '.vin', '.cam', '.cfd', '.rest', '.buzz', '.villas'];
      const host = urlObj.hostname.toLowerCase();
      if (piracyHostIndicators.some(ind => host.includes(ind))) {
        score += 0.4;
        reasons.push('Known piracy domain pattern detected');
      }
      if (piracyTlds.some(t => host.endsWith(t))) {
        score += 0.15;
        reasons.push('Suspicious/ephemeral TLD associated with piracy');
      }

      // Keyword indicators in host or path for streaming/download scams
      const piracyKeywords = ['watch-online', 'watchonline', 'download', 'hdrip', 'brrip', 'dvdscr', 'camrip'];
      const full = (host + path).toLowerCase();
      if (piracyKeywords.some(k => full.includes(k))) {
        score += 0.15;
        reasons.push('Piracy-related keyword patterns detected');
      }

      return {
        score: Math.min(score, 1.0),
        reasons: reasons
      };
    } catch (error) {
      return { score: 0.8, reasons: ['Invalid URL format'] };
    }
  }

  async blockUrl(url, tabId, reason) {
    this.blockedUrls.add(url);
    await this.saveStoredData();

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'PhishGuard Alert',
      message: `Suspicious URL detected: ${reason}`
    });

    // Send message to content script to show warning
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'showWarning',
        url: url,
        reason: reason
      });
    } catch (error) {
      // If content script is not available, redirect to warning page
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL('warning.html') + '?url=' + encodeURIComponent(url) + '&reason=' + encodeURIComponent(reason)
      });
    }
  }

  async saveStoredData() {
    try {
      await chrome.storage.local.set({
        knownPhishingUrls: Array.from(this.knownPhishingUrls),
        knownLegitimateUrls: Array.from(this.knownLegitimateUrls),
        blockedUrls: Array.from(this.blockedUrls),
        apiConfig: this.apiConfig
      });
    } catch (error) {
      console.error('Error saving stored data:', error);
    }
  }

  async analyzeUrlWithAPI(url) {
    if (!this.apiConfig.enabled || !this.apiConfig.endpoint) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeout);

      const requestBody = {
        url: url,
        timestamp: Date.now()
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.apiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiConfig.apiKey}`;
      }

      const response = await fetch(this.apiConfig.endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('API request timeout');
      }
      throw error;
    }
  }

  handleAPIResult(url, tabId, apiResult) {
    /* Expected API response format:
    {
      "isPhishing": boolean,
      "confidence": number (0-1),
      "reasons": string[],
      "riskScore": number (0-1)
    } */

    const riskScore = apiResult.riskScore || apiResult.confidence || 0;
    const reasons = apiResult.reasons || ['API analysis result'];
    const isPhishing = apiResult.isPhishing || riskScore > 0.7;

    const analysisResult = {
      score: riskScore,
      reasons: reasons,
      source: 'API'
    };

    this.handleAnalysisResult(url, tabId, analysisResult, isPhishing);
  }

  handleAnalysisResult(url, tabId, riskScore, isPhishing = null) {
    if (isPhishing === null) {
      isPhishing = riskScore.score > 0.8;
    }

    if (isPhishing) {
      this.blockUrl(url, tabId, `High risk detected: ${riskScore.reasons.join(', ')}`);
      this.knownPhishingUrls.add(url);
    } else if (riskScore.score < 0.2) {
      this.knownLegitimateUrls.add(url);
    }

    this.saveStoredData();
    this.sendResultToContentScript(tabId, url, riskScore);
  }

  async sendResultToContentScript(tabId, url, riskScore) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'displayAnalysisResult',
        url: url,
        riskScore: riskScore
      });
    } catch (error) {
      // Content script might not be available, ignore error
    }
  }

  async loadPhishingDatabase() {
    try {
      const samplePhishingUrls = [
        'http://paypal-security.tk',
        'http://amazon-verify.ml',
        'http://facebook-login.ga',
        'http://google-account.cf',
        'http://apple-support.tk',
        'http://microsoft-update.ml',
        'http://netflix-billing.ga',
        'http://spotify-renewal.cf',
        'http://instagram-verify.tk',
        'http://twitter-security.ml'
      ];

      samplePhishingUrls.forEach(url => {
        this.knownPhishingUrls.add(url);
      });

      await this.saveStoredData();
    } catch (error) {
      console.error('Error loading phishing database:', error);
    }
  }

  showWelcomeNotification() {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'PhishGuard Installed',
      message: 'Your browser is now protected against phishing attacks!'
    });
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'analyzeUrl':
        const riskScore = this.calculateRiskScore(request.url);
        sendResponse({ riskScore });
        break;

      case 'analyzeUrlWithAPI':
        try {
          const apiResult = await this.analyzeUrlWithAPI(request.url);
          sendResponse({ success: true, result: apiResult });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;

      case 'updateApiConfig':
        this.apiConfig = { ...this.apiConfig, ...request.config };
        await this.saveStoredData();
        sendResponse({ success: true });
        break;

      case 'getApiConfig':
        sendResponse({ config: this.apiConfig });
        break;

      case 'testApiConnection':
        try {
          const testResult = await this.analyzeUrlWithAPI('https://www.google.com');
          sendResponse({ success: true, result: testResult });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;

      case 'reportPhishing':
        this.knownPhishingUrls.add(request.url);
        await this.saveStoredData();
        sendResponse({ success: true });
        break;

      case 'reportFalsePositive':
        this.knownLegitimateUrls.add(request.url);
        await this.saveStoredData();
        sendResponse({ success: true });
        break;

      case 'getStats':
        const stats = {
          phishingUrls: this.knownPhishingUrls.size,
          legitimateUrls: this.knownLegitimateUrls.size,
          blockedUrls: this.blockedUrls.size,
          apiEnabled: this.apiConfig.enabled
        };
        sendResponse({ stats });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
}

class BackgroundAPIOnly {
	constructor() {
		this.apiConfig = {
			enabled: true,
			endpoint: 'http://127.0.0.1:8000/analyze',
			apiKey: '',
			timeout: 8000
		};
		this.init();
	}

	init() {
		chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
			if (changeInfo.status === 'complete' && tab.url) {
				this.analyzeViaAPI(tab.url, tabId);
			}
		});

		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			switch (request.action) {
				case 'analyzeUrl':
					this.analyzeViaAPI(request.url, sender.tab?.id).then((res) => {
						sendResponse({ riskScore: res });
					}).catch(() => {
						sendResponse({ riskScore: { score: 0, reasons: ['API unavailable'], source: 'API' } });
					});
					return true;
				default:
					sendResponse({});
			}
		});
	}

	async analyzeViaAPI(url, tabId) {
		if (!this.apiConfig.enabled || !this.apiConfig.endpoint) {
			return { score: 0, reasons: ['API disabled'], source: 'API' };
		}
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeout);
		try {
			const headers = { 'Content-Type': 'application/json' };
			if (this.apiConfig.apiKey) headers['Authorization'] = `Bearer ${this.apiConfig.apiKey}`;
			// Build richer payload to match your Colab preprocessing
			let origin = '';
			let hostname = '';
			let pathname = '';
			try {
				const u = new URL(url);
				origin = u.origin;
				hostname = u.hostname;
				pathname = u.pathname;
			} catch {}
			const response = await fetch(this.apiConfig.endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({ url, origin, hostname, pathname, timestamp: Date.now() }),
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			if (!response.ok) throw new Error('API error');
			const result = await response.json();
			const riskScore = {
				score: result.riskScore ?? result.confidence ?? 0,
				reasons: result.reasons ?? [],
				source: 'API'
			};
			if (typeof tabId === 'number') {
				try {
					await chrome.tabs.sendMessage(tabId, { action: 'displayAnalysisResult', url, riskScore });
					if (riskScore.score >= 0.7) {
						await chrome.tabs.sendMessage(tabId, { action: 'showWarning', url, reason: 'High risk (API)' });
					}
				} catch {}
			}
			return riskScore;
		} catch (e) {
			return { score: 0, reasons: ['API unavailable'], source: 'API' };
		}
	}
}

// Initialize the background service
// Only initialize API-only background
new BackgroundAPIOnly();