// Simple Mulberry32 seeded RNG
export class SeededRNG {
  private state: number;

  constructor(seedStr: string) {
    let h = 0xdeadbeef;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
    }
    this.state = (h ^ h >>> 16) >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    const res = ((t ^ t >>> 14) >>> 0) / 4294967296;
    return res;
  }

  // Helper to pick random int between min and max (inclusive)
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
