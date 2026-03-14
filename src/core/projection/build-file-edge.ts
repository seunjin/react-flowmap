import type { FileEdge, FileEdgeRelationType } from '../types/projection.js';

type BuildFileEdgeInput = {
  sourceFileId: string;
  targetFileId: string;
  relationType: FileEdgeRelationType;
  supportingEdgeId: string;
};

export function buildFileEdge({
  sourceFileId,
  targetFileId,
  relationType,
  supportingEdgeId,
}: BuildFileEdgeInput): FileEdge {
  return {
    id: `file-edge:${sourceFileId}->${targetFileId}`,
    sourceFileId,
    targetFileId,
    relationTypes: [relationType],
    supportingEdges: [supportingEdgeId],
  };
}
