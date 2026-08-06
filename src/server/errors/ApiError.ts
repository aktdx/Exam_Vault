export class ApiError extends Error {
  public status: number;
  public errorCode: string;
  public details?: unknown;

  constructor(status: number, errorCode: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
