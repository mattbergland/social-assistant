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
  
  // Inspiration profiles listeners
  document.getElementById('add-inspiration-btn').addEventListener('click', addInspiration);
  document.getElementById('new-inspiration').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addInspiration();
  });
  document.getElementById('analyze-inspiration').addEventListener('click', analyzeInspirationProfiles);
  
  // Export/Import settings listeners
  document.getElementById('export-settings').addEventListener('click', exportSettings);
  document.getElementById('import-settings').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importSettings);
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
    'styleProfile',
    'styleProfileLastAnalyzed',
    'inspirationProfiles'
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
  renderInspirationProfiles(settings.inspirationProfiles || []);
  
  // Update status based on settings
  updateStatus(settings);
  
  // Check for bi-weekly refresh reminder
  checkRefreshReminder(settings);
  
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

// Inspiration profiles management
function renderInspirationProfiles(profiles) {
  const container = document.getElementById('inspiration-list');
  if (profiles.length === 0) {
    container.innerHTML = '<span style="color: #71767b; font-size: 13px;">No inspiration profiles added yet</span>';
    return;
  }
  container.innerHTML = profiles.map(profile => `
    <span class="topic-tag active" data-profile="${profile.handle}">
      @${profile.handle}
      ${profile.analyzed ? '<span style="color: #00ba7c; margin-left: 4px;">✓</span>' : ''}
      <span class="remove" onclick="removeInspiration('${profile.handle}')">×</span>
    </span>
  `).join('');
}

async function addInspiration() {
  const input = document.getElementById('new-inspiration');
  const rawInput = input.value.trim();
  
  if (!rawInput) return;
  
  // Parse multiple handles (comma or space separated)
  const handles = rawInput.split(/[,\s]+/).map(h => h.replace('@', '').trim()).filter(h => h);
  
  if (handles.length === 0) return;
  
  const settings = await chrome.storage.local.get(['inspirationProfiles']);
  const profiles = settings.inspirationProfiles || [];
  
  let added = 0;
  for (const handle of handles) {
    if (!profiles.find(p => p.handle.toLowerCase() === handle.toLowerCase())) {
      profiles.push({ handle, analyzed: false });
      added++;
    }
  }
  
  if (added > 0) {
    await chrome.storage.local.set({ inspirationProfiles: profiles });
    renderInspirationProfiles(profiles);
    showNotification(`Added ${added} inspiration profile(s)`, 'success');
  } else {
    showNotification('Profile(s) already added', 'warning');
  }
  
  input.value = '';
}

window.removeInspiration = async function(handle) {
  const settings = await chrome.storage.local.get(['inspirationProfiles']);
  const profiles = (settings.inspirationProfiles || []).filter(p => p.handle !== handle);
  await chrome.storage.local.set({ inspirationProfiles: profiles });
  renderInspirationProfiles(profiles);
};

// Analyze inspiration profiles
async function analyzeInspirationProfiles() {
  const btn = document.getElementById('analyze-inspiration');
  
  const settings = await chrome.storage.local.get(['inspirationProfiles', 'apiKey']);
  const profiles = settings.inspirationProfiles || [];
  
  if (profiles.length === 0) {
    showNotification('Add some inspiration profiles first', 'error');
    return;
  }
  
  if (!settings.apiKey) {
    showNotification('Please add your API key first', 'error');
    return;
  }
  
  // Find profiles that haven't been analyzed yet
  const toAnalyze = profiles.filter(p => !p.analyzed);
  
  if (toAnalyze.length === 0) {
    showNotification('All profiles already analyzed! Add more or re-add to refresh.', 'success');
    return;
  }
  
  btn.textContent = `Analyzing ${toAnalyze.length} profile(s)...`;
  btn.disabled = true;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
      showNotification('Please navigate to Twitter first', 'error');
      btn.textContent = 'Analyze Inspiration Styles';
      btn.disabled = false;
      return;
    }
    
    // Analyze each profile one by one
    for (const profile of toAnalyze) {
      showNotification(`Analyzing @${profile.handle}...`, 'success');
      
      // Navigate to the profile
      await chrome.tabs.update(tab.id, { url: `https://twitter.com/${profile.handle}` });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send message to analyze
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'analyzeInspirationProfile', 
        handle: profile.handle 
      });
      
      // Wait for analysis to complete
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
    
    showNotification('Inspiration profiles analyzed!', 'success');
    btn.textContent = 'Analysis Complete!';
    btn.style.background = '#00ba7c';
    
    // Reload profiles to show updated status
    const updatedSettings = await chrome.storage.local.get(['inspirationProfiles']);
    renderInspirationProfiles(updatedSettings.inspirationProfiles || []);
    
    setTimeout(() => {
      btn.textContent = 'Analyze Inspiration Styles';
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
    
  } catch (error) {
    console.error('Error analyzing inspiration profiles:', error);
    showNotification('Error analyzing profiles', 'error');
    btn.textContent = 'Analyze Inspiration Styles';
    btn.disabled = false;
  }
}

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

