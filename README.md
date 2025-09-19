# 🛡️ PhishGuard – Browser Extension for Phishing Detection

<p align="center">
  <video src="Video/Phishing%20Attack_Warning_Video.mp4" controls width="720" />
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
git clone https://github.com/SSanjay0614/PhishGuard.git
cd PhishGuard
```
## 2. Set up Python backend for URL/page APIs

PhishGuard uses local backend APIs (`url_api.py`, `page_api.py`) to serve ML inferences.
