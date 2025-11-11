// Background service worker for Pi2 Explainer extension

// Default configuration
const DEFAULT_CONFIG = {
  backendUrl: 'https://pisquared-exp.onrender.com',
  enabled: true
};

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  // Set default configuration
  chrome.storage.sync.set(DEFAULT_CONFIG);
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'explain') {
    // Use async function to properly handle the promise
    (async () => {
      try {
        const result = await handleExplainRequest(request.data);
        sendResponse({ success: true, data: result });
      } catch (error) {
        console.error('Background explain error:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to generate explanation' 
        });
      }
    })();
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
  
  // Return false if we don't handle the message
  return false;
});

async function handleExplainRequest(data) {
  const { backendUrl } = await chrome.storage.sync.get({ backendUrl: DEFAULT_CONFIG.backendUrl });
  
  const response = await fetch(`${backendUrl}/api/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (handled by manifest)
});

