import { jest } from '@jest/globals';

export const mockUploadFile = jest.fn<any>();
export const mockDeleteFile = jest.fn<any>();
export const mockGetFileUrl = jest.fn<any>();

jest.mock('../../src/lib/storage.ts', () => ({
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile,
  getFileUrl: mockGetFileUrl,
}));

beforeEach(() => {
  mockUploadFile.mockReset();
  mockDeleteFile.mockReset();
  mockGetFileUrl.mockReset();
  
  mockUploadFile.mockResolvedValue('/uploads/mock-file.pdf');
  mockDeleteFile.mockResolvedValue(undefined);
  mockGetFileUrl.mockImplementation(async (path) => `http://mock-storage.com${path}`);
});
