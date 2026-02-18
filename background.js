// Background Service Worker for WebRTC Monitor

// Inlined DatabaseManager (from database.js)
class DatabaseManager {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    const stored = await chrome.storage.local.get('tables');
    if (!stored.tables) {
      await this.createTables();
    }
    this.initialized = true;
    console.log('Database initialized');
  }

  async createTables() {
    await chrome.storage.local.set({ tables: { stats: [] } });
  }

  async logStats(entry) {
    const tables = await chrome.storage.local.get('tables');
    const stats = tables.tables?.stats || [];
    const id = `${Date.now()}-${Math.random().toString(36).substr(2,6)}`;
    stats.unshift({ id, uploaded: false, ...entry });
    await chrome.storage.local.set({ tables: { stats } });
    return id;
  }

  async getRecentStats(n = 10) {
    const tables = await chrome.storage.local.get('tables');
    const stats = tables.tables?.stats || [];
    return stats.slice(0, n);
  }

  async getPendingData() {
    const tables = await chrome.storage.local.get('tables');
    const stats = tables.tables?.stats || [];
    return stats.filter(s => !s.uploaded);
  }

  async markDataUploaded(ids) {
    const tables = await chrome.storage.local.get('tables');
    const stats = tables.tables?.stats || [];
    for (const s of stats) {
      if (ids.includes(s.id)) s.uploaded = true;
    }
    await chrome.storage.local.set({ tables: { stats } });
  }
}

