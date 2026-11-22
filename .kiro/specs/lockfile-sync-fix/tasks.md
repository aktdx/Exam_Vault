# Implementation Plan

## Overview

Fix the CI pipeline failure caused by `package-lock.json` being out of sync with `package.json`. The lockfile is missing three transitive packages (`@opentelemetry/api@1.10.0`, `@emnapi/core@1.11.3`, `@emnapi/runtime@1.11.3`), causing `npm ci` to exit with code 1 and blocking all downstream CI steps. The fix regenerates the lockfile via `npm install` and commits it.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] }
  ]
}
```

Tasks 1 and 2 must run on UNFIXED code before any implementation begins. Task 3.1 applies the fix. Tasks 3.2 and 3.3 re-run the tests written in tasks 1 and 2 respectively.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Missing Transitive Packages in Lockfile
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For this deterministic bug, scope the property to the three concrete missing packages: `@opentelemetry/api@1.10.0`, `@emnapi/core@1.11.3`, `@emnapi/runtime@1.11.3`
  - Read the current `package-lock.json` and verify it contains entries for all three packages
  - Run `npm ci` in the workspace root (`c:\Users\Aamin\Desktop\App\Exam_Vault\Exam_Vault`) against the unfixed lockfile and capture the exit code
  - Assert exit code equals 0 AND `package-lock.json` contains `@opentelemetry/api@1.10.0`, `@emnapi/core@1.11.3`, and `@emnapi/runtime@1.11.3` (from Bug Condition in design)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with exit code 1 (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "`npm ci` exits 1: Missing @opentelemetry/api@1.10.0 from lockfile")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Direct Dependency Versions Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: record the exact `version` field for every direct dependency listed in `package.json` from the current `package-lock.json`
  - Observe: run `npm run build` on the unfixed code (assuming `node_modules` are present) and confirm it succeeds — record exit code 0 as the baseline
  - Write property-based test: for all direct dependencies in `package.json`, the version pinned in `package-lock.json` after the fix SHALL equal the version observed before the fix (from Preservation Requirements in design)
  - Write property-based test: for any input state where `isBugCondition` returns false (lockfile already in sync), `npm ci` continues to exit with code 0
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix - Regenerate package-lock.json to resolve npm ci sync error

  - [ ] 3.1 Regenerate the lockfile by running npm install
    - Run `npm install` in the workspace root (`c:\Users\Aamin\Desktop\App\Exam_Vault\Exam_Vault`)
    - Confirm the command exits with code 0
    - Confirm `package-lock.json` now contains entries for `@opentelemetry/api@1.10.0`, `@emnapi/core@1.11.3`, and `@emnapi/runtime@1.11.3`
    - Confirm no direct dependency versions in `package.json` were altered as a side effect
    - _Bug_Condition: isBugCondition(input) where input.lockfile is missing @opentelemetry/api@1.10.0, @emnapi/core@1.11.3, or @emnapi/runtime@1.11.3_
    - _Expected_Behavior: npm ci exits with code 0 and installs all dependencies successfully (Requirements 2.1, 2.2)_
    - _Preservation: local npm ci reproducibility, CI runs on unrelated commits, and application runtime behavior remain unchanged (Requirements 3.1, 3.2, 3.3)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - npm ci Succeeds with Updated Lockfile
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (exit code 0 + all three packages present in lockfile)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1 against the updated `package-lock.json`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Direct Dependency Versions Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2 against the updated `package-lock.json`
    - Diff direct dependency versions between old and new lockfile — all versions must be identical
    - Run `npm run build` after the fix — must succeed as before
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Stage and commit the updated `package-lock.json` with message: `fix: regenerate package-lock.json to resolve npm ci sync error`
  - Push the commit and verify the CI workflow completes all nine steps (checkout, setup Node, install, build, schema push, tests, Docker build) with exit code 0

## Notes

- No application source files, `package.json` direct dependency versions, or CI workflow configuration need to change — only `package-lock.json` is modified.
- Tasks 1 and 2 intentionally run against the UNFIXED lockfile. Task 1 is expected to FAIL; task 2 is expected to PASS. This is the correct behavior and confirms the baseline.
- The Docker build inside the CI workflow also runs `npm ci`, so the lockfile fix resolves that step as well.
- If `npm install` changes any direct dependency version unexpectedly, stop and investigate before committing.
