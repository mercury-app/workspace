export class CustomError extends Error {
  get detail(): string {
    return `${this.name}: ${this.message}`;
  }
}

export class ConflictError extends CustomError {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
    this.message = message;
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
    this.message = message;
  }
}

export class UnprocessableEntityError extends CustomError {
  constructor(message: string) {
    super(message);
    this.name = "UnprocessableEntityError";
    this.message = message;
  }
}
