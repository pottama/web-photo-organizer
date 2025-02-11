const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/fetch-files', fileController.fetchFiles);
router.post('/move-files', fileController.moveFiles);

module.exports = router;