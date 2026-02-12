// Background Service Worker for WebRTC Monitor

import { DatabaseManager } from './database.js';
import { ApiClient } from './api-client.js';
import { WebRTCMonitor } from './webrtc-monitor.js';
import { ConnectionQualityAnalyzer } from './quality-analyzer.js';

let dbManager;
let apiClient;
let webrtcMonitor;
let qualityAnalyzer;
let config = {};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('WebRTC Monitor installed');
  
  // Set default configuration
  await chrome.storage.local.set({
    config: {
      apiEndpoint: '',
      uploadInterval: 300000, // 5 minutes
      qualityThreshold: {
        rtt: 200, // ms
        packetLoss: 5, // %
        jitter: 30 // ms
      },
      enableNotifications: true,
      enableDataUpload: false,
      autoUpload: false
    }
  });
  
  await initialize();
});

// Initialize components
async function initialize() {
  try {
    // Load configuration
    const stored = await chrome.storage.local.get('config');
    config = stored.config || {};
    
    // Initialize database
    dbManager = new DatabaseManager();
    await dbManager.initialize();
    
    // Initialize API client
    apiClient = new ApiClient(config.apiEndpoint);
    
    // Fetch configuration from API if endpoint is set
    if (config.apiEndpoint && config.apiEndpoint !== '') {
      try {
        const serverConfig = await apiClient.fetchConfiguration();
        if (serverConfig) {
          config = { ...config, ...serverConfig };
          await chrome.storage.local.set({ config });
        }
      } catch (error) {
        console.error('Failed to fetch server configuration:', error);
      }
    }
    
    // Initialize WebRTC monitor
    webrtcMonitor = new WebRTCMonitor();
    qualityAnalyzer = new ConnectionQualityAnalyzer(config.qualityThreshold);
    
    // Start monitoring
    startMonitoring();
    
    // Setup periodic data upload if enabled
    if (config.enableDataUpload && config.autoUpload) {
      setupPeriodicUpload();
    }
    
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// Start monitoring WebRTC connections
function startMonitoring() {
  // Listen for WebRTC stats updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'webrtc-stats') {
      handleWebRTCStats(message.stats, sender.tab?.id);
      sendResponse({ success: true });
    } else if (message.type === 'check-permissions') {
      checkPermissions().then(sendResponse);
      return true;
    } else if (message.type === 'clear-cache') {
      clearCache().then(sendResponse);
      return true;
    } else if (message.type === 'test-endpoint') {
      testEndpoint(message.url).then(sendResponse);
      return true;
    } else if (message.type === 'get-stats') {
      getRecentStats().then(sendResponse);
      return true;
    }
  });
}

// Handle WebRTC statistics
async function handleWebRTCStats(stats, tabId) {
  try {
    // Analyze connection quality
    const quality = qualityAnalyzer.analyze(stats);
    
    // Log to database
    await dbManager.logStats({
      timestamp: Date.now(),
      tabId,
      stats,
      quality
    });
    
    // Check if quality is poor and notify
    if (quality.status === 'poor' && config.enableNotifications) {
      showQualityNotification(quality);
    }
    
    // Update badge
    updateBadge(quality.status);
    
  } catch (error) {
    console.error('Error handling WebRTC stats:', error);
  }
}

// Show notification for poor connection quality
function showQualityNotification(quality) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'WebRTC Connection Quality Warning',
    message: quality.message || 'Connection quality is degraded',
    priority: 2
  });
}

// Update extension badge
function updateBadge(status) {
  const colors = {
    good: '#00C853',
    fair: '#FFB300',
    poor: '#D50000',
    unknown: '#9E9E9E'
  };
  
  chrome.action.setBadgeBackgroundColor({ color: colors[status] || colors.unknown });
  chrome.action.setBadgeText({ text: status.charAt(0).toUpperCase() });
}

// Setup periodic data upload
function setupPeriodicUpload() {
  const uploadInterval = config.uploadInterval || 300000;
  
  setInterval(async () => {
    try {
      const pendingData = await dbManager.getPendingData();
      
      if (pendingData.length > 0 && config.apiEndpoint) {
        const result = await apiClient.uploadData(pendingData);
        
        if (result.success) {
          await dbManager.markDataUploaded(pendingData.map(d => d.id));
        }
      }
    } catch (error) {
      console.error('Failed to upload data:', error);
    }
  }, uploadInterval);
}

// Check microphone and camera permissions
async function checkPermissions() {
  try {
    const permissions = {
      microphone: false,
      camera: false
    };
    
    // Check if permissions are granted
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissions.microphone = true;
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.log('Microphone permission not granted');
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      permissions.camera = true;
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.log('Camera permission not granted');
    }
    
    return { success: true, permissions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Clear browser cache
async function clearCache() {
  try {
    await chrome.browsingData.remove({
      since: 0
    }, {
      cache: true,
      cacheStorage: true,
      serviceWorkers: true
    });
    
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test endpoint accessibility
async function testEndpoint(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return {
      success: true,
      accessible: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      success: false,
      accessible: false,
      error: error.message
    };
  }
}

// Get recent stats for popup
async function getRecentStats() {
  try {
    const stats = await dbManager.getRecentStats(10);
    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Listen for extension startup
chrome.runtime.onStartup.addListener(() => {
  initialize();
});

// Initialize on load
initialize();
