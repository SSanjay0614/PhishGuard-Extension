document.addEventListener('DOMContentLoaded', async () => {
  const resultText = document.getElementById('result-text');
  const riskScore = document.getElementById('risk-score');

  try {
    // Get the current active tab's URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;

    if (!currentUrl) {
      resultText.textContent = "Could not get URL.";
      return;
    }

    // Call your FastAPI endpoint
    const response = await fetch('http://127.0.0.1:8000/predict/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: currentUrl })
    });

    const data = await response.json();

    if (data.error) {
      resultText.textContent = `Error: ${data.error}`;
      return;
    }

    // Display the prediction and risk score
    const prediction = data.prediction;
    const score = data.risk_score;
    const url = data.url;

    if (prediction === 1) {
      resultText.textContent = "⚠️ This might be a phishing site.";
      resultText.classList.add('phishing');
    } else {
      resultText.textContent = "✅ This site looks safe.";
      resultText.classList.add('safe');
    }

    riskScore.textContent = `Risk Score: ${score}%`;
    
  } catch (error) {
    resultText.textContent = "An error occurred. Make sure your API is running.";
    console.error('Error fetching data:', error);
  }
});