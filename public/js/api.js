export class ApiService {
  static async getModels() {
    try {
      const response = await fetch('/api/novel/v1/models');
      const data = await response.json();
      return data.models;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  static async sendMessageStream(message, storyId, settings, narrative, model, onChunk) {
    const endpoint = !storyId ? '/api/novel/v2/generate' : '/api/novel/v2/chat';

    const requestBody = !storyId
      ? {
          context: message,
          model,
          narrative,
          settings,
        }
      : {
          message,
          story_id: storyId,
          model,
          settings,
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Handle rate limiting and other errors
      if (response.status === 429) {
        const errorData = await response.json();
        throw new Error(errorData.content || 'Rate limit exceeded');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              return;
            }

            if (data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'chunk' && parsed.content) {
                  onChunk(parsed);
                } else if (parsed.type === 'status') {
                  onChunk(parsed);
                } else if (parsed.type === 'chapter_complete') {
                  onChunk(parsed);
                } else if (parsed.type === 'complete') {
                  onChunk(parsed);
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.message || 'Server error');
                }
              } catch (parseError) {
                // If not JSON, treat as plain text chunk
                onChunk({ type: 'chunk', content: data, streaming: true });
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  static async getSettings() {
    try {
      const response = await fetch('/api/novel/v1/settings');
      const data = await response.json();
      return data.settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  static async getNarrative() {
    try {
      const response = await fetch('/api/novel/v1/narrative');
      const data = await response.json();
      return data.narrative;
    } catch (error) {
      console.error('Error fetching narrative:', error);
      throw error;
    }
  }
}
