import { createApp } from '../../src/server/app.ts';
import { Express } from 'express';

let appInstance: Express | null = null;

export const getApp = async () => {
  if (!appInstance) {
    appInstance = await createApp();
  }
  return appInstance;
};
