#!/bin/bash

echo "🧪 Quick Local Test - BINGO E-Commerce"
echo "======================================"

# Set environment variables
export NODE_ENV=development
export JWT_SECRET=dev-secret-key
export PORT=3001
export NETLIFY=false

echo "🔄 Starting server..."
node server-sqlite.js &
SERVER_PID=$!

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Stopping server..."
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    echo "✅ Server stopped"
}

trap cleanup EXIT

# Wait for server to start
sleep 5

echo ""
echo "🧪 Testing new endpoints..."

# Test the new endpoints
echo "1. Testing /api/test"
curl -s http://localhost:3001/api/test | head -c 100
echo ""

echo ""
echo "2. Testing /api/categories"
curl -s http://localhost:3001/api/categories | head -c 100
echo ""

echo ""
echo "3. Testing /api/collections"
curl -s http://localhost:3001/api/collections | head -c 100
echo ""

echo ""
echo "4. Testing /api/products"
curl -s http://localhost:3001/api/products | head -c 100
echo ""

echo ""
echo "🎯 Quick test completed!"
