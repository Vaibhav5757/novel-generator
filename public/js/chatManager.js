import { ApiService } from './api.js';

export class ChatManager {
  constructor(modelManager) {
    this.modelManager = modelManager;
    this.chatMessages = document.getElementById('chatMessages');
    this.userInput = document.getElementById('userInput');
    this.sendButton = document.getElementById('sendButton');
    this.chatHistory = [];
    this.storyId = '';
    this.setupEventListeners();
    this.addWelcomeMessage();
  }

  setupEventListeners() {
    this.sendButton.addEventListener('click', () => this.handleSend());
    this.userInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
  }

  formatBotResponse(input) {
    marked.setOptions({
      breaks: true, // Converts newlines into <br> for better readability
    });

    // Replace `***` with a horizontal rule for better readability
    let cleanedResponse = input.replace(/\n\*\*\*\n/g, '\n<hr>\n');

    // Ensure paragraphs have spacing and remove unnecessary empty or single-dot lines
    cleanedResponse = cleanedResponse
      .split(/\n+/) // Split by newlines
      .map(p => p.trim()) // Trim extra spaces
      .filter(p => p && p !== '.') // Remove empty and single-dot paragraphs
      .join('\n\n'); // Ensure spacing between paragraphs

    // Convert Markdown to HTML and add spacing for readability
    let htmlContent = marked.parse(cleanedResponse);

    // Wrap paragraphs and block elements with proper margin spacing for clarity
    return DOMPurify.sanitize(htmlContent.replace(/<(p|h\d|hr|ul|ol|blockquote)/g, '<$1 style="margin-bottom: 16px;"'));
  }

  async handleSend() {
    let message = this.userInput.value.trim();
    if (!this.storyId && !message) return; // don't let user create story without any prompt

    if (!message) message = `Write next chapter`;

    // Add user message to chat
    this.addMessage(message, 'user');
    this.userInput.value = '';

    // Create placeholder for AI response that will be updated dynamically
    const assistantMessageDiv = this.createStreamingMessage('assistant');
    let accumulatedContent = '';

    try {
      this.loading(true);
      const settings = this.modelManager.getSettingValues();
      const narrative = this.modelManager.getNarrativeValues();

      // Call the SSE-enabled API service
      await ApiService.sendMessageStream(
        message,
        this.storyId,
        settings,
        narrative,
        this.modelManager.getCurrentModel(),
        data => {
          // Handle structured data from both endpoints
          switch (data.type) {
            case 'chunk':
              if (data.streaming) {
                // Real-time streaming chunk - append immediately
                accumulatedContent += data.content;
                const sanitizedContent = this.formatBotResponse(accumulatedContent);
                this.updateStreamingMessage(assistantMessageDiv, sanitizedContent);
              } else {
                // Complete chunk (fallback)
                accumulatedContent += data.content;
                const sanitizedContent = this.formatBotResponse(accumulatedContent);
                this.updateStreamingMessage(assistantMessageDiv, sanitizedContent);
              }
              break;

            case 'chapter_complete':
              // Silent completion - no status messages shown to user
              console.log('Generation completed');
              this.storyId = data.story_id;
              break;
            case 'complete':
              // Silent completion - no status messages shown to user
              console.log('Generation completed');
              break;

            case 'error':
              this.updateStreamingMessage(
                assistantMessageDiv,
                `<div class="error-message">Error: ${data.message}</div>`
              );
              break;
          }
        }
      );

      // Update chat history with final content
      this.chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: accumulatedContent });

      // Hide narrative
      this.modelManager.hideNarrativeContainer();
      this.userInput.placeholder = 'Type your message here to continue the novel...';
    } catch (error) {
      console.error('Error:', error);

      // Handle specific error types
      if (error.message.includes('Rate limit') || error.message.includes('Chat history is too long')) {
        this.updateStreamingMessage(assistantMessageDiv, `<div class="error-message">${error.message}</div>`);
      } else {
        this.updateStreamingMessage(
          assistantMessageDiv,
          'Sorry, there was an error processing your request. Please try again.'
        );
      }
    } finally {
      this.loading(false);
    }
  }

  // Create a message div that can be updated during streaming
  createStreamingMessage(role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = ''; // Start empty
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    return messageDiv;
  }

  // Update the content of a streaming message
  updateStreamingMessage(messageDiv, content) {
    messageDiv.innerHTML = content;
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = content;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  resetChat() {
    this.chatMessages.innerHTML = '';
    this.storyId = '';
    this.chatHistory = [];
    this.addWelcomeMessage();
  }

  addWelcomeMessage() {
    const welcomeMessage =
      "Hello! I'm your AI novel writing assistant. Provide me with context to write a novel. Make it as detailed as possible. Once a story is generated, you can ask me to continue it or rewrite it";
    this.addMessage(welcomeMessage, 'assistant');
  }

  loading(load) {
    if (load) {
      this.sendButton.disabled = true;
      this.sendButton.innerHTML = 'Loading...';
    } else {
      this.sendButton.disabled = false;
      this.sendButton.innerHTML = 'Send';
    }
  }
}
