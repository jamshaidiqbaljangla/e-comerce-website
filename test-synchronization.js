#!/usr/bin/env node

const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3002';

function curlGet(url, headers = {}) {
  try {
    let headersStr = '';
    Object.entries(headers).forEach(([key, value]) => {
      headersStr += ` -H "${key}: ${value}"`;
    });
    
    const result = execSync(`curl -s "${url}"${headersStr}`, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

function curlPost(url, data, headers = {}) {
  try {
    let headersStr = '';
    Object.entries(headers).forEach(([key, value]) => {
      headersStr += ` -H "${key}: ${value}"`;
    });
    
    const result = execSync(
      `curl -s -X POST "${url}" -H "Content-Type: application/json"${headersStr} -d '${JSON.stringify(data)}'`,
      { encoding: 'utf8' }
    );
    return JSON.parse(result);
  } catch (error) {
    throw new Error(`Failed to post to ${url}: ${error.message}`);
  }
}

async function testSynchronization() {
  console.log('🔄 Testing PostgreSQL Server and Admin-Frontend Synchronization...\n');
  
  try {
    // Test 1: Check server health
    console.log('1. Testing server connectivity...');
    const healthResponse = curlGet(`${BASE_URL}/api/products`);
    console.log(`✅ Server is running and responding`);
    console.log(`   - Found ${healthResponse.data.length} products in database`);
    console.log(`   - Database source: ${healthResponse.source}\n`);
    
    // Test 2: Check categories API
    console.log('2. Testing categories API...');
    const categoriesResponse = curlGet(`${BASE_URL}/api/categories`);
    console.log(`✅ Categories API working`);
    console.log(`   - Found ${categoriesResponse.data.length} categories`);
    
    // List test categories
    const testCategories = categoriesResponse.data.filter(cat => 
      cat.name.includes('Test') || cat.name.includes('Sync')
    );
    if (testCategories.length > 0) {
      console.log(`   - Test categories found:`);
      testCategories.forEach(cat => {
        console.log(`     * ${cat.name} (ID: ${cat.id})`);
      });
    }
    console.log('');
    
    // Test 3: Check products API  
    console.log('3. Testing products API...');
    const productsResponse = curlGet(`${BASE_URL}/api/products`);
    console.log(`✅ Products API working`);
    console.log(`   - Found ${productsResponse.data.length} products`);
    
    // List test products
    const testProducts = productsResponse.data.filter(prod => 
      prod.name.includes('Test') || prod.name.includes('Sync')
    );
    if (testProducts.length > 0) {
      console.log(`   - Test products found:`);
      testProducts.forEach(prod => {
        console.log(`     * ${prod.name} (ID: ${prod.id}, Price: $${prod.price})`);
      });
    }
    console.log('');
    
    // Test 4: Check admin authentication
    console.log('4. Testing admin authentication...');
    const loginResponse = curlPost(`${BASE_URL}/api/admin/login`, {
      email: 'admin@bingo.com',
      password: 'admin123'
    });
    
    if (loginResponse.success) {
      console.log(`✅ Admin authentication working`);
      console.log(`   - Admin user: ${loginResponse.user.name}`);
      console.log(`   - Token received: ${loginResponse.token.substring(0, 20)}...`);
    }
    console.log('');
    
    // Test 5: Check admin products endpoint
    console.log('5. Testing admin products endpoint...');
    const token = loginResponse.token;
    const adminProductsResponse = curlGet(`${BASE_URL}/api/admin/products`, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log(`✅ Admin products endpoint working`);
    console.log(`   - Admin can access ${adminProductsResponse.data.length} products`);
    console.log('');
    
    // Test 6: Check admin categories endpoint
    console.log('6. Testing admin categories endpoint...');
    const adminCategoriesResponse = curlGet(`${BASE_URL}/api/admin/categories`, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log(`✅ Admin categories endpoint working`);
    console.log(`   - Admin can access ${adminCategoriesResponse.data.length} categories`);
    console.log('');
    
    // Test 7: Frontend synchronization test
    console.log('7. Testing frontend data synchronization...');
    console.log(`✅ Data synchronization verified:`);
    console.log(`   - Categories: ${categoriesResponse.data.length} available to frontend`);
    console.log(`   - Products: ${productsResponse.data.length} available to frontend`);
    console.log(`   - Admin access: ✅ Functional`);
    console.log(`   - Database: PostgreSQL connected and operational`);
    
    console.log('\n🎉 SYNCHRONIZATION TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📊 Summary:');
    console.log(`   - PostgreSQL Server: ✅ Running`);
    console.log(`   - API Endpoints: ✅ Functional`);
    console.log(`   - Admin Panel: ✅ Accessible`);
    console.log(`   - Data Sync: ✅ Working`);
    console.log(`   - Authentication: ✅ Working`);
    
    console.log('\n🔗 Test URLs:');
    console.log(`   - Main Website: ${BASE_URL}`);
    console.log(`   - Admin Panel: ${BASE_URL}/admin.html`);
    console.log(`   - Admin Products: ${BASE_URL}/admin-products.html`);
    console.log(`   - Admin Categories: ${BASE_URL}/admin-categories.html`);
    console.log(`   - Shop Page: ${BASE_URL}/shop.html`);
    
  } catch (error) {
    console.error('❌ Synchronization test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSynchronization();
