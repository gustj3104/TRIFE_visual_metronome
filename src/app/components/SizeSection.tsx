import {
  SHAPE_SCALE_MAX,
  SHAPE_SCALE_MIN,
  SIZE_STEP,
  VISUAL_SCALE_MAX,
  VISUAL_SCALE_MIN,
  type VisualSizeSettings,
} from '../engine/types';
import { formatScalePercent } from '../lib/sizeSettings';

interface SizeSectionProps {
  settings: VisualSizeSettings;
  onChange: (settings: VisualSizeSettings) => void;
  tp: string;
  ts: string;
}

function SizeSlider({
  label,
  value,
  min,
  max,
  onChange,
  tp,
  ts,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  tp: string;
  ts: string;
  testId: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ color: ts, fontSize: '0.73rem' }}>{label}</span>
        <span style={{ color: tp, fontFamily: "'DM Mono', monospace", fontSize: '0.7rem' }}>{formatScalePercent(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={SIZE_STEP}
        value={value}
        aria-label={`${label} size`}
        data-testid={testId}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: tp, display: 'block' }}
      />
    </div>
  );
}

export function SizeSection({ settings, onChange, tp, ts }: SizeSectionProps) {
  return (
    <div data-testid="size-section">
      <SizeSlider
        label="Visual"
        value={settings.visualScale}
        min={VISUAL_SCALE_MIN}
        max={VISUAL_SCALE_MAX}
        onChange={(visualScale) => onChange({ ...settings, visualScale })}
        tp={tp}
        ts={ts}
        testId="visual-scale-slider"
      />
      <SizeSlider
        label="Shape"
        value={settings.shapeScale}
        min={SHAPE_SCALE_MIN}
        max={SHAPE_SCALE_MAX}
        onChange={(shapeScale) => onChange({ ...settings, shapeScale })}
        tp={tp}
        ts={ts}
        testId="shape-scale-slider"
      />
    </div>
  );
}
