#!/usr/bin/env node

/**
 * Test Runner for Configuration Validation
 * 
 * Runs all configuration tests for package.json and pnpm-lock.yaml
 */

const { spawn } = require('child_process');
const path = require('path');

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, 'config', testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test ${testFile} failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Configuration Validation Test Suite');
  console.log('   Testing Next.js 15.2.4 → 15.4.2 Security Upgrade');
  console.log('='.repeat(60));
  
  const tests = [
    'package-json.test.js',
    'pnpm-lock.test.js',
    'package-consistency.test.js'
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      await runTest(test);
    } catch (error) {
      console.error(`\n❌ ${test} failed:`, error.message);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ All configuration validation tests passed!');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the output above.');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});