# BigQuery Release Notes Dashboard

A modern, interactive, and responsive web application built with **Python Flask** and **Vanilla HTML/CSS/JavaScript**. This application fetches the official Google Cloud BigQuery RSS release notes feed, parses the entries, splits daily summaries into granular category-based updates, and renders them in a dashboard interface.

---

## ✨ Features

- **Granular Categorization**: Parses daily feeds and splits them into individual update cards classified into:
  - 🟢 **Features**
  - 🔵 **Changes**
  - 🟡 **Issues & Fixes**
  - 🔴 **Breaking / Deprecations**
  - 🟣 **Announcements**
- **Interactive Stats Overview**: A dashboard statistics bar displaying real-time counts for each category. Clicking any card filters the updates dynamically.
- **Client-Side search engine**: Instant real-time filtering via full-text search across titles, dates, categories, and content descriptions.
- **Sleek UX & UI**: 
  - Glassmorphic interface styled with vanilla CSS.
  - Smooth light/dark theme toggling with persistent preferences saved to `localStorage`.
  - Shimmer skeletons during data loading.
- **Clipboard Integrations**: Card-specific "Copy Link" buttons to copy official documentation URLs with instant visual feedback and custom toast alerts.
- **Performance Caching Layer**: Automated 15-minute in-memory caching to avoid API rate limits, combined with a **Force Refresh** button to fetch live data on demand.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11+, Flask, requests, feedparser
- **Frontend**: HTML5 (Semantic Structure), Vanilla CSS3 (Custom Variables, Transitions, Grids), Vanilla JavaScript (ES6+, Fetch API, Event Loops)
- **Icons**: FontAwesome 6.4.0 (via CDN)
- **Fonts**: Google Fonts (Inter, Outfit)

---

## 📁 File Structure

```
├── app.py                  # Flask backend (RSS parser, caching layer, API endpoints)
├── requirements.txt        # Python dependency specifications
├── .gitignore              # Git ignore configuration
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Semantic HTML dashboard template
└── static/
    ├── css/
    │   └── styles.css      # Core styles, variables, light/dark themes, and animations
    └── js/
        └── app.js          # Client-side engine (AJAX, search indexes, filters, theme control)
```

---

## 🚀 How to Run the App Locally

### Prerequisites
Make sure you have Python 3.11+ and pip installed on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/andytello/agent_vibe_coding_tutorial.git
cd agent_vibe_coding_tutorial
```

### 2. Set up a virtual environment
```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Start the development server
```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📄 License
This project is open-source and available under the MIT License.
