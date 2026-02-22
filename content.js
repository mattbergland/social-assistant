// CEO Social Assistant - Content Script
// Injected into Twitter/X pages

(function() {
  'use strict';
  
  let panelVisible = false;
  let suggestions = [];
  let currentIndex = 0;
  let replyButtonsInjected = false;
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'findOpportunities') {
      findOpportunities();
      sendResponse({ success: true });
    }
    
    if (request.action === 'openPanel') {
      togglePanel(true);
      sendResponse({ success: true });
    }
    
    if (request.action === 'analyzeStyle') {
      analyzeUserStyle(request.handle);
      sendResponse({ success: true });
    }
    
    if (request.action === 'analyzeInspirationProfile') {
      analyzeInspirationProfile(request.handle);
      sendResponse({ success: true });
    }
    
    return true;
  });
  
  // Inject "Suggest Reply" buttons into tweets
  function injectReplyButtons() {
    if (replyButtonsInjected) return;
    
    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
    
    tweetElements.forEach((el) => {
      // Skip if already has our button
      if (el.querySelector('.ceo-suggest-btn')) return;
      
      // Find the action bar (where reply, retweet, like buttons are)
      const actionBar = el.querySelector('[role="group"]');
      if (!actionBar) return;
      
      // Create our suggest button
      const suggestBtn = document.createElement('button');
      suggestBtn.className = 'ceo-suggest-btn';
      suggestBtn.innerHTML = `
        <span class="ceo-suggest-icon">🎯</span>
        <span class="ceo-suggest-text">Suggest</span>
      `;
      suggestBtn.title = 'Get AI-powered reply suggestion';
      
      // Add click handler
      suggestBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await generateSuggestionForTweet(el, suggestBtn);
      });
      
      // Insert at the end of action bar
      actionBar.appendChild(suggestBtn);
    });
  }
  
  // Generate suggestion for a specific tweet
  async function generateSuggestionForTweet(tweetElement, button) {
    // Show loading state
    const originalContent = button.innerHTML;
    button.innerHTML = `<span class="ceo-suggest-loading"></span>`;
    button.disabled = true;
    
    try {
      // Extract tweet data
      const authorEl = tweetElement.querySelector('a[href^="/"][role="link"] span');
      const author = authorEl ? authorEl.textContent.replace('@', '') : 'unknown';
      
      const contentEl = tweetElement.querySelector('[data-testid="tweetText"]');
      const content = contentEl ? contentEl.textContent : '';
      
      const timeEl = tweetElement.querySelector('time');
      const linkEl = timeEl ? timeEl.closest('a') : null;
      const url = linkEl ? `https://twitter.com${linkEl.getAttribute('href')}` : '';
      
      if (!content) {
        showToast('Could not read tweet content', 'error');
        return;
      }
      
      // Send to background for AI processing
      const response = await chrome.runtime.sendMessage({
        action: 'generateSingleSuggestion',
        data: {
          thread: {
            author,
            content,
            url,
            matchedTopics: ['direct request']
          }
        }
      });
      
      if (response.error) {
        showToast(`Error: ${response.error}`, 'error');
        return;
      }
      
      if (response.suggestion) {
        // Show the suggestion in a modal
        showSuggestionModal(response.suggestion);
      } else {
        showToast('Could not generate suggestion', 'error');
      }
    } catch (error) {
      console.error('Error generating suggestion:', error);
      showToast('Error generating suggestion', 'error');
    } finally {
      // Restore button
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  }
  
  // Show suggestion in a modal overlay
  function showSuggestionModal(suggestion) {
    // Remove existing modal if any
    const existingModal = document.getElementById('ceo-suggestion-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'ceo-suggestion-modal';
    modal.innerHTML = `
      <div class="ceo-modal-backdrop"></div>
      <div class="ceo-modal-content">
        <div class="ceo-modal-header">
          <div class="ceo-modal-title">
            <span>🎯</span>
            <span>Suggested Reply</span>
          </div>
          <button class="ceo-modal-close" id="ceo-modal-close">×</button>
        </div>
        
        <div class="ceo-modal-body">
          <div class="ceo-modal-section">
            <div class="ceo-modal-label">Replying to @${suggestion.thread.author}</div>
            <div class="ceo-modal-tweet">${suggestion.thread.content}</div>
          </div>
          
          <div class="ceo-modal-section">
            <div class="ceo-modal-label">Why this reply?</div>
            <div class="ceo-modal-reasoning">${suggestion.reasoning}</div>
          </div>
          
          <div class="ceo-modal-section">
            <div class="ceo-modal-label">Your suggested reply</div>
            <textarea class="ceo-modal-reply" id="ceo-modal-reply" rows="4">${suggestion.reply}</textarea>
          </div>
          
          <div class="ceo-modal-confidence">
            Confidence: <span>${Math.round(suggestion.confidence * 100)}%</span>
          </div>
        </div>
        
        <div class="ceo-modal-actions">
          <button class="ceo-modal-btn ceo-modal-btn-secondary" id="ceo-modal-cancel">Cancel</button>
          <button class="ceo-modal-btn ceo-modal-btn-primary" id="ceo-modal-copy">Copy & Open Tweet</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('ceo-modal-close').addEventListener('click', () => modal.remove());
    document.getElementById('ceo-modal-cancel').addEventListener('click', () => modal.remove());
    document.querySelector('.ceo-modal-backdrop').addEventListener('click', () => modal.remove());
    
    document.getElementById('ceo-modal-copy').addEventListener('click', async () => {
      const reply = document.getElementById('ceo-modal-reply').value;
      await navigator.clipboard.writeText(reply);
      showToast('Reply copied to clipboard!', 'success');
      
      // Open the tweet if we have a URL
      if (suggestion.thread.url) {
        window.open(suggestion.thread.url, '_blank');
      }
      
      // Track the post
      chrome.runtime.sendMessage({ action: 'postComment', suggestion });
      
      modal.remove();
    });
    
    // Focus the textarea for easy editing
    document.getElementById('ceo-modal-reply').focus();
  }
  
  // Show toast notification
  function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.ceo-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `ceo-toast ceo-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('ceo-toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // Watch for new tweets being loaded (infinite scroll)
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      // Debounce the injection
      clearTimeout(window.ceoInjectTimeout);
      window.ceoInjectTimeout = setTimeout(() => {
        injectReplyButtons();
      }, 500);
    });
    
    // Observe the main content area
    const mainContent = document.querySelector('main') || document.body;
    observer.observe(mainContent, {
      childList: true,
      subtree: true
    });
  }
  
  // Initialize reply buttons after a delay (wait for Twitter to load)
  setTimeout(() => {
    injectReplyButtons();
    setupMutationObserver();
  }, 2000);
  
  // Create and inject the suggestion panel
  function createPanel() {
    if (document.getElementById('ceo-assistant-panel')) {
      return document.getElementById('ceo-assistant-panel');
    }
    
    const panel = document.createElement('div');
    panel.id = 'ceo-assistant-panel';
    panel.innerHTML = `
      <div class="ceo-panel-header">
        <div class="ceo-panel-title">
          <span class="ceo-panel-logo">🎯</span>
          <span>Dartboard</span>
        </div>
        <button class="ceo-panel-close" id="ceo-panel-close">×</button>
      </div>
      
      <div class="ceo-panel-status" id="ceo-panel-status">
        <div class="ceo-status-icon">📊</div>
        <div class="ceo-status-text">Ready to find opportunities</div>
      </div>
      
      <div class="ceo-panel-content" id="ceo-panel-content">
        <div class="ceo-empty-state" id="ceo-empty-state">
          <div class="ceo-empty-icon">🔍</div>
          <div class="ceo-empty-text">No suggestions yet</div>
          <div class="ceo-empty-subtext">Click "Find Opportunities" to get started</div>
          <button class="ceo-btn ceo-btn-primary" id="ceo-find-btn">Find Opportunities</button>
        </div>
        
        <div class="ceo-card-container" id="ceo-card-container" style="display: none;">
          <div class="ceo-card-counter" id="ceo-card-counter">1 of 5</div>
          
          <div class="ceo-card" id="ceo-card">
            <div class="ceo-card-section">
              <div class="ceo-card-label">Original Tweet</div>
              <div class="ceo-card-author" id="ceo-tweet-author">@username</div>
              <div class="ceo-card-tweet" id="ceo-tweet-content">Tweet content here...</div>
            </div>
            
            <div class="ceo-card-section">
              <div class="ceo-card-label">Why This Opportunity?</div>
              <div class="ceo-card-reasoning" id="ceo-reasoning">Reasoning here...</div>
            </div>
            
            <div class="ceo-card-section">
              <div class="ceo-card-label">Suggested Reply</div>
              <textarea class="ceo-card-reply" id="ceo-reply" rows="4">Suggested reply here...</textarea>
            </div>
            
            <div class="ceo-confidence" id="ceo-confidence">
              <span class="ceo-confidence-label">Confidence:</span>
              <span class="ceo-confidence-value">85%</span>
            </div>
          </div>
          
          <div class="ceo-card-actions">
            <button class="ceo-action-btn ceo-action-reject" id="ceo-reject" title="Skip">
              <span>✕</span>
              <span class="ceo-action-label">Skip</span>
            </button>
            <button class="ceo-action-btn ceo-action-goodfind" id="ceo-goodfind" title="Good Find - I'll write my own reply">
              <span>⭐</span>
              <span class="ceo-action-label">Good Find</span>
            </button>
            <button class="ceo-action-btn ceo-action-view" id="ceo-view" title="Go to Tweet">
              <span>👁</span>
              <span class="ceo-action-label">View</span>
            </button>
            <button class="ceo-action-btn ceo-action-open" id="ceo-open" title="Open in New Tab">
              <span>↗</span>
              <span class="ceo-action-label">Open</span>
            </button>
            <button class="ceo-action-btn ceo-action-accept" id="ceo-accept" title="Post Reply">
              <span>✓</span>
              <span class="ceo-action-label">Post</span>
            </button>
          </div>
          
          <div class="ceo-swipe-hint">
            <span>← Swipe or use buttons →</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listeners
    document.getElementById('ceo-panel-close').addEventListener('click', () => togglePanel(false));
    document.getElementById('ceo-find-btn').addEventListener('click', findOpportunities);
    document.getElementById('ceo-reject').addEventListener('click', () => handleAction('reject'));
    document.getElementById('ceo-goodfind').addEventListener('click', () => handleAction('goodfind'));
    document.getElementById('ceo-view').addEventListener('click', () => handleAction('view'));
    document.getElementById('ceo-open').addEventListener('click', () => handleAction('open'));
    document.getElementById('ceo-accept').addEventListener('click', () => handleAction('accept'));
    
    // Swipe handling
    setupSwipeHandling();
    
    return panel;
  }
  
  // Toggle panel visibility
  function togglePanel(show) {
    const panel = createPanel();
    panelVisible = show;
    panel.classList.toggle('ceo-panel-visible', show);
    
    if (show) {
      loadSuggestions();
    }
  }
  
  // Load suggestions from storage
  async function loadSuggestions() {
    const data = await chrome.storage.local.get(['suggestions']);
    suggestions = data.suggestions || [];
    currentIndex = 0;
    
    if (suggestions.length > 0) {
      showCardView();
      renderCurrentCard();
    } else {
      showEmptyState();
    }
  }
  
  // Show empty state
  function showEmptyState() {
    document.getElementById('ceo-empty-state').style.display = 'flex';
    document.getElementById('ceo-card-container').style.display = 'none';
  }
  
  // Show card view
  function showCardView() {
    document.getElementById('ceo-empty-state').style.display = 'none';
    document.getElementById('ceo-card-container').style.display = 'block';
  }
  
  // Render current suggestion card
  function renderCurrentCard() {
    if (currentIndex >= suggestions.length) {
      showEmptyState();
      updateStatus('All caught up! Find more opportunities.', '✨');
      return;
    }
    
    const suggestion = suggestions[currentIndex];
    
    document.getElementById('ceo-card-counter').textContent = 
      `${currentIndex + 1} of ${suggestions.length}`;
    document.getElementById('ceo-tweet-author').textContent = 
      `@${suggestion.thread.author}`;
    document.getElementById('ceo-tweet-content').textContent = 
      suggestion.thread.content;
    document.getElementById('ceo-reasoning').textContent = 
      suggestion.reasoning;
    document.getElementById('ceo-reply').value = 
      suggestion.reply;
    document.getElementById('ceo-confidence').querySelector('.ceo-confidence-value').textContent = 
      `${Math.round(suggestion.confidence * 100)}%`;
    
    // Animate card entrance
    const card = document.getElementById('ceo-card');
    card.classList.remove('ceo-card-exit-left', 'ceo-card-exit-right');
    card.classList.add('ceo-card-enter');
    setTimeout(() => card.classList.remove('ceo-card-enter'), 300);
  }
  
  // Handle card actions
  async function handleAction(action) {
    const suggestion = suggestions[currentIndex];
    const card = document.getElementById('ceo-card');
    
    if (action === 'reject') {
      card.classList.add('ceo-card-exit-left');
      suggestion.status = 'rejected';
      setTimeout(() => nextCard(), 300);
    } else if (action === 'accept') {
      card.classList.add('ceo-card-exit-right');
      suggestion.status = 'accepted';
      
      // Get the edited reply
      const editedReply = document.getElementById('ceo-reply').value;
      suggestion.reply = editedReply;
      
      // Copy to clipboard and navigate to tweet
      await navigator.clipboard.writeText(editedReply);
      updateStatus('Reply copied! Paste in the reply box.', '📋');
      
      // Open the tweet
      if (suggestion.thread.url) {
        window.open(suggestion.thread.url, '_blank');
      }
      
      // Track the post
      chrome.runtime.sendMessage({ action: 'postComment', suggestion });
      
      setTimeout(() => nextCard(), 300);
    } else if (action === 'goodfind') {
      // Mark as good find - user will write their own reply
      card.classList.add('ceo-card-exit-right');
      suggestion.status = 'goodfind';
      suggestion.markedAt = new Date().toISOString();
      
      // Save to good finds list for learning
      const goodFinds = await chrome.storage.local.get(['goodFinds']);
      const finds = goodFinds.goodFinds || [];
      finds.push({
        tweet: suggestion.thread,
        aiSuggestion: suggestion.reply,
        markedAt: suggestion.markedAt,
        userReply: null // Will be filled in later when we detect their reply
      });
      await chrome.storage.local.set({ goodFinds: finds });
      
      showToast('Marked as good find! Go write your reply.', 'success');
      updateStatus('Good find saved! Your reply will be tracked for learning.', '⭐');
      
      // Open the tweet so they can reply
      if (suggestion.thread.url) {
        window.open(suggestion.thread.url, '_blank');
      }
      
      setTimeout(() => nextCard(), 300);
    } else if (action === 'view') {
      // Navigate to tweet in same window
      if (suggestion.thread.url) {
        window.location.href = suggestion.thread.url;
      }
    } else if (action === 'open') {
      // Open tweet in new tab
      if (suggestion.thread.url) {
        window.open(suggestion.thread.url, '_blank');
      }
    }
    
    // Save updated suggestions
    await chrome.storage.local.set({ suggestions });
  }
  
  // Move to next card
  function nextCard() {
    currentIndex++;
    renderCurrentCard();
  }
  
  // Setup swipe handling
  function setupSwipeHandling() {
    const card = document.getElementById('ceo-card');
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    card.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'TEXTAREA') return;
      isDragging = true;
      startX = e.clientX;
      card.style.transition = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      currentX = e.clientX - startX;
      card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
    });
    
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      card.style.transition = 'transform 0.3s ease';
      
      if (currentX > 100) {
        handleAction('accept');
      } else if (currentX < -100) {
        handleAction('reject');
      } else {
        card.style.transform = '';
      }
      
      currentX = 0;
    });
    
    // Touch events for mobile
    card.addEventListener('touchstart', (e) => {
      if (e.target.tagName === 'TEXTAREA') return;
      isDragging = true;
      startX = e.touches[0].clientX;
      card.style.transition = 'none';
    });
    
    card.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX - startX;
      card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
    });
    
    card.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      card.style.transition = 'transform 0.3s ease';
      
      if (currentX > 100) {
        handleAction('accept');
      } else if (currentX < -100) {
        handleAction('reject');
      } else {
        card.style.transform = '';
      }
      
      currentX = 0;
    });
  }
  
  // Update status message
  function updateStatus(text, icon = '📊') {
    const statusEl = document.getElementById('ceo-panel-status');
    statusEl.innerHTML = `
      <div class="ceo-status-icon">${icon}</div>
      <div class="ceo-status-text">${text}</div>
    `;
  }
  
  // Find engagement opportunities
  async function findOpportunities() {
    togglePanel(true);
    
    // Clear old suggestions immediately
    suggestions = [];
    currentIndex = 0;
    await chrome.storage.local.remove(['suggestions']);
    showEmptyState();
    
    updateStatus('Scanning feed for opportunities...', '🔍');
    
    const settings = await chrome.storage.local.get(['topics', 'twitterHandle']);
    const topics = settings.topics || ['AI', 'startups', 'leadership'];
    
    // Scrape tweets from the current feed with auto-scrolling
    const tweets = await scrapeTweetsWithScroll(80); // Get up to 80 tweets
    
    if (tweets.length === 0) {
      updateStatus('No tweets found. Make sure you\'re on your feed.', '⚠️');
      return;
    }
    
    updateStatus(`Found ${tweets.length} tweets. Filtering by topics...`, '🤖');
    
    // Filter tweets by relevance to topics
    const relevantTweets = filterRelevantTweets(tweets, topics, 25); // Get up to 25 relevant
    
    if (relevantTweets.length === 0) {
      updateStatus('No relevant opportunities found. Try broader topics.', '🔍');
      return;
    }
    
    updateStatus(`Generating ${relevantTweets.length} suggestions (this may take a minute)...`, '✨');
    showToast(`Found ${relevantTweets.length} opportunities, generating replies...`, 'info');
    
    // Send to background script for AI processing
    const response = await chrome.runtime.sendMessage({
      action: 'generateSuggestions',
      data: { threads: relevantTweets }
    });
    
    if (response.error) {
      updateStatus(`Error: ${response.error}`, '❌');
      showToast(`Error: ${response.error}`, 'error');
      return;
    }
    
    suggestions = response.suggestions || [];
    currentIndex = 0;
    
    if (suggestions.length > 0) {
      updateStatus(`${suggestions.length} suggestions ready! Swipe through them.`, '✅');
      showToast(`${suggestions.length} reply suggestions ready!`, 'success');
      showCardView();
      renderCurrentCard();
    } else {
      updateStatus('Could not generate suggestions. Check API key.', '⚠️');
    }
  }
  
  // Scrape tweets from the current page with auto-scrolling
  async function scrapeTweetsWithScroll(maxTweets = 80) {
    const tweetsMap = new Map(); // Use Map to dedupe by URL
    let lastHeight = 0;
    let noNewTweetsCount = 0;
    const maxScrollAttempts = 15;
    
    const settings = await chrome.storage.local.get(['twitterHandle']);
    const myHandle = (settings.twitterHandle || '').toLowerCase().replace('@', '');
    
    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      // Scrape current visible tweets
      const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
      
      tweetElements.forEach((el) => {
        try {
          // Get author
          const authorEl = el.querySelector('a[href^="/"][role="link"] span');
          const author = authorEl ? authorEl.textContent.replace('@', '') : 'unknown';
          
          // Skip own tweets
          if (author.toLowerCase() === myHandle) return;
          
          // Get tweet content - handle truncated tweets with "Show more"
          const contentEl = el.querySelector('[data-testid="tweetText"]');
          let content = '';
          if (contentEl) {
            // Get all text nodes and spans to capture full content
            content = contentEl.innerText || contentEl.textContent || '';
            
            // Check if tweet is truncated (has "Show more" or ellipsis)
            const isTruncated = content.includes('…') || el.querySelector('[data-testid="tweet-text-show-more-link"]');
            if (isTruncated) {
              // Mark as truncated so we know context may be incomplete
              content = content.replace(/…$/, '...[truncated]');
            }
          }
          
          // Get tweet URL
          const timeEl = el.querySelector('time');
          const linkEl = timeEl ? timeEl.closest('a') : null;
          const url = linkEl ? `https://twitter.com${linkEl.getAttribute('href')}` : '';
          
          // Skip if no content or too short
          if (!content || content.length < 20) return;
          
          // Skip if already have this tweet
          if (tweetsMap.has(url)) return;
          
          tweetsMap.set(url, {
            author,
            content,
            url,
            isTruncated: content.includes('[truncated]')
          });
        } catch (e) {
          console.error('Error scraping tweet:', e);
        }
      });
      
      updateStatus(`Scanning feed (${tweetsMap.size} tweets found)...`, '🔍');
      
      // Stop if we have enough tweets
      if (tweetsMap.size >= maxTweets) {
        break;
      }
      
      // Scroll down to load more
      const currentHeight = document.documentElement.scrollHeight;
      window.scrollTo(0, currentHeight);
      
      // Wait for new content to load
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if we got new content
      if (currentHeight === lastHeight) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 3) break;
      } else {
        noNewTweetsCount = 0;
      }
      lastHeight = currentHeight;
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    
    return Array.from(tweetsMap.values());
  }
  
  // Filter tweets by relevance to topics
  function filterRelevantTweets(tweets, topics, maxResults = 25) {
    const topicPatterns = topics.map(t => new RegExp(t, 'i'));
    
    return tweets.filter(tweet => {
      const matchedTopics = topics.filter((topic, i) => 
        topicPatterns[i].test(tweet.content)
      );
      
      if (matchedTopics.length > 0) {
        tweet.matchedTopics = matchedTopics;
        return true;
      }
      
      return false;
    }).slice(0, maxResults);
  }
  
  // Analyze user's writing style
  async function analyzeUserStyle(handle) {
    togglePanel(true);
    updateStatus('Navigating to your profile...', '🔍');
    
    // Clean handle
    const cleanHandle = handle.replace('@', '');
    
    // Navigate to user's profile
    const profileUrl = `https://twitter.com/${cleanHandle}`;
    
    // We'll scrape from current page if we're on the profile, otherwise instruct user
    if (!window.location.href.includes(`/${cleanHandle}`)) {
      updateStatus(`Please navigate to twitter.com/${cleanHandle} first`, '⚠️');
      window.open(profileUrl, '_blank');
      return;
    }
    
    updateStatus('Starting tweet collection...', '📝');
    
    // Wait a moment for tweets to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scrape user's tweets with auto-scrolling (collect up to 100)
    const tweets = await scrapeUserTweets(100);
    
    if (tweets.length < 5) {
      updateStatus('Need more tweets to analyze. Make sure you have tweets on your profile.', '⚠️');
      showToast('Could not find enough tweets', 'error');
      return;
    }
    
    updateStatus(`Analyzing ${tweets.length} tweets with AI...`, '🤖');
    showToast(`Found ${tweets.length} tweets, analyzing...`, 'info');
    
    // Send to background for analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeStyleFromTweets',
      tweets
    });
    
    if (response.error) {
      updateStatus(`Error: ${response.error}`, '❌');
      showToast(`Error: ${response.error}`, 'error');
      return;
    }
    
    // Save the analysis date for bi-weekly refresh tracking
    await chrome.storage.local.set({ styleProfileLastAnalyzed: new Date().toISOString() });
    
    updateStatus('Style profile created! Ready to generate suggestions.', '✅');
    showToast('Writing style analyzed successfully!', 'success');
  }
  
  // Scrape user's own tweets from their profile with auto-scrolling
  async function scrapeUserTweets(maxTweets = 100) {
    const tweets = new Set(); // Use Set to avoid duplicates
    let lastHeight = 0;
    let noNewTweetsCount = 0;
    const maxScrollAttempts = 30; // Limit scrolling attempts
    
    updateStatus('Collecting tweets (0 found)...', '📝');
    
    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      // Scrape current visible tweets
      const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
      
      tweetElements.forEach((el) => {
        try {
          const contentEl = el.querySelector('[data-testid="tweetText"]');
          const content = contentEl ? contentEl.textContent : '';
          
          // Skip retweets and very short tweets
          if (!content || content.length < 30) return;
          
          // Skip if it looks like a retweet
          if (el.querySelector('[data-testid="socialContext"]')) return;
          
          tweets.add(content);
        } catch (e) {
          console.error('Error scraping user tweet:', e);
        }
      });
      
      updateStatus(`Collecting tweets (${tweets.size} found)...`, '📝');
      
      // Stop if we have enough tweets
      if (tweets.size >= maxTweets) {
        break;
      }
      
      // Scroll down to load more
      const currentHeight = document.documentElement.scrollHeight;
      window.scrollTo(0, currentHeight);
      
      // Wait for new content to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we got new content
      if (currentHeight === lastHeight) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 3) {
          // No new tweets after 3 attempts, stop scrolling
          break;
        }
      } else {
        noNewTweetsCount = 0;
      }
      lastHeight = currentHeight;
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    
    return Array.from(tweets);
  }
  
  // Analyze an inspiration profile's writing style
  async function analyzeInspirationProfile(handle) {
    const cleanHandle = handle.replace('@', '');
    
    showToast(`Analyzing @${cleanHandle}'s style...`, 'info');
    
    // Wait a moment for tweets to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scrape their tweets with auto-scrolling (collect up to 50)
    const tweets = await scrapeUserTweets(50);
    
    if (tweets.length < 5) {
      showToast(`Could not find enough tweets from @${cleanHandle}`, 'error');
      return;
    }
    
    showToast(`Found ${tweets.length} tweets from @${cleanHandle}, analyzing...`, 'info');
    
    // Send to background for analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeInspirationStyleFromTweets',
      handle: cleanHandle,
      tweets
    });
    
    if (response.error) {
      showToast(`Error analyzing @${cleanHandle}: ${response.error}`, 'error');
      return;
    }
    
    // Mark this profile as analyzed in storage with timestamp for bi-weekly refresh
    const settings = await chrome.storage.local.get(['inspirationProfiles']);
    const profiles = settings.inspirationProfiles || [];
    const profileIndex = profiles.findIndex(p => p.handle.toLowerCase() === cleanHandle.toLowerCase());
    if (profileIndex >= 0) {
      profiles[profileIndex].analyzed = true;
      profiles[profileIndex].lastAnalyzed = new Date().toISOString();
      await chrome.storage.local.set({ inspirationProfiles: profiles });
    }
    
    showToast(`@${cleanHandle}'s style analyzed!`, 'success');
  }
  
  // Initialize
  console.log('CEO Social Assistant loaded');
})();