// Inlined ApiClient (from api-client.js)
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.timeout = 10000;
  }

  async fetchConfiguration() {
    if (!this.baseUrl) throw new Error('API endpoint not configured');
    try {
      const response = await this.fetch('/api/config', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Failed to fetch configuration:', error);
      throw error;
    }
  }

  async uploadData(data) {
    if (!this.baseUrl) throw new Error('API endpoint not configured');
    try {
      const response = await this.fetch('/api/stats', { method: 'POST', body: JSON.stringify(data) });
      return { success: true, response };
    } catch (error) {
      console.error('Failed to upload data:', error);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (!this.baseUrl) throw new Error('API endpoint not configured');
    try {
      const response = await this.fetch('/api/health', { method: 'GET' });
      return { success: true, connected: true, response };
    } catch (error) {
      return { success: false, connected: false, error: error.message };
    }
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

// Inlined WebRTCMonitor (from webrtc-monitor.js)
class WebRTCMonitor {
  constructor() {
    this.connections = new Map();
    this.statsInterval = 1000;
    this.debuggerAttached = false;
  }

  async attachToTab(tabId) {
    try {
      console.log('WEBRTCMONITOR: attachToTab starting for', tabId);
      await chrome.debugger.attach({ tabId }, '1.3');
      this.debuggerAttached = true;
      try {
        const res = await chrome.debugger.sendCommand({ tabId }, 'WebRTC.enable');
        console.log('WEBRTCMONITOR: WebRTC.enable returned', res, 'for tab', tabId);
      } catch (cmdErr) {
        console.error('WEBRTCMONITOR: WebRTC.enable failed for tab', tabId, cmdErr);
      }
      console.log(`WEBRTCMONITOR: Debugger attached to tab ${tabId}`);
    } catch (error) {
      console.error('WEBRTCMONITOR: Failed to attach debugger to tab', tabId, error);
      throw error;
    }
  }

  async detachFromTab(tabId) {
    try {
      console.log('WEBRTCMONITOR: detaching debugger from tab', tabId);
      await chrome.debugger.detach({ tabId });
      this.debuggerAttached = false;
      console.log(`WEBRTCMONITOR: Debugger detached from tab ${tabId}`);
    } catch (error) {
      console.error('WEBRTCMONITOR: Failed to detach debugger from tab', tabId, error);
    }
  }

  async getStats(tabId) {
    try {
      console.log('WEBRTCMONITOR: getStats called for tab', tabId, 'debuggerAttached=', this.debuggerAttached);
      return { timestamp: Date.now(), tabId, connections: [] };
    } catch (error) {
      console.error('WEBRTCMONITOR: Failed to get WebRTC stats for tab', tabId, error);
      return null;
    }
  }

  trackConnection(connectionId, peerConnection) { this.connections.set(connectionId, { id: connectionId, peerConnection, startTime: Date.now(), lastStats: null }); }
  removeConnection(connectionId) { this.connections.delete(connectionId); }
  async getAllConnectionStats() { const allStats = []; for (const [id, c] of this.connections) { try { const s = await this.getConnectionStats(c.peerConnection); allStats.push({ connectionId: id, stats: s }); } catch (e) {} } return allStats; }
  async getConnectionStats(peerConnection) { return { timestamp: Date.now(), candidates: [], streams: [] }; }
}

// Inlined ConnectionQualityAnalyzer (from quality-analyzer.js)
class ConnectionQualityAnalyzer {
  constructor(thresholds = {}) { this.thresholds = { rtt: thresholds.rtt || 200, packetLoss: thresholds.packetLoss || 5, jitter: thresholds.jitter || 30 }; }
  analyze(stats) {
    if (!stats || typeof stats !== 'object') return { status: 'unknown', message: 'No stats available', metrics: {} };
    const metrics = this.extractMetrics(stats);
    const issues = this.detectIssues(metrics);
    const status = this.determineStatus(issues);
    return { status, message: this.generateMessage(issues), metrics, issues };
  }
  extractMetrics(stats) {
    const metrics = { rtt: null, packetLoss: null, jitter: null, bandwidth: null, framesDropped: null, timestamp: Date.now() };
    if (stats.rtt !== undefined) metrics.rtt = stats.rtt; else if (stats.currentRoundTripTime !== undefined) metrics.rtt = stats.currentRoundTripTime * 1000;
    if (stats.packetsLost !== undefined && stats.packetsSent !== undefined) { const total = stats.packetsSent + stats.packetsLost; metrics.packetLoss = total > 0 ? (stats.packetsLost / total) * 100 : 0; } else if (stats.packetLossPercentage !== undefined) metrics.packetLoss = stats.packetLossPercentage;
    if (stats.jitter !== undefined) metrics.jitter = stats.jitter * 1000;
    if (stats.availableOutgoingBitrate !== undefined) metrics.bandwidth = stats.availableOutgoingBitrate;
    if (stats.framesDropped !== undefined) metrics.framesDropped = stats.framesDropped;
    return metrics;
  }
  detectIssues(metrics) { const issues = []; if (metrics.rtt !== null) { if (metrics.rtt > this.thresholds.rtt * 2) issues.push({ severity: 'high', metric: 'rtt', value: metrics.rtt, threshold: this.thresholds.rtt, message: `High latency detected (${Math.round(metrics.rtt)}ms)` }); else if (metrics.rtt > this.thresholds.rtt) issues.push({ severity: 'medium', metric: 'rtt', value: metrics.rtt, threshold: this.thresholds.rtt, message: `Elevated latency (${Math.round(metrics.rtt)}ms)` }); }
  if (metrics.packetLoss !== null) { if (metrics.packetLoss > this.thresholds.packetLoss * 2) issues.push({ severity: 'high', metric: 'packetLoss', value: metrics.packetLoss, threshold: this.thresholds.packetLoss, message: `Severe packet loss (${metrics.packetLoss.toFixed(1)}%)` }); else if (metrics.packetLoss > this.thresholds.packetLoss) issues.push({ severity: 'medium', metric: 'packetLoss', value: metrics.packetLoss, threshold: this.thresholds.packetLoss, message: `Packet loss detected (${metrics.packetLoss.toFixed(1)}%)` }); }
  if (metrics.jitter !== null) { if (metrics.jitter > this.thresholds.jitter * 2) issues.push({ severity: 'high', metric: 'jitter', value: metrics.jitter, threshold: this.thresholds.jitter, message: `High jitter detected (${Math.round(metrics.jitter)}ms)` }); else if (metrics.jitter > this.thresholds.jitter) issues.push({ severity: 'medium', metric: 'jitter', value: metrics.jitter, threshold: this.thresholds.jitter, message: `Elevated jitter (${Math.round(metrics.jitter)}ms)` }); }
  return issues; }
  determineStatus(issues) { if (issues.length === 0) return 'good'; const hasHighSeverity = issues.some(issue => issue.severity === 'high'); if (hasHighSeverity) return 'poor'; return 'fair'; }
  generateMessage(issues) { if (issues.length === 0) return 'Connection quality is good'; const highIssues = issues.filter(i => i.severity === 'high'); if (highIssues.length > 0) return highIssues.map(i => i.message).join(', '); const mediumIssues = issues.filter(i => i.severity === 'medium'); return mediumIssues.map(i => i.message).join(', '); }
}

let dbManager;
let apiClient;
let webrtcMonitor;
let qualityAnalyzer;
let config = {};
let _initialized = false;

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
  if (_initialized) {
    try { console.log('BACKGROUNDHOOK: initialize() already run, skipping'); } catch (e) {}
    return;
  }
  _initialized = true;
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
    // Verbose diagnostic logging for incoming messages
    try {
      console.log('BACKGROUNDHOOK: onMessage received', {
        type: message?.type,
        fromTab: sender?.tab?.id,
        frameId: sender?.frameId,
        url: sender?.url
      });
    } catch (e) {}

    if (message.type === 'webrtc-stats') {
      try {
        const statsSummary = Array.isArray(message.stats) ? message.stats.map(s => ({ connectionId: s.connectionId, statCount: Array.isArray(s.stats) ? s.stats.length : (s.stats ? Object.keys(s.stats).length : 0) })) : null;
        console.log('BACKGROUNDHOOK: webrtc-stats payload summary', { connections: message.stats?.length, statsSummary });
      } catch (e) {
        console.error('BACKGROUNDHOOK: error summarizing stats payload', e);
      }

      handleWebRTCStats(message.stats, sender.tab?.id);
      try { sendResponse({ success: true }); } catch (e) {}
    } else if (message.type === 'check-permissions') {
      // No-op: checkPermissions now handled in popup.js for correct context
      sendResponse({ success: false, error: 'Permission check must be run from popup context.' });
      return true;
    } else if (message.type === 'inject-page-hook') {
      // Inject the page-context hook into the tab's main world using scripting API
      const tabId = sender?.tab?.id;
      if (!tabId) {
        try { sendResponse({ success: false, error: 'no_tab' }); } catch (e) {}
        return false;
      }

      try {
        const pageHook = function() {
          try {
            const Original = window.RTCPeerConnection;
            console.log('PAGEHOOK: in-page function running. OriginalRTCPeerConnection type=', typeof Original);
            const _webrtcMonitorPCs = [];
            if (Original) {
              const NewPC = function(...args) {
                try { console.log('PAGEHOOK: RTCPeerConnection constructed', args); } catch (e) {}
                const pc = new Original(...args);
                try {
                  if (pc && pc.getStats) {
                    const origGetStats = pc.getStats.bind(pc);
                    // Assign a page-visible id for correlation (best-effort)
                    try { pc.__webrtc_monitor_id = 'ph-' + Date.now() + '-' + Math.random().toString(36).substr(2,6); } catch (e) {}
                    _webrtcMonitorPCs.push(pc);
                    pc.getStats = function(...gargs) {
                      try { console.log('PAGEHOOK: getStats called on pc', pc.__webrtc_monitor_id); } catch (e) {}
                      // Call original getStats and post results to window for the content script to pick up
                      try {
                        const p = origGetStats(...gargs);
                        if (p && typeof p.then === 'function') {
                          p.then((report) => {
                            try {
                              const arr = [];
                              if (report && typeof report.forEach === 'function') {
                                report.forEach(r => {
                                  try {
                                    // Try to shallow-clone report entry
                                    const obj = Object.assign({}, r);
                                    // Ensure id/type present
                                    if (!obj.id && r.id) obj.id = r.id;
                                    if (!obj.type && r.type) obj.type = r.type;
                                    arr.push(obj);
                                  } catch (e) {
                                    // ignore
                                  }
                                });
                              } else if (Array.isArray(report)) {
                                for (const r of report) arr.push(Object.assign({}, r));
                              }
                              // Post a structured message to the page (content script will listen)
                              window.postMessage({
                                source: 'webrtc-monitor-pagehook',
                                type: 'getStatsResult',
                                pcId: pc.__webrtc_monitor_id,
                                stats: arr,
                                ts: Date.now()
                              }, '*');
                              console.log('PAGEHOOK: posted stats for pc', pc.__webrtc_monitor_id, arr);
                            } catch (e) {
                              // ignore serialization errors
                            }
                          }).catch(() => {});
                        }
                        return p;
                      } catch (e) {
                        return origGetStats(...gargs);
                      }
                    };
                  }
                } catch (e) {
                  console.error('PAGEHOOK: error wrapping getStats', e);
                }
                return pc;
              };
              NewPC.prototype = Original.prototype;
              window.RTCPeerConnection = NewPC;
              console.log('PAGEHOOK: RTCPeerConnection overridden in page context');
              // Periodically call getStats on all tracked PeerConnections
              setInterval(function() {
                _webrtcMonitorPCs.forEach(function(pc) {
                  if (pc && typeof pc.getStats === 'function' && pc.connectionState !== 'closed') {
                    try {
                      pc.getStats(); // This will trigger our wrapper and post stats
                    } catch (e) {}
                  }
                });
              }, 2000);
              // Test message to verify messaging works
              window.postMessage({
                source: 'webrtc-monitor-pagehook',
                type: 'test-injection',
                ts: Date.now()
              }, '*');
            } else {
              console.log('PAGEHOOK: OriginalRTCPeerConnection is undefined in page context');
            }
          } catch (e) {
            console.error('PAGEHOOK: injection error', e);
          }
        };

        // Inject into all accessible frames of the tab so page-level RTCPeerConnections in frames are hooked
        chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: pageHook, world: 'MAIN' }, (results) => {
          if (chrome.runtime.lastError) {
            console.error('BACKGROUNDHOOK: scripting.executeScript error', chrome.runtime.lastError.message);
            try { sendResponse({ success: false, error: chrome.runtime.lastError.message }); } catch (e) {}
            return;
          }

          try {
            // results is an array of execution results per frame
            const injectedFrames = (results || []).map(r => ({ frameId: r.frameId, result: !!r.result }));
            console.log('BACKGROUNDHOOK: injected page hook into tab', tabId, 'frames:', injectedFrames);
            try { sendResponse({ success: true, frames: injectedFrames }); } catch (e) {}
          } catch (e) {
            console.log('BACKGROUNDHOOK: injected page hook into tab', tabId, results);
            try { sendResponse({ success: true, frames: [] }); } catch (e) {}
          }
        });
      } catch (e) {
        console.error('BACKGROUNDHOOK: failed to inject page hook', e);
        try { sendResponse({ success: false, error: e.message }); } catch (e) {}
      }
      return true;
    } else if (message.type === 'dump-stats-now') {
      // Broadcast a dump request to all tabs' content scripts and inject a scan in the page context
      try {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            // Only target normal http/https tabs with an id
            if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) continue;

            // 1. Try to trigger the content script's dump
            try {
              chrome.tabs.sendMessage(tab.id, { type: 'dump-stats-now' }, (response) => {
                if (chrome.runtime.lastError) {
                  // No receiver in this tab (common for pages without the content script)
                  console.debug('BACKGROUNDHOOK: no content script in tab', tab.id, chrome.runtime.lastError.message);
                  // Continue to inject page context scan
                } else {
                  // Optional: log acknowledgement from tab
                  try { console.log('BACKGROUNDHOOK: dump-stats-now ack from tab', tab.id, response); } catch (e) {}
                }
              });
            } catch (e) {
              console.debug('BACKGROUNDHOOK: error sending message to tab', tab.id, e && e.message);
            }

            // 2. Inject a script into the page context to enumerate all PeerConnections and call getStats
            try {
              chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                world: 'MAIN',
                func: function() {
                  try {
                    // Try to find all PeerConnections in the main window
                    const pcs = [];
                    const props = Object.getOwnPropertyNames(window);
                    for (const p of props) {
                      try {
                        const v = window[p];
                        if (v && typeof v.getStats === 'function') {
                          pcs.push({ name: p, pc: v });
                        }
                      } catch (e) {}
                    }
                    // Call getStats on each
                    pcs.forEach(({ name, pc }) => {
                      try {
                        const p = pc.getStats();
                        if (p && typeof p.then === 'function') {
                          p.then((report) => {
                            try {
                              const arr = [];
                              if (report && typeof report.forEach === 'function') {
                                report.forEach(r => {
                                  try {
                                    const obj = Object.assign({}, r);
                                    if (!obj.id && r.id) obj.id = r.id;
                                    if (!obj.type && r.type) obj.type = r.type;
                                    arr.push(obj);
                                  } catch (e) {}
                                });
                              } else if (Array.isArray(report)) {
                                for (const r of report) arr.push(Object.assign({}, r));
                              }
                              window.postMessage({
                                source: 'webrtc-monitor-pagehook',
                                type: 'getStatsResult',
                                pcId: name,
                                stats: arr,
                                ts: Date.now()
                              }, '*');
                              console.log('PAGEHOOK: posted stats for pc (scan)', name, arr);
                            } catch (e) {}
                          }).catch(() => {});
                        }
                      } catch (e) {}
                    });
                  } catch (e) {
                    console.error('PAGEHOOK: scan error', e);
                  }
                }
              }, (results) => {
                if (chrome.runtime.lastError) {
                  console.error('BACKGROUNDHOOK: scripting.executeScript error (scan)', chrome.runtime.lastError.message);
                } else {
                  console.log('BACKGROUNDHOOK: injected PeerConnection scan into tab', tab.id, results);
                }
              });
            } catch (e) {
              console.error('BACKGROUNDHOOK: failed to inject PeerConnection scan', e);
            }
          }
        });
        console.log('BACKGROUNDHOOK: broadcasted dump-stats-now and injected scan to candidate tabs');
        sendResponse({ success: true });
      } catch (e) {
        console.error('BACKGROUNDHOOK: failed to broadcast dump-stats-now or inject scan', e);
        sendResponse({ success: false, error: e.message });
      }
      return true;
    } else if (message.type === 'clear-cache') {
      clearCache().then(sendResponse);
      return true;
    } else if (message.type === 'test-endpoint') {
      testEndpoint(message.url).then(sendResponse);
      return true;
    } else if (message.type === 'get-stats') {
      // Use promise form instead of await to avoid syntax errors in non-async listener
      getRecentStats().then((stats) => {
        // getRecentStats returns { success, stats } or error object
        if (stats && stats.success) {
          try { console.log('BACKGROUNDHOOK: responding to get-stats with', stats.stats.length, 'entries'); } catch (e) {}
        } else {
          try { console.log('BACKGROUNDHOOK: get-stats returned no data or error', stats); } catch (e) {}
        }
        try { sendResponse(stats); } catch (e) {}
      }).catch((e) => {
        console.error('BACKGROUNDHOOK: error handling get-stats', e);
        try { sendResponse({ success: false, error: e.message }); } catch (e) {}
      });
      return true;
    }
    else if (message.type === 'debugger-dump-now') {
      const tabId = message.tabId || (sender && sender.tab && sender.tab.id);
      if (!tabId) {
        try { sendResponse({ success: false, error: 'no_tab' }); } catch (e) {}
        return false;
      }

      // Attach debugger and evaluate getStats in the page context with retries
      (async () => {
        // Validate that the tab still exists before attempting to attach the debugger
        try {
          await new Promise((res, rej) => chrome.tabs.get(tabId, (t) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(t)));
        } catch (err) {
          try { sendResponse({ success: false, error: 'invalid_tab', detail: (err && err.message) || String(err) }); } catch (e) {}
          return;
        }

        const target = { tabId };
        const maxAttempts = 6;
        let attempt = 0;
        let lastErr = null;

        while (attempt < maxAttempts) {
          attempt++;
          try {
            // Try attach
            await new Promise((res, rej) => chrome.debugger.attach(target, '1.3', () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));

            // Enable Runtime
            await new Promise((res, rej) => chrome.debugger.sendCommand(target, 'Runtime.enable', {}, () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));

            const expression = `(${function() {
              return (async function() {
                // Recursively walk all properties of an object, looking for PeerConnections
                const seen = new WeakSet();
                const found = [];
                const MAX_DEPTH = 5;
                const MAX_BREADTH = 50;
                async function walk(obj, path, depth) {
                  if (!obj || typeof obj !== 'object' && typeof obj !== 'function') return;
                  if (seen.has(obj)) return;
                  seen.add(obj);
                  if (typeof obj.getStats === 'function') {
                    try {
                      const stats = await (async function() {
                        try {
                          const p = obj.getStats();
                          const r = await Promise.resolve(p);
                          const arr = [];
                          if (r && typeof r.forEach === 'function') {
                            r.forEach(function(item){ try { arr.push(Object.assign({}, item)); } catch(e){} });
                          } else if (Array.isArray(r)) {
                            for (var i=0;i<r.length;i++){ try { arr.push(Object.assign({}, r[i])); } catch(e){} }
                          }
                          return { success:true, entries: arr };
                        } catch (ex) { return { success:false, error: (ex && ex.message) || '' }; }
                      })();
                      found.push({ name: path, result: stats });
                    } catch (e) {}
                  }
                  if (depth > MAX_DEPTH) return;
                  let keys;
                  try { keys = Object.getOwnPropertyNames(obj); } catch (e) { return; }
                  let count = 0;
                  for (const k of keys) {
                    if (count++ > MAX_BREADTH) break;
                    let v;
                    try { v = obj[k]; } catch (e) { continue; }
                    await walk(v, path + '.' + k, depth + 1);
                  }
                }
                // Start from window
                await walk(window, 'window', 0);
                // Also scan frames
                if (window.frames && window.frames.length) {
                  for (let i = 0; i < window.frames.length; i++) {
                    try {
                      await walk(window.frames[i], 'window.frames['+i+']', 0);
                    } catch (e) {}
                  }
                }
                return found;
              })();
            }})();`;

            const evalParams = { expression, awaitPromise: true, returnByValue: true };
            const evalResult = await new Promise((res, rej) => chrome.debugger.sendCommand(target, 'Runtime.evaluate', evalParams, (r) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r)));

            const value = evalResult && evalResult.result && evalResult.result.value ? evalResult.result.value : null;
            try { console.log('BACKGROUNDHOOK: debugger-eval result', (value && value.length) || 0); } catch (e) {}

            if (Array.isArray(value) && value.length > 0) {
              const connections = [];
              for (const item of value) {
                try {
                  if (item && item.result && item.result.success && Array.isArray(item.result.entries)) {
                    connections.push({ connectionId: item.name, stats: item.result.entries });
                  }
                } catch (e) {}
              }

              if (connections.length > 0) {
                try { console.log('BACKGROUNDHOOK: debugger-collected connections', connections.length); } catch (e) {}
                await handleWebRTCStats(connections, tabId);
              }
            }

            try { sendResponse({ success: true, resultCount: (value && value.length) || 0 }); } catch (e) {}

            // Detach and finish
            try { await new Promise((res, rej) => chrome.debugger.detach(target, () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res())); } catch (e) { /* ignore detach errors here */ }
            return;
          } catch (e) {
            lastErr = e;
            const msg = (e && e.message) || String(e);
            try { console.debug('BACKGROUNDHOOK: debugger attempt failed', { attempt, message: msg, error: e }); } catch (ex) {}

            // If detached during command or debugger not attached, we'll retry after a backoff
            if (msg.includes('Detached while handling command') || msg.includes('Debugger is not attached') || msg.includes('Another debugger is already attached')) {
              try { console.debug('BACKGROUNDHOOK: will retry debugger attach/eval', { attempt, reason: msg }); } catch (ex) {}
              try { chrome.debugger.detach(target, () => {}); } catch (ex) {}
              // exponential backoff
              const backoffMs = Math.min(5000, 300 * Math.pow(2, attempt));
              await new Promise(r => setTimeout(r, backoffMs));
              continue;
            }

            // Non-retriable error: return it with details
            try { sendResponse({ success: false, error: msg, detail: (e && e.stack) || null }); } catch (er) {}
            try { chrome.debugger.detach(target, () => {}); } catch (ex) {}
            return;
          }
        }

        // If we exhausted attempts
        try { sendResponse({ success: false, error: 'exhausted_debugger_attempts', detail: (lastErr && lastErr.message) || String(lastErr) }); } catch (e) {}
        
      })();

      // As a last resort, attempt to enumerate DevTools targets and attach to worker targets
      (async () => {
        try { console.log('BACKGROUNDHOOK: starting worker enumeration for tab', tabId); } catch (e) {}
        const tabTarget = { tabId };
        try {
          await new Promise((res, rej) => chrome.debugger.attach(tabTarget, '1.3', () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));
        } catch (e) {
          try { console.debug('BACKGROUNDHOOK: could not attach to tab for target enumeration', e && e.message); } catch (er) {}
          return;
        }

        try {
          // Ask the inspector for available targets (may include workers)
          const targetsResp = await new Promise((res, rej) => chrome.debugger.sendCommand(tabTarget, 'Target.getTargets', {}, (r) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r)));
          const targets = (targetsResp && targetsResp.targetInfos) || [];
          try { console.log('BACKGROUNDHOOK: Target.getTargets returned', targets.map(t=>({id:t.targetId,type:t.type})).slice(0,20)); } catch (e) {}

          for (const t of targets) {
            try {
              if (!t || !t.type) continue;
              if (t.type === 'worker' || t.type === 'service_worker' || t.type === 'shared_worker') {
                const wtarget = { targetId: t.targetId };
                try {
                  await new Promise((res, rej) => chrome.debugger.attach(wtarget, '1.3', () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));
                } catch (e) {
                  try { console.debug('BACKGROUNDHOOK: attach to worker failed', t.targetId, e && e.message); } catch (er) {}
                  continue;
                }

                try {
                  await new Promise((res, rej) => chrome.debugger.sendCommand(wtarget, 'Runtime.enable', {}, () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));

                  // Evaluate same snippet in worker global scope to find any RTCPeerConnection-like objects
                  const expression = `(${function(){
                    function tryGet(obj){ return new Promise((resolve) => {
                      if(!obj||typeof obj.getStats!=='function') return resolve(null);
                      try {
                        const p = obj.getStats();
                        Promise.resolve(p).then(function(r){
                          const arr = [];
                          try {
                            if (r && typeof r.forEach === 'function') { r.forEach(function(item){ try { arr.push(Object.assign({}, item)); } catch(e){} }); }
                            else if (Array.isArray(r)) { for (var i=0;i<r.length;i++){ try { arr.push(Object.assign({}, r[i])); } catch(e){} } }
                          } catch(e){}
                          resolve({ success:true, entries: arr });
                        }).catch(function(err){ resolve({ success:false, error: (err && err.message) || '' }); });
                      } catch (ex) { resolve({ success:false, error: (ex && ex.message) || '' }); }
                    }); }
                    var found = [];
                    try {
                      var names = Object.getOwnPropertyNames(self||this||globalThis||{});
                      var promises = names.map(function(n){
                        try {
                          var v = (self||this)[n];
                          if (v && typeof v.getStats === 'function') {
                            return tryGet(v).then(function(res){ if (res) found.push({ name: n, result: res }); }).catch(function(){});
                          }
                        } catch(e) {}
                        return Promise.resolve();
                      });
                      return Promise.all(promises).then(function(){ return found; });
                    } catch (e) { return found; }
                  }})();`;

                  const evalParams = { expression, awaitPromise: true, returnByValue: true };
                  const evalResult = await new Promise((res, rej) => chrome.debugger.sendCommand(wtarget, 'Runtime.evaluate', evalParams, (r) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r)));
                  const value = evalResult && evalResult.result && evalResult.result.value ? evalResult.result.value : null;
                  try { console.log('BACKGROUNDHOOK: worker-eval result for', t.targetId, (value && value.length) || 0); } catch (e) {}

                  if (Array.isArray(value) && value.length > 0) {
                    const connections = [];
                    for (const item of value) {
                      try {
                        if (item && item.result && item.result.success && Array.isArray(item.result.entries)) {
                          connections.push({ connectionId: `${t.targetId}:${item.name}`, stats: item.result.entries });
                        }
                      } catch (e) {}
                    }

                    if (connections.length > 0) {
                      try { console.log('BACKGROUNDHOOK: worker-collected connections', t.targetId, connections.length); } catch (e) {}
                      await handleWebRTCStats(connections, tabId);
                    }
                  }
                } catch (e) {
                  try { console.debug('BACKGROUNDHOOK: worker eval failed', t.targetId, e && e.message); } catch (er) {}
                } finally {
                  try { chrome.debugger.detach(wtarget, () => {}); } catch (e) {}
                }
              }
            } catch (e) {
              // continue to next target
            }
          }
        } catch (e) {
          try { console.debug('BACKGROUNDHOOK: Target.getTargets failed', e && e.message); } catch (er) {}
        } finally {
          try { chrome.debugger.detach(tabTarget, () => {}); } catch (e) {}
        }
      })();

      return true;
    }
  });
}

