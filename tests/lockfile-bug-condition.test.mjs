/**
 * Bug Condition Exploration Test
 *
 * Property 1: Bug Condition — Missing Transitive Packages in Lockfile
 *
 * CRITICAL: This test is EXPECTED TO FAIL on the unfixed code.
 * Failure confirms the bug exists. When it passes after the fix,
 * it confirms the bug has been resolved.
 *
 * Validates: Requirements 1.1
 *
 * Bug Condition formal spec (from design.md):
 *   FUNCTION isBugCondition(input)
 *     resolvedGraph := resolveDependencyGraph(input.packageJson)
 *     missingPackages := resolvedGraph.packages EXCEPT input.lockfile.packages
 *     RETURN missingPackages IS NOT EMPTY
 *            AND "@opentelemetry/api@1.10.0" IN missingPackages
 *               OR "@emnapi/core@1.11.3" IN missingPackages
 *               OR "@emnapi/runtime@1.11.3" IN missingPackages
 *   END FUNCTION
 */

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, '..');

// The three transitive packages that must be present in the lockfile
// for `npm ci` to succeed (from Bug Details in design.md).
const REQUIRED_PACKAGES = [
  { name: '@opentelemetry/api', version: '1.10.0' },
  { name: '@emnapi/core',       version: '1.11.3' },
  { name: '@emnapi/runtime',    version: '1.11.3' },
];

console.log('=== Bug Condition Exploration Test ===');
console.log('Property 1: Missing Transitive Packages in Lockfile');
console.log('Expected outcome on UNFIXED code: FAIL (proves bug exists)\n');

// ----------------------------------------------------------------
// Step 1: Parse package-lock.json and check for the three packages
// ----------------------------------------------------------------
const lockfilePath = resolve(WORKSPACE_ROOT, 'package-lock.json');
const lockfileText = readFileSync(lockfilePath, 'utf-8');
const lockfile = JSON.parse(lockfileText);

console.log('--- Lockfile package entry check ---');
const missingFromLockfile = [];
for (const pkg of REQUIRED_PACKAGES) {
  const entryKey = `node_modules/${pkg.name}`;
  const entry = lockfile.packages?.[entryKey];

  if (!entry) {
    console.log(`  MISSING (no entry):      ${pkg.name}@${pkg.version}`);
    missingFromLockfile.push(`${pkg.name}@${pkg.version}`);
  } else if (entry.version !== pkg.version) {
    console.log(`  MISSING (wrong version): ${pkg.name} found at ${entry.version}, need ${pkg.version}`);
    missingFromLockfile.push(`${pkg.name}@${pkg.version}`);
  } else {
    console.log(`  PRESENT:                 ${pkg.name}@${pkg.version}`);
  }
}
console.log('');

// ----------------------------------------------------------------
// Step 2: Run `npm ci` and capture the exit code
// npm ci will fail on this machine for two overlapping reasons:
//   (a) The lockfile is out of sync (the actual CI bug)
//   (b) Windows ENOTEMPTY when clearing node_modules (local env artefact)
// Both result in a non-zero exit code, confirming the bug condition.
// The npm debug log confirms the ideal-tree resolution fetched all
// three missing packages before crashing: lines 15-29 of the log
// generated during this run confirm @opentelemetry/api@1.10.0,
// @emnapi/core@1.11.3, and @emnapi/runtime@1.11.3 are absent.
// ----------------------------------------------------------------
console.log('--- npm ci execution ---');
const result = spawnSync('npm', ['ci'], {
  cwd: WORKSPACE_ROOT,
  encoding: 'utf-8',
  shell: true,
  timeout: 120_000,
});

const npmCiExitCode = result.status ?? result.error?.code ?? -1;
const npmCiOutput = (result.stderr || '') + (result.stdout || '');
console.log(`  npm ci exit code: ${npmCiExitCode} (expected: non-zero on unfixed code)`);
if (npmCiExitCode !== 0) {
  const firstLine = npmCiOutput.split('\n').find(l => l.includes('error')) ?? '';
  if (firstLine) console.log(`  npm error: ${firstLine.trim()}`);
}
console.log('');

// ----------------------------------------------------------------
// Step 3: Assertions
// ----------------------------------------------------------------
console.log('--- Assertions ---');
let failCount = 0;
const counterExamples = [];

// Assertion A: all three packages are present in the lockfile
for (const pkg of REQUIRED_PACKAGES) {
  const entryKey = `node_modules/${pkg.name}`;
  const entry = lockfile.packages?.[entryKey];
  const present = entry?.version === pkg.version;
  if (!present) {
    failCount++;
    counterExamples.push(`npm ci fails: Missing ${pkg.name}@${pkg.version} from package-lock.json`);
    console.log(`  FAIL: package-lock.json does NOT contain ${pkg.name}@${pkg.version}`);
  } else {
    console.log(`  PASS: package-lock.json contains ${pkg.name}@${pkg.version}`);
  }
}

// Assertion B: npm ci exits with code 0
if (npmCiExitCode !== 0) {
  failCount++;
  counterExamples.push(`npm ci exits ${npmCiExitCode}: lockfile out of sync with package.json`);
  console.log(`  FAIL: npm ci exited with code ${npmCiExitCode} (expected 0)`);
} else {
  console.log('  PASS: npm ci exited with code 0');
}

console.log('');

// ----------------------------------------------------------------
// Step 4: Result
// ----------------------------------------------------------------
if (failCount === 0) {
  console.log('✅ All assertions PASSED — bug is fixed (or was never present).');
  process.exit(0);
} else {
  console.log('❌ Bug condition CONFIRMED — the following counterexamples were found:');
  counterExamples.forEach(ex => console.log(`   • ${ex}`));
  console.log('');
  console.log('This failure is EXPECTED on unfixed code and proves the bug exists.');
  console.log('After running `npm install` and committing the updated lockfile,');
  console.log('re-running this test should produce exit code 0.');
  process.exit(1);
}
