const { builder } = require('@netlify/functions');
const express = require('express');
const serverless = require('serverless-http');

// Import the configured Express app
const app = require('../../app');

// Create serverless handler
const handler = serverless(app, {
  request: (req, event, context) => {
    // Add Netlify function context to request object
    req.context = context;
    req.lambdaEvent = event;
  }
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400' // 24 hours
};

// Main handler function
const netlifyHandler = async (event, context) => {
  // Log incoming request
  console.log('Incoming request:', {
    path: event.path,
    httpMethod: event.httpMethod,
    query: event.queryStringParameters,
    headers: event.headers,
    body: event.body
  });

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...corsHeaders
      },
      body: ''
    };
  }

  try {

    // Process the request
    const response = await handler(event, context);
    
    // Ensure response has headers
    if (!response.headers) {
      response.headers = {};
    }

    // Ensure response has headers
    const responseHeaders = {
      ...corsHeaders,
      ...(response.headers || {})
    };

    return {
      ...response,
      headers: responseHeaders
    };
  } catch (error) {
    console.error('Unhandled error:', error);
    
    // Format error response
    const statusCode = error.statusCode || 500;
    const errorResponse = {
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };

    return {
      statusCode,
      body: JSON.stringify(errorResponse),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      }
    };
  }
};

// Export the handler with Netlify's builder
module.exports.handler = builder(netlifyHandler);