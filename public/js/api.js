export class ApiService {
  static async getModels() {
    try {
      const response = await fetch("/api/novel/models");
      const data = await response.json();
      return data.models;
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  }

  static async sendMessage(message, history, settings, narrative, model) {
    const endpoint =
      history.length === 0 ? "/api/novel/generate" : "/api/novel/chat";
    try {
      const requestBody =
        history.length === 0
          ? {
            context: message, // Use message as context for generation
            model,
            narrative,
            settings,
          }
          : {
            message,
            history,
            model,
            settings,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  static async getSettings() {
    try {
      const response = await fetch("/api/novel/settings");
      const data = await response.json();
      return data.settings;
    } catch (error) {
      console.error("Error fetching settings:", error);
      throw error;
    }
  }

  static async getNarrative() {
    try {
      const response = await fetch("/api/novel/narrative");
      const data = await response.json();
      return data.narrative;
    } catch (error) {
      console.error("Error fetching narrative:", error);
      throw error;
    }
  }
}
