/**
 * How many failed passcode attempts are tolerated, and for how long.
 *
 * The login route had no throttle at all. That was defensible while the app
 * refused to listen on anything but loopback: the only way to reach the form
 * was to already be at the machine. Once it is reachable from the internet the
 * passcode is the whole boundary, and an unthrottled passcode is a matter of
 * time rather than a secret.
 *
 * Everything here is pure. The stored counters are read and written by the
 * caller, so the policy can be tested without a database and cannot drift from
 * what the tests describe.
 */

export interface ThrottleState {
  failureCount: number;
  /** When the current window opened; failures older than it are forgotten. */
  firstFailureAt: number;
  /** Epoch ms until which attempts are refused, or null when open. */
  lockedUntil: number | null;
}

export interface ThrottlePolicy {
  /** Failures stop counting once this much time has passed since the first. */
  windowMs: number;
  /** Failures inside the window before the scope locks. */
  failureLimit: number;
  /** The first lock's duration; each further failure doubles it. */
  baseLockMs: number;
  /** The ceiling on that doubling. */
  maximumLockMs: number;
}

export const OPEN_STATE: ThrottleState = {
  failureCount: 0,
  firstFailureAt: 0,
  lockedUntil: null,
};

/**
 * One address gets a handful of tries, then waits — a minute, then two, then
 * four.
 *
 * Observably six wrong answers are returned a 401 and the seventh is refused:
 * the lock is evaluated before an attempt is recorded, so the failure that
 * crosses the limit is itself answered normally and the next one meets the
 * lock. That ordering is deliberate — it is what keeps a locked-out caller
 * from learning whether their guess was right.
 *
 * The doubling matters more than the limit. A fixed penalty is a fixed cost an
 * attacker can budget for; a doubling one reaches hours within a dozen attempts
 * while costing the owner who fat-fingers their passcode about a minute.
 */
export const ADDRESS_POLICY: ThrottlePolicy = {
  windowMs: 15 * 60_000,
  failureLimit: 5,
  baseLockMs: 60_000,
  maximumLockMs: 12 * 60 * 60_000,
};

/**
 * A ceiling across every address at once, for attempts spread over many.
 *
 * Deliberately far looser, and deliberately short: this is the one limit an
 * attacker can trip on the owner's behalf, so a long global lock would hand
 * anyone a way to lock the owner out of their own holdings. Sixty seconds
 * costs a distributed attacker most of their throughput and costs the owner a
 * minute in the worst case.
 */
export const GLOBAL_POLICY: ThrottlePolicy = {
  windowMs: 15 * 60_000,
  failureLimit: 50,
  baseLockMs: 60_000,
  maximumLockMs: 5 * 60_000,
};

export interface ThrottleDecision {
  allowed: boolean;
  /** How long the caller must wait, for the Retry-After header. */
  retryAfterMs: number;
}

/** Whether an attempt may proceed, given what has already been recorded. */
export function evaluateThrottle(
  state: ThrottleState,
  now: number,
): ThrottleDecision {
  if (state.lockedUntil !== null && state.lockedUntil > now) {
    return { allowed: false, retryAfterMs: state.lockedUntil - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * The state after one more failure.
 *
 * A failure arriving after the window has elapsed opens a new window rather
 * than adding to a stale count, so an attempt today is not punished for a typo
 * last week. A failure arriving after a lock expires keeps the accumulated
 * count, which is what makes the next lock longer than the last.
 *
 * The window is measured from the first failure *or the end of the most recent
 * lock, whichever is later*, and that second half is not a refinement — without
 * it the escalation cannot work at all. The locks themselves spend window time:
 * 60s + 120s + 240s + 480s is fifteen minutes, so by the ninth failure the
 * window measured from the first had always elapsed and the tenth opened a
 * fresh one at a count of 1. Simulated against the real policy, an attacker who
 * retried the instant each lock lifted got a sawtooth that reset every fifteen
 * minutes for ever: 864 guesses a day, a longest lock of 8 minutes, and the
 * 12-hour ceiling unreachable. Measuring from the end of the lock means a
 * caller who keeps trying keeps escalating, while one who goes quiet for the
 * window is still forgiven — which is the only case the owner is ever in.
 */
export function registerFailure(
  state: ThrottleState,
  policy: ThrottlePolicy,
  now: number,
): ThrottleState {
  const windowFrom = Math.max(state.firstFailureAt, state.lockedUntil ?? 0);
  const windowExpired =
    state.failureCount === 0 || now - windowFrom >= policy.windowMs;
  const failureCount = windowExpired ? 1 : state.failureCount + 1;
  const firstFailureAt = windowExpired ? now : state.firstFailureAt;

  if (failureCount <= policy.failureLimit) {
    return { failureCount, firstFailureAt, lockedUntil: null };
  }

  // Doubling from the first lock: the sixth failure waits baseLockMs, the
  // seventh twice that, and so on to the ceiling.
  const exponent = failureCount - policy.failureLimit - 1;
  const lockMs = Math.min(
    policy.baseLockMs * 2 ** Math.min(exponent, 40),
    policy.maximumLockMs,
  );
  return { failureCount, firstFailureAt, lockedUntil: now + lockMs };
}

/**
 * The state after a success: forgotten entirely.
 *
 * Proving the passcode clears the record for that scope. Keeping a decaying
 * count after a correct answer would punish the owner for having once mistyped
 * it, which is not what the limit is for.
 */
export function clearFailures(): ThrottleState {
  return OPEN_STATE;
}
