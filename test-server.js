const express = require('express');

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'dev-secret-key';
process.env.PORT = '3001';

console.log('Starting test server...');

// Import the main server
const app = require('./server-sqlite.js');

console.log('Server imported successfully');

// Give it a moment to initialize, then test
setTimeout(() => {
  console.log('Testing server endpoints...');
  
  // Make test request to see if server is responsive
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/test',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      process.exit(0);
    });
  });
  
  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
  });
  
  req.end();
}, 1000);
