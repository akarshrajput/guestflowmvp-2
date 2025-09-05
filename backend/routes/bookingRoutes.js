const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  generateGuestLink,
  validateBooking,
} = require('../controllers/bookingController');
const { authenticateManager } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.post('/', validateBooking, createBooking);
router.get('/:id', getBooking);
router.delete('/:id/cancel', cancelBooking);

// Guest access link generation (public but could be rate-limited in production)
router.get('/guest-link', generateGuestLink);

// Protected routes (require authentication)
router.use(authenticateManager);

// Hotel manager routes
router.get('/', getBookings);
router.put('/:id', updateBooking);
router.delete('/:id', cancelBooking);

module.exports = router;
