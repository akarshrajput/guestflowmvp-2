const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateManager } = require('../middleware/authMiddleware');

// Public routes
router.get('/number/:number', roomController.getRoomByNumber);

// Protected routes (require authentication)
router.use(authenticateManager);

// Room CRUD operations
router
  .route('/')
  .get(roomController.getRooms)
  .post(roomController.validateRoom, roomController.createRoom);

router
  .route('/:id')
  .get(roomController.getRoom)
  .put(roomController.validateRoom, roomController.updateRoom)
  .delete(roomController.deleteRoom);

// QR code routes
router.post('/:id/qr', roomController.generateQRCode);
router.get('/:id/qr/download', roomController.downloadQRCode);

module.exports = router;
