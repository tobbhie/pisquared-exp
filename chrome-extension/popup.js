// Popup script for configuration

document.addEventListener('DOMContentLoaded', async () => {
  const backendUrlInput = document.getElementById('backend-url');
  const saveButton = document.getElementById('save-config');
  const statusDiv = document.getElementById('status');

  // Load current configuration
  const { backendUrl } = await chrome.storage.sync.get({ backendUrl: 'http://localhost:3001' });
  backendUrlInput.value = backendUrl;

  // Save configuration
  saveButton.addEventListener('click', async () => {
    const backendUrl = backendUrlInput.value.trim();
    
    if (!backendUrl) {
      showStatus('Please enter a backend URL', 'error');
      return;
    }

    try {
      // Test connection
      const response = await fetch(`${backendUrl}/api/health`);
      if (!response.ok) {
        throw new Error('Backend not reachable');
      }

      await chrome.storage.sync.set({ backendUrl });
      showStatus('Configuration saved!', 'success');
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    }
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}

