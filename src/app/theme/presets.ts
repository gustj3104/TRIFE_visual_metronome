export interface ColorPreset {
  id: string;
  name: string;
  bg: string;
  fg: string;
}

export const PRESETS: ColorPreset[] = [
  { id: 'bw',  name: 'Black / White',     bg: '#0a0a0a', fg: '#ffffff' },
  { id: 'wb',  name: 'White / Black',     bg: '#f2f2f2', fg: '#0a0a0a' },
  { id: 'by',  name: 'Black / Yellow',    bg: '#0a0a0a', fg: '#f5d200' },
  { id: 'nw',  name: 'Navy / White',      bg: '#0c1445', fg: '#ffffff' },
  { id: 'wdb', name: 'White / Deep Blue', bg: '#f2f2f2', fg: '#0a1f5c' },
  { id: 'pl',  name: 'Purple / Lime',     bg: '#160c28', fg: '#c8f135' },
  { id: 'bc',  name: 'Burgundy / Cream',  bg: '#3c0810', fg: '#f0e6d3' },
];
