// CEO Social Assistant - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
  
  // Load saved settings
  await loadSettings();
  await loadStats();
  
  // Event listeners
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('add-topic-btn').addEventListener('click', addTopic);
  document.getElementById('new-topic').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTopic();
  });
  document.getElementById('find-opportunities').addEventListener('click', findOpportunities);
  document.getElementById('open-panel').addEventListener('click', openPanel);
  document.getElementById('analyze-style').addEventListener('click', analyzeStyle);
});

// API provider hints
const providerHints = {
  openai: 'Get your key from platform.openai.com',
  anthropic: 'Get your key from console.anthropic.com',
  gemini: 'Get your key from aistudio.google.com'
};

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'apiKey',
    'apiProvider',
    'twitterHandle',
    'topics',
    'aboutContext',
    'styleProfile'
  ]);
  
  if (settings.apiProvider) {
    document.getElementById('api-provider').value = settings.apiProvider;
    document.getElementById('api-key-hint').textContent = providerHints[settings.apiProvider];
  }
  
  if (settings.apiKey) {
    document.getElementById('api-key').value = settings.apiKey;
  }
  
  if (settings.twitterHandle) {
    document.getElementById('twitter-handle').value = settings.twitterHandle;
  }
  
  if (settings.aboutContext) {
    document.getElementById('about-context').value = settings.aboutContext;
  }
  
  renderTopics(settings.topics || ['AI', 'startups', 'leadership']);
  
  // Update status based on settings
  updateStatus(settings);
  
  // Add provider change listener
  document.getElementById('api-provider').addEventListener('change', (e) => {
    document.getElementById('api-key-hint').textContent = providerHints[e.target.value];
  });
}

// Load stats
async function loadStats() {
  const stats = await chrome.storage.local.get(['suggestions', 'postedToday', 'lastPostedDate']);
  
  const today = new Date().toDateString();
  const postedToday = stats.lastPostedDate === today ? (stats.postedToday || 0) : 0;
  
  document.getElementById('suggestions-count').textContent = (stats.suggestions || []).length;
  document.getElementById('posted-count').textContent = postedToday;
}

// Update status indicator
function updateStatus(settings) {
  const container = document.getElementById('status-container');
  
  if (!settings.apiKey) {
    container.innerHTML = `
      <div class="status warning">
        <div class="status-dot"></div>
        <span>Add your API key to get started</span>
      </div>
    `;
  } else if (!settings.styleProfile) {
    container.innerHTML = `
      <div class="status warning">
        <div class="status-dot"></div>
        <span>Analyze your writing style to personalize suggestions</span>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="status success">
        <div class="status-dot"></div>
        <span>Ready to find engagement opportunities</span>
      </div>
    `;
  }
}

// Save settings
async function saveSettings() {
  const btn = document.getElementById('save-settings');
  const originalText = btn.textContent;
  
  // Show saving state
  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  const apiKey = document.getElementById('api-key').value.trim();
  const apiProvider = document.getElementById('api-provider').value;
  const twitterHandle = document.getElementById('twitter-handle').value.trim();
  const aboutContext = document.getElementById('about-context').value.trim();
  
  await chrome.storage.local.set({
    apiKey,
    apiProvider,
    twitterHandle,
    aboutContext
  });
  
  // Show success with checkmark
  btn.textContent = 'Saved!';
  btn.style.background = '#00ba7c';
  showNotification('Settings saved successfully!', 'success');
  
  // Reset button after delay
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
    btn.disabled = false;
  }, 2000);
  
  const settings = await chrome.storage.local.get(['apiKey', 'apiProvider', 'twitterHandle', 'topics', 'aboutContext', 'styleProfile']);
  updateStatus(settings);
}

// Topics management
function renderTopics(topics) {
  const container = document.getElementById('topics-list');
  container.innerHTML = topics.map(topic => `
    <span class="topic-tag active" data-topic="${topic}">
      ${topic}
      <span class="remove" onclick="removeTopic('${topic}')">×</span>
    </span>
  `).join('');
}

