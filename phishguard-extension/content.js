class ContentAPIOnly {
	constructor() {
		this.init();
	}

	init() {
		this.requestApiAnalysis();
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			if (request.action === 'displayAnalysisResult') {
				this.displayAnalysisResult(request.url, request.riskScore);
				sendResponse({ success: true });
			} else if (request.action === 'showWarning') {
				this.showWarning(request.url, { score: 0.8, reasons: [request.reason] });
				sendResponse({ success: true });
			}
		});
	}

	requestApiAnalysis() {
		try {
			const url = window.location.href;
			chrome.runtime.sendMessage({ action: 'analyzeUrl', url }, (resp) => {
				if (resp && resp.riskScore) {
					this.displayAnalysisResult(url, resp.riskScore);
					if (resp.riskScore.score >= 0.7) {
						this.showWarning(url, resp.riskScore);
					}
				}
			});
		} catch {}
	}

	displayAnalysisResult(url, riskScore) {
		const existing = document.getElementById('phishguard-analysis-result');
		if (existing) existing.remove();
		const resultDisplay = document.createElement('div');
		resultDisplay.id = 'phishguard-analysis-result';
		resultDisplay.innerHTML = `
			<div class="phishguard-analysis-content">
				<div class="phishguard-analysis-header">
					<h3>🔍 URL Analysis Result</h3>
					<button id="phishguard-analysis-close" class="phishguard-close-btn">&times;</button>
				</div>
				<div class="phishguard-analysis-body">
					<div class="analysis-url"><strong>URL:</strong> ${url}</div>
					<div class="analysis-score">
						<strong>Risk Score:</strong>
						<span class="risk-value ${this.getRiskClass(riskScore.score)}">${Math.round(riskScore.score * 100)}%</span>
						<span class="analysis-source">(API)</span>
					</div>
					<div class="analysis-reasons">
						<strong>Analysis Details:</strong>
						<ul>${(riskScore.reasons || []).map(r => `<li>${r}</li>`).join('')}</ul>
					</div>
					<div class="analysis-actions">
						<button id="phishguard-analysis-close-btn" class="phishguard-btn phishguard-btn-primary">Close</button>
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(resultDisplay);
		document.getElementById('phishguard-analysis-close').onclick = () => resultDisplay.remove();
		document.getElementById('phishguard-analysis-close-btn').onclick = () => resultDisplay.remove();
		setTimeout(() => { if (resultDisplay.parentNode) resultDisplay.remove(); }, 10000);
	}

	showWarning(url, riskData) {
		const existing = document.getElementById('phishguard-warning');
		if (existing) existing.remove();
		const warning = document.createElement('div');
		warning.id = 'phishguard-warning';
		warning.innerHTML = `
			<div class="phishguard-warning-content">
				<div class="phishguard-warning-header">
					<h3>⚠️PhishGuard Warning</h3>
					<button id="phishguard-close" class="phishguard-close-btn">&times;</button>
				</div>
				<div class="phishguard-warning-body">
					<p><strong>This website may be a phishing attempt!</strong></p>
					<p>Risk Score: ${Math.round(riskData.score * 100)}%</p>
					<p>URL: ${url}</p>
					<div class="phishguard-reasons">
						<strong>Reasons:</strong>
						<ul>${(riskData.reasons || []).map(r => `<li>${r}</li>`).join('')}</ul>
					</div>
					<div class="phishguard-actions">
						<button id="phishguard-leave" class="phishguard-btn phishguard-btn-danger">Leave Site</button>
						<button id="phishguard-continue" class="phishguard-btn phishguard-btn-secondary">Continue Anyway</button>
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(warning);
		document.getElementById('phishguard-close').onclick = () => warning.remove();
		document.getElementById('phishguard-leave').onclick = () => { window.history.back(); warning.remove(); };
		document.getElementById('phishguard-continue').onclick = () => warning.remove();
	}

	getRiskClass(score) {
		if (score >= 0.7) return 'high-risk';
		if (score >= 0.4) return 'medium-risk';
		return 'low-risk';
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => new ContentAPIOnly());
} else {
	new ContentAPIOnly();
}