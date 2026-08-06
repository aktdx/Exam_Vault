declare global {
  namespace Express {
    interface Request {
      dbUser?: any;
    }
  }
}
export {};
