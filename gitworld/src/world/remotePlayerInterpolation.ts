import type { PlayerSnapshot } from './realtimeTypes';

interface TimedSnapshot extends PlayerSnapshot {
  receivedAt: number;
}

export class PlayerSnapshotInterpolator {
  private buffer: TimedSnapshot[] = [];
  private readonly bufferTimeMs = 80; // 80ms render delay buffer for smooth interpolation
  private readonly maxBufferSize = 20;

  public pushSnapshot(snapshot: PlayerSnapshot) {
    const timed: TimedSnapshot = {
      ...snapshot,
      receivedAt: performance.now(),
    };
    this.buffer.push(timed);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  public getInterpolatedState(now = performance.now()): {
    position: { x: number; y: number };
    facing: { x: number; y: number };
    isWalking: boolean;
    walkPhase: number;
  } | null {
    if (this.buffer.length === 0) return null;
    if (this.buffer.length === 1) {
      const s = this.buffer[0];
      return {
        position: s.position,
        facing: s.facing,
        isWalking: s.isWalking,
        walkPhase: s.walkPhase,
      };
    }

    const renderTime = now - this.bufferTimeMs;

    // 1. If renderTime is older than our earliest snapshot
    if (renderTime <= this.buffer[0].receivedAt) {
      const s = this.buffer[0];
      return {
        position: s.position,
        facing: s.facing,
        isWalking: s.isWalking,
        walkPhase: s.walkPhase,
      };
    }

    // 2. If renderTime is newer than our latest snapshot (brief extrapolation)
    const latest = this.buffer[this.buffer.length - 1];
    if (renderTime >= latest.receivedAt) {
      const deltaSec = Math.min(0.15, (renderTime - latest.receivedAt) / 1000);
      return {
        position: {
          x: latest.position.x + latest.velocity.x * deltaSec * 0.5,
          y: latest.position.y + latest.velocity.y * deltaSec * 0.5,
        },
        facing: latest.facing,
        isWalking: latest.isWalking,
        walkPhase: latest.walkPhase + deltaSec * 2,
      };
    }

    // 3. Find adjacent snapshots for linear interpolation
    for (let i = 0; i < this.buffer.length - 1; i++) {
      const s0 = this.buffer[i];
      const s1 = this.buffer[i + 1];

      if (renderTime >= s0.receivedAt && renderTime <= s1.receivedAt) {
        const span = s1.receivedAt - s0.receivedAt;
        const progress = span > 0 ? (renderTime - s0.receivedAt) / span : 0;
        const t = Math.max(0, Math.min(1, progress));

        // Detect teleport / giant jump (e.g. respawn or world transfer)
        const dist = Math.hypot(s1.position.x - s0.position.x, s1.position.y - s0.position.y);
        if (dist > 300) {
          return {
            position: s1.position,
            facing: s1.facing,
            isWalking: s1.isWalking,
            walkPhase: s1.walkPhase,
          };
        }

        return {
          position: {
            x: s0.position.x + (s1.position.x - s0.position.x) * t,
            y: s0.position.y + (s1.position.y - s0.position.y) * t,
          },
          facing: {
            x: s0.facing.x + (s1.facing.x - s0.facing.x) * t,
            y: s0.facing.y + (s1.facing.y - s0.facing.y) * t,
          },
          isWalking: s1.isWalking,
          walkPhase: s0.walkPhase + (s1.walkPhase - s0.walkPhase) * t,
        };
      }
    }

    return latest;
  }
}