// Handle WebRTC statistics
async function handleWebRTCStats(stats, tabId) {
  try {
    console.log('BACKGROUNDHOOK: handleWebRTCStats received stats:', JSON.stringify(stats, null, 2));
    // Synthesize a metrics object from the incoming stats array so the analyzer can extract meaningful values
    const synthesized = synthesizeMetricsFromStats(stats);
    try { console.log('BACKGROUNDHOOK: synthesized metrics for analysis', synthesized); } catch (e) {}
    // Analyze connection quality
    const quality = qualityAnalyzer.analyze(synthesized);
    try { console.log('BACKGROUNDHOOK: quality analysis result', quality); } catch (e) {}
    // Log to database
    const entryId = await dbManager.logStats({
      timestamp: Date.now(),
      tabId,
      stats,
      quality
    });
    try { console.log('BACKGROUNDHOOK: logged stats entry id', entryId); } catch (e) {}
    // Check if quality is poor and notify
    if (quality.status === 'poor' && config.enableNotifications) {
      showQualityNotification(quality);
    }
    // Update badge
    updateBadge(quality.status);
  } catch (error) {
    console.error('BACKGROUNDHOOK: Error handling WebRTC stats:', error);
  }
}

// Create a flat metrics object from the collected stats array
function synthesizeMetricsFromStats(statsArray) {
  try {
    if (!Array.isArray(statsArray) || statsArray.length === 0) return {};

    // Prefer the first connection payload
    const first = statsArray[0];
    const reports = first.stats || [];

    const out = {};

    // Find candidate-pair for RTT and bitrate
    for (const r of reports) {
      try {
        if (r.type === 'candidate-pair' && (r.currentRoundTripTime !== undefined || r.totalRoundTripTime !== undefined)) {
          if (r.currentRoundTripTime !== undefined) out.currentRoundTripTime = r.currentRoundTripTime; // seconds
          if (r.totalRoundTripTime !== undefined) out.totalRoundTripTime = r.totalRoundTripTime;
          if (r.availableOutgoingBitrate !== undefined) out.availableOutgoingBitrate = r.availableOutgoingBitrate;
          if (r.availableIncomingBitrate !== undefined) out.availableIncomingBitrate = r.availableIncomingBitrate;
          if (r.bytesSent !== undefined) out.bytesSent = r.bytesSent;
          if (r.bytesReceived !== undefined) out.bytesReceived = r.bytesReceived;
        }

        if (r.type === 'inbound-rtp') {
          if (r.packetsReceived !== undefined) out.packetsReceived = r.packetsReceived;
          if (r.packetsLost !== undefined) out.packetsLost = r.packetsLost;
          if (r.jitter !== undefined) out.jitter = r.jitter;
          if (r.bytesReceived !== undefined) out.bytesReceived = out.bytesReceived || r.bytesReceived;
        }

        if (r.type === 'outbound-rtp') {
          if (r.packetsSent !== undefined) out.packetsSent = r.packetsSent;
          if (r.bytesSent !== undefined) out.bytesSent = out.bytesSent || r.bytesSent;
        }
      } catch (e) {}
    }

    // Convert currentRoundTripTime to ms for compatibility if present
    if (out.currentRoundTripTime !== undefined) {
      out.rtt = out.currentRoundTripTime * 1000;
    }

    return out;
  } catch (e) {
    return {};
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

// Persistent auto-capture state: map tabId -> intervalId
const _autoCaptureState = new Map();
const AUTO_CAPTURE_INTERVAL_MS = 3000; // poll every 3s

// Toggle auto-capture for a tab (attach debugger and poll worker targets)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;
  if (message.type === 'toggle-auto-capture') {
    const tabId = message.tabId;
    if (!tabId) { sendResponse({ success: false, error: 'no_tab' }); return; }

    if (_autoCaptureState.has(tabId)) {
      // disable
      const intervalId = _autoCaptureState.get(tabId);
      clearInterval(intervalId);
      _autoCaptureState.delete(tabId);
      // detach debugger if attached
      try { chrome.debugger.detach({ tabId }, () => {}); } catch (e) {}
      sendResponse({ success: true, enabled: false });
      return;
    }

    // enable
    const intervalId = setInterval(async () => {
      try {
        await attemptWorkerCollection(tabId);
      } catch (e) {
        console.debug('BACKGROUNDHOOK: auto-capture iteration failed for', tabId, e && e.message);
      }
    }, AUTO_CAPTURE_INTERVAL_MS);

    _autoCaptureState.set(tabId, intervalId);
    sendResponse({ success: true, enabled: true });
    return;
  }
});

