// ─── Design Tokens ────────────────────────────────────────────────────────────

export const colors = {
  primary: '#1e40af',
  primaryLight: '#dbeafe',
  primaryBg: '#eff6ff',
  primaryDark: '#1d4ed8',
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6b7280',
    subtle: '#9ca3af',
    disabled: '#d1d5db',
  },
  border: {
    default: 'rgba(229,231,235,0.8)',
    strong: '#e5e7eb',
    light: 'rgba(229,231,235,0.5)',
    medium: 'rgba(229,231,235,0.7)',
    soft: 'rgba(229,231,235,0.6)',
  },
  bg: {
    panel: 'rgba(255,255,255,0.88)',
    surface: 'rgba(249,250,251,0.6)',
    hover: '#f3f4f6',
    hoverAlpha: 'rgba(243,244,246,0.8)',
    hoverStrong: 'rgba(243,244,246,0.9)',
    selected: '#dbeafe',
    focus: '#f3f4f6',
    input: 'rgba(249,250,251,0.6)',
    white: 'rgba(255,255,255,0.5)',
    whiteStrong: 'rgba(255,255,255,0.95)',
    nodeDefault: 'rgba(249,250,251,0.7)',
    nodeCenter: 'rgba(243,244,246,0.9)',
  },
  accent: {
    blue: '#3b82f6',
    blueLight: 'rgba(59,130,246,0.04)',
    blueActive: 'rgba(30,64,175,0.05)',
  },
  value: {
    string: '#16a34a',
    number: '#2563eb',
    boolean: '#dc2626',
    default: '#6b7280',
  },
} as const;

export const SIDEBAR_W = 320;
export const BOTTOM_H  = 320;

export const shadow = {
  panel: '0 4px 6px rgba(23,37,84,0.04), 0 12px 32px rgba(23,37,84,0.10), 0 32px 64px rgba(23,37,84,0.06)',
  sideLeft:  '4px 0 32px rgba(23,37,84,0.08)',
  sideRight: '-4px 0 32px rgba(23,37,84,0.08)',
  sideBottom: '0 -4px 32px rgba(23,37,84,0.08)',
  dropdown: '0 4px 16px rgba(23,37,84,0.1)',
  node: '0 0 0 3px rgba(30,64,175,0.1)',
  button: '0 2px 10px rgba(29,78,216,0.4)',
} as const;
