const express = require('express');
const router = express.Router();
const novelController = require('../../controllers/novel.controller');
const rateLimiter = require('../../middleware/rateLimiter');
const { validateGenerateRequest, validateChatV2Request } = require('../../middleware/validation');

/**
 * @swagger
 * /api/novel/v2/generate:
 *   post:
 *     summary: Generate multiple chapters with real-time streaming
 *     description: Generates multiple chapters based on context with Server-Sent Events streaming. Each chapter is streamed in real-time as it's generated.
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
 *                 description: The context for generating the chapters
 *                 example: "A young wizard discovers a mysterious spell book in an ancient library..."
 *               model:
 *                 type: string
 *                 description: The model to use for generation
 *                 example: "meta-llama/Llama-3.3-70B-Instruct-Turbo"
 *               settings:
 *                 type: object
 *                 description: Additional generation settings
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     description: Creativity level (0.2 - 1.2)
 *                     default: 0.7
 *                     minimum: 0.2
 *                     maximum: 1.2
 *                   top_p:
 *                     type: number
 *                     description: Sampling threshold (0.5 - 1.0)
 *                     default: 1.0
 *                     minimum: 0.5
 *                     maximum: 1.0
 *                   top_k:
 *                     type: number
 *                     description: Top-k sampling (0 - 1000)
 *                     default: 0
 *                     minimum: 0
 *                     maximum: 1000
 *                   presence_penalty:
 *                     type: number
 *                     description: Encourages new topics (-2.0 - 2.0)
 *                     default: 0.0
 *                     minimum: -2.0
 *                     maximum: 2.0
 *                   frequency_penalty:
 *                     type: number
 *                     description: Reduces repetition (-2.0 - 2.0)
 *                     default: 0.0
 *                     minimum: -2.0
 *                     maximum: 2.0
 *                   repetition_penalty:
 *                     type: number
 *                     description: Repetition penalty (0.01 - 5.0)
 *                     default: 1.0
 *                     minimum: 0.01
 *                     maximum: 5.0
 *                   max_tokens:
 *                     type: integer
 *                     description: Maximum length of the response per chapter
 *                     default: 2000
 *                     minimum: 100
 *                     maximum: 4000
 *               narrative:
 *                 type: object
 *                 description: Narrative preferences
 *                 properties:
 *                   genre:
 *                     type: string
 *                     description: Genre of the novel
 *                     enum: [Fantasy, Sci-Fi, Mystery, Romance, Horror, Historical, Adventure, Thriller, Drama, Comedy]
 *                     example: "Fantasy"
 *                   writing_style:
 *                     type: string
 *                     description: Writing style preference
 *                     enum: [Concise, Descriptive, Poetic, Fast-Paced, Stream of Consciousness, Dialogue-Heavy, Action-Packed]
 *                     example: "Descriptive"
 *                   point_of_view:
 *                     type: string
 *                     description: Perspective of narration
 *                     enum: [First-Person, Second-Person, Third-Person Limited, Third-Person Omniscient]
 *                     example: "Third-Person Limited"
 *                   stop_sequence:
 *                     type: string
 *                     description: Custom stop sequence
 *                     default: "\n\n"
 *     responses:
 *       200:
 *         description: Chapters generated successfully via Server-Sent Events
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-Sent Events stream with different event types
 *               example: |
 *                 data: {"type": "status", "message": "Starting chapter generation..."}
 *
 *                 data: {"type": "chunk", "content": "The ancient library stood silent", "streaming": true}
 *
 *                 data: {"type": "chunk", "content": " in the moonlight...", "streaming": true}
 *
 *                 data: {"type": "chapter_complete", "tokens_consumed": 150, "tokens_prompt": 50, "story_id": "4965e936-e9a4-4823-a33a-8a5efeffa2b8"}
 *
 *                 data: {"type": "complete", "summary": {"tokens_consumed": 1500, "tokens_prompt": 200, "chapters_generated": 3}}
 *
 *                 data: [DONE]
 *             examples:
 *               status_event:
 *                 summary: Status update event
 *                 value: '{"type": "status", "message": "Generating Chapter 2...", "progress": {"current": 2, "total": 3}}'
 *               chunk_event:
 *                 summary: Content chunk event (streaming)
 *                 value: '{"type": "chunk", "content": "The wizard opened the ancient tome", "streaming": true}'
 *               chapter_complete_event:
 *                 summary: Chapter completion event
 *                 value: '{"type": "chapter_complete", "tokens_consumed": 180, "tokens_prompt": 45}'
 *               complete_event:
 *                 summary: Final completion event
 *                 value: '{"type": "complete", "summary": {"prompt_used": "...", "tokens_consumed": 1800, "tokens_prompt": 300, "chapters_generated": 3}}'
 *               error_event:
 *                 summary: Error event
 *                 value: '{"type": "error", "message": "Generation failed", "error": "Model unavailable"}'
 *               done_event:
 *                 summary: Stream end marker
 *                 value: '[DONE]'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Rate limit exceeded. Please try again later."
 *       500:
 *         description: Server error during generation
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: 'data: {"type": "error", "message": "Failed to generate chapter", "error": "Model connection failed"}'
 */
