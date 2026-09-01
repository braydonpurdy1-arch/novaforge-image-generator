export class NovaForgeError extends Error {
  constructor(message, { code = "NOVAFORGE_ERROR", status = 400, details } = {}) {
    super(message);
    this.name = "NovaForgeError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function publicError(error) {
  if (error instanceof NovaForgeError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  }
  return {
    status: 500,
    body: { error: "INTERNAL_ERROR", message: "The request could not be completed." },
  };
}
