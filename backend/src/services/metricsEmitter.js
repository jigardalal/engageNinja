/**
 * Metrics Emitter Service
 * Manages Server-Sent Events connections for real-time campaign metrics
 *
 * Architecture:
 * - Tracks active SSE connections per campaign
 * - Broadcasts metric updates when webhooks arrive
 * - Handles client connect/disconnect gracefully
 * - Implements connection timeout (30 minutes inactivity)
 */

const EventEmitter = require('events');

class MetricsEmitter extends EventEmitter {
  constructor() {
    super();
    // Map of campaign_id -> Set of response objects
    this.activeConnections = new Map();
    // Map of campaign_id -> last activity timestamp
    this.lastActivity = new Map();
    // 30 minute timeout (1800000ms)
    this.IDLE_TIMEOUT = 30 * 60 * 1000;

    // Cleanup old connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 5 * 60 * 1000);
  }

  /**
   * Register a new SSE client connection for a campaign
   * @param {string} campaignId - The campaign ID
   * @param {Object} res - Express response object
   */
  subscribe(campaignId, res) {
    if (!this.activeConnections.has(campaignId)) {
      this.activeConnections.set(campaignId, new Set());
    }

    this.activeConnections.get(campaignId).add(res);
    this.lastActivity.set(campaignId, Date.now());

    console.log(`[SSE] New connection for campaign ${campaignId}. Total: ${this.activeConnections.get(campaignId).size}`);

    // Handle client disconnect
    res.on('close', () => {
      this.unsubscribe(campaignId, res);
    });

    res.on('error', (err) => {
      console.error(`[SSE] Error on campaign ${campaignId}:`, err.message);
      this.unsubscribe(campaignId, res);
    });
  }

  /**
   * Unregister a client connection
   * @param {string} campaignId - The campaign ID
   * @param {Object} res - Express response object
   */
  unsubscribe(campaignId, res) {
    const connections = this.activeConnections.get(campaignId);
    if (connections) {
      connections.delete(res);
      console.log(`[SSE] Client disconnected from campaign ${campaignId}. Remaining: ${connections.size}`);

      // Clean up empty entries
      if (connections.size === 0) {
        this.activeConnections.delete(campaignId);
        this.lastActivity.delete(campaignId);
      }
    }
  }

  /**
   * Broadcast metrics update to all connected clients for a campaign
   * @param {string} campaignId - The campaign ID
   * @param {Object} metrics - The metrics data to broadcast
   */
  broadcast(campaignId, metrics) {
    const connections = this.activeConnections.get(campaignId);

    if (!connections || connections.size === 0) {
      return; // No active connections for this campaign
    }

    this.lastActivity.set(campaignId, Date.now());
    const data = JSON.stringify(metrics);
    let disconnected = 0;

    for (const res of connections) {
      try {
        // SSE format: data: {json}\n\n
        res.write(`data: ${data}\n\n`);
      } catch (err) {
        console.error(`[SSE] Failed to write to client:`, err.message);
        disconnected++;
        connections.delete(res);
      }
    }

    if (disconnected > 0) {
      console.log(`[SSE] Removed ${disconnected} dead connections from campaign ${campaignId}`);
    }
  }

  /**
   * Clean up idle connections that haven't received updates
   * Helps prevent memory leaks from stale connections
   */
  cleanupIdleConnections() {
    const now = Date.now();
    let cleaned = 0;

    for (const [campaignId, lastTime] of this.lastActivity.entries()) {
      if (now - lastTime > this.IDLE_TIMEOUT) {
        const connections = this.activeConnections.get(campaignId);
        if (connections) {
          console.log(`[SSE] Cleaning up ${connections.size} idle connections for campaign ${campaignId}`);

          // Close all connections for this campaign
          for (const res of connections) {
            try {
              res.end();
            } catch (err) {
              // Already closed, ignore
            }
          }

          this.activeConnections.delete(campaignId);
          this.lastActivity.delete(campaignId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`[SSE] Cleaned up ${cleaned} idle campaigns`);
    }
  }

  /**
   * Get connection count for a campaign (for monitoring)
   * @param {string} campaignId - The campaign ID
   * @returns {number} Number of active connections
   */
  getConnectionCount(campaignId) {
    const connections = this.activeConnections.get(campaignId);
    return connections ? connections.size : 0;
  }

  /**
   * Get total active connections across all campaigns (for monitoring)
   * @returns {number} Total number of active connections
   */
  getTotalConnections() {
    let total = 0;
    for (const connections of this.activeConnections.values()) {
      total += connections.size;
    }
    return total;
  }

  /**
   * Shutdown the emitter (for graceful shutdown)
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const connections of this.activeConnections.values()) {
      for (const res of connections) {
        try {
          res.end();
        } catch (err) {
          // Already closed, ignore
        }
      }
    }

    this.activeConnections.clear();
    this.lastActivity.clear();
    console.log('[SSE] Metrics emitter shutdown complete');
  }
}

// Export singleton instance
module.exports = new MetricsEmitter();
