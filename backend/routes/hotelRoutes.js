const express = require('express');
const router = express.Router();
const {
  getHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelsByManager,
  validateHotel,
} = require('../controllers/hotelController');
const { authenticateManager } = require('../middleware/authMiddleware');

// Public routes
router.route('/').get(getHotels);
router.route('/:id').get(getHotel);

// Protected routes (require authentication)
router.use(authenticateManager);

// Manager's hotels
router.route('/manager/my-hotels').get(getHotelsByManager);

// Hotel CRUD operations
router.route('/').post(validateHotel, createHotel);
router
  .route('/:id')
  .put(validateHotel, updateHotel)
  .delete(deleteHotel);

module.exports = router;
