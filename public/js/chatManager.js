import { ApiService } from "./api.js";

export class ChatManager {
  constructor(modelManager) {
    this.modelManager = modelManager;
    this.chatMessages = document.getElementById("chatMessages");
    this.userInput = document.getElementById("userInput");
    this.sendButton = document.getElementById("sendButton");
    this.chatHistory = [];
    this.setupEventListeners();
    this.addWelcomeMessage();
  }

  setupEventListeners() {
    this.sendButton.addEventListener("click", () => this.handleSend());
    this.userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
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
    let cleanedResponse = input.replace(/\n\*\*\*\n/g, "\n<hr>\n");

    // Ensure paragraphs have spacing and remove unnecessary empty or single-dot lines
    cleanedResponse = cleanedResponse
      .split(/\n+/) // Split by newlines
      .map((p) => p.trim()) // Trim extra spaces
      .filter((p) => p && p !== ".") // Remove empty and single-dot paragraphs
      .join("\n\n"); // Ensure spacing between paragraphs

    // Convert Markdown to HTML and add spacing for readability
    let htmlContent = marked.parse(cleanedResponse);

    // Wrap paragraphs and block elements with proper margin spacing for clarity
    return DOMPurify.sanitize(
      htmlContent.replace(
        /<(p|h\d|hr|ul|ol|blockquote)/g,
        '<$1 style="margin-bottom: 16px;"'
      )
    );
  }

  async handleSend() {
    const message = this.userInput.value.trim();
    if (!message) return;

    // Add user message to chat
    this.addMessage(message, "user");
    this.userInput.value = "";

    try {
      this.loading(true);
      const settings = this.modelManager.getSettingValues();
      const narrative = this.modelManager.getNarrativeValues();
      const response = await ApiService.sendMessage(
        message,
        this.chatHistory,
        settings,
        narrative,
        this.modelManager.getCurrentModel()
      );

      // Add AI response to chat
      const sanitizedResponse = this.formatBotResponse(response.content);
      this.addMessage(sanitizedResponse || response.response, "assistant");

      // Update chat history
      this.chatHistory.push(
        { role: "user", content: message },
        { role: "assistant", content: response.content || response.response }
      );

      // Hide narrative
      this.modelManager.hideNarrativeContainer();
      this.userInput.placeholder = "Type your message here to continue the novel...";
    } catch (error) {
      console.error("Error:", error);
      this.addMessage(
        "Sorry, there was an error processing your request. Please try again.",
        "assistant"
      );
    } finally {
      this.loading(false);
    }
  }

  addMessage(content, role) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = content;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  resetChat() {
    this.chatMessages.innerHTML = "";
    this.chatHistory = [];
    this.addWelcomeMessage();
  }

  addWelcomeMessage() {
    const welcomeMessage =
      "Hello! I'm your AI novel writing assistant. Provide me with context to write a novel. Make it as detailed as possible. Once a story is generated, you can ask me to continue it or rewrite it";
    this.addMessage(
      welcomeMessage,
      "assistant"
    );
  }

  loading(load) {
    if (load) {
      this.sendButton.disabled = true;
      this.sendButton.innerHTML = "Loading...";
    } else {
      this.sendButton.disabled = false;
      this.sendButton.innerHTML = "Send";
    }
  }
}
