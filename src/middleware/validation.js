const { body, validationResult } = require("express-validator");

const validateCommonRequest = [
  body("model").isString().notEmpty().withMessage("Model is required."),
];

const validateSettingRequest = [
  body("settings.temperature")
    .optional()
    .isFloat({ min: 0.0, max: 2.0 })
    .withMessage("Temperature must be between 0.0 and 2.0."),

  body("settings.top_p")
    .optional()
    .isFloat({ min: 0.0, max: 1.0 })
    .withMessage("Top-p must be between 0.0 and 1.0."),

  body("settings.presence_penalty")
    .optional()
    .isFloat({ min: -2.0, max: 2.0 })
    .withMessage("Presence penalty must be between -2.0 and 2.0."),

  body("settings.frequency_penalty")
    .optional()
    .isFloat({ min: -2.0, max: 2.0 })
    .withMessage("Frequency penalty must be between -2.0 and 2.0."),

  body("settings.max_tokens")
    .optional()
    .isInt({ min: 1, max: 32000 })
    .withMessage("Max tokens must be between 1 and 32000."),

  body("settings.n")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("n must be between 1 and 50."),
];

const validateNarrativeRequest = [
  body("narrative.genre")
    .optional()
    .isIn([
      "Fantasy",
      "Sci-Fi",
      "Mystery",
      "Romance",
      "Horror",
      "Historical",
      "Cyberpunk",
      "Thriller",
    ])
    .withMessage("Invalid genre."),

  body("narrative.writing_style")
    .optional()
    .isIn([
      "Concise",
      "Descriptive",
      "Poetic",
      "Fast-Paced",
      "Stream of Consciousness",
    ])
    .withMessage("Invalid writing style."),

  body("narrative.point_of_view")
    .optional()
    .isIn([
      "First-Person",
      "Second-Person",
      "Third-Person Limited",
      "Third-Person Omniscient",
    ])
    .withMessage("Invalid point of view."),
];

const validateGenerateRequest = [
  ...validateCommonRequest,
  ...validateSettingRequest,
  ...validateNarrativeRequest,
  body("context").isString().notEmpty().withMessage("Context is required."),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateChatRequest = [
  ...validateCommonRequest,
  ...validateSettingRequest,

  body("message").isString().notEmpty().withMessage("Context is required."),
  body("history").isArray().notEmpty().withMessage("Chat history is required"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateGenerateRequest, validateChatRequest };
