// Popup script

document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentStatus();
  await loadRecentStats();
  await loadDatabaseStats();
  
  setupEventListeners();
  
  // Auto-refresh every 2 seconds
  setInterval(async () => {
    await loadCurrentStatus();
    await loadRecentStats();
  }, 2000);
});

function setupEventListeners() {
  document.getElementById('check-permissions').addEventListener('click', checkPermissions);
  document.getElementById('clear-cache').addEventListener('click', clearCache);
  document.getElementById('test-connection').addEventListener('click', testConnection);
  document.getElementById('view-stats').addEventListener('click', viewStats);
  document.getElementById('dump-stats').addEventListener('click', dumpStatsNow);
  document.getElementById('debugger-dump').addEventListener('click', debuggerDumpNow);
  document.getElementById('open-options').addEventListener('click', openOptions);
  document.getElementById('auto-capture').addEventListener('click', toggleAutoCapture);
}

async function toggleAutoCapture() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return alert('No active tab');

    // Ask background to toggle auto-capture for this tab
    const resp = await chrome.runtime.sendMessage({ type: 'toggle-auto-capture', tabId: tab.id });
    if (resp && resp.success) {
      const btn = document.getElementById('auto-capture');
      btn.textContent = resp.enabled ? 'Disable Auto-capture' : 'Enable Auto-capture';
      btn.className = resp.enabled ? 'btn btn-danger' : 'btn btn-success';
      alert(resp.enabled ? 'Auto-capture enabled for this tab' : 'Auto-capture disabled for this tab');
    } else {
      alert('Auto-capture toggle failed: ' + (resp && resp.error));
    }
  } catch (error) {
    alert('Error toggling auto-capture: ' + error.message);
  }
}

async function loadCurrentStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-stats' });
    
    if (response.success && response.stats.length > 0) {
      const latestStat = response.stats[0];
      updateStatusDisplay(latestStat);
    }
  } catch (error) {
    console.error('Failed to load current status:', error);
  }
}

function updateStatusDisplay(stat) {
  const statusBadge = document.getElementById('status-badge');
  const qualityStatus = document.getElementById('quality-status');
  const quality = stat.quality || {};
  const status = quality.status || 'unknown';
  // Update badge
  statusBadge.textContent = status;
  statusBadge.className = `status-badge ${status}`;
  // Update quality
  qualityStatus.textContent = (status && typeof status === 'string') ? status.toUpperCase() : '--';
  qualityStatus.className = `value ${status}`;
  // Update metrics
  const metrics = quality.metrics || {};
  document.getElementById('rtt-value').textContent =
    metrics.rtt !== null && metrics.rtt !== undefined ? `${Math.round(metrics.rtt)}ms` : '--';
  document.getElementById('packet-loss-value').textContent =
    metrics.packetLoss !== null && metrics.packetLoss !== undefined ? `${metrics.packetLoss.toFixed(1)}%` : '--';
  document.getElementById('jitter-value').textContent =
    metrics.jitter !== null && metrics.jitter !== undefined ? `${Math.round(metrics.jitter)}ms` : '--';
}

async function loadRecentStats() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-stats' });
    
    if (response.success) {
      displayRecentStats(response.stats);
    }
  } catch (error) {
    console.error('Failed to load recent stats:', error);
  }
}

function displayRecentStats(stats) {
  const statsList = document.getElementById('stats-list');
  
  if (!Array.isArray(stats) || stats.length === 0) {
    statsList.innerHTML = '<p class="placeholder">No data available yet</p>';
    return;
  }
  statsList.innerHTML = stats.slice(0, 5).map(stat => {
    const time = stat.timestamp ? new Date(stat.timestamp).toLocaleTimeString() : '--';
    const quality = (stat.quality && stat.quality.status) ? stat.quality.status : 'unknown';
    const message = (stat.quality && stat.quality.message) ? stat.quality.message : '';
    return `
      <div class="stat-entry">
        <div class="time">${time}</div>
        <div class="quality ${quality}">${(quality && typeof quality === 'string') ? quality.toUpperCase() : '--'}: ${message}</div>
      </div>
    `;
  }).join('');
}

