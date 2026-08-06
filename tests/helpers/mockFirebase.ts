import { jest } from '@jest/globals';

export const mockVerifyIdToken = jest.fn();
export const mockGetUserByEmail = jest.fn();
export const mockVerifySessionCookie = jest.fn();

// This won't work in ESM Jest if used as a normal import.
// We must use jest.unstable_mockModule in the test files BEFORE importing app.ts.
