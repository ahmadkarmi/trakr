/**
 * Production Verification Script
 * 
 * Tests critical production endpoints and functionality
 * Run: node scripts/verify-production.js
 */

const https = require('https');

const PRODUCTION_URL = 'https://trakr-mobile.vercel.app';
const tests = [];
let passed = 0;
let failed = 0;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function test(name, fn) {
  tests.push({ name, fn });
}

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Test 1: Root page loads
test('Root page (/) loads successfully', async () => {
  const res = await fetch(PRODUCTION_URL);
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
  if (!res.body.includes('<!DOCTYPE html') && !res.body.includes('<!doctype html')) {
    throw new Error('Response does not contain HTML');
  }
});

// Test 2: Login page loads
test('Login page (/login) loads successfully', async () => {
  const res = await fetch(`${PRODUCTION_URL}/login`);
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
});

// Test 3: Direct dashboard URL (critical for SPA routing)
test('Direct dashboard URL (/dashboard/admin) loads', async () => {
  const res = await fetch(`${PRODUCTION_URL}/dashboard/admin`);
  if (res.status === 404) {
    throw new Error('Dashboard URL returns 404 - SPA routing broken!');
  }
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
});

// Test 4: Assets folder accessible
test('Assets folder serves files correctly', async () => {
  const res = await fetch(`${PRODUCTION_URL}/manifest.json`);
  if (res.status !== 200) {
    throw new Error(`Manifest not found: ${res.status}`);
  }
  try {
    JSON.parse(res.body);
  } catch (e) {
    throw new Error('Manifest is not valid JSON');
  }
});

// Test 5: Service Worker loads
test('Service Worker (sw.js) loads', async () => {
  const res = await fetch(`${PRODUCTION_URL}/sw.js`);
  if (res.status !== 200) {
    throw new Error(`Service Worker not found: ${res.status}`);
  }
  if (!res.body.includes('CACHE_NAME')) {
    throw new Error('Service Worker does not contain expected code');
  }
});

// Test 6: Icon loads
test('App icon (icon.svg) loads', async () => {
  const res = await fetch(`${PRODUCTION_URL}/icon.svg`);
  if (res.status !== 200) {
    throw new Error(`Icon not found: ${res.status}`);
  }
});

// Test 7: Check for lazy-loaded chunks (simulate)
test('Asset URLs are not rewritten to index.html', async () => {
  // Test that /assets/* URLs don't return HTML
  const res = await fetch(`${PRODUCTION_URL}/assets/nonexistent-chunk.js`);
  
  // Should be 404 (file doesn't exist) not 200 with HTML (rewrite issue)
  if (res.status === 200 && res.body.includes('<!DOCTYPE html')) {
    throw new Error('Assets are being rewritten to index.html - vercel.json issue!');
  }
  
  // 404 is expected for non-existent file
  if (res.status !== 404) {
    log(`  ⚠️  Unexpected status ${res.status} for missing asset`, colors.yellow);
  }
});

// Test 8: Check Content-Type headers
test('HTML pages have correct Content-Type', async () => {
  const res = await fetch(`${PRODUCTION_URL}/login`);
  const contentType = res.headers['content-type'];
  if (!contentType || !contentType.includes('text/html')) {
    throw new Error(`Expected text/html, got ${contentType}`);
  }
});

// Test 9: Check cache headers for assets
test('Assets have proper cache headers', async () => {
  const res = await fetch(`${PRODUCTION_URL}/manifest.json`);
  const cacheControl = res.headers['cache-control'];
  if (!cacheControl) {
    log('  ⚠️  No cache-control header found', colors.yellow);
  }
});

// Test 10: Check security headers
test('Security headers are present', async () => {
  const res = await fetch(PRODUCTION_URL);
  const securityHeaders = [
    'x-frame-options',
    'x-content-type-options',
  ];
  
  const missing = securityHeaders.filter(h => !res.headers[h]);
  if (missing.length > 0) {
    log(`  ⚠️  Missing security headers: ${missing.join(', ')}`, colors.yellow);
  }
});

// Run all tests
async function runTests() {
  log('\n🔍 Production Verification - Trakr', colors.blue);
  log(`   URL: ${PRODUCTION_URL}`, colors.blue);
  log(`   Tests: ${tests.length}\n`, colors.blue);

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      log(`✅ ${name}`, colors.green);
    } catch (error) {
      failed++;
      log(`❌ ${name}`, colors.red);
      log(`   Error: ${error.message}`, colors.red);
    }
  }

  // Summary
  log('\n' + '='.repeat(60), colors.blue);
  log(`\n📊 Test Results:`, colors.blue);
  log(`   Total: ${tests.length}`, colors.blue);
  log(`   Passed: ${passed}`, passed === tests.length ? colors.green : colors.yellow);
  log(`   Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`   Success Rate: ${Math.round(passed / tests.length * 100)}%\n`, 
    passed === tests.length ? colors.green : colors.yellow);

  if (failed > 0) {
    log('⚠️  Some tests failed. Check the errors above.', colors.red);
    log('   Most common fixes:', colors.yellow);
    log('   1. Deploy fix/e2e-login-failures-router-context branch', colors.yellow);
    log('   2. Verify Vercel environment variables', colors.yellow);
    log('   3. Clear Service Worker cache in browser\n', colors.yellow);
    process.exit(1);
  } else {
    log('✅ All tests passed! Production is healthy.\n', colors.green);
    process.exit(0);
  }
}

// Run
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});
