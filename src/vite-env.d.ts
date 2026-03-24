declare module '*.css';
declare module '*.css?inline' {
  const content: string;
  export default content;
}
declare module '*.css?raw' {
  const content: string;
  export default content;
}

type RfmTypeFieldEntry = { type: string; optional: boolean; resolvedType?: string; fields?: Record<string, RfmTypeFieldEntry> };
declare var __rfmPropTypes: Record<string, Record<string, RfmTypeFieldEntry>> | undefined;
