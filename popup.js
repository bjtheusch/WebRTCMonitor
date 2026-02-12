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
  document.getElementById('open-options').addEventListener('click', openOptions);
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
  
  // Update badge
  statusBadge.textContent = stat.quality.status;
  statusBadge.className = `status-badge ${stat.quality.status}`;
  
  // Update quality
  qualityStatus.textContent = stat.quality.status.toUpperCase();
  qualityStatus.className = `value ${stat.quality.status}`;
  
  // Update metrics
  const metrics = stat.quality.metrics;
  
  document.getElementById('rtt-value').textContent = 
    metrics.rtt !== null ? `${Math.round(metrics.rtt)}ms` : '--';
  
  document.getElementById('packet-loss-value').textContent = 
    metrics.packetLoss !== null ? `${metrics.packetLoss.toFixed(1)}%` : '--';
  
  document.getElementById('jitter-value').textContent = 
    metrics.jitter !== null ? `${Math.round(metrics.jitter)}ms` : '--';
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
  
  if (stats.length === 0) {
    statsList.innerHTML = '<p class="placeholder">No data available yet</p>';
    return;
  }
  
  statsList.innerHTML = stats.slice(0, 5).map(stat => {
    const time = new Date(stat.timestamp).toLocaleTimeString();
    const quality = stat.quality.status;
    const message = stat.quality.message;
    
    return `
      <div class="stat-entry">
        <div class="time">${time}</div>
        <div class="quality ${quality}">${quality.toUpperCase()}: ${message}</div>
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
    const response = await chrome.runtime.sendMessage({ type: 'check-permissions' });
    
    if (response.success) {
      const { microphone, camera } = response.permissions;
      
      alert(`Permissions Status:
Microphone: ${microphone ? '✓ Granted' : '✗ Not Granted'}
Camera: ${camera ? '✓ Granted' : '✗ Not Granted'}

${!microphone || !camera ? 'Visit a website and allow permissions when prompted.' : ''}`);
    } else {
      alert('Failed to check permissions: ' + response.error);
    }
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
