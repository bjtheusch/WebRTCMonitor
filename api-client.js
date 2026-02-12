// API Client for communication with backend server

export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.timeout = 10000;
  }

  async fetchConfiguration() {
    if (!this.baseUrl) {
      throw new Error('API endpoint not configured');
    }

    try {
      const response = await this.fetch('/api/config', {
        method: 'GET'
      });

      return response;
    } catch (error) {
      console.error('Failed to fetch configuration:', error);
      throw error;
    }
  }

  async uploadData(data) {
    if (!this.baseUrl) {
      throw new Error('API endpoint not configured');
    }

    try {
      const response = await this.fetch('/api/stats', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      return {
        success: true,
        response
      };
    } catch (error) {
      console.error('Failed to upload data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    if (!this.baseUrl) {
      throw new Error('API endpoint not configured');
    }

    try {
      const response = await this.fetch('/api/health', {
        method: 'GET'
      });

      return {
        success: true,
        connected: true,
        response
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
