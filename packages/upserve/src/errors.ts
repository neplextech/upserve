/** Safe operational failure; messages must not contain credentials or upstream bodies. */
export class UpserveError extends Error {
  constructor(
    public readonly code:
      | "configuration"
      | "auth"
      | "rate_limit"
      | "network"
      | "invalid"
      | "missing",
    message: string,
    public readonly retryAt?: number,
  ) {
    super(message);
    this.name = "UpserveError";
  }
}
