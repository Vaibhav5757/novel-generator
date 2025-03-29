const { body, validationResult } = require('express-validator');
const models = require('../json/models.json');
const settings = require('../json/settings.json');
const narrative = require('../json/narrative.json');

const validateCommonRequest = [
  body('model')
    .isString()
    .notEmpty()
    .withMessage('Model is required.')
    .custom(value => {
      const validModels = models.models.map(m => m.id);
      if (!validModels.includes(value)) {
        throw new Error('Invalid model selected.');
      }
      return true;
    }),
];

const validateSettingRequest = [
  body('settings.temperature')
    .optional()
    .isFloat({
      min: settings.settings.temperature.min,
      max: settings.settings.temperature.max,
    })
    .withMessage(
      `Temperature must be between ${settings.settings.temperature.min} and ${settings.settings.temperature.max}.`
    ),

  body('settings.top_p')
    .optional()
    .isFloat({
      min: settings.settings.top_p.min,
      max: settings.settings.top_p.max,
    })
    .withMessage(`Top-p must be between ${settings.settings.top_p.min} and ${settings.settings.top_p.max}.`),

  body('settings.top_k')
    .optional()
    .isFloat({
      min: settings.settings.top_k.min,
      max: settings.settings.top_k.max,
    })
    .withMessage(`Top-k must be between ${settings.settings.top_k.min} and ${settings.settings.top_k.max}.`),

  body('settings.presence_penalty')
    .optional()
    .isFloat({
      min: settings.settings.presence_penalty.min,
      max: settings.settings.presence_penalty.max,
    })
    .withMessage(
      `Presence penalty must be between ${settings.settings.presence_penalty.min} and ${settings.settings.presence_penalty.max}.`
    ),

  body('settings.frequency_penalty')
    .optional()
    .isFloat({
      min: settings.settings.frequency_penalty.min,
      max: settings.settings.frequency_penalty.max,
    })
    .withMessage(
      `Frequency penalty must be between ${settings.settings.frequency_penalty.min} and ${settings.settings.frequency_penalty.max}.`
    ),

  body('settings.repetition_penalty')
    .optional()
    .isFloat({
      min: settings.settings.repetition_penalty.min,
      max: settings.settings.repetition_penalty.max,
    })
    .withMessage(
      `Repetition penalty must be between ${settings.settings.repetition_penalty.min} and ${settings.settings.repetition_penalty.max}.`
    ),

  body('settings.max_tokens')
    .optional()
    .isInt({
      min: settings.settings.max_tokens.min,
      max: settings.settings.max_tokens.max,
    })
    .withMessage(
      `Max tokens must be between ${settings.settings.max_tokens.min} and ${settings.settings.max_tokens.max}.`
    ),
];

const validateNarrativeRequest = [
  body('narrative.genre')
    .optional()
    .isIn(narrative.narrative.genre)
    .withMessage(`Invalid genre. Must be one of: ${narrative.narrative.genre.join(', ')}`),

  body('narrative.writing_style')
    .optional()
    .isIn(narrative.narrative.writing_style)
    .withMessage(`Invalid writing style. Must be one of: ${narrative.narrative.writing_style.join(', ')}`),

  body('narrative.point_of_view')
    .optional()
    .isIn(narrative.narrative.point_of_view)
    .withMessage(`Invalid point of view. Must be one of: ${narrative.narrative.point_of_view.join(', ')}`),
];

const validateGenerateRequest = [
  ...validateCommonRequest,
  ...validateSettingRequest,
  ...validateNarrativeRequest,
  body('context').isString().notEmpty().withMessage('Context is required.'),

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

  body('message').isString().notEmpty().withMessage('Message is required.'),
  body('history').isArray().notEmpty().withMessage('Chat history is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateGenerateRequest, validateChatRequest };
