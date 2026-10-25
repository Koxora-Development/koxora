import { createHash, randomBytes } from 'node:crypto';
/**
 * Abuse controls that store nothing durable.
 *
 * A sliding window per client and one for the whole service, and a short
 * memory of what was already accepted so a double submission is not a second
 * message. Everything lives in this process and disappears with it: there is
 * no database, and a restart simply forgets.
 *
 * A client is identified by a keyed hash of its address with a salt generated
 * at startup, so nothing that could be linked back to a visitor is held even
 * in memory, and the keys cannot be enumerated.
 */
export class SlidingWindow {
  private readonly hits = new Map<string, number[]>();
  constructor(
    private readonly count: number,
    private readonly windowMilliseconds: number,
  ) {}
  /**
   * Records a hit and reports whether it is allowed. When it is not, it also
   * says how long the caller has to wait, which becomes `Retry-After`.
   */
  take(
    key: string,
    now = Date.now(),
  ): { allowed: boolean; retryAfter: number } {
    const since = now - this.windowMilliseconds;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > since);
    if (recent.length >= this.count) {
      const oldest = recent[0]!;
      this.hits.set(key, recent);
      return {
        allowed: false,
        retryAfter: Math.max(
          1,
          Math.ceil((oldest + this.windowMilliseconds - now) / 1000),
        ),
      };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, retryAfter: 0 };
  }
  /** Drops what has fallen out of the window, so memory stays bounded. */
  prune(now = Date.now()): void {
    const since = now - this.windowMilliseconds;
    for (const [key, times] of this.hits) {
      const recent = times.filter((time) => time > since);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
  get size(): number {
    return this.hits.size;
  }
}
/**
 * Remembers what was accepted, long enough that a reader who presses the
 * button twice, or whose browser repeats the request, does not send two
 * messages. It keeps a hash, never the message.
 */
export class DuplicateGuard {
  private readonly seen = new Map<string, number>();
  constructor(private readonly windowMilliseconds: number) {}
  /** `true` when this exact submission was already accepted recently. */
  check(fingerprint: string, now = Date.now()): boolean {
    this.prune(now);
    return this.seen.has(fingerprint);
  }
  remember(fingerprint: string, now = Date.now()): void {
    this.seen.set(fingerprint, now);
  }
  prune(now = Date.now()): void {
    const since = now - this.windowMilliseconds;
    for (const [key, time] of this.seen)
      if (time <= since) this.seen.delete(key);
  }
  get size(): number {
    return this.seen.size;
  }
}
/**
 * Hashes a client address with a salt this process generated, so the value
 * cannot be turned back into an address and does not survive a restart.
 */
export function createClientKeyer(salt: Buffer = randomBytes(32)) {
  return (address: string): string =>
    createHash('sha256').update(salt).update(address).digest('base64url');
}
/** Identifies a submission by content, for the duplicate guard only. */
export function fingerprint(parts: string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part).update('\u0000');
  return hash.digest('base64url');
}
