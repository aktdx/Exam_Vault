import { jest } from '@jest/globals';

export const mockVerifyIdToken = jest.fn<any>();
export const mockGetUserByEmail = jest.fn<any>();

export const adminAuth = {
  verifyIdToken: mockVerifyIdToken,
  getUserByEmail: mockGetUserByEmail,
};

// Exports for src/lib/firebase-admin.ts
export const getAuth = () => adminAuth;
export const getApps = () => [];
export const initializeApp = () => ({});
