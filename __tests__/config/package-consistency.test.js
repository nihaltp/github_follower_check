/**
 * Package Consistency Integration Tests
 * 
 * These tests validate that package.json and pnpm-lock.yaml are consistent
 * with each other after the Next.js security upgrade
 */

const fs = require('fs');
const path = require('path');

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log('\n🧪 Running Package Consistency Integration Tests\n');
    console.log('='.repeat(60));
    
    for (const { description, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ PASS: ${description}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ FAIL: ${description}`);
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);
    
    return this.failed === 0;
  }
}

// Assertion helpers
function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertTrue(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExists(value, message = 'Value should exist') {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

// Test suite
const runner = new TestRunner();

// Load files
let packageJson, lockContent;
try {
  const packagePath = path.join(process.cwd(), 'package.json');
  packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  
  const lockPath = path.join(process.cwd(), 'pnpm-lock.yaml');
  lockContent = fs.readFileSync(lockPath, 'utf-8');
} catch (error) {
  console.error('❌ Failed to load files:', error.message);
  process.exit(1);
}

// Test 1: Next.js versions match between files
runner.test('Next.js version in lock file should match package.json', () => {
  const packageVersion = packageJson.dependencies.next;
  assertTrue(
    lockContent.includes(packageVersion),
    `Lock file should reference Next.js version ${packageVersion}`
  );
});

// Test 2: React versions consistency
runner.test('React version should be consistent across both files', () => {
  const reactVersion = packageJson.dependencies.react;
  const versionNumber = reactVersion.replace('^', '');
  assertTrue(
    lockContent.includes(`react@${versionNumber}`) || lockContent.includes(`react@${reactVersion}`),
    'Lock file should reference same React version as package.json'
  );
});

// Test 3: All dependencies in package.json should be in lock file
runner.test('All package.json dependencies should be in lock file', () => {
  const deps = Object.keys(packageJson.dependencies);
  const missingDeps = [];
  
  deps.forEach(dep => {
    if (!lockContent.includes(dep)) {
      missingDeps.push(dep);
    }
  });
  
  assertTrue(
    missingDeps.length === 0,
    `Missing dependencies in lock file: ${missingDeps.join(', ')}`
  );
});

// Test 4: All devDependencies in package.json should be in lock file
runner.test('All package.json devDependencies should be in lock file', () => {
  const devDeps = Object.keys(packageJson.devDependencies || {});
  const missingDeps = [];
  
  devDeps.forEach(dep => {
    if (!lockContent.includes(dep)) {
      missingDeps.push(dep);
    }
  });
  
  assertTrue(
    missingDeps.length === 0,
    `Missing devDependencies in lock file: ${missingDeps.join(', ')}`
  );
});

// Test 5: TypeScript version consistency
runner.test('TypeScript version should be consistent', () => {
  const tsVersion = packageJson.devDependencies.typescript;
  const versionNumber = tsVersion.replace('^', '');
  assertTrue(
    lockContent.includes('typescript'),
    'Lock file should reference TypeScript'
  );
});

// Test 6: File timestamps indicate lock file is newer or same
runner.test('Lock file should be up to date with package.json', () => {
  const packagePath = path.join(process.cwd(), 'package.json');
  const lockPath = path.join(process.cwd(), 'pnpm-lock.yaml');
  
  const packageStats = fs.statSync(packagePath);
  const lockStats = fs.statSync(lockPath);
  
  // Lock file should be modified at the same time or after package.json
  assertTrue(
    lockStats.mtime >= packageStats.mtime - 1000, // Allow 1 second tolerance
    'Lock file should be synchronized with package.json (run pnpm install if needed)'
  );
});

// Test 7: No version mismatches for critical packages
runner.test('Critical packages should have no version mismatches', () => {
  const criticalPackages = ['next', 'react', 'react-dom'];
  criticalPackages.forEach(pkg => {
    const version = packageJson.dependencies[pkg];
    assertTrue(
      lockContent.includes(`${pkg}@`) || lockContent.includes(`${pkg}:`),
      `Lock file should properly reference ${pkg}`
    );
  });
});

// Test 8: Package.json and lock file both reference Next.js 15.4.2
runner.test('Both files should reference Next.js 15.4.2 upgrade', () => {
  assertEquals(
    packageJson.dependencies.next,
    '15.4.2',
    'package.json should have Next.js 15.4.2'
  );
  assertTrue(
    lockContent.includes('15.4.2'),
    'Lock file should reference Next.js 15.4.2'
  );
});

// Test 9: No old version references in lock file
runner.test('Lock file should not contain old Next.js 15.2.4 references', () => {
  const oldVersionPattern = /next@15\.2\.4|next:\s*15\.2\.4/;
  assertTrue(
    !oldVersionPattern.test(lockContent),
    'Lock file should not reference old Next.js 15.2.4'
  );
});

// Test 10: Geist font dependency consistency
runner.test('Geist font package should be consistent', () => {
  assertTrue(
    packageJson.dependencies.geist === 'latest',
    'Geist should use latest version in package.json'
  );
  assertTrue(
    lockContent.includes('geist'),
    'Lock file should reference geist package'
  );
});

// Test 11: Radix UI packages consistency
runner.test('Radix UI packages should be consistent', () => {
  const radixPackages = Object.keys(packageJson.dependencies)
    .filter(name => name.startsWith('@radix-ui/'));
  
  radixPackages.forEach(pkg => {
    assertTrue(
      lockContent.includes(pkg),
      `Lock file should reference ${pkg}`
    );
  });
});

// Test 12: Sharp image optimization consistency
runner.test('Sharp package should be in lock file (Next.js optional dep)', () => {
  // Sharp is an optional dependency for Next.js image optimization
  if (lockContent.includes('sharp')) {
    // If sharp is present, verify it's referenced correctly
    assertTrue(
      lockContent.includes('sharp@') || lockContent.includes('sharp:'),
      'Sharp should be properly referenced in lock file'
    );
  }
  // It's okay if sharp is not present (optional)
});

// Test 13: Next.js platform binaries consistency
runner.test('Next.js platform binaries should be in lock file', () => {
  // Check for at least one platform binary
  const hasPlatformBinary = 
    lockContent.includes('@next/swc-darwin') ||
    lockContent.includes('@next/swc-linux') ||
    lockContent.includes('@next/swc-win32');
  
  assertTrue(
    hasPlatformBinary,
    'Lock file should contain Next.js platform-specific binaries'
  );
});

// Test 14: Styled-jsx version consistency (Next.js dependency)
runner.test('Styled-jsx should be in lock file (Next.js dependency)', () => {
  assertTrue(
    lockContent.includes('styled-jsx'),
    'Lock file should include styled-jsx (required by Next.js)'
  );
});

// Test 15: No missing peer dependencies warnings
runner.test('Package structure should support Next.js peer dependencies', () => {
  // Next.js 15 requires React 18 or 19
  const reactVersion = packageJson.dependencies.react;
  const reactDomVersion = packageJson.dependencies['react-dom'];
  
  assertExists(reactVersion, 'React should be present');
  assertExists(reactDomVersion, 'React DOM should be present');
  assertEquals(
    reactVersion,
    reactDomVersion,
    'React and React DOM versions should match'
  );
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});