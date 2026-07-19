import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BpmControl } from '../../src/app/components/BpmControl';

function Harness() {
  const [bpm, setBpm] = useState(120);
  return <BpmControl bpm={bpm} onCommit={setBpm} onWheel={() => {}} tp="#fff" />;
}

describe('BpmControl', () => {
  it('shows the BPM as plain text until clicked', () => {
    render(<Harness />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('clicking enters edit mode with a number input', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    expect(screen.getByRole('spinbutton')).toHaveValue(120);
  });

  it('Enter commits the new value and exits edit mode', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '180' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('180')).toBeInTheDocument();
  });

  it('Escape restores the previous BPM without committing', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('Blur commits the value', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.blur(input);
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('an empty value on commit restores the previous BPM', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('out-of-range values are clamped on commit', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('240')).toBeInTheDocument();
  });

  it('calls onCommit exactly once per confirmed edit', () => {
    const onCommit = vi.fn();
    render(<BpmControl bpm={120} onCommit={onCommit} onWheel={() => {}} tp="#fff" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit BPM' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '150' } });
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(150);
  });
});
