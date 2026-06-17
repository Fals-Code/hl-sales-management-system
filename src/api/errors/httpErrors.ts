export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = () => new HttpError(401, "UNAUTHENTICATED", "Session is required.");
