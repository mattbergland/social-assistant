// CEO Social Assistant - Background Service Worker

// API endpoints for different providers
const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSuggestions') {
    generateSuggestions(request.data).then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'generateSingleSuggestion') {
    generateSingleSuggestionFromContent(request.data).then(sendResponse);
    return true;
  }
  
  if (request.action === 'analyzeStyleFromTweets') {
    analyzeStyleFromTweets(request.tweets).then(sendResponse);
    return true;
  }
  
  if (request.action === 'postComment') {
    // Track posted comments
    trackPostedComment(request.suggestion);
    sendResponse({ success: true });
  }
});

// Generate a single suggestion from content script request
async function generateSingleSuggestionFromContent(data) {
  const settings = await chrome.storage.local.get(['apiKey', 'apiProvider', 'styleProfile', 'aboutContext', 'topics']);
  
  if (!settings.apiKey) {
    return { error: 'API key not configured. Add it in extension settings.' };
  }
  
  try {
    const suggestion = await generateSingleSuggestion(
      data.thread,
      settings.styleProfile,
      settings.aboutContext,
      settings.topics,
      settings.apiKey,
      settings.apiProvider || 'openai'
    );
    
    if (suggestion) {
      return { suggestion };
    } else {
      return { error: 'Could not generate suggestion' };
    }
  } catch (error) {
    console.error('Error generating single suggestion:', error);
    return { error: 'Failed to generate suggestion' };
  }
}

// Generate comment suggestions
async function generateSuggestions(data) {
  const settings = await chrome.storage.local.get(['apiKey', 'apiProvider', 'styleProfile', 'aboutContext', 'topics']);
  
  if (!settings.apiKey) {
    return { error: 'API key not configured' };
  }
  
  const { threads } = data;
  const suggestions = [];
  
  for (const thread of threads) {
    try {
      const suggestion = await generateSingleSuggestion(
        thread,
        settings.styleProfile,
        settings.aboutContext,
        settings.topics,
        settings.apiKey,
        settings.apiProvider || 'openai'
      );
      
      if (suggestion) {
        suggestions.push(suggestion);
      }
    } catch (error) {
      console.error('Error generating suggestion for thread:', error);
    }
  }
  
  // Save suggestions to storage
  await chrome.storage.local.set({ suggestions });
  
  return { suggestions };
}

