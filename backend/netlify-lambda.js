const serverless = require('serverless-http');
const app = require('./app');

// Create a serverless-http wrapper for the Express app
const handler = serverless(app);

// Export the handler for Netlify Functions
module.exports.handler = async (event, context) => {
  // You can add any pre-processing here if needed
  return await handler(event, context);
};
