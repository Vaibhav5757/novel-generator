const express = require("express");
const router = express.Router();
const novelController = require("../controllers/novel.controller");
const rateLimiter = require("../middleware/rateLimiter");
const {
    validateChatRequest,
    validateGenerateRequest,
} = require("../middleware/validation");
const models = require('../json/models.json');
const settings = require('../json/settings.json');
const narrative = require('../json/narrative.json');

/**
 * @swagger
 * /api/novel/generate:
 *   post:
 *     summary: Generate a new chapter
 *     tags: [Novel]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - context
 *               - model
 *             properties:
 *               context:
 *                 type: string
 *                 description: The context for generating the chapter
 *               model:
 *                 type: string
 *                 description: The model to use for generation
 *               settings:
 *                 type: object
 *                 description: Additional generation settings
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     description: Creativity level (0.2 - 1.2)
 *                     default: 0.7
 *                   top_p:
 *                     type: number
 *                     description: Sampling threshold (0.5 - 1.0)
 *                     default: 1.0 
 *                   top_k:
 *                     type: number
 *                     description: Top-k sampling (0 - 1000)
 *                     default: 0
 *                   presence_penalty:
 *                     type: number
 *                     description: Encourages new topics (-2.0 - 2.0)
 *                     default: 0.0
 *                   frequency_penalty:
 *                     type: number
 *                     description: Reduces repetition (-2.0 - 2.0)
 *                     default: 0.0 
 *                   repetition_penalty:
 *                     type: number
 *                     description: Repetition penalty (0.01 - 5.0)
 *                     default: 1.0
 *                   max_tokens:
 *                     type: integer
 *                     description: Maximum length of the response
 *                     default: 2000
 *               narrative:
 *                 type: object
 *                 description: Narrative preferences
 *                 properties:
 *                   genre:
 *                     type: string
 *                     description: Genre of the novel
 *                     enum: [Fantasy, Sci-Fi, Mystery, Romance, Horror, Historical]
 *                   writing_style:
 *                     type: string
 *                     description: Writing style preference
 *                     enum: [Concise, Descriptive, Poetic, Fast-Paced, Stream of Consciousness]
 *                   point_of_view:
 *                     type: string
 *                     description: Perspective of narration
 *                     enum: [First-Person, Second-Person, Third-Person Limited, Third-Person Omniscient]
 *                   stop_sequence:
 *                     type: string
 *                     description: Custom stop sequence
 *                     default: "\n\n"
 *     responses:
 *       200:
 *         description: Chapter generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                 prompt_used:
 *                   type: string   
 *                 tokens_consumed:
 *                   type: number
 *                 tokens_prompt:
 *                   type: number
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post(
    "/generate",
    rateLimiter,
    validateGenerateRequest,
    novelController.generateChapter
);

/**
 * @swagger
 * /api/novel/chat:
 *   post:
 *     summary: Chat with the AI about the novel
 *     tags: [Novel]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - model
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user's message
 *               model:
 *                 type: string
 *                 description: The model to use for chat
 *               history:   
 *                 type: array
 *                 description: The chat history. At max 20 messages
 *                 properties:
 *                   role:
 *                     type: string
 *                     description: The role of the message
 *                     enum: [user, assistant]
 *                   content:
 *                     type: string
 *                     description: The content of the message
 *               settings:
 *                 type: object
 *                 description: Additional generation settings
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     description: Creativity level (0.2 - 1.2)
 *                     default: 0.7
 *                   top_p:
 *                     type: number
 *                     description: Sampling threshold (0.5 - 1.0)
 *                     default: 1.0 
 *                   top_k:
 *                     type: number
 *                     description: Top-k sampling (0 - 1000)
 *                     default: 0
 *                   repetition_penalty:    
 *                     type: number
 *                     description: Repetition penalty (0.01 - 5.0)
 *                     default: 1.0
 *                   presence_penalty:
 *                     type: number
 *                     description: Encourages new topics (-2.0 - 2.0)
 *                     default: 0.0
 *                   frequency_penalty:
 *                     type: number
 *                     description: Reduces repetition (-2.0 - 2.0)
 *                     default: 0.0
 *                   max_tokens:
 *                     type: integer
 *                     description: Maximum length of the response
 *                     default: 2000
 *     responses:
 *       200:
 *         description: Chat response received
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string   
 *                 prompt_used:
 *                   type: string
 *                 tokens_consumed:
 *                   type: number
 *                 tokens_prompt:
 *                   type: number
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post("/chat", rateLimiter, validateChatRequest, novelController.chat);

/**
 * @swagger
 * /api/novel/models:
 *   get:
 *     summary: Get available AI models
 *     description: Returns a list of available AI models that can be used for novel generation
 *     tags: [Novel]
 *     responses:
 *       200:
 *         description: List of available models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                         required: false
 */
router.get("/models", (req, res) => {
    res.json(models);
});

/**
 * @swagger
 * /api/novel/settings:
 *   get:
 *     summary: Get available settings ranges
 *     description: Returns the valid ranges for generation settings
 *     tags: [Novel]
 *     responses:
 *       200:
 *         description: Settings ranges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 settings:
 *                   type: object
 *                   properties:
 *                     temperature:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                         default:
 *                           type: number
 *                     top_p:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                         default:
 *                           type: number
 *                     presence_penalty:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                         default:
 *                           type: number
 *                     frequency_penalty:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                         default:
 *                           type: number
 *                     max_tokens:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         default:
 *                           type: number
 *                     n:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         default:
 *                           type: number
 */
router.get("/settings", (req, res) => {
    res.json(settings);
});

/**
 * @swagger
 * /api/novel/narrative:
 *   get:
 *     summary: Get available narrative options
 *     description: Returns the valid options for narrative settings
 *     tags: [Novel]
 *     responses:
 *       200:
 *         description: Narrative options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 narrative:
 *                   type: object
 *                   properties:
 *                     genre:
 *                       type: array
 *                       items:
 *                         type: string
 *                     writing_style:
 *                       type: array
 *                       items:
 *                         type: string
 *                     point_of_view:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get("/narrative", (req, res) => {
    res.json(narrative);
});

module.exports = router;
