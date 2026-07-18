import { describe, expect, it } from 'vitest';
import {
  bpmToBeatDurationMs,
  clampBpm,
  computeBeatIndex,
  computeBeatPhase,
  computeElapsedBeats,
  computeFraction,
  computeGoingForward,
  computeIsFirstBeat,
  computePlaybackRate,
  countTotalFor,
  elapsedBeatsToBaseCurrentTimeMs,
  msUntilNextBeatBoundary,
  rebaseAnchorForBpm,
} from './timing';
import type { AnchorState } from './types';

describe('bpmToBeatDurationMs', () => {
  it('converts BPM to a real beat duration', () => {
    expect(bpmToBeatDurationMs(120)).toBeCloseTo(500, 6);
    expect(bpmToBeatDurationMs(60)).toBeCloseTo(1000, 6);
    expect(bpmToBeatDurationMs(240)).toBeCloseTo(250, 6);
  });
});

describe('clampBpm', () => {
  it('clamps to [40, 240] and rounds', () => {
    expect(clampBpm(20)).toBe(40);
    expect(clampBpm(300)).toBe(240);
    expect(clampBpm(120.4)).toBe(120);
    expect(clampBpm(120.6)).toBe(121);
    expect(clampBpm(40)).toBe(40);
    expect(clampBpm(240)).toBe(240);
  });
});

describe('computePlaybackRate', () => {
  it('is 1 at the base BPM', () => {
    expect(computePlaybackRate(120, 120)).toBe(1);
  });

  it('scales proportionally to bpm/baseBpm', () => {
    expect(computePlaybackRate(180, 120)).toBeCloseTo(1.5, 6);
    expect(computePlaybackRate(60, 120)).toBeCloseTo(0.5, 6);
  });

  it('produces the correct real beat duration when applied to a base-authored animation', () => {
    const baseDurationMs = bpmToBeatDurationMs(120);
    for (const bpm of [40, 90, 120, 180, 240]) {
      const rate = computePlaybackRate(bpm, 120);
      const effectiveDurationMs = baseDurationMs / rate;
      expect(effectiveDurationMs).toBeCloseTo(bpmToBeatDurationMs(bpm), 6);
    }
  });
});

describe('countTotalFor', () => {
  it('returns 4 for 4/4 and 8 for 8count', () => {
    expect(countTotalFor('4/4')).toBe(4);
    expect(countTotalFor('8count')).toBe(8);
  });
});

describe('computeElapsedBeats', () => {
  it('is anchorBeats at the anchor instant', () => {
    const anchor: AnchorState = { anchorTimeMs: 1000, anchorBeats: 0, bpm: 120 };
    expect(computeElapsedBeats(anchor, 1000)).toBe(0);
  });

  it('advances by real elapsed time / beat duration', () => {
    const anchor: AnchorState = { anchorTimeMs: 1000, anchorBeats: 0, bpm: 120 }; // 500ms/beat
    expect(computeElapsedBeats(anchor, 1250)).toBeCloseTo(0.5, 6);
    expect(computeElapsedBeats(anchor, 1500)).toBeCloseTo(1, 6);
    expect(computeElapsedBeats(anchor, 2500)).toBeCloseTo(3, 6);
  });
});

describe('computeBeatIndex (4/4 and 8 Count)', () => {
  it('wraps within the 4/4 total', () => {
    expect(computeBeatIndex(0, 4)).toBe(0);
    expect(computeBeatIndex(1, 4)).toBe(1);
    expect(computeBeatIndex(3.9, 4)).toBe(3);
    expect(computeBeatIndex(4, 4)).toBe(0);
    expect(computeBeatIndex(5, 4)).toBe(1);
    expect(computeBeatIndex(9, 4)).toBe(1);
  });

  it('wraps within the 8 Count total', () => {
    expect(computeBeatIndex(0, 8)).toBe(0);
    expect(computeBeatIndex(7.9, 8)).toBe(7);
    expect(computeBeatIndex(8, 8)).toBe(0);
    expect(computeBeatIndex(15, 8)).toBe(7);
    expect(computeBeatIndex(16, 8)).toBe(0);
  });
});

describe('computeIsFirstBeat', () => {
  it('is true only for beat index 0', () => {
    expect(computeIsFirstBeat(0)).toBe(true);
    expect(computeIsFirstBeat(1)).toBe(false);
    expect(computeIsFirstBeat(7)).toBe(false);
  });
});

describe('computeFraction', () => {
  it('returns the fractional progress within the current traversal', () => {
    expect(computeFraction(0)).toBeCloseTo(0, 6);
    expect(computeFraction(0.25)).toBeCloseTo(0.25, 6);
    expect(computeFraction(3.75)).toBeCloseTo(0.75, 6);
  });
});

