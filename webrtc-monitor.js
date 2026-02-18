// WebRTC Monitor - Tracks WebRTC connections and stats

export class WebRTCMonitor {
  constructor() {
    this.connections = new Map();
    this.statsInterval = 1000; // Poll every second
    this.debuggerAttached = false;
  }

  async attachToTab(tabId) {
    try {
      // Attach Chrome debugger to access WebRTC internals
      console.log('WEBRTCMONITOR: attachToTab starting for', tabId);
      await chrome.debugger.attach({ tabId }, '1.3');
      this.debuggerAttached = true;

      // Enable necessary domains
      try {
        const res = await chrome.debugger.sendCommand({ tabId }, 'WebRTC.enable');
        console.log('WEBRTCMONITOR: WebRTC.enable returned', res, 'for tab', tabId);
      } catch (cmdErr) {
        console.error('WEBRTCMONITOR: WebRTC.enable failed for tab', tabId, cmdErr);
        // continue; the attach succeeded but enabling WebRTC domain failed
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
      // Note: Chrome's debugger API doesn't directly expose WebRTC stats
      // This is a simplified implementation
      // In practice, you'd need to inject a content script to access RTCPeerConnection
      console.log('WEBRTCMONITOR: getStats called for tab', tabId, 'debuggerAttached=', this.debuggerAttached);

      const stats = {
        timestamp: Date.now(),
        tabId,
        connections: []
      };

      return stats;
    } catch (error) {
      console.error('WEBRTCMONITOR: Failed to get WebRTC stats for tab', tabId, error);
      return null;
    }
  }

  trackConnection(connectionId, peerConnection) {
    this.connections.set(connectionId, {
      id: connectionId,
      peerConnection,
      startTime: Date.now(),
      lastStats: null
    });
  }

  removeConnection(connectionId) {
    this.connections.delete(connectionId);
  }

  async getAllConnectionStats() {
    const allStats = [];

    for (const [id, connection] of this.connections) {
      try {
        const stats = await this.getConnectionStats(connection.peerConnection);
        allStats.push({
          connectionId: id,
          stats
        });
      } catch (error) {
        console.error(`Failed to get stats for connection ${id}:`, error);
      }
    }

    return allStats;
  }

  async getConnectionStats(peerConnection) {
    // This would be called from a content script
    // Placeholder implementation
    return {
      timestamp: Date.now(),
      candidates: [],
      streams: []
    };
  }
}
