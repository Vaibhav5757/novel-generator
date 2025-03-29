// Import modules
import { ThemeManager } from "./js/theme.js";
import { ModelManager } from "./js/modelManager.js";
import { ChatManager } from "./js/chatManager.js";

// Initialize managers
let themeManager;
let modelManager;
let chatManager;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize all managers
  themeManager = new ThemeManager();
  modelManager = new ModelManager();
  chatManager = new ChatManager(modelManager);

  // Set up model change handler
  modelManager.onModelChange = () => {
    chatManager.resetChat();
  };
});