async function loadDatabaseStats() {
  try {
    // Get database statistics
    const stored = await chrome.storage.local.get('tables');
    const stats = stored.tables?.stats || [];
    
    const total = stats.length;
    const pending = stats.filter(s => !s.uploaded).length;
    
    document.getElementById('db-total').textContent = total;
    document.getElementById('db-pending').textContent = pending;
  } catch (error) {
    console.error('Failed to load database stats:', error);
  }
}

async function checkPermissions() {
  try {
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      alert('No active tab found.');
      return;
    }
    // Listen for the result ONCE
    let timeoutId;
    const onMessage = (msg, sender, sendResponse) => {
      if (msg && msg.type === 'permissions-result' && sender.tab && sender.tab.id === tab.id) {
        chrome.runtime.onMessage.removeListener(onMessage);
        clearTimeout(timeoutId);
        if (msg.error) {
          alert('Error checking permissions: ' + msg.error);
          return;
        }
        const mic = msg.microphone;
        const cam = msg.camera;
        alert(`Permissions Status:\nMicrophone: ${mic === 'granted' ? '✓ Granted' : mic === 'denied' ? '✗ Denied' : 'Prompt'}\nCamera: ${cam === 'granted' ? '✓ Granted' : cam === 'denied' ? '✗ Denied' : 'Prompt'}\n\n${mic !== 'granted' || cam !== 'granted' ? 'Visit a website and allow permissions when prompted.' : ''}`);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    // Inject permissions-content.js into the page context
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['permissions-content.js'],
      world: 'MAIN'
    });
    // Timeout in case no response
    timeoutId = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(onMessage);
      alert('Timed out waiting for permission check result.');
    }, 3000);
  } catch (error) {
    alert('Error checking permissions: ' + error.message);
  }
}

async function clearCache() {
  if (!confirm('Are you sure you want to clear the browser cache? This will remove all cached data.')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'clear-cache' });
    
    if (response.success) {
      alert('Cache cleared successfully!');
    } else {
      alert('Failed to clear cache: ' + response.error);
    }
  } catch (error) {
    alert('Error clearing cache: ' + error.message);
  }
}

async function testConnection() {
  try {
    const stored = await chrome.storage.local.get('config');
    const apiEndpoint = stored.config?.apiEndpoint;
    
    if (!apiEndpoint) {
      alert('API endpoint not configured. Please configure it in Settings.');
      return;
    }
    
    const response = await chrome.runtime.sendMessage({
      type: 'test-endpoint',
      url: apiEndpoint + '/api/health'
    });
    
    if (response.accessible) {
      alert(`API connection successful!\nStatus: ${response.status} ${response.statusText}`);
    } else {
      alert(`API connection failed!\nError: ${response.error || 'Unknown error'}`);
    }
  } catch (error) {
    alert('Error testing connection: ' + error.message);
  }
}

function viewStats() {
  // Open a new tab with detailed stats view
  chrome.tabs.create({ url: 'stats.html' });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

async function dumpStatsNow() {
  try {
    // Request background to broadcast dump request to all tabs
    const resp = await chrome.runtime.sendMessage({ type: 'dump-stats-now' });
    if (resp && resp.success) {
      alert('Requested stats dump. Check background/service worker logs for incoming data.');
    } else {
      alert('Requested stats dump. Background did not acknowledge.');
    }
  } catch (error) {
    alert('Error requesting stats dump: ' + error.message);
  }
}

async function debuggerDumpNow() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) {
      alert('No active tab found');
      return;
    }

    const resp = await chrome.runtime.sendMessage({ type: 'debugger-dump-now', tabId: tab.id });
    if (resp && resp.success) {
      alert('Debugger dump completed. Check background/service worker logs for results.');
    } else {
      alert('Debugger dump failed: ' + (resp && resp.error));
    }
  } catch (error) {
    alert('Error requesting debugger dump: ' + error.message);
  }
}
