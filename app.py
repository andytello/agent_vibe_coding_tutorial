import os
import re
import time
from datetime import datetime
import feedparser
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory cache to store parsed release notes
# Structure: { "items": [...], "last_updated": timestamp }
feed_cache = {
    "items": None,
    "last_updated": 0
}
CACHE_DURATION_SECS = 900  # 15 minutes cache

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_iso_date(date_str):
    """Parses ISO date string for sorting. Returns timestamp or 0 if parsing fails."""
    if not date_str:
        return 0
    try:
        # e.g., '2026-06-12T00:00:00-07:00'
        # Python 3.11 supports datetime.fromisoformat for timezone offsets
        dt = datetime.fromisoformat(date_str)
        return int(dt.timestamp())
    except Exception:
        try:
            # Fallback
            dt = datetime.strptime(date_str[:19], "%Y-%m-%dT%H:%M:%S")
            return int(dt.timestamp())
        except Exception:
            return 0

def fetch_and_parse_feed(force_refresh=False):
    """Fetches the RSS feed, parses it, separates into individual category cards, and caches the result."""
    global feed_cache
    
    current_time = time.time()
    if not force_refresh and feed_cache["items"] is not None and (current_time - feed_cache["last_updated"] < CACHE_DURATION_SECS):
        return feed_cache["items"], feed_cache["last_updated"], "cached"
        
    try:
        # Fetch the feed with requests to handle timeout and headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse with feedparser
        feed = feedparser.parse(response.content)
        
        parsed_items = []
        
        for entry in feed.entries:
            date_title = entry.get('title', 'Unknown Date')
            updated_str = entry.get('updated', '')
            timestamp = parse_iso_date(updated_str)
            base_link = entry.get('link', '')
            base_id = entry.get('id', '')
            
            html_content = entry.get('summary', '') or entry.get('content', [{}])[0].get('value', '')
            
            if not html_content:
                continue
                
            # Split items by <h3> tags
            parts = re.split(r'<h3>(.*?)</h3>', html_content)
            
            if len(parts) > 1:
                # parts[0] is content before first <h3>
                # parts[1] is header, parts[2] is content, parts[3] is header, parts[4] is content, etc.
                for i in range(1, len(parts), 2):
                    category = parts[i].strip()
                    content = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    # Create a unique ID for this item
                    item_id = f"{base_id}_{category.lower()}_{i}"
                    
                    # Clean up category name and map to standardized categories
                    category_lower = category.lower()
                    if 'feature' in category_lower:
                        std_category = 'Feature'
                    elif 'change' in category_lower:
                        std_category = 'Change'
                    elif 'issue' in category_lower or 'fix' in category_lower:
                        std_category = 'Issue'
                    elif 'breaking' in category_lower or 'deprecated' in category_lower:
                        std_category = 'Breaking'
                    else:
                        std_category = 'Announcement'
                        
                    parsed_items.append({
                        "id": item_id,
                        "date": date_title,
                        "timestamp": timestamp,
                        "raw_date": updated_str,
                        "original_category": category,
                        "category": std_category,
                        "content": content,
                        "link": base_link
                    })
            else:
                # No <h3> headers found, add the entire entry as an Announcement
                parsed_items.append({
                    "id": base_id,
                    "date": date_title,
                    "timestamp": timestamp,
                    "raw_date": updated_str,
                    "original_category": "Announcement",
                    "category": "Announcement",
                    "content": html_content,
                    "link": base_link
                })
        
        # Sort items by timestamp descending (newest first)
        parsed_items.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Update cache
        feed_cache["items"] = parsed_items
        feed_cache["last_updated"] = current_time
        
        return parsed_items, current_time, "fetched"
        
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If fetch fails but cache has data, return cache with a warning
        if feed_cache["items"] is not None:
            return feed_cache["items"], feed_cache["last_updated"], "error_using_cache"
        raise e

@app.route('/')
def index():
    """Renders the main dashboard page."""
    return render_template('index.html')

@app.route('/api/feed')
def get_feed():
    """API endpoint to get the parsed feed items."""
    force = request.args.get('refresh', 'false').lower() == 'true'
    try:
        items, last_updated, status = fetch_and_parse_feed(force_refresh=force)
        return jsonify({
            "success": True,
            "items": items,
            "last_updated": last_updated,
            "status": status,
            "count": len(items)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Bind to localhost port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