// Attempt to collect stats by enumerating worker targets and evaluating getStats
async function attemptWorkerCollection(tabId) {
  const tabTarget = { tabId };
  try {
    await new Promise((res, rej) => chrome.debugger.attach(tabTarget, '1.3', () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));
  } catch (e) {
    // cannot attach (maybe DevTools attached) — bail silently
    try { console.debug('BACKGROUNDHOOK: auto-capture attach failed for tab', tabId, e && e.message); } catch (ex) {}
    return;
  }

  try {
    const targetsResp = await new Promise((res, rej) => chrome.debugger.sendCommand(tabTarget, 'Target.getTargets', {}, (r) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r)));
    const targets = (targetsResp && targetsResp.targetInfos) || [];
    for (const t of targets) {
      if (!t || !t.type) continue;
      if (t.type === 'worker' || t.type === 'service_worker' || t.type === 'shared_worker') {
        const wtarget = { targetId: t.targetId };
        try {
          await new Promise((res, rej) => chrome.debugger.attach(wtarget, '1.3', () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));
        } catch (e) {
          try { console.debug('BACKGROUNDHOOK: auto-capture attach to worker failed', t.targetId, e && e.message); } catch (er) {}
          continue;
        }

        try {
          await new Promise((res, rej) => chrome.debugger.sendCommand(wtarget, 'Runtime.enable', {}, () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()));
          const expression = `(${function(){
            function safeCloneEntry(e){ try { return Object.assign({}, e); } catch (ex) { return { id: e && e.id, type: e && e.type }; } }
            function tryGet(obj){ return new Promise((resolve) => {
              if(!obj||typeof obj.getStats!=='function') return resolve(null);
              try {
                const p = obj.getStats();
                Promise.resolve(p).then(function(r){
                  const arr = [];
                  try {
                    if (r && typeof r.forEach === 'function') { r.forEach(function(item){ try { arr.push(safeCloneEntry(item)); } catch(e){} }); }
                    else if (Array.isArray(r)) { for (var i=0;i<r.length;i++){ try { arr.push(safeCloneEntry(r[i])); } catch(e){} } }
                  } catch(e){}
                  resolve({ success:true, entries: arr });
                }).catch(function(err){ resolve({ success:false, error: (err && err.message) || '' }); });
              } catch (ex) { resolve({ success:false, error: (ex && ex.message) || '' }); }
            }); }
            var found = [];
            try {
              var names = Object.getOwnPropertyNames(self||this||globalThis||{});
              var promises = names.map(function(n){
                try {
                  var v = (self||this)[n];
                  if (v && typeof v.getStats === 'function') {
                    return tryGet(v).then(function(res){ if (res) found.push({ name: n, result: res }); }).catch(function(){});
                  }
                } catch(e) { }
                return Promise.resolve();
              });
              return Promise.all(promises).then(function(){ return found; });
            } catch (e) { return found; }
          }})();`;

          const evalParams = { expression, awaitPromise: true, returnByValue: true };
          const evalResult = await new Promise((res, rej) => chrome.debugger.sendCommand(wtarget, 'Runtime.evaluate', evalParams, (r) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r)));
          const value = evalResult && evalResult.result && evalResult.result.value ? evalResult.result.value : null;
          if (Array.isArray(value) && value.length > 0) {
            const connections = [];
            for (const item of value) {
              try {
                if (item && item.result && item.result.success && Array.isArray(item.result.entries)) {
                  connections.push({ connectionId: `${t.targetId}:${item.name}`, stats: item.result.entries });
                }
              } catch (e) {}
            }

            if (connections.length > 0) {
              try { await handleWebRTCStats(connections, tabId); } catch (e) {}
            }
          }
        } catch (e) {
          try { console.debug('BACKGROUNDHOOK: auto-capture worker eval failed', t.targetId, e && e.message); } catch (er) {}
        } finally {
          try { chrome.debugger.detach(wtarget, () => {}); } catch (e) {}
        }
      }
    }
  } catch (e) {
    try { console.debug('BACKGROUNDHOOK: auto-capture Target.getTargets failed', e && e.message); } catch (er) {}
  } finally {
    try { chrome.debugger.detach(tabTarget, () => {}); } catch (e) {}
  }
}

