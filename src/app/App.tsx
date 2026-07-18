import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type VizType = 'Bounce' | 'Swing' | 'Pulse' | 'Sweep';
type CountMode = '4/4' | '8count';
type Direction = 'Vertical' | 'Horizontal';
type Status = 'Ready' | 'Playing' | 'Paused';
type StartCount = 'Immediately' | '4count' | '8count' | '5678';

interface AnimState {
  ballPos: number;
  beat: number;
  flash: boolean;
  firstBeat: boolean;
}

const PRESETS = [
  { id: 'bw',  name: 'Black / White',    bg: '#0a0a0a', fg: '#ffffff' },
  { id: 'wb',  name: 'White / Black',    bg: '#f2f2f2', fg: '#0a0a0a' },
  { id: 'by',  name: 'Black / Yellow',   bg: '#0a0a0a', fg: '#f5d200' },
  { id: 'nw',  name: 'Navy / White',     bg: '#0c1445', fg: '#ffffff' },
  { id: 'wdb', name: 'White / Deep Blue',bg: '#f2f2f2', fg: '#0a1f5c' },
  { id: 'pl',  name: 'Purple / Lime',    bg: '#160c28', fg: '#c8f135' },
  { id: 'bc',  name: 'Burgundy / Cream', bg: '#3c0810', fg: '#f0e6d3' },
];

// ─── Visualizations ───────────────────────────────────────────────────────────

// ease-in-out: slow at endpoints, fast in middle (sinusoidal)
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function BounceViz({
  ballPos, direction, fg, flash, firstBeat, firstBeatEmphasis, isReady,
}: {
  ballPos: number; direction: Direction; fg: string;
  flash: boolean; firstBeat: boolean;
  firstBeatEmphasis: boolean; isReady: boolean;
}) {
  const isFB = firstBeat && firstBeatEmphasis;
  const baseR = 50;
  const scale = flash ? (isFB ? 1.38 : 1.18) : 1;
  const lineW = flash ? (isFB ? 4 : 2.5) : 1.5;
  const SP = 0.17, EP = 0.83;

  let cx: number, cy: number;
  let gx1: number, gy1: number, gx2: number, gy2: number;
  let r1x1: number, r1y1: number, r1x2: number, r1y2: number;
  let r2x1: number, r2y1: number, r2x2: number, r2y2: number;

  if (direction === 'Vertical') {
    cx = 500;
    cy = isReady ? 500 : 1000 * (SP + ballPos * (EP - SP));
    gx1 = 500; gy1 = 1000 * SP; gx2 = 500; gy2 = 1000 * EP;
    r1x1 = 350; r1y1 = 1000 * SP; r1x2 = 650; r1y2 = 1000 * SP;
    r2x1 = 350; r2y1 = 1000 * EP; r2x2 = 650; r2y2 = 1000 * EP;
  } else {
    cy = 500;
    cx = isReady ? 500 : 1000 * (SP + ballPos * (EP - SP));
    gx1 = 1000 * SP; gy1 = 500; gx2 = 1000 * EP; gy2 = 500;
    r1x1 = 1000 * SP; r1y1 = 350; r1x2 = 1000 * SP; r1y2 = 650;
    r2x1 = 1000 * EP; r2y1 = 350; r2x2 = 1000 * EP; r2y2 = 650;
  }

  const scaleTransition = flash
    ? 'transform 0.06s cubic-bezier(0.34,1.56,0.64,1)'
    : 'transform 0.18s ease-in';

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <line x1={gx1} y1={gy1} x2={gx2} y2={gy2} stroke={fg} strokeWidth={0.5} strokeOpacity={0.06} />
      <line x1={r1x1} y1={r1y1} x2={r1x2} y2={r1y2} stroke={fg} strokeWidth={lineW} strokeOpacity={0.28} strokeLinecap="round" style={{ transition: 'stroke-width 0.15s ease' }} />
      <line x1={r2x1} y1={r2y1} x2={r2x2} y2={r2y2} stroke={fg} strokeWidth={lineW} strokeOpacity={0.28} strokeLinecap="round" style={{ transition: 'stroke-width 0.15s ease' }} />
      <g transform={`translate(${cx}, ${cy})`} data-testid="bounce-translate-wrapper">
        <g transform={`scale(${scale})`} style={{ transition: scaleTransition }} data-testid="bounce-scale-wrapper">
          <circle r={baseR} fill={fg} />
        </g>
      </g>
    </svg>
  );
}

