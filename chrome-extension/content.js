// Content script for Pi2 Explainer extension

let explainButton = null;
let selectedText = '';
let selectionRange = null;
let suppressSelectionHandler = false;

// Listen for text selection
document.addEventListener('mouseup', handleSelection);
document.addEventListener('keyup', handleSelection);

function handleSelection() {
  if (suppressSelectionHandler) {
    suppressSelectionHandler = false;
    return;
  }

  const selection = window.getSelection();
  const text = selection.toString().trim();

  // Only show button for selections > 10 characters
  if (text.length < 10) {
    removeExplainButton();
    return;
  }

  // Only show on pi2.network domains
  if (!window.location.hostname.includes('pi2.network')) {
    return;
  }

  if (selection.rangeCount > 0) {
    selectedText = text;
    selectionRange = selection.getRangeAt(0);
    showExplainButton(selectionRange);
  }
}

function showExplainButton(range) {
  removeExplainButton();

  const rect = range.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  explainButton = document.createElement('button');
  explainButton.id = 'pi2-explainer-button';
  explainButton.type = 'button';
  explainButton.innerHTML = '💡 Explain';
  explainButton.style.cssText = `
    position: absolute;
    top: ${rect.top + scrollY - 45}px;
    left: ${rect.left + scrollX + rect.width / 2 - 40}px;
    background: rgba(255, 255, 255, 0.95);
    color: #1f2937;
    padding: 6px 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    transition: all 0.15s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: auto;
    user-select: none;
    outline: none;
  `;

  explainButton.addEventListener('mouseenter', () => {
    explainButton.style.background = '#ffffff';
    explainButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    explainButton.style.transform = 'translateY(-1px)';
  });

  explainButton.addEventListener('mouseleave', () => {
    explainButton.style.background = 'rgba(255, 255, 255, 0.95)';
    explainButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    explainButton.style.transform = 'translateY(0)';
  });

  // Auto-hide timer
  let autoHideTimer = setTimeout(() => {
    if (explainButton && document.body.contains(explainButton)) {
      removeExplainButton();
    }
  }, 5000);

  // Store timer on button for cleanup
  explainButton._autoHideTimer = autoHideTimer;

  // Use both mousedown and click to ensure it works
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
    }
    
    removeExplainButton();
    
    // Small delay to ensure button is removed before handling
    setTimeout(() => {
      handleExplainClick();
    }, 10);
  };
  
  // Add onclick as fallback (after handleClick is defined)
  explainButton.onclick = handleClick;

  explainButton.addEventListener('mousedown', (e) => {
    suppressSelectionHandler = true;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  explainButton.addEventListener('click', handleClick, true);
  
  document.body.appendChild(explainButton);
}

function removeExplainButton() {
  if (explainButton) {
    if (explainButton._autoHideTimer) {
      clearTimeout(explainButton._autoHideTimer);
    }
    explainButton.remove();
    explainButton = null;
  }
}

async function handleExplainClick() {
  if (!selectedText) {
    return;
  }
  
  removeExplainButton();

  // Show loading overlay
  showLoadingOverlay();

  try {
    const requestPayload = {
      url: window.location.href,
      selected_text: selectedText,
      user_options: {
        tone: 'casual',
        level: 'beginner'
      },
      session_id: generateSessionId()
    };

    chrome.runtime.sendMessage(
      {
        action: 'explain',
        data: requestPayload
      },
      (response) => {
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          showErrorOverlay(`Extension error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (!response) {
          showErrorOverlay('No response from background script. Is the extension enabled?');
          return;
        }

        if (!response.success) {
          showErrorOverlay(response.error || 'Failed to generate explanation');
          return;
        }

        showExplanationOverlay(response.data);
      }
    );
  } catch (error) {
    console.error('Explain error:', error);
    showErrorOverlay(error.message);
  }
}

function showLoadingOverlay() {
  const overlay = createOverlay();
  overlay.innerHTML = `
    <div class="pi2-overlay-content">
      <div class="pi2-spinner"></div>
      <div class="pi2-loading-text">Generating explanation...</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showExplanationOverlay(data) {
  const overlay = createOverlay();

  overlay.innerHTML = `
    <div class="pi2-overlay-content pi2-explanation-content">
      <div class="pi2-header">
        <h2 class="pi2-title">Explanation</h2>
        <button id="close-overlay" class="pi2-close-btn" aria-label="Close">×</button>
      </div>
      <div class="pi2-explanation-text">
        ${data.explanation || 'No explanation available'}
      </div>
      <div class="pi2-feedback">
        <button id="feedback-up" class="pi2-feedback-btn pi2-feedback-positive">Helpful</button>
        <button id="feedback-down" class="pi2-feedback-btn pi2-feedback-negative">Not helpful</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close button
  const closeBtn = overlay.querySelector('#close-overlay');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
  });

  // Feedback buttons
  const feedbackUp = overlay.querySelector('#feedback-up');
  const feedbackDown = overlay.querySelector('#feedback-down');
  
  feedbackUp.addEventListener('click', (e) => {
    e.stopPropagation();
    handleFeedback('positive', data);
    overlay.remove();
  });

  feedbackDown.addEventListener('click', (e) => {
    e.stopPropagation();
    handleFeedback('negative', data);
    overlay.remove();
  });

  // Close on outside click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

function showErrorOverlay(message) {
  const overlay = createOverlay();
  overlay.innerHTML = `
    <div class="pi2-overlay-content pi2-error-content">
      <div class="pi2-error-icon">⚠</div>
      <h2 class="pi2-error-title">Error</h2>
      <p class="pi2-error-message">${message}</p>
      <button id="close-error" class="pi2-close-error-btn">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const closeBtn = overlay.querySelector('#close-error');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
  });
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

function createOverlay() {
  // Remove existing overlay if any
  const existing = document.getElementById('pi2-explainer-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pi2-explainer-overlay';
  overlay.className = 'pi2-overlay';
  return overlay;
}

function handleFeedback(type, data) {
  // Store feedback locally (could send to backend)
  chrome.storage.local.get(['feedback'], (result) => {
    const feedback = result.feedback || [];
    feedback.push({
      type,
      explanationId: data.executionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      selectedText: selectedText.substring(0, 100) // Store snippet for context
    });
    chrome.storage.local.set({ feedback });
  });
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Keyboard shortcut (Alt+E)
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'e') {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length >= 10) {
      selectedText = text;
      if (selection.rangeCount > 0) {
        selectionRange = selection.getRangeAt(0);
        handleExplainClick();
      }
    }
  }
});

