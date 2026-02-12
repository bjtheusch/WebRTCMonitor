// Database Manager using SQL.js for SQLite operations
// Note: SQL.js will be loaded dynamically

export class DatabaseManager {
  constructor() {
    this.db = null;
    this.SQL = null;
  }

  async initialize() {
    try {
      // Check if we have a stored database
      const stored = await chrome.storage.local.get('database');
      
      // Initialize SQL.js with WASM
      // For now, we'll use chrome.storage.local as a simple key-value store
      // In production, you would load SQL.js library
      
      // Create tables structure using chrome.storage
      const tables = await chrome.storage.local.get('tables');
      if (!tables.tables) {
        await this.createTables();
      }
      
      console.log('Database initialized');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    // Since we're using chrome.storage.local, we'll structure data as objects
    await chrome.storage.local.set({
      tables: {
        stats: [],
        sessions: [],
        uploads: []
      }
    });
  }

  async logStats(data) {
    try {
      const tables = await chrome.storage.local.get('tables');
      const stats = tables.tables?.stats || [];
      
      const entry = {
        id: Date.now() + Math.random(),
        timestamp: data.timestamp,
        tabId: data.tabId,
        stats: JSON.stringify(data.stats),
        quality: JSON.stringify(data.quality),
        uploaded: false
      };
      
      stats.push(entry);
      
      // Keep only last 1000 entries
      if (stats.length > 1000) {
        stats.splice(0, stats.length - 1000);
      }
      
      await chrome.storage.local.set({
        tables: {
          ...tables.tables,
          stats
        }
      });
      
      return entry.id;
    } catch (error) {
      console.error('Failed to log stats:', error);
      throw error;
    }
  }

  async getRecentStats(limit = 10) {
    try {
      const tables = await chrome.storage.local.get('tables');
      const stats = tables.tables?.stats || [];
      
      return stats
        .slice(-limit)
        .reverse()
        .map(entry => ({
          ...entry,
          stats: JSON.parse(entry.stats),
          quality: JSON.parse(entry.quality)
        }));
    } catch (error) {
      console.error('Failed to get recent stats:', error);
      return [];
    }
  }

  async getPendingData() {
    try {
      const tables = await chrome.storage.local.get('tables');
      const stats = tables.tables?.stats || [];
      
      return stats
        .filter(entry => !entry.uploaded)
        .map(entry => ({
          ...entry,
          stats: JSON.parse(entry.stats),
          quality: JSON.parse(entry.quality)
        }));
    } catch (error) {
      console.error('Failed to get pending data:', error);
      return [];
    }
  }

  async markDataUploaded(ids) {
    try {
      const tables = await chrome.storage.local.get('tables');
      const stats = tables.tables?.stats || [];
      
      stats.forEach(entry => {
        if (ids.includes(entry.id)) {
          entry.uploaded = true;
          entry.uploadedAt = Date.now();
        }
      });
      
      await chrome.storage.local.set({
        tables: {
          ...tables.tables,
          stats
        }
      });
    } catch (error) {
      console.error('Failed to mark data as uploaded:', error);
      throw error;
    }
  }

  async clearOldData(olderThan) {
    try {
      const tables = await chrome.storage.local.get('tables');
      const stats = tables.tables?.stats || [];
      
      const filtered = stats.filter(entry => entry.timestamp > olderThan);
      
      await chrome.storage.local.set({
        tables: {
          ...tables.tables,
          stats: filtered
        }
      });
      
      return stats.length - filtered.length;
    } catch (error) {
      console.error('Failed to clear old data:', error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const tables = await chrome.storage.local.get('tables');
      const stats = tables.tables?.stats || [];
      
      return {
        total: stats.length,
        uploaded: stats.filter(s => s.uploaded).length,
        pending: stats.filter(s => !s.uploaded).length,
        oldestEntry: stats.length > 0 ? stats[0].timestamp : null,
        newestEntry: stats.length > 0 ? stats[stats.length - 1].timestamp : null
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return null;
    }
  }
}
