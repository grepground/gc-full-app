/**
 * Domain/service error that carries an HTTP-ish status so the controller layer
 * can map it onto an API response. This file lives outside of any HTTP/Next
 * module so services stay transport-agnostic.
 */
export class ServiceError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.details = details;
  }
}

/** 400 */
export const badRequestError = (msg = "Invalid request data") =>
  new ServiceError(400, msg);

/** 401 */
export const unauthorizedError = (msg = "Unauthorized") =>
  new ServiceError(401, msg);

/** 403 */
export const forbiddenError = (msg = "Forbidden") =>
  new ServiceError(403, msg);

/** 404 */
export const notFoundError = (msg = "Not found") => new ServiceError(404, msg);

/** 409 */
export const conflictError = (msg = "Conflict") => new ServiceError(409, msg);
