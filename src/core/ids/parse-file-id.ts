export function parseFileId(fileId: string): string {
  return fileId.startsWith('file:') ? fileId.slice('file:'.length) : fileId;
}
