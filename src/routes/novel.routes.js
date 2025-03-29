const express = require('express');
const router = express.Router();
const models = require('../json/models.json');
const settings = require('../json/settings.json');
const narrative = require('../json/narrative.json');
const v1Routes = require('./v1.0/novel.routes');

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
router.get('/models', (req, res) => {
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
router.get('/settings', (req, res) => {
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
router.get('/narrative', (req, res) => {
  res.json(narrative);
});

router.use('/v1', v1Routes);

module.exports = router;
