document.addEventListener('DOMContentLoaded', async () => {
  const currentUrlDisplay = document.getElementById('current-url-display');
  const urlScoreEl = document.getElementById('url-score');
  const urlRiskEl = document.getElementById('url-risk');
  const urlExtraEl = document.getElementById('url-extra');

  const webpageScoreEl = document.getElementById('webpage-score');
  const webpageRiskEl = document.getElementById('webpage-risk');
  const redFlagsList = document.getElementById('red-flags-list');

  const reasonsDisplay = document.getElementById('reasons-display');

  // Stats placeholders
  document.getElementById('phishing-blocked').textContent = '0';
  document.getElementById('legitimate-verified').textContent = '0';
  document.getElementById('total-blocked').textContent = '0';

  // Utility: normalizes risk_score (handles 0-1 floats and 0-100)
  function normalizeScore(raw) {
    if (raw === null || raw === undefined || Number.isNaN(Number(raw))) return null;
    let n = Number(raw);
    if (n >= 0 && n <= 1) n = n * 100;
    // clamp to 0-100
    n = Math.max(0, Math.min(100, n));
    return Math.round(n * 10) / 10; // one decimal
  }

  function setScorePill(el, score) {
    el.className = 'score-pill';
    if (score === null) {
      el.classList.add('neutral');
      el.textContent = '--%';
      return;
    }
    el.textContent = `${score}%`;
    if (score >= 70) el.classList.add('danger');
    else if (score >= 40) el.classList.add('warning');
    else el.classList.add('safe');
  }

  function setRiskPill(el, prediction) {
    // prediction: 1 => phishing (true), 0 => safe (false), else unknown
    el.className = 'risk-pill';
    if (prediction === 1) {
      el.classList.add('true');
      el.textContent = 'True (Phishing)';
    } else if (prediction === 0) {
      el.classList.add('false');
      el.textContent = 'False (Safe)';
    } else {
      el.classList.add('unknown');
      el.textContent = 'Unknown';
    }
  }

  function showRedFlags(flags) {
    redFlagsList.innerHTML = '';
    if (!Array.isArray(flags) || flags.length === 0) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'No immediate threats detected.';
      redFlagsList.appendChild(li);
      return;
    }
    flags.forEach(f => {
      const li = document.createElement('li');
      li.textContent = f;
      redFlagsList.appendChild(li);
    });
  }

  // Render functions to be used after fetch(). They accept API response objects.
  function renderUrlPrediction(data) {
    if (!data) {
      setScorePill(urlScoreEl, null);
      setRiskPill(urlRiskEl, null);
      urlExtraEl.textContent = 'No data.';
      return;
    }
    const score = normalizeScore(data.risk_score);
    setScorePill(urlScoreEl, score);
    setRiskPill(urlRiskEl, data.prediction);
    urlExtraEl.textContent = data.url ? `URL: ${data.url}` : 'No additional details.';
  }

  function renderWebpagePrediction(data) {
    if (!data) {
      setScorePill(webpageScoreEl, null);
      setRiskPill(webpageRiskEl, null);
      showRedFlags([]);
      return;
    }
    const score = normalizeScore(data.risk_score);
    setScorePill(webpageScoreEl, score);
    setRiskPill(webpageRiskEl, data.prediction);
    showRedFlags(data.red_flags || []);
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab && tab.url ? tab.url : null;
    currentUrlDisplay.value = currentUrl || 'Unable to read URL';

    if (!currentUrl || currentUrl.startsWith('chrome://') || currentUrl.startsWith('edge://') || currentUrl.startsWith('about:')) {
      renderUrlPrediction(null);
      renderWebpagePrediction(null);
      reasonsDisplay.innerHTML = '<p>Cannot scan internal browser pages or invalid URLs.</p>';
      return;
    }

    // --- First API Call: URL phishing (port 8000) ---
    try {
      const urlResponse = await fetch('http://172.16.45.127:8000/predict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl })
      });

      // If server returned non-200, handle gracefully
      if (!urlResponse.ok) {
        console.error('URL API returned', urlResponse.status);
        renderUrlPrediction(null);
      } else {
        const urlData = await urlResponse.json();
        if (urlData.error) {
          console.error('URL API error:', urlData.error);
          renderUrlPrediction(null);
        } else {
          renderUrlPrediction(urlData);
        }
      }
    } catch (err) {
      console.error('URL API is unavailable:', err);
      renderUrlPrediction(null);
    }

    // small delay to avoid overloading backend
    await new Promise(r => setTimeout(r, 300)); // 300ms pause

    // --- Second API Call: Webpage phishing (port 8001) ---
    try {
      const webpageResponse = await fetch('http://172.16.45.127:8001/predict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl })
      });

      if (!webpageResponse.ok) {
        console.error('Webpage API returned', webpageResponse.status);
        renderWebpagePrediction(null);
        reasonsDisplay.innerHTML = '<p>Webpage API returned an error response.</p>';
      } else {
        const webpageData = await webpageResponse.json();
        if (webpageData.error) {
          console.error('Webpage API error:', webpageData.error);
          renderWebpagePrediction(null);
          reasonsDisplay.innerHTML = `<p>Error from Webpage API: ${webpageData.error}</p>`;
        } else {
          renderWebpagePrediction(webpageData);
          // Copy red flags into the reasons-display area for emphasis
          const flags = webpageData.red_flags || [];
          if (flags.length > 0) {
            reasonsDisplay.innerHTML = `<p><strong>Reasons:</strong></p><ul>${flags.map(f => `<li>${f}</li>`).join('')}</ul>`;
          } else {
            reasonsDisplay.innerHTML = '<p>No immediate threats detected.</p>';
          }
        }
      }
    } catch (err) {
      console.error('Webpage API is unavailable:', err);
      renderWebpagePrediction(null);
      reasonsDisplay.innerHTML = '<p>Webpage API is unavailable. Check server connection.</p>';
    }

  } catch (error) {
    // chrome.tabs.query failed
    currentUrlDisplay.value = "Error getting URL.";
    renderUrlPrediction(null);
    renderWebpagePrediction(null);
    reasonsDisplay.innerHTML = '<p>An initial error occurred.</p>';
    console.error('An initial error occurred:', error);
  }

  // Button handlers
  const scanButton = document.getElementById('scan-current-page-button');
  if (scanButton) {
    scanButton.addEventListener('click', () => location.reload());
  }

  document.getElementById('report-phishing-button').addEventListener('click', () => {
    // Example: open a reporting page or send to your backend
    chrome.tabs.create({ url: 'https://example.com/report-phishing' });
  });

  document.getElementById('report-false-positive-button').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://example.com/report-false-positive' });
  });

});
