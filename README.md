# 🛡️ PhishGuard – Browser Extension for Phishing Detection

<p align="center">
  <video src="Video/Phishing_Attack_Warning_Video.mp4" controls width="720" />
</p>

> If the embedded video doesn't render on GitHub, click here to watch:  
> [🎥 Demo: Phishing Attack Warning Video](Video/Phishing_Attack_Warning_Video.mp4)

---

## 📌 Overview
**PhishGuard** is a browser extension that provides **two-layer protection** against phishing attacks:

1. **URL-Level Detection** – Fast ML classification of URLs using a **stacking ensemble** (LightGBM, XGBoost, CatBoost → Logistic Regression meta-model) trained on the **PhiUSIIL Phishing URL** dataset.  
2. **Webpage-Level Detection** – Scrapes webpage content and analyzes it with an LLM (Mistral via Ollama) plus heuristic signals (pop-ups, ads, suspicious elements). The **final risk** is a weighted combination of the LLM score and heuristic score.

This two-tier approach verifies both the link and the actual page before flagging a site as phishing.

---

## 🚀 Features
- ✅ Two-layer protection: URL + Webpage analysis  
- 🧠 Stacking ensemble for URL classification  
- 🤖 LLM-assisted webpage analysis (Mistral via Ollama)  
- ⚖️ Heuristic risk scoring (pop-ups count, ad density, suspicious links, etc.)  
- 🔔 Lightweight popup UI for one-click checks  
- 🎥 Demo video included in the repo

---

## 🛠️ Installation & Usage

> **Note:** This extension is **not** published on the Chrome Web Store. To use it, load the extension folder as an unpacked extension.

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/PhishGuard.git
cd PhishGuard
```
### 2. Set up Python backend for URL/page APIs
PhishGuard uses local backend APIs (url_api.py, page_api.py) to serve ML inferences.
python -m venv venv
#### Linux / Mac
source venv/bin/activate
#### Windows
venv\Scripts\activate

pip install -r requirements.txt

Start the backend APIs (in separate terminals if needed):
python url_api.py
python page_api.py

Make sure the APIs are accessible to the extension (e.g., default localhost ports). Update popup.js endpoints if you use non-default ports.
### 3. Load the extension in your browser

Open Chrome (or Edge/Brave) → chrome://extensions/
Toggle Developer mode (top-right)
Click Load unpacked
Select the phishing-detector/ folder inside this repository

You should now see the PhishGuard icon in the toolbar. Click it to open the popup UI and test URLs/pages.


### ⚙️ Tech Stack

Extension Frontend: HTML, CSS, JavaScript
Backend: Python (Flask/FastAPI recommended)
ML: scikit-learn, LightGBM, XGBoost, CatBoost
LLM Integration: Mistral via Ollama (for webpage analysis)
Scraping: BeautifulSoup, Requests


### 📊 Results (URL Detection)

Accuracy: 99.77%
F1-Score: 99.80%

These metrics are from the stacking ensemble trained on the PhiUSIIL phishing URL dataset. Webpage detection uses LLM probabilities combined with heuristic scoring (final = 0.5 * LLM + 0.5 * Heuristic by default).
