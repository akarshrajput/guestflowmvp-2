const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateManager } = require('../middleware/authMiddleware');

// Public routes (guest access via room-specific link)
router.post('/', ticketController.createTicket);
router.post('/guest', require('../controllers/chatController').createGuestTicket);

// Protected routes (manager access only)
router.use(authenticateManager);

// Ticket management routes
router
  .route('/')
  .get(ticketController.getTickets);

router
  .route('/:id')
  .get(ticketController.getTicket);

// Update ticket status
router
  .route('/:id/status')
  .put(ticketController.updateTicketStatus);

// Add message to ticket
router
  .route('/:id/messages')
  .post(ticketController.addMessage);

module.exports = router;
