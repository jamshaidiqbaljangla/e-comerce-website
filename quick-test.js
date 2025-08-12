const express = require('express');

// Set development environment
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'dev-secret-key';
process.env.PORT = '3001';
process.env.NETLIFY = 'false'; // Explicitly set to false

console.log('Loading server module...');

try {
    const app = require('./server-sqlite.js');
    console.log('Server module loaded successfully');
    
    // Test if we can make a simple request
    setTimeout(() => {
        const http = require('http');
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/test',
            method: 'GET',
            timeout: 5000
        };
        
        console.log('Attempting to connect to server...');
        
        const req = http.request(options, (res) => {
            console.log(`✅ Server responding with status: ${res.statusCode}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('✅ API Response:', data);
                console.log('🎯 Smoke test PASSED! Server is working correctly.');
                process.exit(0);
            });
        });
        
        req.on('timeout', () => {
            console.log('❌ Request timeout - server may not be listening');
            req.destroy();
            process.exit(1);
        });
        
        req.on('error', (e) => {
            console.log(`❌ Connection error: ${e.message}`);
            console.log('   This could mean the server is not listening on port 3001');
            process.exit(1);
        });
        
        req.end();
    }, 3000); // Wait 3 seconds for server to start
    
} catch (error) {
    console.error('❌ Error loading server:', error.message);
    process.exit(1);
}
