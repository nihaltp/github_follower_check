/**
 * Package.json Configuration Validation Tests
 * 
 * These tests validate the integrity and correctness of package.json
 * focusing on the Next.js version upgrade from 15.2.4 to 15.4.2
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
    console.log('\n🧪 Running Package.json Validation Tests\n');
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

function assertMatches(value, pattern, message = '') {
  if (!pattern.test(value)) {
    throw new Error(`${message}\n  Value "${value}" does not match pattern ${pattern}`);
  }
}

function assertExists(value, message = 'Value should exist') {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

function assertIsObject(value, message = 'Value should be an object') {
  if (typeof value !== 'object' || value === null) {
    throw new Error(message);
  }
}

// Test suite
const runner = new TestRunner();

// Load package.json
let packageJson;
try {
  const packagePath = path.join(process.cwd(), 'package.json');
  const content = fs.readFileSync(packagePath, 'utf-8');
  packageJson = JSON.parse(content);
} catch (error) {
  console.error('❌ Failed to load package.json:', error.message);
  process.exit(1);
}

// Test 1: Validate JSON structure
runner.test('package.json should be valid JSON', () => {
  assertExists(packageJson, 'package.json should be parsed successfully');
  assertIsObject(packageJson, 'package.json should be an object');
});

// Test 2: Validate required fields
runner.test('package.json should have required fields', () => {
  const requiredFields = ['name', 'version', 'scripts', 'dependencies'];
  requiredFields.forEach(field => {
    assertExists(packageJson[field], `package.json should have "${field}" field`);
  });
});

// Test 3: Validate Next.js version upgrade
runner.test('Next.js version should be 15.4.2', () => {
  assertEquals(
    packageJson.dependencies.next,
    '15.4.2',
    'Next.js version should be exactly 15.4.2'
  );
});

// Test 4: Validate Next.js version is not the old version
runner.test('Next.js version should not be the old 15.2.4', () => {
  assertTrue(
    packageJson.dependencies.next !== '15.2.4',
    'Next.js version should have been upgraded from 15.2.4'
  );
});

// Test 5: Validate Next.js version format (semver)
runner.test('Next.js version should follow semantic versioning', () => {
  const semverPattern = /^\d+\.\d+\.\d+$/;
  assertMatches(
    packageJson.dependencies.next,
    semverPattern,
    'Next.js version should follow semantic versioning (major.minor.patch)'
  );
});

// Test 6: Validate Next.js version is within expected range
runner.test('Next.js version should be 15.x.x', () => {
  const version = packageJson.dependencies.next;
  const major = parseInt(version.split('.')[0]);
  assertEquals(major, 15, 'Next.js major version should be 15');
});

// Test 7: Validate Next.js version is a security patch (minor version 4)
runner.test('Next.js version should include security patch (15.4.x)', () => {
  const version = packageJson.dependencies.next;
  const parts = version.split('.');
  assertTrue(
    parts[0] === '15' && parts[1] === '4',
    'Next.js version should be 15.4.x for security patch'
  );
});

// Test 8: Validate scripts section
runner.test('package.json should have necessary build scripts', () => {
  const requiredScripts = ['dev', 'build', 'start', 'lint'];
  requiredScripts.forEach(script => {
    assertExists(
      packageJson.scripts[script],
      `package.json should have "${script}" script`
    );
  });
});

// Test 9: Validate dependencies structure
runner.test('dependencies should be an object with valid entries', () => {
  assertIsObject(packageJson.dependencies, 'dependencies should be an object');
  assertTrue(
    Object.keys(packageJson.dependencies).length > 0,
    'dependencies should not be empty'
  );
});

// Test 10: Validate devDependencies structure
runner.test('devDependencies should be an object with valid entries', () => {
  assertIsObject(packageJson.devDependencies, 'devDependencies should be an object');
  assertTrue(
    Object.keys(packageJson.devDependencies).length > 0,
    'devDependencies should not be empty'
  );
});

// Test 11: Validate React version compatibility with Next.js 15.4.2
runner.test('React version should be compatible with Next.js 15.4.2', () => {
  const reactVersion = packageJson.dependencies.react;
  assertExists(reactVersion, 'React dependency should exist');
  // Next.js 15 requires React 18 or 19
  assertTrue(
    reactVersion.includes('19') || reactVersion.includes('18'),
    'React version should be 18 or 19 for Next.js 15 compatibility'
  );
});

// Test 12: Validate React DOM version matches React version
runner.test('React DOM version should match React version', () => {
  const reactVersion = packageJson.dependencies.react;
  const reactDomVersion = packageJson.dependencies['react-dom'];
  assertEquals(
    reactVersion,
    reactDomVersion,
    'React and React DOM versions should match'
  );
});

// Test 13: Validate no version conflicts (no duplicate next in devDependencies)
runner.test('Next.js should not be in both dependencies and devDependencies', () => {
  assertTrue(
    !packageJson.devDependencies || !packageJson.devDependencies.next,
    'Next.js should only be in dependencies, not devDependencies'
  );
});

// Test 14: Validate TypeScript is in devDependencies
runner.test('TypeScript should be in devDependencies for Next.js project', () => {
  assertExists(
    packageJson.devDependencies?.typescript,
    'TypeScript should be in devDependencies'
  );
});

// Test 15: Validate version format for all dependencies (FIXED)
runner.test('All dependency versions should have valid format', () => {
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  // Updated regex to properly handle ^19, ^3.10.0, ^5, 15.4.2, latest, etc.
  const validVersionPattern = /^(\^|~|>=|<=|>|<|=)?(\d+)(\.\d+)?(\.\d+)?(-[\w.-]+)?$|^latest$/;
  
  Object.entries(allDeps).forEach(([name, version]) => {
    assertTrue(
      validVersionPattern.test(version),
      `Dependency "${name}" has invalid version format: "${version}"`
    );
  });
});

// Test 16: Validate package name
runner.test('package.json should have a valid name', () => {
  assertExists(packageJson.name, 'Package should have a name');
  assertTrue(
    packageJson.name.length > 0,
    'Package name should not be empty'
  );
});

// Test 17: Validate package version
runner.test('package.json should have a valid version', () => {
  assertExists(packageJson.version, 'Package should have a version');
  const semverPattern = /^\d+\.\d+\.\d+/;
  assertMatches(
    packageJson.version,
    semverPattern,
    'Package version should follow semantic versioning'
  );
});

// Test 18: Validate private flag
runner.test('package.json should be marked as private', () => {
  assertEquals(
    packageJson.private,
    true,
    'Package should be marked as private for Next.js applications'
  );
});

// Test 19: Validate critical dependencies are present
runner.test('Critical Next.js dependencies should be present', () => {
  const criticalDeps = ['react', 'react-dom', 'next'];
  criticalDeps.forEach(dep => {
    assertExists(
      packageJson.dependencies[dep],
      `Critical dependency "${dep}" should be present`
    );
  });
});

// Test 20: Validate no conflicting Next.js versions
runner.test('Should not have multiple Next.js version specifications', () => {
  const nextVersions = Object.entries(packageJson.dependencies)
    .filter(([key]) => key.toLowerCase().includes('next'))
    .filter(([key]) => key === 'next');
  
  assertEquals(
    nextVersions.length,
    1,
    'Should have exactly one Next.js dependency entry'
  );
});

// Test 21: Edge case - Validate against empty version strings
runner.test('No dependency should have empty version string', () => {
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  Object.entries(allDeps).forEach(([name, version]) => {
    assertTrue(
      version && version.length > 0,
      `Dependency "${name}" should not have empty version`
    );
  });
});

// Test 22: Validate Next.js version is a specific version (not range)
runner.test('Next.js should use exact version (not version range)', () => {
  const nextVersion = packageJson.dependencies.next;
  const hasRangeIndicator = /^[\^~><=]/.test(nextVersion);
  assertTrue(
    !hasRangeIndicator,
    'Next.js version should be exact, not a range (for security fix)'
  );
});

// Test 23: Validate package.json encoding and structure
runner.test('package.json should be properly formatted JSON', () => {
  const packagePath = path.join(process.cwd(), 'package.json');
  const content = fs.readFileSync(packagePath, 'utf-8');
  
  // Should not have trailing commas (which are invalid JSON)
  assertTrue(
    !content.match(/,\s*[}\]]/),
    'package.json should not have trailing commas'
  );
  
  // Should be valid UTF-8
  assertTrue(
    content.length > 0,
    'package.json should not be empty'
  );
});

// Test 24: Validate consistency of related packages
runner.test('Related Radix UI packages should use consistent version strategy', () => {
  const radixPackages = Object.entries(packageJson.dependencies)
    .filter(([name]) => name.startsWith('@radix-ui/'));
  
  assertTrue(
    radixPackages.length > 0,
    'Should have Radix UI packages'
  );
  
  // Most Radix packages use 'latest'
  const versionStrategies = radixPackages.map(([, version]) => version);
  const hasConsistentStrategy = versionStrategies.every(v => v === 'latest');
  
  assertTrue(
    hasConsistentStrategy,
    'Radix UI packages should use consistent version strategy'
  );
});

// Test 25: Validate Next.js compatibility with other dependencies
runner.test('Next.js 15.4.2 should be compatible with TypeScript 5.x', () => {
  const tsVersion = packageJson.devDependencies.typescript;
  assertExists(tsVersion, 'TypeScript should be present');
  assertTrue(
    tsVersion.includes('5') || tsVersion.startsWith('^5'),
    'TypeScript should be version 5.x for Next.js 15 compatibility'
  );
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});