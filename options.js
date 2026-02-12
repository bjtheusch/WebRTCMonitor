// Options page script

document.addEventListener('DOMContentLoaded', loadSettings);

document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('cancel').addEventListener('click', () => window.close());
document.getElementById('export-data').addEventListener('click', exportData);
document.getElementById('clear-data').addEventListener('click', clearData);

async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get('config');
    const config = stored.config || {};

    // API Configuration
    document.getElementById('api-endpoint').value = config.apiEndpoint || '';
    document.getElementById('enable-data-upload').checked = config.enableDataUpload || false;
    document.getElementById('auto-upload').checked = config.autoUpload || false;
    document.getElementById('upload-interval').value = (config.uploadInterval || 300000) / 1000;

    // Quality Thresholds
    document.getElementById('rtt-threshold').value = config.qualityThreshold?.rtt || 200;
    document.getElementById('packet-loss-threshold').value = config.qualityThreshold?.packetLoss || 5;
    document.getElementById('jitter-threshold').value = config.qualityThreshold?.jitter || 30;

    // Notifications
    document.getElementById('enable-notifications').checked = config.enableNotifications !== false;
  } catch (error) {
    showStatus('Failed to load settings', 'error');
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  try {
    const config = {
      apiEndpoint: document.getElementById('api-endpoint').value.trim(),
      enableDataUpload: document.getElementById('enable-data-upload').checked,
      autoUpload: document.getElementById('auto-upload').checked,
      uploadInterval: parseInt(document.getElementById('upload-interval').value) * 1000,
      qualityThreshold: {
        rtt: parseFloat(document.getElementById('rtt-threshold').value),
        packetLoss: parseFloat(document.getElementById('packet-loss-threshold').value),
        jitter: parseFloat(document.getElementById('jitter-threshold').value)
      },
      enableNotifications: document.getElementById('enable-notifications').checked
    };

    // Validate
    if (config.enableDataUpload && !config.apiEndpoint) {
      showStatus('API endpoint is required when data upload is enabled', 'error');
      return;
    }

    await chrome.storage.local.set({ config });
    
    showStatus('Settings saved successfully!', 'success');
    
    // Reload the extension to apply new settings
    setTimeout(() => {
      chrome.runtime.reload();
    }, 1000);
  } catch (error) {
    showStatus('Failed to save settings', 'error');
    console.error('Error saving settings:', error);
  }
}

async function exportData() {
  try {
    const tables = await chrome.storage.local.get('tables');
    const stats = tables.tables?.stats || [];

    if (stats.length === 0) {
      showStatus('No data to export', 'error');
      return;
    }

    const data = stats.map(entry => ({
      ...entry,
      stats: JSON.parse(entry.stats),
      quality: JSON.parse(entry.quality)
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webrtc-monitor-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus('Data exported successfully!', 'success');
  } catch (error) {
    showStatus('Failed to export data', 'error');
    console.error('Error exporting data:', error);
  }
}

async function clearData() {
  if (!confirm('Are you sure you want to delete all stored data? This action cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.set({
      tables: {
        stats: [],
        sessions: [],
        uploads: []
      }
    });

    showStatus('All data cleared successfully!', 'success');
  } catch (error) {
    showStatus('Failed to clear data', 'error');
    console.error('Error clearing data:', error);
  }
}

function showStatus(message, type) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`;

  setTimeout(() => {
    statusElement.textContent = '';
    statusElement.className = 'status-message';
  }, 3000);
}
