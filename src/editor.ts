export type KnownEditorId =
  | 'code'
  | 'cursor'
  | 'antigravity'
  | 'vim';

export type EditorOption = {
  id: KnownEditorId;
  label: string;
  command: string;
  aliases?: string[];
  macAppPaths?: string[];
};

export const DEFAULT_EDITOR_ID: KnownEditorId = 'code';
export const EDITOR_SELECTION_STORAGE_KEY = 'rfm-editor-selection';

export const EDITOR_OPTIONS: EditorOption[] = [
  {
    id: 'code',
    label: 'VS Code',
    command: 'code',
    macAppPaths: ['/Applications/Visual Studio Code.app'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    command: 'cursor',
    macAppPaths: ['/Applications/Cursor.app'],
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    command: 'antigravity',
    macAppPaths: ['/Applications/Antigravity.app'],
  },
  {
    id: 'vim',
    label: 'Vim',
    command: 'vim',
    aliases: ['vi'],
  },
];

export function isKnownEditorId(value: string | null | undefined): value is KnownEditorId {
  return EDITOR_OPTIONS.some((option) => option.id === value);
}

export function getEditorOption(id: KnownEditorId): EditorOption {
  return EDITOR_OPTIONS.find((option) => option.id === id)!;
}

export function getEditorCommand(id: KnownEditorId): string {
  return getEditorOption(id).command;
}

export function getEditorLabel(id: KnownEditorId): string {
  return getEditorOption(id).label;
}

export function normalizeKnownEditorId(value: string | null | undefined): KnownEditorId | null {
  if (!value) return null;
  const lastSegment = value.split(/[\\/]/).pop()?.toLowerCase() ?? value.toLowerCase();
  const normalized = lastSegment.replace(/(?:\.cmd|\.exe)$/i, '');

  for (const option of EDITOR_OPTIONS) {
    if (normalized === option.id || normalized === option.command) return option.id;
    if (option.aliases?.some((alias) => normalized === alias)) return option.id;
  }

  return null;
}
