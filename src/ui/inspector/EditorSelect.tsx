import { useEffect, useMemo, useState } from "react";
import { EDITOR_OPTIONS } from "../../editor.js";
import {
  DEFAULT_EDITOR_AVAILABILITY,
  EDITOR_SELECTION_EVENT,
  fetchEditorAvailability,
  getStoredEditorSelection,
  setStoredEditorSelection,
  type EditorAvailability,
  type EditorSelection,
} from "./utils.js";

function getInitialSelection(): EditorSelection {
  return getStoredEditorSelection() ?? "project";
}

function sortEditors(editors: EditorAvailability["editors"]) {
  const order = new Map(
    EDITOR_OPTIONS.map((option, index) => [option.id, index]),
  );
  return [...editors].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99);
  });
}

export function EditorSelect() {
  const [selection, setSelection] =
    useState<EditorSelection>(getInitialSelection);
  const [availability, setAvailability] = useState<EditorAvailability>(
    DEFAULT_EDITOR_AVAILABILITY,
  );

  useEffect(() => {
    let cancelled = false;
    fetchEditorAvailability().then((next) => {
      if (!cancelled) setAvailability(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      setSelection(getStoredEditorSelection() ?? "project");
    };
    window.addEventListener(EDITOR_SELECTION_EVENT, onSelectionChange);
    window.addEventListener("storage", onSelectionChange);
    return () => {
      window.removeEventListener(EDITOR_SELECTION_EVENT, onSelectionChange);
      window.removeEventListener("storage", onSelectionChange);
    };
  }, []);

  const editors = useMemo(
    () => sortEditors(availability.editors),
    [availability.editors],
  );
  const visibleEditors = editors.filter(
    (editor) =>
      editor.available ||
      editor.id === "code" ||
      editor.id === selection ||
      editor.id === availability.defaultEditor,
  );
  const showProjectDefault =
    availability.defaultEditor !== "code" && selection === "project";

  return (
    <label
      className="h-7 shrink-0 flex items-center gap-1.5 rounded-[6px] border border-rfm-border-light bg-white px-2 text-[11px] font-medium text-rfm-text-500"
      title="Choose editor for source jumps"
    >
      <span className="text-rfm-text-400">IDE</span>
      <select
        value={showProjectDefault ? "project" : selection === "project" ? "code" : selection}
        onChange={(event) => {
          const value = event.target.value as EditorSelection;
          setSelection(value);
          setStoredEditorSelection(value);
        }}
        className="h-5 min-w-[112px] max-w-[150px] border-none bg-transparent p-0 text-[11px] font-medium text-rfm-text-700 outline-none"
      >
        {showProjectDefault && (
          <option value="project">Project default ({availability.defaultLabel})</option>
        )}
        {visibleEditors.map((editor) => (
          <option key={editor.id} value={editor.id}>
            {editor.label}
          </option>
        ))}
      </select>
    </label>
  );
}
