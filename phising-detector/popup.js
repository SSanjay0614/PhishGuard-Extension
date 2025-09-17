document.addEventListener('DOMContentLoaded', async () => {
  const currentUrlDisplay = document.getElementById('current-url-display');
  const riskScoreUi = document.getElementById('risk-score-ui');
  const reasonsDisplay = document.getElementById('reasons-display');

  // Placeholder for stats (these would ideally come from a background script or local storage)
  document.getElementById('phishing-blocked').textContent = '0';
  document.getElementById('legitimate-verified').textContent = '0';
  document.getElementById('total-blocked').textContent = '0';

  try {
    console.log("1. DOM content loaded. Starting URL check.");
    // Get the current active tab's URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;

    console.log("2. Current URL is:", currentUrl);
    currentUrlDisplay.value = currentUrl; // Display the current URL

    // Check for special browser pages that the extension can't access
    if (!currentUrl || currentUrl.startsWith("chrome://") || currentUrl.startsWith("edge://") || currentUrl.startsWith("about:")) {
      riskScoreUi.textContent = "N/A";
      riskScoreUi.classList.add('unknown');
      reasonsDisplay.innerHTML = '<p>Cannot scan internal browser pages or invalid URLs.</p>';
      console.error("URL is a special browser page, stopping.");
      return;
    }

    console.log("3. Fetching prediction from API.");
    // Call your FastAPI endpoint
    const response = await fetch('http://127.0.0.1:8000/predict/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: currentUrl })
    });

    console.log("4. Fetch successful. Processing response.");
    const data = await response.json();

    if (data.error) {
      riskScoreUi.textContent = "Error";
      riskScoreUi.classList.add('unknown');
      reasonsDisplay.innerHTML = `<p>Error from API: ${data.error}</p>`;
      console.error('API Error:', data.error);
      return;
    }

    // Display the prediction and risk score
    const prediction = data.prediction;
    const score = data.risk_score;
    // const url = data.url; // Already have currentUrl

    riskScoreUi.textContent = `${score}%`;

    // Remove previous classes
    riskScoreUi.classList.remove('phishing', 'safe', 'unknown');

    if (prediction === 1) {
      riskScoreUi.classList.add('phishing');
      reasonsDisplay.innerHTML = '<p><strong>Reasons:</strong></p><ul><li>High risk features detected.</li><li>Suspicious domain patterns.</li></ul>'; // Placeholder reasons
    } else {
      riskScoreUi.classList.add('safe');
      reasonsDisplay.innerHTML = '<p>No immediate phishing threats detected.</p>'; // Placeholder reasons
    }
    
  } catch (error) {
    currentUrlDisplay.value = "Error getting URL or API unavailable.";
    riskScoreUi.textContent = "N/A";
    riskScoreUi.classList.remove('phishing', 'safe');
    riskScoreUi.classList.add('unknown');
    reasonsDisplay.innerHTML = '<p><strong>Reasons:</strong> API unavailable. Check server connection.</p>';
    console.error('An error occurred during the process:', error);
  }

  // Handle "Scan Current Page" button click (optional, for explicit scans)
  const scanButton = document.getElementById('scan-current-page-button');
  if (scanButton) {
      scanButton.addEventListener('click', () => {
          location.reload(); 
      });
  }

  // Example for footer links - could open a new tab with relevant info
  document.getElementById('about-link').addEventListener('click', (e) => {
    e.preventDefault();
    currentUrlDisplay.value = "About PhishGuard - Version 1.0.0";
    riskScoreUi.textContent = "N/A";
    riskScoreUi.classList.remove('phishing', 'safe');
    riskScoreUi.classList.add('unknown');
    reasonsDisplay.innerHTML = '<p>PhishGuard protects you from phishing attacks by analyzing URLs in real-time and warning you about suspicious websites.</p><p><a href="https://example.com/help" target="_blank">Help & Support</a></p>';
  });
});