describe('computeGoingForward', () => {
  it('alternates every whole beat, starting forward', () => {
    expect(computeGoingForward(0)).toBe(true);
    expect(computeGoingForward(0.5)).toBe(true);
    expect(computeGoingForward(1)).toBe(false);
    expect(computeGoingForward(1.9)).toBe(false);
    expect(computeGoingForward(2)).toBe(true);
  });
});

describe('computeBeatPhase', () => {
  it('combines elapsed beats, index, first-beat, fraction, and direction consistently', () => {
    const anchor: AnchorState = { anchorTimeMs: 0, anchorBeats: 0, bpm: 120 };
    const phase = computeBeatPhase(anchor, '4/4', 1750); // 3.5 beats elapsed
    expect(phase.elapsedBeats).toBeCloseTo(3.5, 6);
    expect(phase.beatIndex).toBe(3);
    expect(phase.isFirstBeat).toBe(false);
    expect(phase.fraction).toBeCloseTo(0.5, 6);
    expect(phase.goingForward).toBe(false); // whole beat 3 is odd -> backward
  });
});

describe('rebaseAnchorForBpm (BPM-change phase preservation)', () => {
  it('preserves the continuous elapsed-beats value at the moment of the change', () => {
    const anchor: AnchorState = { anchorTimeMs: 0, anchorBeats: 0, bpm: 120 };
    const changeAtMs = 750; // 1.5 beats elapsed at 120bpm
    const elapsedBefore = computeElapsedBeats(anchor, changeAtMs);

    const rebased = rebaseAnchorForBpm(anchor, changeAtMs, 180);
    expect(rebased.bpm).toBe(180);
    expect(rebased.anchorTimeMs).toBe(changeAtMs);

    // Reading the phase immediately after rebasing (no time passed) must match exactly - no jump.
    expect(computeElapsedBeats(rebased, changeAtMs)).toBeCloseTo(elapsedBefore, 9);
  });

  it('continues advancing at the new rate after the rebase', () => {
    const anchor: AnchorState = { anchorTimeMs: 0, anchorBeats: 0, bpm: 120 };
    const rebased = rebaseAnchorForBpm(anchor, 750, 240); // half speed's inverse: double bpm -> half beat duration (250ms)
    // 250ms further at 240bpm should advance exactly 1 more beat.
    expect(computeElapsedBeats(rebased, 750 + 250)).toBeCloseTo(rebased.anchorBeats + 1, 6);
  });
});

describe('msUntilNextBeatBoundary', () => {
  it('counts down to the next whole beat', () => {
    const anchor: AnchorState = { anchorTimeMs: 0, anchorBeats: 0, bpm: 120 }; // 500ms/beat
    expect(msUntilNextBeatBoundary(anchor, 0)).toBeCloseTo(500, 6);
    expect(msUntilNextBeatBoundary(anchor, 250)).toBeCloseTo(250, 6);
    expect(msUntilNextBeatBoundary(anchor, 499)).toBeCloseTo(1, 6);
  });

  it('never returns a negative delay right at a boundary', () => {
    const anchor: AnchorState = { anchorTimeMs: 0, anchorBeats: 0, bpm: 120 };
    expect(msUntilNextBeatBoundary(anchor, 500)).toBeGreaterThanOrEqual(0);
  });
});

describe('elapsedBeatsToBaseCurrentTimeMs', () => {
  it('maps continuous elapsed beats onto the BASE_BPM-authored animation timeline', () => {
    expect(elapsedBeatsToBaseCurrentTimeMs(0)).toBe(0);
    expect(elapsedBeatsToBaseCurrentTimeMs(1)).toBeCloseTo(bpmToBeatDurationMs(120), 6);
    expect(elapsedBeatsToBaseCurrentTimeMs(2.5)).toBeCloseTo(2.5 * bpmToBeatDurationMs(120), 6);
  });
});

describe('long tab-inactivity beat correction', () => {
  it('lands on the mathematically correct beat after a large real-time gap, not a stuck/incremented-by-one value', () => {
    const anchor: AnchorState = { anchorTimeMs: 0, anchorBeats: 0, bpm: 120 }; // 500ms/beat
    // Tab was hidden for ~37.3 beats worth of real time.
    const resumeAtMs = 37.3 * 500;
    const elapsedBeats = computeElapsedBeats(anchor, resumeAtMs);
    expect(elapsedBeats).toBeCloseTo(37.3, 6);
    expect(computeBeatIndex(elapsedBeats, 4)).toBe(1); // floor(37.3) = 37, 37 % 4 = 1
    expect(computeBeatIndex(elapsedBeats, 8)).toBe(5); // 37 % 8 = 5
  });
});
