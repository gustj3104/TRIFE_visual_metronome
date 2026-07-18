import React, { useCallback, useRef, useState } from 'react';
import { useFullscreen } from './hooks/useFullscreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMetronomeEngine } from './hooks/useMetronomeEngine';
import { useReducedMotion } from './hooks/useReducedMotion';
import type { CountMode, Direction, StartCount, VizType } from './metronome/types';
import { PRESETS } from './theme/presets';
import { BounceViz } from './visualizations/BounceViz';
import { PulseViz } from './visualizations/PulseViz';
import { SweepViz } from './visualizations/SweepViz';
import { SwingViz } from './visualizations/SwingViz';

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
  const [vizType, setVizType] = useState<VizType>('Bounce');
  const [direction, setDirection] = useState<Direction>('Vertical');
  const [firstBeatEmphasis, setFirstBeatEmphasis] = useState(true);
  const [showCount, setShowCount] = useState(true);
  const [presetId, setPresetId] = useState('bw');
  const [startCount, setStartCount] = useState<StartCount>('Immediately');
  const [panelOpen, setPanelOpen] = useState(true);

  const engine = useMetronomeEngine(120, '4/4');
  const { isFullscreen, fullscreenSupported, toggleFullscreen } = useFullscreen();
  const reducedMotion = useReducedMotion();
  const tapTimesRef = useRef<number[]>([]);

  useKeyboardShortcuts({
    togglePlay: engine.togglePlay,
    adjustBpm: engine.adjustBpm,
    toggleFullscreen,
    togglePanel: () => setPanelOpen(p => !p),
  });

  const totalBeats = engine.countMode === '4/4' ? 4 : 8;
  const preset = PRESETS.find(p => p.id === presetId) ?? PRESETS[0];
  const isReady = engine.status === 'Ready';

  // Panel theme
  const panelBg  = isDark ? '#111111' : '#f0f0f0';
  const pBorder  = isDark ? '#222222' : '#d4d4d4';
  const tp       = isDark ? '#ffffff' : '#0a0a0a';
  const ts       = isDark ? '#666666' : '#909090';
  const hov      = isDark ? '#1c1c1c' : '#e2e2e2';

  // Tap tempo
  const handleTap = useCallback(() => {
    const now = Date.now();
    const taps = [...tapTimesRef.current.slice(-7), now];
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      engine.setBpm(Math.round(60000 / (intervals.reduce((a, b) => a + b) / intervals.length)));
    }
  }, [engine]);

  const handleBpmWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    engine.adjustBpm(-Math.sign(e.deltaY));
  };

  // Hover-scale interactions are minimized (not removed) under reduced motion.
  const hoverBoost = reducedMotion ? 0.3 : 1;

  const vizCommonProps = {
    fg: preset.fg,
    status: engine.status,
    bpm: engine.bpm,
    currentBeat: engine.currentBeat,
    isFirstBeat: engine.isFirstBeat,
    firstBeatEmphasis,
    getElapsedBeats: engine.getElapsedBeats,
  };

  const renderViz = () => {
    switch (vizType) {
      case 'Bounce': return <BounceViz {...vizCommonProps} direction={direction} reducedMotion={reducedMotion} />;
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
                  fontSize: i === engine.currentBeat ? '2.2rem' : '1rem',
                  fontWeight: i === engine.currentBeat ? 700 : 400,
                  opacity: i === engine.currentBeat ? 1 : 0.18,
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
            animation: (isReady && !reducedMotion) ? 'breathe 3.6s ease-in-out infinite' : 'none',
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
                {engine.bpm} BPM
              </div>
              <button
                onClick={engine.togglePlay}
                title="Start (Space)"
                aria-label="Start metronome"
                data-testid="start-button"
                style={{
                  width: 96, height: 96, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: preset.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = `scale(${1 + 0.07 * hoverBoost})`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 52px ${preset.fg}55`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
                onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = `scale(${1 - 0.05 * hoverBoost})`}
                onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = `scale(${1 + 0.07 * hoverBoost})`}
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
                {engine.bpm} BPM
              </span>
              <button
                onClick={engine.togglePlay}
                aria-label={engine.status === 'Playing' ? 'Pause metronome' : 'Play metronome'}
                data-testid="play-pause-button"
                style={{
                  width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: preset.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = `scale(${1 + 0.07 * hoverBoost})`}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = `scale(${1 - 0.07 * hoverBoost})`}
                onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = `scale(${1 + 0.07 * hoverBoost})`}
              >
                {engine.status === 'Playing'
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
                    {engine.status.toUpperCase()}
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
                      {engine.bpm}
                    </div>
                    <div style={{ color: ts, fontSize: '0.6rem', letterSpacing: '0.16em', marginTop: 4 }}>BPM</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
                    {[1, -1].map(d => (
                      <button
                        key={d}
                        onClick={() => engine.adjustBpm(d)}
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
                  type="range" min={40} max={240} value={engine.bpm}
                  onChange={e => engine.setBpm(Number(e.target.value))}
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
                  value={engine.countMode} onChange={v => engine.setCountMode(v as CountMode)}
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
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = `scale(${1 + 0.05 * hoverBoost})`}
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
                  onClick={engine.togglePlay}
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
                  {engine.status === 'Playing'
                    ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>PAUSE</>)
                    : (<><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>{engine.status === 'Ready' ? 'START' : 'PLAY'}</>)
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
