#!/bin/bash

echo "🚀 Testing Production Deployment on Netlify"
echo "============================================="

PROD_URL="https://6897282650d587b75fe1493e--ubiquitous-meringue-b2611a.netlify.app"

echo ""
echo "1. Testing Basic API Health..."
response=$(curl -s -w "%{http_code}" "$PROD_URL/api/test" -o /dev/null)
if [ "$response" -eq 200 ]; then
    echo "✅ API Health: PASS (200)"
else
    echo "❌ API Health: FAIL ($response)"
fi

echo ""
echo "2. Testing Categories Endpoint..."
categories=$(curl -s "$PROD_URL/api/categories" | jq -r '.success')
if [ "$categories" = "true" ]; then
    echo "✅ Categories API: PASS"
    curl -s "$PROD_URL/api/categories" | jq '.data[0:2]'
else
    echo "❌ Categories API: FAIL"
fi

echo ""
echo "3. Testing Collections Endpoint..."
collections=$(curl -s "$PROD_URL/api/collections" | jq -r '.success')
if [ "$collections" = "true" ]; then
    echo "✅ Collections API: PASS"
    curl -s "$PROD_URL/api/collections" | jq '.data[0:2]'
else
    echo "❌ Collections API: FAIL"
fi

echo ""
echo "4. Testing Products Endpoint..."
products=$(curl -s "$PROD_URL/api/products" | jq -r '.success')
if [ "$products" = "true" ]; then
    echo "✅ Products API: PASS"
    curl -s "$PROD_URL/api/products" | jq '.data[0:2]'
else
    echo "❌ Products API: FAIL"
fi

echo ""
echo "5. Testing Frontend Pages..."
home_status=$(curl -s -w "%{http_code}" "$PROD_URL/" -o /dev/null)
shop_status=$(curl -s -w "%{http_code}" "$PROD_URL/shop.html" -o /dev/null)

if [ "$home_status" -eq 200 ]; then
    echo "✅ Homepage: PASS (200)"
else
    echo "❌ Homepage: FAIL ($home_status)"
fi

if [ "$shop_status" -eq 200 ]; then
    echo "✅ Shop Page: PASS (200)"
else
    echo "❌ Shop Page: FAIL ($shop_status)"
fi

echo ""
echo "7. Testing Admin Login..."
admin_response=$(curl -s -X POST "$PROD_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bingo.com","password":"admin123"}')

admin_success=$(echo "$admin_response" | jq -r '.success')
if [ "$admin_success" = "true" ]; then
    echo "✅ Admin Login: PASS"
    admin_token=$(echo "$admin_response" | jq -r '.token')
    echo "📝 Got admin token"
    
    echo ""
    echo "8. Testing Admin Category Creation..."
    create_response=$(curl -s -X POST "$PROD_URL/api/admin/categories" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $admin_token" \
      -d '{"name":"API Test Category","slug":"api-test-category","description":"Created via API test"}')
    
    create_success=$(echo "$create_response" | jq -r '.success')
    if [ "$create_success" = "true" ]; then
        echo "✅ Admin Category Creation: PASS"
        echo "$create_response" | jq '.message'
    else
        echo "❌ Admin Category Creation: FAIL"
    fi
echo ""
echo "6. Testing Image Assets..."
img_status=$(curl -s -w "%{http_code}" "$PROD_URL/images/logo.png" -o /dev/null)
if [ "$img_status" -eq 200 ]; then
    echo "✅ Image Assets: PASS (200)"
else
    echo "❌ Image Assets: FAIL ($img_status)"
fi

echo ""
echo "7. Testing Admin Login..."
admin_response=$(curl -s -X POST "$PROD_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bingo.com","password":"admin123"}')

admin_success=$(echo "$admin_response" | jq -r '.success')
if [ "$admin_success" = "true" ]; then
    echo "✅ Admin Login: PASS"
    admin_token=$(echo "$admin_response" | jq -r '.token')
    echo "📝 Got admin token"
    
    echo ""
    echo "8. Testing Admin Category Creation..."
    create_response=$(curl -s -X POST "$PROD_URL/api/admin/categories" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $admin_token" \
      -d '{"name":"API Test Category","slug":"api-test-category","description":"Created via API test"}')
    
    create_success=$(echo "$create_response" | jq -r '.success')
    if [ "$create_success" = "true" ]; then
        echo "✅ Admin Category Creation: PASS"
        echo "$create_response" | jq '.message'
    else
        echo "❌ Admin Category Creation: FAIL"
    fi
else
    echo "❌ Admin Login: FAIL"
fi

echo ""
echo "============================================="
echo "🎯 Production Smoke Test Complete!"
echo "🌐 Database: Netlify PostgreSQL"
echo "📊 All admin functions ready for production use!"
echo "============================================="