function PulseViz({
  ballPos, fg, flash, firstBeat, firstBeatEmphasis, status,
}: {
  ballPos: number; fg: string; flash: boolean; firstBeat: boolean;
  firstBeatEmphasis: boolean; status: Status;
}) {
  const isFB = firstBeat && firstBeatEmphasis;
  const scale = flash ? (isFB ? 1.48 : 1.24) : 1;
  const playing = status === 'Playing';
  const eased = easeInOut(ballPos);
  const scaleTransition = flash
    ? 'transform 0.07s cubic-bezier(0.34,1.56,0.64,1)'
    : 'transform 0.2s ease-in';

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      {playing && (
        <circle cx={500} cy={500} r={60 + eased * 250} fill="none"
          stroke={fg} strokeWidth={2.5} strokeOpacity={(1 - eased) * 0.6} />
      )}
      {playing && ballPos > 0.4 && (
        <circle cx={500} cy={500} r={60 + easeInOut((ballPos - 0.4) / 0.6) * 250} fill="none"
          stroke={fg} strokeWidth={1.5} strokeOpacity={(1 - (ballPos - 0.4) / 0.6) * 0.3} />
      )}
      <g transform="translate(500, 500)">
        <g transform={`scale(${scale})`} style={{ transition: scaleTransition }}>
          <circle r={55} fill={fg} />
        </g>
      </g>
    </svg>
  );
}

function SwingViz({
  ballPos, fg, flash, firstBeat, firstBeatEmphasis, status,
}: {
  ballPos: number; fg: string; flash: boolean; firstBeat: boolean;
  firstBeatEmphasis: boolean; status: Status;
}) {
  const isFB = firstBeat && firstBeatEmphasis;
  const scale = flash ? (isFB ? 1.35 : 1.18) : 1;
  const maxAngle = (status === 'Ready') ? 0 : 52 * Math.PI / 180;
  const easedPos = Math.sin(ballPos * Math.PI - Math.PI / 2);
  const angle = easedPos * maxAngle;

  const pivotX = 500, pivotY = 130;
  const armLength = 370;
  const ballX = pivotX + armLength * Math.sin(angle);
  const ballY = pivotY + armLength * Math.cos(angle);

  const arcMaxAngle = 52 * Math.PI / 180;
  const startX = pivotX - armLength * Math.sin(arcMaxAngle);
  const startY = pivotY + armLength * Math.cos(arcMaxAngle);
  const endX   = pivotX + armLength * Math.sin(arcMaxAngle);
  const endY   = pivotY + armLength * Math.cos(arcMaxAngle);

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <path d={`M ${startX} ${startY} A ${armLength} ${armLength} 0 0 1 ${endX} ${endY}`}
        fill="none" stroke={fg} strokeWidth={0.5} strokeOpacity={0.09} />
      <circle cx={startX} cy={startY} r={7} fill={fg} fillOpacity={0.18} />
      <circle cx={endX}   cy={endY}   r={7} fill={fg} fillOpacity={0.18} />
      <circle cx={pivotX} cy={pivotY} r={7} fill={fg} fillOpacity={0.4} />
      <line x1={pivotX} y1={pivotY} x2={ballX} y2={ballY}
        stroke={fg} strokeWidth={2} strokeOpacity={0.22} />
      <g transform={`translate(${ballX}, ${ballY})`}>
        <g
          transform={`scale(${scale})`}
          style={{ transition: flash ? 'transform 0.06s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.18s ease-in' }}
        >
          <circle r={52} fill={fg} />
        </g>
      </g>
    </svg>
  );
}

