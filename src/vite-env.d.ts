declare module '*.css';
declare module '*.css?inline' {
  const content: string;
  export default content;
}

type GoriTypeFieldEntry = { type: string; optional: boolean; resolvedType?: string; fields?: Record<string, GoriTypeFieldEntry> };
declare var __goriPropTypes: Record<string, Record<string, GoriTypeFieldEntry>> | undefined;
