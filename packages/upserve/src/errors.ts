/** Stable failure classifications exposed as the JSON error field. */
export type UpserveErrorCode =
  | "configuration"
  | "auth"
  | "rate_limit"
  | "network"
  | "invalid"
  | "missing";

/** Every UpserveErrorCode, for validating persisted classifications. */
export const errorCodes: readonly UpserveErrorCode[] = [
  "configuration",
  "auth",
  "rate_limit",
  "network",
  "invalid",
  "missing",
];

/** Safe operational failure; messages must not contain credentials or upstream bodies. */
export class UpserveError extends Error {
  constructor(
    public readonly code: UpserveErrorCode,
    message: string,
    public readonly retryAt?: number,
  ) {
    super(message);
    this.name = "UpserveError";
  }
}
