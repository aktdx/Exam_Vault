import { jest } from '@jest/globals';

export const uploadFile = jest.fn<any>().mockResolvedValue('/uploads/test.pdf');
export const deleteFile = jest.fn<any>().mockResolvedValue(undefined);
export const getFileUrl = jest.fn<any>().mockImplementation(async (path: any) => `http://mock${path}`);
