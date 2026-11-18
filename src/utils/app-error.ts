// src/utils/app-error.ts

/**
 * Error "yang sudah diperkirakan" (operational error) beserta HTTP status-nya.
 * Pesan AppError aman dikirim ke client. Error lain dianggap tak terduga (500).
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}