// Generate a single suggestion
async function generateSingleSuggestion(thread, styleProfile, aboutContext, topics, apiKey, provider = 'openai') {
  const systemPrompt = `You help a busy executive write quick, authentic Twitter replies.

${styleProfile ? `## Their Writing Style\n${styleProfile}\n` : ''}
${aboutContext ? `## About Them\n${aboutContext}\n` : ''}

## CRITICAL RULES
- MAX 1-2 sentences. Shorter is better.
- Sound like a real person, not AI. No corporate speak.
- Be direct and punchy. Skip pleasantries.
- Add a quick insight, agree/disagree, or ask a sharp question.
- NO bullet points, NO numbered lists, NO emojis unless they use them.
- Match their casual/formal tone from the style profile.
- It's OK to be brief. "This." or "Exactly this." can be perfect replies.

## Bad examples (too long/AI-sounding):
- "This is such a great point! I completely agree that..."
- "Thank you for sharing this insightful perspective on..."
- "I've been thinking about this a lot lately and..."

## Good examples (punchy/human):
- "Nailed it. The hard part is getting teams to actually do this."
- "Disagree - speed matters more early on."
- "We tried this. Worked until we hit 50 people."
- "What changed your mind on this?"

## Output Format
JSON only:
{
  "reply": "1-2 sentence reply",
  "reasoning": "Why this works (1 sentence)",
  "confidence": 0.0-1.0
}`;

  const userPrompt = `## Tweet to Reply To
Author: @${thread.author}
Content: ${thread.content}

${thread.context ? `## Thread Context\n${thread.context}\n` : ''}

## Why This Was Selected
This tweet was identified as relevant because it relates to: ${thread.matchedTopics?.join(', ') || 'general interest topics'}

Generate a reply suggestion.`;

  try {
    const content = await callAI(provider, apiKey, systemPrompt, userPrompt);
    
    if (!content) {
      return null;
    }
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from response:', content);
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      id: generateId(),
      thread: {
        author: thread.author,
        content: thread.content,
        url: thread.url,
        context: thread.context
      },
      reply: parsed.reply,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating suggestion:', error);
    return null;
  }
}

// Call AI provider (OpenAI, Anthropic, or Gemini)
async function callAI(provider, apiKey, systemPrompt, userPrompt) {
  try {
    if (provider === 'openai') {
      return await callOpenAI(apiKey, systemPrompt, userPrompt);
    } else if (provider === 'anthropic') {
      return await callAnthropic(apiKey, systemPrompt, userPrompt);
    } else if (provider === 'gemini') {
      return await callGemini(apiKey, systemPrompt, userPrompt);
    }
    return null;
  } catch (error) {
    console.error(`Error calling ${provider}:`, error);
    return null;
  }
}

// Call OpenAI API
async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch(API_ENDPOINTS.openai, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI API error:', error);
    return null;
  }
  
  const result = await response.json();
  return result.choices[0].message.content;
}

// Call Anthropic (Claude) API
async function callAnthropic(apiKey, systemPrompt, userPrompt) {
  const response = await fetch(API_ENDPOINTS.anthropic, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Anthropic API error:', error);
    return null;
  }
  
  const result = await response.json();
  return result.content[0].text;
}

// Call Google Gemini API
async function callGemini(apiKey, systemPrompt, userPrompt) {
  const response = await fetch(`${API_ENDPOINTS.gemini}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Gemini API error:', error);
    return null;
  }
  
  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
}

// Analyze writing style from tweets
async function analyzeStyleFromTweets(tweets) {
  const settings = await chrome.storage.local.get(['apiKey', 'apiProvider']);
  
  if (!settings.apiKey) {
    return { error: 'API key not configured' };
  }
  
  const systemPrompt = `You are an expert at analyzing writing styles. Given a collection of tweets from a user, create a detailed writing style profile that can be used to generate authentic content in their voice.

Analyze and document:
1. Tone (formal/casual, serious/humorous, etc.)
2. Vocabulary patterns (technical terms, slang, industry jargon)
3. Sentence structure (short punchy vs long flowing, use of fragments)
4. Punctuation habits (emoji usage, exclamation points, etc.)
5. Common phrases or expressions they use
6. How they engage with others (direct, supportive, challenging)
7. Topics they're passionate about
8. Their unique voice characteristics

Output a comprehensive style guide that could be used to write content that sounds authentically like them.`;

  const userPrompt = `Here are the user's recent tweets:\n\n${tweets.map((t, i) => `${i + 1}. ${t}`).join('\n\n')}

Create a detailed writing style profile for this user.`;

  try {
    const styleProfile = await callAI(
      settings.apiProvider || 'openai',
      settings.apiKey,
      systemPrompt,
      userPrompt
    );
    
    if (!styleProfile) {
      return { error: 'Failed to analyze style' };
    }
    
    // Save style profile
    await chrome.storage.local.set({ styleProfile });
    
    return { success: true, styleProfile };
  } catch (error) {
    console.error('Error analyzing style:', error);
    return { error: 'Failed to analyze style' };
  }
}

// Track posted comments
async function trackPostedComment(suggestion) {
  const today = new Date().toDateString();
  const stats = await chrome.storage.local.get(['postedToday', 'lastPostedDate', 'postedHistory']);
  
  let postedToday = stats.postedToday || 0;
  if (stats.lastPostedDate !== today) {
    postedToday = 0;
  }
  postedToday++;
  
  const postedHistory = stats.postedHistory || [];
  postedHistory.push({
    ...suggestion,
    postedAt: new Date().toISOString()
  });
  
  await chrome.storage.local.set({
    postedToday,
    lastPostedDate: today,
    postedHistory
  });
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