async function addTopic() {
  const input = document.getElementById('new-topic');
  const topic = input.value.trim();
  
  if (!topic) return;
  
  const settings = await chrome.storage.local.get(['topics']);
  const topics = settings.topics || ['AI', 'startups', 'leadership'];
  
  if (!topics.includes(topic)) {
    topics.push(topic);
    await chrome.storage.local.set({ topics });
    renderTopics(topics);
  }
  
  input.value = '';
}

window.removeTopic = async function(topic) {
  const settings = await chrome.storage.local.get(['topics']);
  const topics = (settings.topics || []).filter(t => t !== topic);
  await chrome.storage.local.set({ topics });
  renderTopics(topics);
};

// Find engagement opportunities
async function findOpportunities() {
  const btn = document.getElementById('find-opportunities');
  btn.textContent = 'Searching...';
  btn.disabled = true;
  
  try {
    // Send message to content script to find opportunities
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
      showNotification('Please navigate to Twitter first', 'error');
      return;
    }
    
    await chrome.tabs.sendMessage(tab.id, { action: 'findOpportunities' });
    showNotification('Searching for opportunities...', 'success');
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error('Error finding opportunities:', error);
    showNotification('Error: Make sure you\'re on Twitter', 'error');
  } finally {
    btn.textContent = 'Find Engagement Opportunities';
    btn.disabled = false;
  }
}

// Open the suggestion panel
async function openPanel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
      showNotification('Please navigate to Twitter first', 'error');
      return;
    }
    
    await chrome.tabs.sendMessage(tab.id, { action: 'openPanel' });
    window.close();
  } catch (error) {
    console.error('Error opening panel:', error);
    showNotification('Error: Make sure you\'re on Twitter', 'error');
  }
}

// Analyze writing style
async function analyzeStyle() {
  const btn = document.getElementById('analyze-style');
  const handle = document.getElementById('twitter-handle').value.trim();
  
  if (!handle) {
    showNotification('Please enter your Twitter handle first', 'error');
    return;
  }
  
  const settings = await chrome.storage.local.get(['apiKey']);
  if (!settings.apiKey) {
    showNotification('Please add your API key first', 'error');
    return;
  }
  
  btn.textContent = 'Starting analysis...';
  btn.disabled = true;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
      showNotification('Please navigate to Twitter first', 'error');
      btn.textContent = 'Analyze My Writing Style';
      btn.disabled = false;
      return;
    }
    
    // Check if we're on the user's profile
    const cleanHandle = handle.replace('@', '');
    if (!tab.url.includes(`/${cleanHandle}`)) {
      showNotification(`Navigate to twitter.com/${cleanHandle} first`, 'warning');
      btn.textContent = 'Analyze My Writing Style';
      btn.disabled = false;
      // Open their profile in a new tab
      chrome.tabs.create({ url: `https://twitter.com/${cleanHandle}` });
      return;
    }
    
    await chrome.tabs.sendMessage(tab.id, { action: 'analyzeStyle', handle });
    showNotification('Collecting & analyzing tweets... Check the Twitter tab!', 'success');
    
    // Don't close popup - let user see the status
    btn.textContent = 'Analysis in progress...';
    
    // Keep checking if analysis is done
    const checkInterval = setInterval(async () => {
      const data = await chrome.storage.local.get(['styleProfile']);
      if (data.styleProfile) {
        clearInterval(checkInterval);
        btn.textContent = 'Analysis Complete!';
        btn.style.background = '#00ba7c';
        showNotification('Writing style analyzed! Ready to generate suggestions.', 'success');
        
        setTimeout(() => {
          btn.textContent = 'Analyze My Writing Style';
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }
    }, 2000);
    
    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (btn.textContent === 'Analysis in progress...') {
        btn.textContent = 'Analyze My Writing Style';
        btn.disabled = false;
      }
    }, 60000);
    
  } catch (error) {
    console.error('Error analyzing style:', error);
    showNotification('Error: Make sure you\'re on Twitter', 'error');
    btn.textContent = 'Analyze My Writing Style';
    btn.disabled = false;
  }
}

// Show notification
function showNotification(message, type) {
  const container = document.getElementById('status-container');
  container.innerHTML = `
    <div class="status ${type}">
      <div class="status-dot"></div>
      <span>${message}</span>
    </div>
  `;
}
