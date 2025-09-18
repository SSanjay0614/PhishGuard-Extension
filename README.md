# PhishGuard - Browser Extension for Phishing Detection

PhishGuard is a powerful browser extension that protects users from phishing attacks by analyzing URLs in real-time and providing warnings for suspicious websites.

## Features

- **Real-time URL Analysis**: Automatically scans URLs as you browse
- **Advanced Detection**: Uses multiple algorithms to detect phishing attempts
- **Visual Warnings**: Clear, user-friendly warnings for suspicious sites
- **Link Scanning**: Monitors all links on web pages
- **Form Protection**: Warns about suspicious form submissions
- **User Reporting**: Allows users to report phishing sites and false positives
- **Statistics Dashboard**: Shows protection statistics and risk scores
- **Customizable Settings**: Adjustable sensitivity and notification preferences

## Installation

### For Chrome/Edge (Manifest V3)

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the PhishGuard folder
5. The extension will be installed and ready to use

### For Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the PhishGuard folder

## How It Works

### Detection Methods

1. **Domain Analysis**:
   - Checks for suspicious TLDs (.tk, .ml, .ga, .cf, etc.)
   - Detects typosquatting attempts
   - Identifies IP addresses instead of domain names

2. **URL Pattern Recognition**:
   - Analyzes URL structure and length
   - Detects suspicious keywords and patterns
   - Checks for excessive subdomains

3. **Security Indicators**:
   - Verifies HTTPS usage
   - Checks for valid SSL certificates
   - Analyzes domain age and reputation

4. **Machine Learning**:
   - Uses trained models to classify URLs
   - Learns from user reports and feedback
   - Continuously improves detection accuracy

### Risk Scoring

The extension calculates a risk score from 0-100% based on:
- Suspicious domain patterns (30 points)
- Typosquatting detection (30 points)
- URL structure anomalies (20 points)
- Security indicators (10 points)
- Keyword analysis (10 points)

## File Structure

```
PhishGuard/
├── Document
    ├──PHISHGUARD.pdf
├── Video
   ├── Phishing Attack_Warning_Video.mp4
├── phishing-detector
   ├── icon.png
   ├── icon16.png
   ├── manifest.json   # Extension manifest
   ├── popup.html      # Extension popup interface
   ├── popup.js        # Popup functionality
   ├── styles.css      # Styling for all components
├── .gitattributes     # For uploading pdf and mp4 files
├── .gitignore         # For ignore python virtual environment files
├── main.py            # Main python file
├── requirements.txt   # Python Libraries to be installed in virtual environment
├── stacking_url_model.pkl   # ML Model saved as pickle file
└── README.md             # This file
```

## Usage

### Basic Usage

1. **Automatic Protection**: The extension works automatically in the background
2. **Warning System**: When a suspicious URL is detected, you'll see a warning popup
3. **Link Scanning**: Hover over links to see risk indicators
4. **Form Protection**: Get warnings before submitting forms to suspicious sites

### Popup Interface

Click the PhishGuard icon in your browser toolbar to:
- View current site analysis
- See protection statistics
- Report phishing sites
- Adjust settings
- Scan the current page

### Settings

- **Enable Notifications**: Toggle browser notifications
- **Auto-block High Risk URLs**: Automatically block very suspicious sites
- **Scan All Links**: Monitor all links on web pages

## Detection Examples

### High Risk URLs
- `http://paypal-security.tk` (Suspicious TLD + brand name)
- `http://amazon-verify.ml` (Typosquatting attempt)
- `http://192.168.1.1/login` (IP address instead of domain)

### Medium Risk URLs
- `http://long-suspicious-domain-name.com` (Unusually long URL)
- `http://sub1.sub2.sub3.domain.com` (Excessive subdomains)

### Low Risk URLs
- `https://www.google.com` (Legitimate, secure domain)
- `https://github.com/user/repo` (Known legitimate site)

## Contributing

We welcome contributions! Please feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

## Privacy

PhishGuard is designed with privacy in mind:
- All URL analysis happens locally in your browser
- No personal data is sent to external servers
- User reports are anonymized
- Settings are stored locally

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, questions, or feedback:
- Open an issue on GitHub
- Contact us at support@phishguard.com
- Check our documentation wiki

## Changelog

### Version 1.0.0
- Initial release
- Real-time URL analysis
- Warning system
- User reporting
- Statistics dashboard
- Customizable settings

## Acknowledgments

- PhishTank for phishing URL data
- OpenPhish for threat intelligence
- The cybersecurity community for research and feedback

---

**Stay Safe Online with PhishGuard!** 🛡️
