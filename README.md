# CEO Social Assistant - Chrome Extension

AI-powered social media engagement assistant for busy executives. This Chrome extension helps CEOs and founders maintain an authentic presence on Twitter/X without spending hours on the platform.

## Features

- **Style Learning**: Analyzes your existing tweets to learn your unique writing voice, tone, and patterns
- **Opportunity Finding**: Scans your Twitter feed for relevant conversations based on topics you care about
- **AI-Powered Suggestions**: Generates authentic reply suggestions that match your writing style
- **Swipe Interface**: Review suggestions with a Tinder-like swipe UI - accept, reject, or edit
- **Activity Tracking**: Keeps track of your engagement activity

## Installation

1. Download and unzip the extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `ceo-social-assistant` folder

## Setup

1. Click the extension icon in your Chrome toolbar
2. Go to the **Settings** tab
3. Add your **OpenAI API key** (required for AI suggestions)
4. Enter your **Twitter handle** (e.g., @yourname)
5. Add **topics** you want to engage with (e.g., AI, startups, leadership)
6. Optionally add context about yourself/your company
7. Click **Save Settings**

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
- **Click the eye icon** to view the original tweet
- **Edit the reply** directly in the text area before accepting

## Requirements

- Chrome browser
- OpenAI API key (get one at https://platform.openai.com)
- Twitter/X account

## Privacy

- Your API key is stored locally in Chrome storage
- No data is sent to any servers except OpenAI for generating suggestions
- All tweet scraping happens locally in your browser

## Troubleshooting

**Extension not showing on Twitter?**
- Make sure you're on twitter.com or x.com
- Try refreshing the page after installing

**No suggestions generated?**
- Check that your OpenAI API key is valid
- Make sure you have topics configured
- Try scrolling the feed to load more tweets

**Style analysis not working?**
- Navigate to your own Twitter profile first
- Make sure you have at least 5-10 tweets visible