function SweepViz({
  ballPos, fg, flash, firstBeat, firstBeatEmphasis, status,
}: {
  ballPos: number; fg: string; flash: boolean; firstBeat: boolean;
  firstBeatEmphasis: boolean; status: Status;
}) {
  const isFB = firstBeat && firstBeatEmphasis;
  const barW = flash ? (isFB ? 12 : 8) : 5;
  const x = (status === 'Ready') ? 500 : 120 + ballPos * 760;

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <line x1={120} y1={175} x2={120} y2={825} stroke={fg} strokeWidth={1} strokeOpacity={0.15} />
      <line x1={880} y1={175} x2={880} y2={825} stroke={fg} strokeWidth={1} strokeOpacity={0.15} />
      <line x1={120} y1={500} x2={880} y2={500} stroke={fg} strokeWidth={0.5} strokeOpacity={0.06} />
      <rect
        x={x - barW / 2} y={155}
        width={barW} height={690}
        fill={fg} rx={barW / 2}
        style={{ transition: flash ? 'width 0.07s cubic-bezier(0.34,1.56,0.64,1)' : 'width 0.18s ease-in' }}
      />
    </svg>
  );
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function IconBtn({
  children, onClick, title, ariaLabel, testId, tp, ts, hov,
}: {
  children: React.ReactNode; onClick: () => void; title?: string; ariaLabel?: string; testId?: string;
  tp: string; ts: string; hov: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      data-testid={testId}
      style={{ width: 28, height: 28, color: ts, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hov; (e.currentTarget as HTMLElement).style.color = tp; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = ts; }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ text, ts }: { text: string; ts: string }) {
  return (
    <div style={{ color: ts, fontSize: '0.62rem', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 8 }}>
      {text}
    </div>
  );
}

function SegCtrl({
  opts, value, onChange, tp, ts, bg, border,
}: {
  opts: { id: string; label: string; testId?: string }[];
  value: string; onChange: (v: string) => void;
  tp: string; ts: string; bg: string; border: string;
}) {
  return (
    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}` }}>
      {opts.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          data-testid={o.testId}
          aria-pressed={value === o.id}
          style={{
            flex: 1, padding: '7px 4px', fontSize: '0.72rem', border: 'none', cursor: 'pointer',
            background: value === o.id ? tp : 'transparent',
            color: value === o.id ? bg : ts,
            fontWeight: value === o.id ? 700 : 400,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label, value, onChange, tp, ts, bg, testId, ariaLabel,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void;
  tp: string; ts: string; bg: string; testId?: string; ariaLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: ts, fontSize: '0.73rem' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        data-testid={testId}
        role="switch"
        aria-checked={value}
        aria-label={ariaLabel ?? label}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: value ? tp : `${ts}50`,
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', width: 14, height: 14, borderRadius: '50%',
          background: value ? bg : ts,
          transform: value ? 'translateX(18px)' : 'translateX(3px)',
          transition: 'transform 0.2s, background 0.2s',
        }} />
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [status, setStatus] = useState<Status>('Ready');
  const [bpm, setBpmState] = useState(120);
  const [countMode, setCountMode] = useState<CountMode>('4/4');
  const [vizType, setVizType] = useState<VizType>('Bounce');
  const [direction, setDirection] = useState<Direction>('Vertical');
  const [firstBeatEmphasis, setFirstBeatEmphasis] = useState(true);
  const [showCount, setShowCount] = useState(true);
  const [presetId, setPresetId] = useState('bw');
  const [startCount, setStartCount] = useState<StartCount>('Immediately');
  const [panelOpen, setPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(true);

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {
          setFullscreenSupported(false);
        });
      }
    } catch {
      setFullscreenSupported(false);
    }
  }, []);
  const [animState, setAnimState] = useState<AnimState>({ ballPos: 0, beat: 0, flash: false, firstBeat: false });

  // Refs for animation (never trigger re-renders)
  const rafRef = useRef<number>(0);
  const statusRef = useRef<Status>('Ready');
  const bpmRef = useRef(120);
  const countModeRef = useRef<CountMode>('4/4');
  const beatIndexRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const goingForwardRef = useRef(true);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { countModeRef.current = countMode; }, [countMode]);

  const totalBeats = countMode === '4/4' ? 4 : 8;
  const preset = PRESETS.find(p => p.id === presetId) ?? PRESETS[0];

  // Panel theme
  const panelBg  = isDark ? '#111111' : '#f0f0f0';
  const pBorder  = isDark ? '#222222' : '#d4d4d4';
  const tp       = isDark ? '#ffffff' : '#0a0a0a';
  const ts       = isDark ? '#666666' : '#909090';
  const hov      = isDark ? '#1c1c1c' : '#e2e2e2';

  // ── Animation loop ─────────────────────────────────────────────────────────
  const animate = useCallback((timestamp: number) => {
    if (statusRef.current !== 'Playing') return;

    const beatDuration = 60000 / bpmRef.current;
    if (lastBeatTimeRef.current === 0) lastBeatTimeRef.current = timestamp;

    const elapsed = timestamp - lastBeatTimeRef.current;
    const progress = elapsed / beatDuration;

    if (progress >= 1) {
      lastBeatTimeRef.current = lastBeatTimeRef.current + beatDuration;
      const total = countModeRef.current === '4/4' ? 4 : 8;
      beatIndexRef.current = (beatIndexRef.current + 1) % total;
      goingForwardRef.current = !goingForwardRef.current;

      const nb = beatIndexRef.current;
      const isFirst = nb === 0;

      setAnimState({ ballPos: goingForwardRef.current ? 0 : 1, beat: nb, flash: true, firstBeat: isFirst });

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(
        () => setAnimState(prev => ({ ...prev, flash: false, firstBeat: false })),
        isFirst ? 170 : 105,
      );
    } else {
      const ballPos = goingForwardRef.current ? progress : 1 - progress;
      setAnimState(prev => ({ ...prev, ballPos, beat: beatIndexRef.current }));
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const startPlay = useCallback(() => {
    beatIndexRef.current = 0;
    goingForwardRef.current = true;
    lastBeatTimeRef.current = 0;
    statusRef.current = 'Playing';
    setStatus('Playing');
    setAnimState({ ballPos: 0, beat: 0, flash: false, firstBeat: false });
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const pausePlay = useCallback(() => {
    statusRef.current = 'Paused';
    setStatus('Paused');
    cancelAnimationFrame(rafRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (statusRef.current === 'Playing') pausePlay(); else startPlay();
  }, [startPlay, pausePlay]);

  // Smooth BPM change preserving beat position
  const setBpm = useCallback((v: number) => {
    const next = Math.max(40, Math.min(240, Math.round(v)));
    if (statusRef.current === 'Playing' && lastBeatTimeRef.current > 0) {
      const now = performance.now();
      const oldDur = 60000 / bpmRef.current;
      const newDur = 60000 / next;
      const frac = Math.min((now - lastBeatTimeRef.current) / oldDur, 1);
      lastBeatTimeRef.current = now - frac * newDur;
    }
    bpmRef.current = next;
    setBpmState(next);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowRight') setBpm(bpmRef.current + (e.shiftKey ? 5 : 1));
      else if (e.code === 'ArrowLeft')  setBpm(bpmRef.current - (e.shiftKey ? 5 : 1));
      else if (e.code === 'KeyF') toggleFullscreen();
      else if (e.code === 'KeyC') setPanelOpen(p => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, setBpm]);

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);
    return () => document.removeEventListener('fullscreenchange', onFS);
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  // Tap tempo
  const handleTap = () => {
    const now = Date.now();
    const taps = [...tapTimesRef.current.slice(-7), now];
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      setBpm(Math.round(60000 / (intervals.reduce((a, b) => a + b) / intervals.length)));
    }
  };

  const handleBpmWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setBpm(bpmRef.current - Math.sign(e.deltaY));
  };

  // Render visualization
  const vizCommonProps = {
    ballPos: animState.ballPos, fg: preset.fg,
    flash: animState.flash, firstBeat: animState.firstBeat,
    firstBeatEmphasis, status,
  };
  const isReady = status === 'Ready';

  const renderViz = () => {
    switch (vizType) {
      case 'Bounce': return <BounceViz {...vizCommonProps} direction={direction} isReady={isReady} />;
      case 'Pulse':  return <PulseViz  {...vizCommonProps} />;
      case 'Swing':  return <SwingViz  {...vizCommonProps} />;
      case 'Sweep':  return <SweepViz  {...vizCommonProps} />;
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        @keyframes breathe {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.82; }
        }
        @keyframes readyPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
          50% { transform: scale(1.04); box-shadow: 0 0 32px 8px rgba(255,255,255,0.08); }
        }
      `}</style>

      <div style={{
        display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
        userSelect: 'none', fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}>

        {/* ── Visual area ──────────────────────────────────────────────── */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: preset.bg, transition: 'background 0.4s' }}>

          {/* Count display */}
          {showCount && !isReady && (
            <div data-testid="count-display" style={{
              position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 14, zIndex: 10,
            }}>
              {Array.from({ length: totalBeats }, (_, i) => (
                <span key={i} style={{
                  color: preset.fg,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: i === animState.beat ? '2.2rem' : '1rem',
                  fontWeight: i === animState.beat ? 700 : 400,
                  opacity: i === animState.beat ? 1 : 0.18,
                  transition: 'all 0.07s ease',
                  lineHeight: 1,
                  minWidth: '1.5ch',
                  textAlign: 'center',
                }}>
                  {i + 1}
                </span>
              ))}
            </div>
          )}

          {/* Visualization */}
          <div data-testid="metronome-visual-root" style={{
            position: 'absolute', inset: 0,
            animation: isReady ? 'breathe 3.6s ease-in-out infinite' : 'none',
          }}>
            {renderViz()}
          </div>

          {/* Ready state overlay */}
          {isReady && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 28, zIndex: 10,
            }}>
              <div style={{ color: preset.fg, opacity: 0.22, fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.16em' }}>
                {bpm} BPM
              </div>
              <button
                onClick={togglePlay}
                title="Start (Space)"
                aria-label="Start metronome"
                data-testid="start-button"
                style={{
                  width: 96, height: 96, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: preset.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 52px ${preset.fg}55`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
                onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)'}
                onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)'}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill={preset.bg}>
                  <polygon points="7,3 21,12 7,21" />
                </svg>
              </button>
              <div style={{ color: preset.fg, opacity: 0.2, fontSize: '0.62rem', letterSpacing: '0.2em' }}>
                SPACE TO START
              </div>
            </div>
          )}

          {/* Active play/pause corner */}
          {!isReady && (
            <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: preset.fg, opacity: 0.22, fontFamily: "'DM Mono', monospace", fontSize: '0.7rem' }}>
                {bpm} BPM
              </span>
              <button
                onClick={togglePlay}
                aria-label={status === 'Playing' ? 'Pause metronome' : 'Play metronome'}
                data-testid="play-pause-button"
                style={{
                  width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: preset.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = 'scale(0.93)'}
                onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)'}
              >
                {status === 'Playing'
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill={preset.bg}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill={preset.bg}><polygon points="7,3 21,12 7,21" /></svg>
                }
              </button>
            </div>
          )}

          {/* Panel expand handle */}
          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              title="Open panel (C)"
              aria-label="Expand controls"
              data-testid="panel-expand-handle"
              style={{
                position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                width: 16, height: 52, background: panelBg, borderLeft: `1px solid ${pBorder}`,
                borderRadius: '4px 0 0 4px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: ts, zIndex: 20,
              }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Control panel ────────────────────────────────────────────── */}
        <div data-testid="control-panel" style={{
          flexShrink: 0, overflow: 'hidden',
          width: panelOpen ? 268 : 0,
          background: panelBg,
          borderLeft: `1px solid ${pBorder}`,
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {panelOpen && (
            <div style={{ width: 268, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', scrollbarWidth: 'none' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: tp, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em' }}>BEAT</span>
                  <span style={{
                    color: ts, fontSize: '0.62rem', fontFamily: "'DM Mono', monospace",
                    padding: '2px 6px', border: `1px solid ${pBorder}`, borderRadius: 4,
                  }}>
                    {status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconBtn onClick={() => setIsDark(d => !d)} title={isDark ? 'Light mode' : 'Dark mode'} tp={tp} ts={ts} hov={hov}>
                    {isDark
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    }
                  </IconBtn>
                  {fullscreenSupported && (
                    <IconBtn
                      onClick={toggleFullscreen}
                      title="Fullscreen (F)"
                      ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                      testId="fullscreen-button"
                      tp={tp} ts={ts} hov={hov}
                    >
                      {isFullscreen
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                      }
                    </IconBtn>
                  )}
                  <IconBtn
                    onClick={() => setPanelOpen(false)}
                    title="Collapse (C)"
                    ariaLabel="Collapse controls"
                    testId="panel-collapse-button"
                    tp={tp} ts={ts} hov={hov}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </IconBtn>
                </div>
              </div>

              {/* BPM */}
              <div style={{ padding: '16px 16px 14px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div
                      data-testid="bpm-display"
                      style={{
                        color: tp, fontFamily: "'DM Mono', monospace",
                        fontSize: '3.5rem', fontWeight: 700, lineHeight: 1,
                        cursor: 'ns-resize', userSelect: 'none',
                      }}
                      onWheel={handleBpmWheel}
                    >
                      {bpm}
                    </div>
                    <div style={{ color: ts, fontSize: '0.6rem', letterSpacing: '0.16em', marginTop: 4 }}>BPM</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
                    {[1, -1].map(d => (
                      <button
                        key={d}
                        onClick={() => setBpm(bpm + d)}
                        style={{ width: 26, height: 26, border: 'none', cursor: 'pointer', background: 'transparent', color: ts, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hov; (e.currentTarget as HTMLElement).style.color = tp; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = ts; }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          {d > 0 ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range" min={40} max={240} value={bpm}
                  onChange={e => setBpm(Number(e.target.value))}
                  style={{ width: '100%', accentColor: tp, marginBottom: 10, display: 'block' }}
                />
                <button
                  onClick={handleTap}
                  style={{
                    width: '100%', padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                    color: ts, border: `1px solid ${pBorder}`, background: 'transparent',
                    fontSize: '0.7rem', letterSpacing: '0.12em', fontWeight: 600,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hov}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  TAP TEMPO
                </button>
              </div>

              {/* Count mode */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <SectionLabel text="COUNT MODE" ts={ts} />
                <SegCtrl
                  opts={[
                    { id: '4/4', label: '4 / 4', testId: 'count-mode-4-4' },
                    { id: '8count', label: '8 Count', testId: 'count-mode-8count' },
                  ]}
                  value={countMode} onChange={v => setCountMode(v as CountMode)}
                  tp={tp} ts={ts} bg={panelBg} border={pBorder}
                />
              </div>

              {/* Visualization */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <SectionLabel text="VISUALIZATION" ts={ts} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(['Bounce', 'Swing', 'Pulse', 'Sweep'] as VizType[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setVizType(v)}
                      style={{
                        padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: '0.72rem',
                        background: vizType === v ? tp : 'transparent',
                        color: vizType === v ? panelBg : ts,
                        border: `1px solid ${vizType === v ? tp : pBorder}`,
                        fontWeight: vizType === v ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <SectionLabel text="DIRECTION" ts={ts} />
                <SegCtrl
                  opts={[{ id: 'Vertical', label: 'Vertical' }, { id: 'Horizontal', label: 'Horiz.' }]}
                  value={direction} onChange={v => setDirection(v as Direction)}
                  tp={tp} ts={ts} bg={panelBg} border={pBorder}
                />
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <ToggleRow
                    label="First beat emphasis" value={firstBeatEmphasis} onChange={setFirstBeatEmphasis}
                    tp={tp} ts={ts} bg={panelBg}
                    testId="first-beat-emphasis-toggle" ariaLabel="Toggle first beat emphasis"
                  />
                  <ToggleRow label="Count numbers" value={showCount} onChange={setShowCount} tp={tp} ts={ts} bg={panelBg} />
                </div>
              </div>

              {/* Color */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <SectionLabel text="COLOR" ts={ts} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPresetId(p.id)}
                      title={p.name}
                      style={{
                        aspectRatio: '1', borderRadius: 8, background: p.bg, cursor: 'pointer',
                        border: presetId === p.id ? `2px solid ${tp}` : `1px solid ${pBorder}`,
                        outline: presetId === p.id ? `2px solid ${tp}` : 'none',
                        outlineOffset: 2,
                        position: 'relative', overflow: 'hidden',
                        transition: 'transform 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                    >
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 10, height: 10, background: p.fg, borderRadius: '50%',
                      }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Start count */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <SectionLabel text="START COUNT" ts={ts} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {([
                    { id: 'Immediately' as StartCount, label: 'Now' },
                    { id: '4count'      as StartCount, label: '4 Count' },
                    { id: '8count'      as StartCount, label: '8 Count' },
                    { id: '5678'        as StartCount, label: '5,6,7,8' },
                  ]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setStartCount(opt.id)}
                      style={{
                        padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: '0.72rem',
                        background: startCount === opt.id ? tp : 'transparent',
                        color: startCount === opt.id ? panelBg : ts,
                        border: `1px solid ${startCount === opt.id ? tp : pBorder}`,
                        fontWeight: startCount === opt.id ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${pBorder}`, flexShrink: 0 }}>
                <SectionLabel text="SHORTCUTS" ts={ts} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['Space', 'Play / Pause'],
                    ['← →', 'BPM ±1'],
                    ['⇧ + ← →', 'BPM ±5'],
                    ...(fullscreenSupported ? [['F', 'Fullscreen']] : []),
                    ['C', 'Toggle panel'],
                  ].map(([key, desc]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: ts, fontSize: '0.7rem' }}>{desc}</span>
                      <span style={{
                        color: tp, fontFamily: "'DM Mono', monospace", fontSize: '0.6rem',
                        padding: '2px 6px', border: `1px solid ${pBorder}`, borderRadius: 4,
                      }}>
                        {key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main play/pause button */}
              <div style={{ padding: '16px', marginTop: 'auto', flexShrink: 0 }}>
                <button
                  onClick={togglePlay}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: tp, color: panelBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em',
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.86'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'}
                  onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                >
                  {status === 'Playing'
                    ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>PAUSE</>)
                    : (<><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>{status === 'Ready' ? 'START' : 'RESUME'}</>)
                  }
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
