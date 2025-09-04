const axios = require("axios");

const testMessages = [
  "I need coffee",
  "Can I get some coffee please",
  "Bring me towels",
  "Room cleaning needed",
  "AC is not working",
  "Help with my luggage",
  "Book me a taxi",
  "Key card not working",
  "I need coffee and clean towels",
  "Fix the AC and help with bags",
  "Hello",
  "Good morning",
];

async function testClassification() {
  console.log("🧪 Testing AI Classification Accuracy\n");

  for (const message of testMessages) {
    try {
      const response = await axios.post("http://localhost:5050/api/chat/ai", {
        message: message,
        guestInfo: {
          guestName: "Test Guest",
          roomNumber: "101",
        },
        conversationHistory: [],
      });

      // Call the ticket creation endpoint to see categories
      if (response.data.shouldCreateTicket) {
        const ticketResponse = await axios.post(
          "http://localhost:5050/api/tickets/guest",
          {
            roomNumber: "101",
            guestInfo: {
              name: "Test Guest",
              email: "test@test.com",
              phone: "N/A",
            },
            initialMessage: message,
          }
        );

        const categories = ticketResponse.data.categories || ["unknown"];
        console.log(
          `"${message}" → ${categories.join(", ")} (${categories.length} categories)`
        );
      } else {
        console.log(`"${message}" → NO TICKET (greeting detected)`);
      }
    } catch (error) {
      console.log(
        `"${message}" → ERROR: ${error.response?.data?.message || error.message}`
      );
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

testClassification();
