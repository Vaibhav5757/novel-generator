import { ApiService } from "./api.js";

export class ModelManager {
  constructor() {
    this.modelSelect = document.getElementById("modelSelect");
    this.modelInfo = document.getElementById("modelInfo");
    this.modal = document.getElementById("modelChangeModal");
    this.confirmButton = document.getElementById("confirmModelChange");
    this.cancelButton = document.getElementById("cancelModelChange");
    this.settingsContainer = document.getElementById("modelSettingsContainer");
    this.narrativeContainer = document.getElementById(
      "modelNarrativeContainer"
    );
    this.toggleSettingsContainer = document.getElementById(
      "toggleSettingsContainer"
    );
    this.currentModels = [];
    this.currentNarrative = {};
    this.currentSettings = {};
    this.onModelChange = null;
    this.previousModelId = null;
    this.pendingModelChange = null;

    // Verify elements are found
    if (!this.modelSelect) {
      console.error("Model select element not found");
      return;
    }
    if (!this.modelInfo) {
      console.error("Model info element not found");
      return;
    }
    if (!this.modal) {
      console.error("Modal element not found");
      return;
    }
    if (!this.confirmButton) {
      console.error("Confirm button not found");
      return;
    }
    if (!this.cancelButton) {
      console.error("Cancel button not found");
      return;
    }

    this.init();
  }

  async init() {
    try {
      console.log("Initializing ModelManager");
      this.currentModels = await ApiService.getModels();
      this.availableSettings = await ApiService.getSettings();
      this.availableNarrative = await ApiService.getNarrative();
      console.log("Models loaded:", this.currentModels);
      this.populateModelSelect();
      this.populateSettingsContainer();
      this.createNarrativeDropdowns("modelNarrativeContainer");
      this.setupEventListeners();
      this.toggleSettings();
    } catch (error) {
      console.error("Error initializing ModelManager:", error);
      this.setFallbackOptions();
    }
  }

