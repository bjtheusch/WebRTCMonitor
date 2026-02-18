// Content Script - Injected into pages to monitor WebRTC connections

(function() {
  'use strict';

  const connections = new Map();
  const statsInterval = 2000; // Collect stats every 2 seconds

  // Diagnostic: log whether content script sees OriginalRTCPeerConnection
  try {
    console.log('CONTENTHOOK: content script loaded. window.RTCPeerConnection=', window.RTCPeerConnection, 'typeof=', typeof window.RTCPeerConnection);
  } catch (e) {
    console.error('CONTENTHOOK: error reading window.RTCPeerConnection', e);
  }

  // Request background script to inject a page-context hook (CSP-safe via chrome.scripting)
  try {
    chrome.runtime.sendMessage({ type: 'inject-page-hook' }, (resp) => {
      if (chrome.runtime.lastError) {
        console.debug('CONTENTHOOK: inject-page-hook lastError', chrome.runtime.lastError.message);
        return;
      }
      console.log('CONTENTHOOK: inject-page-hook response', resp);
    });
  } catch (e) {
    console.error('CONTENTHOOK: failed to request page hook injection', e);
  }

  // Listen for messages posted from the page hook (main world) and forward to background
  try {
    window.addEventListener('message', (event) => {
      try {
        if (!event || !event.data) return;
        const d = event.data;
        console.log('CONTENTHOOK: window.message received', d);
        if (d && d.source === 'webrtc-monitor-pagehook' && d.type === 'getStatsResult') {
          try {
            const syntheticId = d.pcId || ('pagehook-' + Date.now() + '-' + Math.random().toString(36).substr(2,6));
            const payload = [{ connectionId: syntheticId, stats: d.stats }];
            console.log('CONTENTHOOK: forwarding pagehook stats to background', payload);
            // Enqueue for reliable forwarding; handle transient extension restarts
            try {
              enqueuePagehookStats({ payload, syntheticId });
            } catch (e) {
              console.error('CONTENTHOOK: enqueue failed', e);
            }
          } catch (e) {
            console.error('CONTENTHOOK: failed to process pagehook stats', e);
          }
        } else if (d && d.source === 'webrtc-monitor-pagehook' && d.type === 'test-injection') {
          console.log('CONTENTHOOK: received test-injection message from page hook', d);
        }
      } catch (e) {}
    }, false);
  } catch (e) {
    console.error('CONTENTHOOK: failed to attach window.message listener', e);
  }

  // Queue for pagehook stats forwarding to handle extension/service-worker restarts
  const _pendingPagehookQueue = [];
  let _flushScheduled = false;

  function enqueuePagehookStats(item) {
    _pendingPagehookQueue.push(item);
    scheduleFlush();
  }

  function scheduleFlush(delay = 250) {
    if (_flushScheduled) return;
    _flushScheduled = true;
    setTimeout(() => {
      _flushScheduled = false;
      flushPendingPagehookStats();
    }, delay);
  }

  function flushPendingPagehookStats() {
    if (_pendingPagehookQueue.length === 0) return;

    // If chrome runtime isn't available, retry later
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      console.debug('CONTENTHOOK: chrome.runtime not available during flush, retrying');
      scheduleFlush(1000);
      return;
    }

    const item = _pendingPagehookQueue[0];
    try {
      chrome.runtime.sendMessage({ type: 'webrtc-stats', stats: item.payload }, (resp) => {
        try {
          if (chrome.runtime.lastError) {
            console.debug('CONTENTHOOK: flush sendMessage lastError', chrome.runtime.lastError.message);
            // Retry later
            scheduleFlush(1000);
            return;
          }

          console.log('CONTENTHOOK: flush forwarded pagehook stats ack', item.syntheticId, 'response:', resp);
          // Remove on success and continue flushing
          _pendingPagehookQueue.shift();
          if (_pendingPagehookQueue.length > 0) {
            // Continue immediately
            scheduleFlush(0);
          }
        } catch (e) {
          console.error('CONTENTHOOK: flush callback error', e);
          scheduleFlush(1000);
        }
      });
    } catch (e) {
      // Likely 'Extension context invalidated' or similar
      console.debug('CONTENTHOOK: exception during flush sendMessage', e && e.message);
      scheduleFlush(1000);
    }
  }

  // Intercept RTCPeerConnection creation (content-script scope)
  const OriginalRTCPeerConnection = window.RTCPeerConnection;
  try {
    console.log('CONTENTHOOK: After injection, content script sees OriginalRTCPeerConnection=', OriginalRTCPeerConnection, 'typeof=', typeof OriginalRTCPeerConnection);
  } catch (e) {}

  window.RTCPeerConnection = function(...args) {
    const pc = new OriginalRTCPeerConnection(...args);
    const connectionId = generateId();
    console.log('CONTENTHOOK: WebRTC connection created:', connectionId, args);
    connections.set(connectionId, {
      id: connectionId,
      pc: pc,
      createdAt: Date.now(),
      statsHistory: []
    });
    
    // Monitor connection state changes
    pc.addEventListener('connectionstatechange', () => {
      console.log(`Connection ${connectionId} state:`, pc.connectionState);
      
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        connections.delete(connectionId);
      }
    });
    
    pc.addEventListener('iceconnectionstatechange', () => {
      console.log(`Connection ${connectionId} ICE state:`, pc.iceConnectionState);
    });
    
    return pc;
  };
  
  // Copy static properties
  window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
  
  // Generate unique ID
  function generateId() {
    return `webrtc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Collect stats from all active connections
  async function collectAllStats() {
    const allStats = [];
    
    for (const [id, connection] of connections) {
      try {
        const stats = await collectConnectionStats(connection);
        console.log('CONTENTHOOK: Collected stats for', id, stats);
        allStats.push({
          connectionId: id,
          stats: stats
        });
      } catch (error) {
        console.error(`CONTENTHOOK: Failed to collect stats for ${id}:`, error);
      }
    }
    
    return allStats;
  }
  
  // Collect stats from a single connection
  async function collectConnectionStats(connection) {
    const { pc } = connection;
    const statsReport = await pc.getStats();
    
    const stats = {
      timestamp: Date.now(),
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState,
      candidates: [],
      inbound: [],
      outbound: [],
      remote: []
    };
    
    statsReport.forEach(report => {
      if (report.type === 'candidate-pair' && report.nominated) {
        stats.candidates.push({
          type: report.type,
          state: report.state,
          priority: report.priority,
          nominated: report.nominated,
          writable: report.writable,
          bytesSent: report.bytesSent,
          bytesReceived: report.bytesReceived,
          totalRoundTripTime: report.totalRoundTripTime,
          currentRoundTripTime: report.currentRoundTripTime,
          availableOutgoingBitrate: report.availableOutgoingBitrate,
          availableIncomingBitrate: report.availableIncomingBitrate
        });
      }
      
      if (report.type === 'inbound-rtp') {
        stats.inbound.push({
          type: report.type,
          mediaType: report.mediaType,
          packetsReceived: report.packetsReceived,
          packetsLost: report.packetsLost,
          jitter: report.jitter,
          bytesReceived: report.bytesReceived,
          framesDecoded: report.framesDecoded,
          framesDropped: report.framesDropped,
          framesPerSecond: report.framesPerSecond
        });
      }
      
      if (report.type === 'outbound-rtp') {
        stats.outbound.push({
          type: report.type,
          mediaType: report.mediaType,
          packetsSent: report.packetsSent,
          bytesSent: report.bytesSent,
          framesEncoded: report.framesEncoded,
          framesPerSecond: report.framesPerSecond,
          totalPacketSendDelay: report.totalPacketSendDelay
        });
      }
      
      if (report.type === 'remote-inbound-rtp') {
        stats.remote.push({
          type: report.type,
          packetsLost: report.packetsLost,
          jitter: report.jitter,
          roundTripTime: report.roundTripTime
        });
      }
    });
    
    return stats;
  }
  
  // Send stats to background script
  async function sendStatsToBackground() {
    const allStats = await collectAllStats();
    
    if (allStats.length > 0) {
      try {
        console.log('CONTENTHOOK: Sending stats to background:', allStats);
        await chrome.runtime.sendMessage({
          type: 'webrtc-stats',
          stats: allStats
        });
      } catch (error) {
        console.error('CONTENTHOOK: Failed to send stats to background:', error);
      }
    } else {
      console.log('CONTENTHOOK: No active PeerConnections to send stats for.');
    }
  }
  
  // Start periodic stats collection
  setInterval(sendStatsToBackground, statsInterval);
  
  console.log('WebRTC Monitor content script loaded');

  // Listen for on-demand dump requests from the extension (popup/background)
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === 'dump-stats-now') {
        try {
          console.log('CONTENTHOOK: received dump-stats-now request, collecting stats now');
          sendStatsToBackground();
          // Also run a fallback scan to detect any unhooked PeerConnections
          try {
            fallbackScanForPeerConnections();
          } catch (e) {}
          try { sendResponse({ success: true }); } catch (e) {}
        } catch (e) {
          console.error('CONTENTHOOK: error during dump-stats-now', e);
          try { sendResponse({ success: false, error: e.message }); } catch (e) {}
        }
        return true;
      }
    });
  } catch (e) {
    console.error('CONTENTHOOK: failed to register onMessage listener', e);
  }

  // Fallback: scan window and same-origin frames for objects that expose getStats
  async function tryGetStats(obj, hint) {
    try {
      if (!obj || typeof obj.getStats !== 'function') return null;

      // Timeout wrapper so getStats can't hang forever
      const result = await Promise.race([
        obj.getStats(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getStats timeout')), 2000))
      ]);

      // Summarize result size if it's an RTCStatsReport-like object
      let summary = null;
      try {
        if (result && typeof result.forEach === 'function') {
          let count = 0;
          result.forEach(() => count++);
          summary = { type: 'RTCStatsReport', entries: count };
        } else if (Array.isArray(result)) {
          summary = { type: 'array', length: result.length };
        } else {
          summary = { type: typeof result };
        }
      } catch (e) {
        summary = { type: typeof result };
      }

      console.log('FALLBACK: getStats succeeded for', hint, summary);
      return summary;
    } catch (e) {
      console.error('FALLBACK: getStats error for', hint, e);
      return { error: e.message };
    }
  }

  function scanGlobalForGetStats(rootWindow) {
    const found = [];
    try {
      const props = Object.getOwnPropertyNames(rootWindow);
      for (const p of props) {
        try {
          const v = rootWindow[p];
          if (v && typeof v.getStats === 'function') {
            found.push({ name: p, obj: v });
          }
        } catch (e) {
          // ignore cross-origin or accessor errors
        }
      }
    } catch (e) {
      // ignore
    }
    return found;
  }

  async function fallbackScanForPeerConnections() {
    try {
      console.log('FALLBACK: starting scan for PeerConnection-like objects');

      // Scan current window
      const foundLocal = scanGlobalForGetStats(window);

      // Scan same-origin child frames
      const foundFrames = [];
      for (let i = 0; i < window.frames.length; i++) {
        try {
          const fw = window.frames[i];
          // try accessing frame's globals (may throw for cross-origin)
          const fFound = scanGlobalForGetStats(fw);
          for (const ff of fFound) {
            foundFrames.push({ frameIndex: i, name: ff.name, obj: ff.obj });
          }
        } catch (e) {
          // cross-origin frame, skip
        }
      }

      const candidates = [];
      for (const f of foundLocal) candidates.push({ hint: `window.${f.name}`, obj: f.obj });
      for (const f of foundFrames) candidates.push({ hint: `frame[${f.frameIndex}].${f.name}`, obj: f.obj });

      if (candidates.length === 0) {
        console.log('FALLBACK: no candidates exposing getStats found');
        return;
      }

      // Attempt getStats on each candidate (but do not modify state)
      for (const c of candidates) {
        await tryGetStats(c.obj, c.hint);
      }
    } catch (e) {
      console.error('FALLBACK: scan failed', e);
    }
  }

  // Run a one-off fallback scan shortly after load
  try { setTimeout(fallbackScanForPeerConnections, 500); } catch (e) {}
})();
