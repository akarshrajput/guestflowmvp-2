const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateManager } = require('../middleware/authMiddleware');

// Public routes (guest access)
router.post('/ai', chatController.chatWithAI);

// Protected routes (manager access only)
router.use(authenticateManager);
router.post('/manager-assist', chatController.managerAIAssist);

module.exports = router;
