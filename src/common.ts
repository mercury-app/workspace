export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
    this.message = message;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
    this.message = message;
  }
}

export class UnprocessableEntityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnprocessableEntityError";
    this.message = message;
  }
}
