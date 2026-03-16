declare module '*.css';

type GoriTypeFieldEntry = { type: string; optional: boolean; fields?: Record<string, GoriTypeFieldEntry> };
declare var __goriPropTypes: Record<string, Record<string, GoriTypeFieldEntry>> | undefined;
