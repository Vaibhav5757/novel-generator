const express = require('express');
const router = express.Router();
const v1Routes = require('./v1.0/novel.routes');
const v2Routes = require('./v2.0/novel.routes');

router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

module.exports = router;
