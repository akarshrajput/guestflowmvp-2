const axios = require("axios");
const Ticket = require("../models/Ticket");
const Room = require("../models/Room");

// External API classification using your hotel classifier
const classifyWithExternalAPI = async (message, roomNumber) => {
  try {
    console.log("🔍 Calling external classification API:", {
      message,
      roomNumber,
    });

    const response = await axios.post(
      "https://hotel-classifier-api.onrender.com/classify",
      {
        guest_message: message,
        room_number: roomNumber.toString(),
      }
    );

    console.log("✅ External API response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ External classification API failed:",
      error.response?.data || error.message
    );
    // Fallback response
    return {
      should_create_ticket: false,
      categories: [],
      confidence: 0.0,
      reasoning: "Classification service unavailable",
      suggested_priority: "low",
      estimated_completion_time: null,
    };
  }
};

// @desc    Handle AI chat for guests
// @route   POST /api/chat/ai
// @access  Public
exports.chatWithAI = async (req, res) => {
  try {
    const { message, guestInfo, conversationHistory = [] } = req.body;

    if (!message || !guestInfo) {
      return res.status(400).json({
        success: false,
        message: "Message and guest info are required",
      });
    }

    // Get classification from your external API
    const classification = await classifyWithExternalAPI(
      message,
      guestInfo.roomNumber
    );

    // Simple response logic based on classification
    let aiResponse = "I'll help you with that right away!";

    if (!classification.should_create_ticket) {
      aiResponse = "Hello! How can I assist you today?";
    } else if (
      classification.categories &&
      classification.categories.length > 0
    ) {
      const categoryNames = classification.categories
        .map((cat) => cat.category)
        .join(" and ");
      aiResponse = `I'll handle your ${categoryNames} request immediately!`;
    }

    res.json({
      success: true,
      message: aiResponse,
      shouldCreateTicket: classification.should_create_ticket,
      categories: classification.categories,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      priority: classification.suggested_priority,
      estimatedCompletion: classification.estimated_completion_time,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Chat AI error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process chat message",
    });
  }
};

// @desc    Create ticket from guest chat
// @route   POST /api/tickets/guest
// @access  Public
exports.createGuestTicket = async (req, res) => {
  try {
    const {
      roomNumber,
      guestInfo,
      initialMessage,
      conversationHistory = [],
    } = req.body;

    if (!roomNumber || !guestInfo || !initialMessage) {
      return res.status(400).json({
        success: false,
        message: "Room number, guest info, and initial message are required",
      });
    }

    // Get classification from your external API
    const classification = await classifyWithExternalAPI(
      initialMessage,
      roomNumber
    );

    // Check if ticket should be created
    if (!classification.should_create_ticket) {
      return res.status(200).json({
        success: true,
        message: "No ticket needed for this message",
        shouldCreateTicket: false,
        isGreeting: true,
        reasoning: classification.reasoning,
      });
    }

    // Find the room to get the manager
    const room = await Room.findOne({ number: roomNumber });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Create separate tickets for each category
    const createdTickets = [];

    if (classification.categories && classification.categories.length > 0) {
      for (const categoryInfo of classification.categories) {
        try {
          const ticket = await Ticket.create({
            room: room._id,
            roomNumber: roomNumber,
            category: categoryInfo.category,
            guestInfo: {
              name: guestInfo.name,
              email: guestInfo.email || "",
              phone: guestInfo.phone || "",
            },
            status: "raised",
            manager: room.manager,
            subject: `${categoryInfo.category.toUpperCase()} - Room ${roomNumber}`,
            messages: [
              {
                content: categoryInfo.message,
                sender: "system",
                senderName: "System",
                timestamp: new Date().toISOString(),
              },
            ],
            priority: categoryInfo.urgency || "medium",
            estimatedCompletion: classification.estimated_completion_time,
            confidence: classification.confidence,
          });

          // Populate the ticket with room details
          await ticket.populate("room");
          createdTickets.push(ticket);

          // Emit real-time notification to managers for each ticket
          if (req.app && req.app.get("io")) {
            const io = req.app.get("io");
            io.emit("newTicket", {
              ticket,
              notification: {
                title: "New Service Request",
                message: `${guestInfo.name} from Room ${roomNumber} needs ${categoryInfo.category} assistance`,
                timestamp: new Date().toISOString(),
              },
            });
          }
        } catch (error) {
          console.error(
            `Error creating ticket for category ${categoryInfo.category}:`,
            error
          );
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Service request${createdTickets.length > 1 ? "s" : ""} created successfully`,
      data: createdTickets.length === 1 ? createdTickets[0] : createdTickets,
      ticketCount: createdTickets.length,
      categories: classification.categories.map((cat) => cat.category),
      shouldCreateTicket: true,
    });
  } catch (error) {
    console.error("Create guest ticket error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create service request",
    });
  }
};

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Public
exports.getTickets = async (req, res) => {
  try {
    const { status, category } = req.query;

    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate("room")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get tickets",
    });
  }
};

// @desc    Update ticket status
// @route   PUT /api/tickets/:id
// @access  Public
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response } = req.body;

    const ticket = await Ticket.findById(id).populate("room");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Update ticket status
    if (status) {
      ticket.status = status;
    }

    // Add response message if provided
    if (response) {
      ticket.messages.push({
        content: response,
        sender: "manager",
        senderName: "Hotel Staff",
        timestamp: new Date().toISOString(),
      });
    }

    await ticket.save();

    // Emit real-time update
    if (req.app && req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("ticketUpdated", ticket);
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update ticket",
    });
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Public
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    await Ticket.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Delete ticket error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
    });
  }
};
