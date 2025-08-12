#!/bin/bash

echo "🚀 COMPREHENSIVE NETLIFY TESTING - BINGO E-Commerce"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    print_status "INFO" "Testing: $description"
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_status "SUCCESS" "Status: $http_code - $description"
        if [ ${#body} -gt 100 ]; then
            echo "   📄 Response: ${body:0:100}..."
        else
            echo "   📄 Response: $body"
        fi
    else
        print_status "ERROR" "Status: $http_code (Expected: $expected_status) - $description"
        echo "   📄 Response: $body"
        return 1
    fi
    return 0
}

# Step 1: Test Local Development
echo "🔧 STEP 1: Testing Local Development Server"
echo "=========================================="

# Set environment variables for local testing
export NODE_ENV=development
export JWT_SECRET=dev-secret-key
export PORT=3001
export NETLIFY=false

print_status "INFO" "Starting local development server..."

# Start server in background
node server-sqlite.js &
SERVER_PID=$!

# Function to cleanup
cleanup() {
    echo ""
    print_status "INFO" "Cleaning up..."
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    print_status "SUCCESS" "Local server stopped"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Wait for server to start
sleep 5

print_status "INFO" "Running local tests..."

# Test local endpoints
LOCAL_BASE="http://localhost:3001"
local_tests_passed=0
local_tests_total=6

test_endpoint "$LOCAL_BASE/api/test" "200" "API Health Check" && ((local_tests_passed++))
test_endpoint "$LOCAL_BASE/api/categories" "200" "Categories Endpoint" && ((local_tests_passed++))
test_endpoint "$LOCAL_BASE/api/collections" "200" "Collections Endpoint" && ((local_tests_passed++))
test_endpoint "$LOCAL_BASE/api/products" "200" "Products Endpoint" && ((local_tests_passed++))
test_endpoint "$LOCAL_BASE/api/admin/settings" "401" "Protected Admin Endpoint" && ((local_tests_passed++))
test_endpoint "$LOCAL_BASE/api/nonexistent" "404" "404 Error Handling" && ((local_tests_passed++))

echo ""
print_status "INFO" "Local Tests Results: $local_tests_passed/$local_tests_total passed"

if [ $local_tests_passed -eq $local_tests_total ]; then
    print_status "SUCCESS" "All local tests passed! ✨"
else
    print_status "ERROR" "Some local tests failed. Please fix before deploying."
    exit 1
fi

# Step 2: Deploy to Netlify
echo ""
echo "🚀 STEP 2: Deploying to Netlify"
echo "==============================="

print_status "INFO" "Stopping local server for deployment..."
cleanup
trap - EXIT  # Remove the trap

print_status "INFO" "Building and deploying to Netlify..."

# Deploy to Netlify
netlify deploy --prod --dir . --message "Updated server with missing API endpoints"

if [ $? -eq 0 ]; then
    print_status "SUCCESS" "Deployment completed successfully!"
else
    print_status "ERROR" "Deployment failed!"
    exit 1
fi

# Step 3: Test Production Deployment
echo ""
echo "🌐 STEP 3: Testing Production Deployment"
echo "======================================="

# Get the site URL
SITE_URL=$(netlify status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ -z "$SITE_URL" ]; then
    print_status "ERROR" "Could not determine site URL"
    exit 1
fi

print_status "INFO" "Testing production site: $SITE_URL"

# Wait for deployment to be live
print_status "INFO" "Waiting for deployment to be live..."
sleep 30

# Test production endpoints
prod_tests_passed=0
prod_tests_total=6

test_endpoint "$SITE_URL/api/test" "200" "Production API Health Check" && ((prod_tests_passed++))
test_endpoint "$SITE_URL/api/categories" "200" "Production Categories Endpoint" && ((prod_tests_passed++))
test_endpoint "$SITE_URL/api/collections" "200" "Production Collections Endpoint" && ((prod_tests_passed++))
test_endpoint "$SITE_URL/api/products" "200" "Production Products Endpoint" && ((prod_tests_passed++))
test_endpoint "$SITE_URL/api/admin/settings" "401" "Production Protected Admin Endpoint" && ((prod_tests_passed++))
test_endpoint "$SITE_URL/api/nonexistent" "404" "Production 404 Error Handling" && ((prod_tests_passed++))

echo ""
print_status "INFO" "Production Tests Results: $prod_tests_passed/$prod_tests_total passed"

# Step 4: Additional Production Tests
echo ""
echo "🔍 STEP 4: Additional Production Tests"
echo "====================================="

print_status "INFO" "Testing static file serving..."
test_endpoint "$SITE_URL/" "200" "Home Page" && print_status "SUCCESS" "Static files serving correctly"

print_status "INFO" "Testing admin panel..."
test_endpoint "$SITE_URL/admin.html" "200" "Admin Panel" && print_status "SUCCESS" "Admin panel accessible"

# Step 5: Summary
echo ""
echo "📊 FINAL RESULTS"
echo "================"

if [ $local_tests_passed -eq $local_tests_total ] && [ $prod_tests_passed -eq $prod_tests_total ]; then
    print_status "SUCCESS" "🎉 ALL TESTS PASSED!"
    echo ""
    echo "✅ Local Development: $local_tests_passed/$local_tests_total tests passed"
    echo "✅ Production Deploy: $prod_tests_passed/$prod_tests_total tests passed"
    echo ""
    print_status "SUCCESS" "Your BINGO E-Commerce website is successfully deployed and working!"
    echo ""
    print_status "INFO" "🌐 Production URL: $SITE_URL"
    print_status "INFO" "👨‍💼 Admin Panel: $SITE_URL/admin.html"
    print_status "INFO" "🧪 API Health: $SITE_URL/api/test"
    echo ""
    print_status "SUCCESS" "Deployment completed successfully! 🚀"
else
    print_status "ERROR" "Some tests failed:"
    echo "   Local Tests: $local_tests_passed/$local_tests_total"
    echo "   Production Tests: $prod_tests_passed/$prod_tests_total"
    echo ""
    print_status "ERROR" "Please check the errors above and redeploy."
    exit 1
fi
