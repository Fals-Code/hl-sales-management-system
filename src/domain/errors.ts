export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export class AuthorizationError extends BusinessError {
  constructor(message = "Owner authorization is required.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DuplicateValueError extends BusinessError {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateValueError";
  }
}