router.post('/generate', rateLimiter, validateGenerateRequest, novelController.streamChapterCreate);

/**
 * @swagger
 * /api/novel/v2/chat:
 *   post:
 *     summary: Continue the novel with real-time streaming
 *     description: Continues the novel story based on user input and chat history with Server-Sent Events streaming. Generates the next chapter in real-time.
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
 *               - history
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user's message to continue the story
 *                 example: "The protagonist should discover a hidden passage behind the bookshelf."
 *               model:
 *                 type: string
 *                 description: The model to use for chat
 *                 example: "meta-llama/Llama-3.3-70B-Instruct-Turbo"
 *               story_id:
 *                 type: String
 *                 description: Story ID recieved in response of /generate endpoint
 *               settings:
 *                 type: object
 *                 description: Additional generation settings for fine-tuning the response
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     description: Creativity level (0.2 - 1.2)
 *                     default: 0.7
 *                     minimum: 0.2
 *                     maximum: 1.2
 *                   top_p:
 *                     type: number
 *                     description: Sampling threshold (0.5 - 1.0)
 *                     default: 1.0
 *                     minimum: 0.5
 *                     maximum: 1.0
 *                   top_k:
 *                     type: number
 *                     description: Top-k sampling (0 - 1000)
 *                     default: 0
 *                     minimum: 0
 *                     maximum: 1000
 *                   repetition_penalty:
 *                     type: number
 *                     description: Repetition penalty (0.01 - 5.0)
 *                     default: 1.0
 *                     minimum: 0.01
 *                     maximum: 5.0
 *                   presence_penalty:
 *                     type: number
 *                     description: Encourages new topics (-2.0 - 2.0)
 *                     default: 0.0
 *                     minimum: -2.0
 *                     maximum: 2.0
 *                   frequency_penalty:
 *                     type: number
 *                     description: Reduces repetition (-2.0 - 2.0)
 *                     default: 0.0
 *                     minimum: -2.0
 *                     maximum: 2.0
 *                   max_tokens:
 *                     type: integer
 *                     description: Maximum length of the response
 *                     default: 2000
 *                     minimum: 100
 *                     maximum: 4000
 *     responses:
 *       200:
 *         description: Next chapter generated successfully via Server-Sent Events
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-Sent Events stream with content chunks and completion events
 *               example: |
 *                 data: {"type": "status", "message": "Continuing the story..."}
 *
 *                 data: {"type": "chunk", "content": "Behind the ancient bookshelf", "streaming": true}
 *
 *                 data: {"type": "chunk", "content": ", a narrow passage revealed itself...", "streaming": true}
 *
 *                 data: {"type": "chapter_complete", "tokens_consumed": 95, "tokens_prompt": 320}
 *
 *                 data: {"type": "complete", "summary": {"prompt_used": "...", "tokens_consumed": 95, "tokens_prompt": 320}}
 *
 *                 data: [DONE]
 *             examples:
 *               status_event:
 *                 summary: Initial status event
 *                 value: '{"type": "status", "message": "Continuing the story..."}'
 *               generating_status:
 *                 summary: Generation status event
 *                 value: '{"type": "status", "message": "Generating next chapter..."}'
 *               chunk_event:
 *                 summary: Content chunk event (real-time streaming)
 *                 value: '{"type": "chunk", "content": "The knight stepped cautiously", "streaming": true}'
 *               chapter_complete_event:
 *                 summary: Chapter completion event
 *                 value: '{"type": "chapter_complete", "tokens_consumed": 125, "tokens_prompt": 280}'
 *               complete_event:
 *                 summary: Final completion event
 *                 value: '{"type": "complete", "summary": {"prompt_used": "Generated prompt...", "tokens_consumed": 125, "tokens_prompt": 280, "content_length": 450}}'
 *               error_event:
 *                 summary: Error event
 *                 value: '{"type": "error", "message": "Failed to process chat message", "error": "Connection timeout"}'
 *               done_event:
 *                 summary: Stream termination marker
 *                 value: '[DONE]'
 *       429:
 *         description: Rate limit exceeded - chat history too long
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                   example: "Chat history is too long. Please start a new conversation."
 *       500:
 *         description: Server error during chat processing
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: 'data: {"type": "error", "message": "Failed to process chat message", "error": "Model processing failed"}'
 */
router.post('/chat', rateLimiter, validateChatV2Request, novelController.chatStream);

module.exports = router;
