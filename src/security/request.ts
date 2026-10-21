const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export interface BoundaryRequest {
  method: string;
  host: string | null;
  origin: string | null;
}

export type BoundaryResult =
  | { accepted: true }
  | { accepted: false; status: 403 | 421; reason: "host" | "origin" };

export interface BoundaryOptions {
  /**
   * Accept a state-changing request that carries no `Origin` header at all.
   * Only for endpoints that use no ambient credential: a native client sends
   * no Origin, and without a cookie there is nothing for a forged cross-site
   * request to ride on. A present-but-foreign Origin is still refused.
   */
  allowMissingOrigin?: boolean;
}

export function validateRequestBoundary(
  request: BoundaryRequest,
  expectedHost: string,
  expectedOrigin: string,
  options: BoundaryOptions = {},
): BoundaryResult {
  if (request.host !== expectedHost) {
    return { accepted: false, status: 421, reason: "host" };
  }

  if (!safeMethods.has(request.method.toUpperCase())) {
    const missingAllowed =
      options.allowMissingOrigin === true && request.origin === null;
    if (request.origin !== expectedOrigin && !missingAllowed) {
      return { accepted: false, status: 403, reason: "origin" };
    }
  }

  return { accepted: true };
}
