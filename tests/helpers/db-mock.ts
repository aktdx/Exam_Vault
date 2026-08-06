export const mockDb = {
  insert: () => ({ values: () => ({ returning: async () => [] }) }),
  execute: async () => undefined,
};