  populateModelSelect() {
    console.log("Populating model select");
    this.modelSelect.innerHTML = "";
    this.currentModels.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      this.modelSelect.appendChild(option);
    });
    this.previousModelId = this.currentModels[0].id;
    this.updateModelInfo(this.currentModels[0]);
  }

  updateSettings(key, value) {
    const numValue = key === "n" ? parseInt(value) : parseFloat(value);
    this.currentSettings[key] = numValue;
    console.log("Updated settings:", this.currentSettings);
  }

  populateSettingsContainer() {
    console.log("Populating settings container");
    const keys = Object.keys(this.availableSettings);

    keys.forEach((key) => {
      const { min, max, default: defaultValue } = this.availableSettings[key];

      this.currentSettings[key] = defaultValue;

      // Create elements
      const settingGroup = document.createElement("div");
      settingGroup.className = "setting-group";

      // Determine appropriate step value based on the parameter
      let step = 0.1;
      if (key === "top_p") step = 0.05;
      if (key === "n") step = 1;
      if (key === "max_tokens") step = 99;

      // Format display name
      const displayName = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      // Create label and value span
      const labelElement = document.createElement("label");
      labelElement.setAttribute("for", key);
      labelElement.textContent = `${displayName}: `;

      const valueSpan = document.createElement("span");
      valueSpan.id = `${key}-value`;
      valueSpan.textContent = defaultValue;
      labelElement.appendChild(valueSpan);

      // Create input
      const inputElement = document.createElement("input");
      inputElement.type = "range";
      inputElement.id = key;
      inputElement.min = min;
      inputElement.max = max;
      inputElement.step = step;
      inputElement.value = defaultValue;

      // Add event listener (properly bound to this context)
      inputElement.addEventListener("input", (e) => {
        document.getElementById(`${key}-value`).textContent = e.target.value;
        this.updateSettings(key, e.target.value);
      });

      // Append elements
      settingGroup.appendChild(labelElement);
      settingGroup.appendChild(inputElement);

      this.settingsContainer.appendChild(settingGroup);
    });
  }

  createNarrativeDropdowns(containerId) {
    const container = document.getElementById(containerId);

    // Clear existing content
    container.innerHTML = "";

    // Get all keys
    const keys = Object.keys(this.availableNarrative);
    keys.forEach(
      (key) => (this.currentNarrative[key] = this.availableNarrative[key][0])
    );

    keys.forEach((key) => {
      const options = this.availableNarrative[key];

      // Create elements
      const settingGroup = document.createElement("div");
      settingGroup.className = "narrative-setting-group";

      // Format display name
      const displayName = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      // Create label
      const label = document.createElement("label");
      label.setAttribute("for", key);
      label.textContent = `${displayName}:`;

      // Add line break
      const br = document.createElement("br");

      // Create select element
      const select = document.createElement("select");
      select.id = key;

      // Add options to select
      options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      });

      // Add event listener for select change
      select.addEventListener("change", (e) => {
        this.updateNarrativeSettings(key, e.target.value);
      });

      // Append elements to setting group
      settingGroup.appendChild(label);
      settingGroup.appendChild(br);
      settingGroup.appendChild(select);

      // Append setting group to container
      container.appendChild(settingGroup);
    });
  }

  updateNarrativeSettings(key, value) {
    // Update current narrative settings
    this.currentNarrative[key] = value;
    console.log("Updated narrative settings:", this.currentNarrative);
  }

  getSettingValues() {
    // Get all range input elements
    const sliders = document.querySelectorAll(
      '#modelSettingsContainer input[type="range"]'
    );

    // Create an object to store the values
    const values = {};

    // Collect values from each slider
    sliders.forEach((slider) => {
      const key = slider.id;
      // Convert to appropriate type (int for 'n', float for others)
      const value =
        key === "n" || key === "max_tokens"
          ? parseInt(slider.value)
          : parseFloat(slider.value);
      values[key] = value;
    });

    return values;
  }

  getNarrativeValues() {
    if (!this.currentNarrative) {
      const selects = document.querySelectorAll(
        "#modelNarrativeContainer select"
      );

      const values = {};

      selects.forEach((select) => {
        const key = select.id;
        values[key] = select.value;
      });

      this.currentNarrative = values;
    }
    return this.currentNarrative;
  }

  setupEventListeners() {
    console.log("Setting up event listeners");

    // Remove any existing listeners
    this.modelSelect.removeEventListener(
      "change",
      this.handleModelSelectChange
    );
    this.confirmButton.removeEventListener("click", this.handleConfirm);
    this.cancelButton.removeEventListener("click", this.handleCancel);

    // Add new listeners
    this.modelSelect.addEventListener(
      "change",
      this.handleModelSelectChange.bind(this)
    );
    this.confirmButton.addEventListener("click", this.handleConfirm.bind(this));
    this.cancelButton.addEventListener("click", this.handleCancel.bind(this));
    this.toggleSettingsContainer.addEventListener(
      "click",
      this.toggleSettings.bind(this)
    );
  }

  handleModelSelectChange(e) {
    console.log("Model select changed:", e.target.value);
    const selectedModel = this.currentModels.find(
      (model) => model.id === e.target.value
    );
    if (selectedModel) {
      console.log("Selected model:", selectedModel);
      this.pendingModelChange = e.target.value; // Store just the ID
      this.showModal();
    } else {
      console.log("No model found for value:", e.target.value);
    }
  }

  handleConfirm() {
    console.log("Confirm button clicked");
    this.handleModelChange(true);
  }

  handleCancel() {
    console.log("Cancel button clicked");
    this.handleModelChange(false);
  }

  showModal() {
    console.log("Showing modal");
    this.modal.classList.add("show");
  }

  hideModal() {
    console.log("Hiding modal");
    this.modal.classList.remove("show");
  }

  handleModelChange(confirmed) {
    if (confirmed) {
      // Update previous model ID
      this.previousModelId = this.pendingModelChange;

      // Reset settings to defaults
      Object.keys(this.availableSettings).forEach(key => {
        const defaultValue = this.availableSettings[key].default;
        this.currentSettings[key] = defaultValue;

        // Update UI
        const slider = document.getElementById(key);
        const valueSpan = document.getElementById(`${key}-value`);
        if (slider && valueSpan) {
          slider.value = defaultValue;
          valueSpan.textContent = defaultValue;
        }
      });

      // Reset narrative inputs to first options
      Object.keys(this.availableNarrative).forEach(key => {
        const firstOption = this.availableNarrative[key][0];
        this.currentNarrative[key] = firstOption;

        // Update UI
        const select = document.getElementById(key);
        if (select) {
          select.value = firstOption;
        }
      });

      // Update model info
      const selectedModel = this.currentModels.find(
        (model) => model.id === this.pendingModelChange
      );
      this.updateModelInfo(selectedModel);

      // Trigger onModelChange callback if set
      if (this.onModelChange) {
        this.onModelChange();
      }
    } else {
      // Revert model selection
      this.modelSelect.value = this.previousModelId;

      // Also revert the model info display
      const previousModel = this.currentModels.find(
        (model) => model.id === this.previousModelId
      );
      this.updateModelInfo(previousModel);
    }

    // Clear pending change
    this.pendingModelChange = null;
    this.hideModal();
  }

  updateModelInfo(model) {
    if (!model) return;

    this.modelInfo.innerHTML = `
            <p><strong>${model.name}</strong></p>
            <p>${model.description}</p>
        `;
  }

  setFallbackOptions() {
    this.modelSelect.innerHTML = `
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3">Claude 3</option>
        `;
    this.previousModelId = "gpt-4";
  }

  getCurrentModel() {
    return this.modelSelect.value;
  }

  hideNarrativeContainer() {
    this.narrativeContainer.classList.add("hide");
  }

  // JavaScript toggle function
  toggleSettings() {
    // Get references
    const settingsContainer = document.getElementById('modelSettingsContainer');
    const toggleContainer = document.getElementById('toggleSettingsContainer');
    const messageElement = toggleContainer.querySelector('.message-for-settings');

    // Check current state
    const isCollapsed = settingsContainer.classList.contains('settings-collapsed');

    if (isCollapsed) {
      // For showing: Set initial height then animate
      settingsContainer.style.maxHeight = '0px';

      // Force a reflow
      void settingsContainer.offsetWidth;

      // Remove collapsed class
      settingsContainer.classList.remove('settings-collapsed');

      // Animate to proper height
      requestAnimationFrame(() => {
        // Get the height after removing the collapsed class
        const expandedHeight = settingsContainer.scrollHeight;
        settingsContainer.style.maxHeight = expandedHeight + 'px';

        // After transition completes, remove the inline style
        setTimeout(() => {
          settingsContainer.style.maxHeight = '';
        }, 100);
      });

      messageElement.textContent = 'Hide Settings';
      toggleContainer.classList.add('active');
    } else {
      // For hiding: First capture current height
      const currentHeight = settingsContainer.scrollHeight;
      settingsContainer.style.maxHeight = currentHeight + 'px';

      // Force a reflow
      void settingsContainer.offsetWidth;

      // Now animate to zero height
      requestAnimationFrame(() => {
        settingsContainer.style.maxHeight = '0px';
        settingsContainer.classList.add('settings-collapsed');

        messageElement.textContent = 'Show Settings';
        toggleContainer.classList.remove('active');
      });
    }
  }
}
