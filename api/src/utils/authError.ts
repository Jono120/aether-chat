/**
 * Intentional, user-facing auth failure. Routes return `message` with `status`;
 * any other thrown error is logged server-side and mapped to a generic response
 * so internal pg/driver messages never reach the client.
 */
export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
