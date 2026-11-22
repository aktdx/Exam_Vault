# Lockfile Sync Fix Bugfix Design

## Overview

The CI pipeline fails at `npm ci` because `package-lock.json` is out of sync with `package.json`. Three transitive dependencies — `@opentelemetry/api@1.10.0`, `@emnapi/core@1.11.3`, and `@emnapi/runtime@1.11.3` — are present in the resolved dependency graph but absent from the committed lockfile. Because `npm ci` enforces a strict, immutable install from the lockfile, any missing entry causes it to exit with code 1, blocking every downstream CI step.

The fix is to regenerate `package-lock.json` by running `npm install` locally, then commit the updated lockfile. No `package.json` changes are required.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `npm ci` is run against a `package-lock.json` that is missing one or more packages required by the current dependency graph
- **Property (P)**: The desired behavior when the bug condition holds — `npm ci` SHALL exit with code 0 and all dependencies SHALL be installed correctly
- **Preservation**: The existing behaviors (local `npm ci` reproducibility, non-lockfile-change CI runs, runtime behavior) that must remain unchanged by the fix
- **npm ci**: The strict, lockfile-only install command used in CI; it refuses to modify the lockfile and fails if the lockfile does not satisfy the dependency graph
- **npm install**: The command that resolves the full dependency graph and regenerates `package-lock.json` to match `package.json`
- **Transitive dependency**: A package required by a direct dependency but not listed directly in `package.json`
- **package-lock.json**: The lockfile that pins exact versions of every dependency (direct and transitive) for reproducible installs

## Bug Details

### Bug Condition

The bug manifests when `npm ci` is executed in CI against the current `package-lock.json`. The install command fails because the lockfile does not contain entries for `@opentelemetry/api@1.10.0`, `@emnapi/core@1.11.3`, and `@emnapi/runtime@1.11.3`, which are required by the resolved dependency tree of the packages listed in `package.json`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { lockfile: PackageLockJson, packageJson: PackageJson }
  OUTPUT: boolean

  resolvedGraph := resolveDependencyGraph(input.packageJson)
  missingPackages := resolvedGraph.packages EXCEPT input.lockfile.packages

  RETURN missingPackages IS NOT EMPTY
         AND "@opentelemetry/api@1.10.0" IN missingPackages
            OR "@emnapi/core@1.11.3" IN missingPackages
            OR "@emnapi/runtime@1.11.3" IN missingPackages
