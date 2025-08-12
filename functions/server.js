// Netlify serverless function wrapper for Express app
const express = require('express');
const serverless = require('serverless-http');
const path = require('path');

// Ensure Netlify environment variables are set
process.env.NETLIFY = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import your server app - adjust path if needed
const app = require('./server-postgresql');

// Use serverless-http to wrap the Express app
const handler = serverless(app);

// Export the handler function for Netlify Functions
exports.handler = async (event, context) => {
  // Set context timeout
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Return the serverless handler
  return await handler(event, context);
};
