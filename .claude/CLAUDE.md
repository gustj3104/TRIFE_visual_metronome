# Product goal

A projector-first visual metronome for Deaf, hard-of-hearing,
and hearing dancers to share rhythm through motion.

# Core constraints

- Desktop and 16:9 projector are the primary environments.
- Vertical Bounce must never change its x coordinate.
- Horizontal Bounce must never change its y coordinate.
- Motion between endpoints must be linear.
- First-beat emphasis may change scale only, never position.
- 4/4 and 8-count modes must both be supported.
- Space toggles play and pause.
- The control panel can collapse without resetting playback.
- Use only approved high-contrast color presets.
- Do not add decorative flashing effects.

# Required verification

After changing UI behavior:

1. Run type checking.
2. Run linting.
3. Run unit tests.
4. Run Playwright tests at 1920×1080.
5. Capture a screenshot of the ready, playing, and collapsed-panel states.

# Architecture

- Separate timing logic from React rendering.
- Use requestAnimationFrame for visual rendering.
- Use a monotonic time source such as performance.now().
- Do not drive metronome timing with React setInterval alone.
- Clean up animation frames, event listeners, AudioContext,
  object URLs, and MediaStream tracks.

# Audio privacy

- Prefer local analysis when possible.
- Never expose API keys in client code.
- Do not upload or retain audio without an explicit product decision.
