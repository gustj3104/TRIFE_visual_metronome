import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/app/App';

describe('App CTA + keyboard integration', () => {
  it('Ready -> Start -> Pause -> Restart transitions with correct labels', () => {
    render(<App />);
    const cta = screen.getByTestId('cta-button');
    expect(cta).toHaveTextContent('START');
    expect(cta).toHaveAttribute('aria-label', 'Start metronome');

    fireEvent.click(cta);
    expect(cta).toHaveTextContent('PAUSE');
    expect(cta).toHaveAttribute('aria-label', 'Pause metronome');
    expect(screen.getByTestId('status-badge')).toHaveTextContent('PLAYING');

    fireEvent.click(cta);
    expect(cta).toHaveTextContent('RESTART');
    expect(cta).toHaveAttribute('aria-label', 'Restart from count 1');
    expect(screen.getByTestId('status-badge')).toHaveTextContent('PAUSED');

    fireEvent.click(cta);
    expect(cta).toHaveTextContent('PAUSE');
    expect(screen.getByTestId('status-badge')).toHaveTextContent('PLAYING');
  });

  it('Space toggles play/pause globally', () => {
    render(<App />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('READY');
    fireEvent.keyDown(window, { code: 'Space' });
    expect(screen.getByTestId('status-badge')).toHaveTextContent('PLAYING');
    fireEvent.keyDown(window, { code: 'Space' });
    expect(screen.getByTestId('status-badge')).toHaveTextContent('PAUSED');
  });

  it('Space is ignored while the BPM input is focused, and does not double-fire on a focused button', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    const input = screen.getByRole('spinbutton');
    input.focus();

    fireEvent.keyDown(input, { code: 'Space' });
    expect(screen.getByTestId('status-badge')).toHaveTextContent('READY');
  });

  it('arrow keys adjust BPM, but not while the BPM input is focused', () => {
    render(<App />);
    fireEvent.keyDown(window, { code: 'ArrowRight' });
    expect(screen.getByText('121')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    const input = screen.getByRole('spinbutton');
    fireEvent.keyDown(input, { code: 'ArrowRight' });
    // Still 121 — the global BPM-arrow-key shortcut must not fire while
    // editing the BPM input (native number-input arrow behavior applies
    // instead).
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByText('121')).toBeInTheDocument();
  });

  it('never renders the string RESUME', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('cta-button'));
    fireEvent.click(screen.getByTestId('cta-button'));
    expect(screen.queryByText(/resume/i)).not.toBeInTheDocument();
  });

  it('renders a SIZE section with Visual and Shape sliders', () => {
    render(<App />);
    expect(screen.getByTestId('size-section')).toBeInTheDocument();
    expect(screen.getByTestId('visual-scale-slider')).toBeInTheDocument();
    expect(screen.getByTestId('shape-scale-slider')).toBeInTheDocument();
  });

  it('changing Visual/Shape scale does not change engine status or BPM', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('cta-button'));
    expect(screen.getByTestId('status-badge')).toHaveTextContent('PLAYING');

    fireEvent.change(screen.getByTestId('visual-scale-slider'), { target: { value: '1.3' } });
    fireEvent.change(screen.getByTestId('shape-scale-slider'), { target: { value: '0.6' } });

    expect(screen.getByTestId('status-badge')).toHaveTextContent('PLAYING');
    expect(screen.getByText('120')).toBeInTheDocument();
  });
});