END FUNCTION
```

### Examples

- **CI run on current commit**: `npm ci` reads the current lockfile, finds `@opentelemetry/api@1.10.0` missing → exits code 1 → all downstream steps are skipped
- **Local developer install**: `npm install` succeeds because it regenerates the lockfile on the fly, but `npm ci` would fail on the same machine if the developer clones the repo fresh
- **Edge case — no lockfile at all**: If `package-lock.json` is deleted entirely, `npm ci` still fails (different error); the fix must commit a valid lockfile, not remove it
- **Edge case — partial sync**: Adding only `@opentelemetry/api` to the lockfile manually while leaving `@emnapi/core` and `@emnapi/runtime` missing would still trigger the bug condition

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Running `npm ci` locally with the updated lockfile SHALL install the exact dependency versions recorded in `package-lock.json` without modifications, preserving reproducible local installs
- CI runs on commits that do not touch `package.json` or `package-lock.json` SHALL continue to complete all steps without lockfile-related errors
- The built and deployed application SHALL continue to behave identically to its pre-fix runtime behavior — no dependency version changes that affect application logic

**Scope:**
All CI and local workflows that do NOT involve running `npm ci` against the stale lockfile should be completely unaffected by this fix. This includes:
- Application source code (no `.ts`, `.tsx`, or configuration file changes)
- `package.json` direct dependency versions (no version bumps)
- Docker build steps (the Dockerfile runs `npm ci` too — it benefits from the same fix)

## Hypothesized Root Cause

Based on the bug description, the most likely causes are:

1. **Dependency upgrade introduced new transitive requirements**: A recent update to a direct dependency (likely `firebase-admin@14.2.0`, `@aws-sdk/client-s3@3.x`, or `firebase@12.x`) added `@opentelemetry/api`, `@emnapi/core`, and `@emnapi/runtime` as transitive dependencies. The developer ran `npm install` locally (updating the lockfile on their machine) but committed only `package.json`, not the regenerated `package-lock.json`.

2. **Lockfile was committed from a different Node.js version**: `npm` generates slightly different lockfile formats across major Node.js versions. If the lockfile was last committed using Node 18 but CI uses Node 22, the resolved graph may differ.

3. **Manual lockfile edit**: A developer may have manually edited `package-lock.json` to resolve a merge conflict without running `npm install` afterward, leaving the file structurally valid but incomplete.

4. **`.gitignore` or merge conflict resolution dropped lockfile changes**: A merge or rebase may have inadvertently reverted the lockfile to an older state while keeping the updated `package.json`.

## Correctness Properties

Property 1: Bug Condition - npm ci Succeeds with Updated Lockfile

_For any_ CI run where the bug condition holds (the lockfile is missing one or more packages from the resolved dependency graph), the fixed `package-lock.json` SHALL cause `npm ci` to exit with code 0, installing all dependencies successfully and allowing all downstream CI steps to proceed.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Existing Install and Runtime Behavior Unchanged

_For any_ input where the bug condition does NOT hold (a fresh clone using the updated lockfile on a system with no missing packages), the fixed `package-lock.json` SHALL produce the same installed dependency tree as before — preserving reproducible local installs, CI runs on unrelated commits, and application runtime behavior.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `package-lock.json`

**Operation**: Regenerate by running `npm install` in the workspace root

**Specific Changes**:

1. **Regenerate lockfile**: Run `npm install` in `c:\Users\Aamin\Desktop\App\Exam_Vault\Exam_Vault` to resolve the full dependency graph against the current `package.json` and write an updated `package-lock.json`
   - This adds missing entries for `@opentelemetry/api@1.10.0`, `@emnapi/core@1.11.3`, and `@emnapi/runtime@1.11.3`
   - No other files need to change

2. **Commit the updated lockfile**: Stage and commit `package-lock.json` with a message such as `fix: regenerate package-lock.json to resolve npm ci sync error`

3. **Push and verify CI**: Push the commit to trigger the CI workflow; confirm the "Install Dependencies" step exits with code 0 and all downstream steps complete

4. **No package.json changes**: Direct dependency versions in `package.json` are correct; only the lockfile needs updating

5. **No application code changes**: The fix is purely a build/tooling change; no source files are modified

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface the failure on the unfixed lockfile to confirm the root cause, then verify the fix resolves it without breaking any existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface the exact `npm ci` failure on the UNFIXED lockfile to confirm which packages are missing and validate the root cause hypothesis.

**Test Plan**: Run `npm ci` locally against the current (unfixed) `package-lock.json` and capture the error output. Inspect the lockfile to confirm the absence of the three packages.

**Test Cases**:
1. **npm ci on unfixed lockfile**: Run `npm ci` in the workspace root → expect exit code 1 with an error referencing missing packages (will fail on unfixed code)
2. **Lockfile grep check**: Search `package-lock.json` for `@opentelemetry/api` → expect no match, confirming it is missing (will fail on unfixed code)
3. **Lockfile grep check**: Search `package-lock.json` for `@emnapi/core` → expect no match (will fail on unfixed code)
4. **Lockfile grep check**: Search `package-lock.json` for `@emnapi/runtime` → expect no match (will fail on unfixed code)

**Expected Counterexamples**:
- `npm ci` exits with code 1 and prints "Missing: @opentelemetry/api@1.10.0" (or similar)
- Possible causes: dependency upgrade committed without lockfile update, Node.js version mismatch during last lockfile generation, manual lockfile edit after a merge conflict

### Fix Checking

**Goal**: Verify that after regenerating the lockfile, `npm ci` succeeds for all inputs where the bug condition previously held.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  regenerateLockfile(input.packageJson)   -- run npm install
  result := npmCi(updatedLockfile)
  ASSERT result.exitCode = 0
  ASSERT result.installedPackages CONTAINS "@opentelemetry/api@1.10.0"
  ASSERT result.installedPackages CONTAINS "@emnapi/core@1.11.3"
  ASSERT result.installedPackages CONTAINS "@emnapi/runtime@1.11.3"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the updated lockfile produces the same behavior as a correctly-synced lockfile.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT npmCi(originalLockfile).installedPackages
       = npmCi(fixedLockfile).installedPackages
  ASSERT applicationBehavior(originalLockfile) = applicationBehavior(fixedLockfile)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random dependency configurations automatically to verify lockfile stability
- It catches edge cases (e.g., optional dependencies, platform-specific packages) that manual checks might miss
- It provides strong guarantees that no unintended version changes slipped in during regeneration

**Test Plan**: After regenerating the lockfile, compare the diff of direct dependency versions between old and new lockfile to confirm no version regressions were introduced.

**Test Cases**:
1. **Direct dependency version preservation**: Diff the `version` field of every direct dependency between the old and new lockfile → all versions must be identical
2. **npm ci idempotence**: Run `npm ci` twice with the new lockfile → both runs must produce the same `node_modules` tree (no drift)
3. **Build preservation**: Run `npm run build` after the lockfile fix → build must succeed as before

### Unit Tests

- Verify `npm ci` exits with code 0 on the updated lockfile in a clean environment (no pre-existing `node_modules`)
- Verify the three previously-missing packages are present in the updated lockfile at the correct versions
- Verify no direct dependency versions in `package.json` changed as a side effect of running `npm install`

### Property-Based Tests

- Generate random subsets of the dependency graph and verify that `npm ci` with the updated lockfile always succeeds (no missing transitive packages)
- Generate random commit scenarios (changed vs unchanged `package.json`) and verify the lockfile remains valid after the fix for all non-change scenarios
- Verify across many simulated fresh-clone environments that `node_modules` contents are identical between the pre-fix and post-fix lockfile for all existing direct dependencies

### Integration Tests

- Full CI workflow run on the fixed commit: all nine steps (checkout, setup Node, install, build, schema push, tests, Docker build) must pass
- Local fresh-clone simulation: clone the repo into a temp directory, run `npm ci`, then `npm run build` → both must succeed
- Docker build integration: run `docker build` with the updated lockfile committed → the `RUN npm ci` layer inside the Dockerfile must complete without errors
