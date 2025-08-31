const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { protect } = require('../middleware/authMiddleware');

// Public route for QR code validation
router.post('/validate', qrController.validateQRCode);

// Protected routes (staff access)
router.use(protect);

router.post('/generate', qrController.generateQRCode);
router.get('/', qrController.getQRCodes);
router.delete('/:id', qrController.revokeQRCode);

module.exports = router;
