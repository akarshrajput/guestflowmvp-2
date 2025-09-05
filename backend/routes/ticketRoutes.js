const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const chatController = require("../controllers/chatController");
const { authenticateManager } = require("../middleware/authMiddleware");

// Public routes (guest access via room-specific link)
router.post("/", ticketController.createTicket);
router.post("/guest", chatController.createGuestTicket);

// Protected routes (manager access only)
router.use(authenticateManager);

// Ticket management routes
router.route("/").get(chatController.getTickets);

router
  .route("/:id")
  .get(ticketController.getTicket)
  .put(chatController.updateTicket)
  .delete(chatController.deleteTicket);

// Update ticket status
router.route("/:id/status").put(ticketController.updateTicketStatus);

// Add message to ticket
router.route("/:id/messages").post(ticketController.addMessage);

module.exports = router;
