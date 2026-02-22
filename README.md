# Dartboard - Social Assistant

AI-powered social media engagement assistant for busy executives. This Chrome extension helps CEOs and founders maintain an authentic presence on Twitter/X without spending hours on the platform.

**Website**: [dartboard.social](https://dartboard.social)

## Features

- **Style Learning**: Analyzes your existing tweets to learn your unique writing voice, tone, and patterns
- **Inspiration Profiles**: Load other Twitter profiles as style inspiration to blend their voice with yours
- **Opportunity Finding**: Scans your Twitter feed for relevant conversations based on topics you care about
- **AI-Powered Suggestions**: Generates authentic reply suggestions that match your writing style
- **Swipe Interface**: Review suggestions with a Tinder-like swipe UI - accept, reject, or edit
- **Good Find Tracking**: Mark tweets worth responding to even if you write your own reply - helps the AI learn
- **Bi-Weekly Refresh**: Reminds you to re-analyze profiles to keep suggestions fresh
- **Multi-Provider Support**: Works with OpenAI, Anthropic (Claude), or Google (Gemini)
- **Export/Import Settings**: Backup your settings before updates and restore them after

## Installation

1. Download and unzip the extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension folder

## Setup

1. Click the extension icon in your Chrome toolbar
2. Go to the **Settings** tab
3. Choose your **AI Provider** (OpenAI, Anthropic, or Google)
4. Add your **API key**
5. Enter your **Twitter handle** (e.g., @yourname)
6. Add **topics** you want to engage with (e.g., AI, startups, leadership)
7. Optionally add **inspiration profiles** - Twitter accounts whose style you admire
8. Optionally add context about yourself/your company
9. Click **Save Settings**

## Usage

### Analyze Your Writing Style
1. Navigate to your Twitter profile
2. Click the extension icon
3. Go to Settings and click "Analyze My Writing Style"
4. The AI will analyze your recent tweets to learn your voice

### Find Engagement Opportunities
1. Go to your Twitter home feed or any feed with relevant content
2. Click the extension icon
3. Click "Find Engagement Opportunities"
4. A panel will appear on the right side of Twitter

### Review Suggestions
- **Swipe right** or click the green checkmark to accept (copies reply to clipboard)
- **Swipe left** or click the red X to skip
- **Click the star** to mark as "Good Find" - you'll write your own reply
- **Click the eye icon** to view the tweet in the same window
- **Click the arrow icon** to open the tweet in a new tab
- **Edit the reply** directly in the text area before accepting

### Backup Your Settings
Before updating the extension:
1. Go to Settings
2. Scroll to "Backup & Restore"
3. Click "Export Settings" to download a JSON file
4. After updating, click "Import Settings" to restore

## Requirements

- Chrome browser
- API key from one of: OpenAI, Anthropic, or Google
- Twitter/X account

## Privacy

- Your API key is stored locally in Chrome storage
- No data is sent to any servers except your chosen AI provider
- All tweet scraping happens locally in your browser

## Troubleshooting

**Extension not showing on Twitter?**
- Make sure you're on twitter.com or x.com
- Try refreshing the page after installing

**No suggestions generated?**
- Check that your API key is valid
- Make sure you have topics configured
- Try scrolling the feed to load more tweets

**Style analysis not working?**
- Navigate to your own Twitter profile first
- Make sure you have at least 5-10 tweets visible
