const express = require('express');
const router = express.Router();
const { generate, downloadPdf } = require('../controllers/itineraryController');

router.post('/generate', generate);
router.post('/pdf', downloadPdf);

module.exports = router;
