// Connection Quality Analyzer

export class ConnectionQualityAnalyzer {
  constructor(thresholds = {}) {
    this.thresholds = {
      rtt: thresholds.rtt || 200,        // Round-trip time in ms
      packetLoss: thresholds.packetLoss || 5,  // Packet loss percentage
      jitter: thresholds.jitter || 30    // Jitter in ms
    };
  }

  analyze(stats) {
    if (!stats || typeof stats !== 'object') {
      return {
        status: 'unknown',
        message: 'No stats available',
        metrics: {}
      };
    }

    const metrics = this.extractMetrics(stats);
    const issues = this.detectIssues(metrics);
    const status = this.determineStatus(issues);

    return {
      status,
      message: this.generateMessage(issues),
      metrics,
      issues
    };
  }

  extractMetrics(stats) {
    const metrics = {
      rtt: null,
      packetLoss: null,
      jitter: null,
      bandwidth: null,
      framesDropped: null,
      timestamp: Date.now()
    };

    // Extract RTT (Round Trip Time)
    if (stats.rtt !== undefined) {
      metrics.rtt = stats.rtt;
    } else if (stats.currentRoundTripTime !== undefined) {
      metrics.rtt = stats.currentRoundTripTime * 1000; // Convert to ms
    }

    // Extract packet loss
    if (stats.packetsLost !== undefined && stats.packetsSent !== undefined) {
      const total = stats.packetsSent + stats.packetsLost;
      metrics.packetLoss = total > 0 ? (stats.packetsLost / total) * 100 : 0;
    } else if (stats.packetLossPercentage !== undefined) {
      metrics.packetLoss = stats.packetLossPercentage;
    }

    // Extract jitter
    if (stats.jitter !== undefined) {
      metrics.jitter = stats.jitter * 1000; // Convert to ms
    }

    // Extract bandwidth
    if (stats.availableOutgoingBitrate !== undefined) {
      metrics.bandwidth = stats.availableOutgoingBitrate;
    }

    // Extract frames dropped
    if (stats.framesDropped !== undefined) {
      metrics.framesDropped = stats.framesDropped;
    }

    return metrics;
  }

  detectIssues(metrics) {
    const issues = [];

    // Check RTT
    if (metrics.rtt !== null) {
      if (metrics.rtt > this.thresholds.rtt * 2) {
        issues.push({
          severity: 'high',
          metric: 'rtt',
          value: metrics.rtt,
          threshold: this.thresholds.rtt,
          message: `High latency detected (${Math.round(metrics.rtt)}ms)`
        });
      } else if (metrics.rtt > this.thresholds.rtt) {
        issues.push({
          severity: 'medium',
          metric: 'rtt',
          value: metrics.rtt,
          threshold: this.thresholds.rtt,
          message: `Elevated latency (${Math.round(metrics.rtt)}ms)`
        });
      }
    }

    // Check packet loss
    if (metrics.packetLoss !== null) {
      if (metrics.packetLoss > this.thresholds.packetLoss * 2) {
        issues.push({
          severity: 'high',
          metric: 'packetLoss',
          value: metrics.packetLoss,
          threshold: this.thresholds.packetLoss,
          message: `Severe packet loss (${metrics.packetLoss.toFixed(1)}%)`
        });
      } else if (metrics.packetLoss > this.thresholds.packetLoss) {
        issues.push({
          severity: 'medium',
          metric: 'packetLoss',
          value: metrics.packetLoss,
          threshold: this.thresholds.packetLoss,
          message: `Packet loss detected (${metrics.packetLoss.toFixed(1)}%)`
        });
      }
    }

    // Check jitter
    if (metrics.jitter !== null) {
      if (metrics.jitter > this.thresholds.jitter * 2) {
        issues.push({
          severity: 'high',
          metric: 'jitter',
          value: metrics.jitter,
          threshold: this.thresholds.jitter,
          message: `High jitter detected (${Math.round(metrics.jitter)}ms)`
        });
      } else if (metrics.jitter > this.thresholds.jitter) {
        issues.push({
          severity: 'medium',
          metric: 'jitter',
          value: metrics.jitter,
          threshold: this.thresholds.jitter,
          message: `Elevated jitter (${Math.round(metrics.jitter)}ms)`
        });
      }
    }

    return issues;
  }

  determineStatus(issues) {
    if (issues.length === 0) {
      return 'good';
    }

    const hasHighSeverity = issues.some(issue => issue.severity === 'high');
    if (hasHighSeverity) {
      return 'poor';
    }

    return 'fair';
  }

  generateMessage(issues) {
    if (issues.length === 0) {
      return 'Connection quality is good';
    }

    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      return highIssues.map(i => i.message).join(', ');
    }

    const mediumIssues = issues.filter(i => i.severity === 'medium');
    return mediumIssues.map(i => i.message).join(', ');
  }
}
