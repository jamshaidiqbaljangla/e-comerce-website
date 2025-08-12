// Test Netlify serverless mode
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'test-secret-for-netlify';
process.env.NETLIFY = 'true';

console.log('🧪 Testing Netlify serverless mode...');
console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    NETLIFY: process.env.NETLIFY,
    JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[MISSING]'
});

try {
    const app = require('./server-sqlite.js');
    console.log('✅ Server module loaded successfully in Netlify mode');
    console.log('✅ App exported for serverless functions');
    
    // Verify the app is an Express app
    if (typeof app === 'function' && app.listen) {
        console.log('✅ Valid Express app exported');
    } else {
        console.log('❌ Invalid app export');
        process.exit(1);
    }
    
    console.log('🎯 Netlify mode test PASSED!');
    
} catch (error) {
    console.error('❌ Error in Netlify mode:', error.message);
    process.exit(1);
}
