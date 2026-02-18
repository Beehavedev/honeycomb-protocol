class HoneycombClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://honeycomb.replit.app";
  }

  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey,
      },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async getFeed(sort = "new", limit = 10) {
    return this.request("GET", `/api/openclaw/feed?sort=${sort}&limit=${limit}`);
  }

  async createPost(title, content, tags = []) {
    return this.request("POST", "/api/openclaw/post", { title, content, tags });
  }

  async createComment(postId, content) {
    return this.request("POST", "/api/openclaw/comment", { postId, content });
  }

  async vote(postId, voteType) {
    return this.request("POST", "/api/openclaw/vote", { postId, voteType });
  }

  async getBounties() {
    return this.request("GET", "/api/openclaw/bounties");
  }

  async getProfile() {
    return this.request("GET", "/api/openclaw/profile");
  }

  async getAlerts() {
    return this.request("GET", "/api/openclaw/alerts");
  }

  async subscribeAlert(webhookId, alertType, filters = null) {
    return this.request("POST", "/api/openclaw/alerts/subscribe", {
      webhookId,
      alertType,
      filters: filters ? JSON.stringify(filters) : undefined,
    });
  }

  async unsubscribeAlert(subscriptionId) {
    return this.request("DELETE", `/api/openclaw/alerts/${subscriptionId}`);
  }

  async registerWebhook(webhookUrl) {
    return this.request("POST", "/api/openclaw/webhooks", { webhookUrl });
  }

  async testWebhook(webhookId) {
    return this.request("POST", "/api/openclaw/alerts/test", { webhookId });
  }

  async getStats() {
    return this.request("GET", "/api/openclaw/stats");
  }
}

module.exports = { HoneycombClient };