// Check if profiles need bi-weekly refresh
function checkRefreshReminder(settings) {
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
  const now = Date.now();
  
  const needsRefresh = [];
  
  // Check user's own style profile
  if (settings.styleProfile && settings.styleProfileLastAnalyzed) {
    const lastAnalyzed = new Date(settings.styleProfileLastAnalyzed).getTime();
    if (now - lastAnalyzed > TWO_WEEKS_MS) {
      needsRefresh.push('your profile');
    }
  }
  
  // Check inspiration profiles
  const inspirationProfiles = settings.inspirationProfiles || [];
  const staleInspirations = inspirationProfiles.filter(p => {
    if (p.analyzed && p.lastAnalyzed) {
      const lastAnalyzed = new Date(p.lastAnalyzed).getTime();
      return now - lastAnalyzed > TWO_WEEKS_MS;
    }
    return false;
  });
  
  if (staleInspirations.length > 0) {
    needsRefresh.push(`${staleInspirations.length} inspiration profile(s)`);
  }
  
  // Show reminder if any profiles need refresh
  if (needsRefresh.length > 0) {
    const refreshContainer = document.getElementById('refresh-reminder');
    if (refreshContainer) {
      refreshContainer.innerHTML = `
        <div class="status warning" style="cursor: pointer;" onclick="showRefreshDetails()">
          <div class="status-dot"></div>
          <span>Time to refresh ${needsRefresh.join(' and ')} (2+ weeks old)</span>
        </div>
      `;
      refreshContainer.style.display = 'block';
    }
  }
}

// Show details about what needs refreshing
window.showRefreshDetails = function() {
  // Switch to settings tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.querySelector('[data-tab="settings"]').classList.add('active');
  document.getElementById('settings').classList.add('active');
  
  showNotification('Re-analyze your profiles to keep suggestions fresh!', 'warning');
};

// Export settings to JSON file
async function exportSettings() {
  const btn = document.getElementById('export-settings');
  btn.textContent = 'Exporting...';
  btn.disabled = true;
  
  try {
    // Get all settings from storage
    const settings = await chrome.storage.local.get([
      'apiKey',
      'apiProvider',
      'twitterHandle',
      'topics',
      'aboutContext',
      'styleProfile',
      'styleProfileLastAnalyzed',
      'inspirationProfiles',
      'inspirationStyles',
      'goodFinds'
    ]);
    
    // Create export object with metadata
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: settings
    };
    
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceo-social-assistant-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Settings exported successfully!', 'success');
    btn.textContent = 'Exported!';
    btn.style.background = '#00ba7c';
    
    setTimeout(() => {
      btn.textContent = 'Export Settings';
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Error exporting settings:', error);
    showNotification('Error exporting settings', 'error');
    btn.textContent = 'Export Settings';
    btn.disabled = false;
  }
}

// Import settings from JSON file
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const btn = document.getElementById('import-settings');
  btn.textContent = 'Importing...';
  btn.disabled = true;
  
  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // Validate the import data
    if (!importData.settings) {
      throw new Error('Invalid settings file');
    }
    
    // Import all settings
    await chrome.storage.local.set(importData.settings);
    
    // Reload the UI with imported settings
    await loadSettings();
    await loadStats();
    
    showNotification('Settings imported successfully!', 'success');
    btn.textContent = 'Imported!';
    btn.style.background = '#00ba7c';
    
    setTimeout(() => {
      btn.textContent = 'Import Settings';
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Error importing settings:', error);
    showNotification('Error: Invalid settings file', 'error');
    btn.textContent = 'Import Settings';
    btn.disabled = false;
  }
  
  // Reset the file input so the same file can be selected again
  event.target.value = '';
}
