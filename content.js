// Content Script - Injected into pages to monitor WebRTC connections

(function() {
  'use strict';

  const connections = new Map();
  const statsInterval = 2000; // Collect stats every 2 seconds

  // Intercept RTCPeerConnection creation
  const OriginalRTCPeerConnection = window.RTCPeerConnection;
  
  window.RTCPeerConnection = function(...args) {
    const pc = new OriginalRTCPeerConnection(...args);
    const connectionId = generateId();
    
    console.log('WebRTC connection created:', connectionId);
    
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
        allStats.push({
          connectionId: id,
          stats: stats
        });
      } catch (error) {
        console.error(`Failed to collect stats for ${id}:`, error);
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
        await chrome.runtime.sendMessage({
          type: 'webrtc-stats',
          stats: allStats
        });
      } catch (error) {
        console.error('Failed to send stats to background:', error);
      }
    }
  }
  
  // Start periodic stats collection
  setInterval(sendStatsToBackground, statsInterval);
  
  console.log('WebRTC Monitor content script loaded');
})();
