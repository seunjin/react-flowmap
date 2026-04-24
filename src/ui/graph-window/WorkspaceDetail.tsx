import type React from 'react';
import { ExternalLink } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { PropTypesMap } from '../inspector/channel';
import { PropRow } from '../inspector/PropRow';
import type { RfmRoute } from '../inspector/types';
import { openInEditor } from '../inspector/utils';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4 border-b border-rfm-border">
      <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase block mb-3">
        {label}
      </span>
      {children}
    </section>
  );
}

function SelectionHeader({
  name,
  filePath,
  onOpen,
}: {
  name: string;
  filePath: string;
  onOpen: () => void;
}) {
  return (
    <div className="px-4 py-4 border-b border-rfm-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold text-rfm-text-900 truncate">{name}</h2>
          <p className="m-0 mt-2 text-[10px] text-rfm-text-400 font-mono break-all">
            {filePath || '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          title="Open in editor"
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded border border-rfm-border-light bg-transparent text-rfm-text-400 hover:text-rfm-text-700 hover:bg-rfm-bg-100 cursor-pointer transition-all"
        >
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}

function PropsSection({
  props,
  symbolId,
  propTypesMap,
}: {
  props: Record<string, unknown> | null;
  symbolId: string;
  propTypesMap: PropTypesMap;
}) {
  const propEntries = props ? Object.entries(props) : [];
  const compPropTypes = propTypesMap[symbolId];
  const propsDefLoc = compPropTypes?.propsDefLoc;

  return (
    <Section label="Props">
      {props === null ? (
        <p className="m-0 text-[11px] text-rfm-text-400">Syncing live props...</p>
      ) : propEntries.length === 0 ? (
        <p className="m-0 text-[11px] text-rfm-text-400">No props.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {propsDefLoc && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => openInEditor(propsDefLoc.file, '', String(propsDefLoc.line))}
                title={`Go to Props type\n${propsDefLoc.file}:${propsDefLoc.line}`}
                className="flex items-center gap-1 text-[10px] text-rfm-text-400 hover:text-rfm-blue cursor-pointer border-none bg-transparent p-0 transition-all"
              >
                <ExternalLink size={11} />
                Props type
              </button>
            </div>
          )}
          <div className="flex flex-col gap-[5px]">
            {propEntries.map(([name, value]) => (
              <PropRow key={name} name={name} value={value} typeEntry={compPropTypes?.props?.[name]} />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function ComponentDetail({
  entry,
  props,
  propTypesMap,
}: {
  entry: DocEntry;
  props: Record<string, unknown> | null;
  propTypesMap: PropTypesMap;
}) {
  return (
    <>
      <SelectionHeader
        name={entry.name}
        filePath={entry.filePath}
        onOpen={() => openInEditor(entry.filePath, entry.symbolId)}
      />
      <PropsSection props={props} symbolId={entry.symbolId} propTypesMap={propTypesMap} />
    </>
  );
}

function RouteDetail({
  route,
}: {
  route: RfmRoute;
}) {
  const propEntries = Object.entries(route.propTypes ?? {});

  return (
    <>
      <SelectionHeader
        name={route.componentName}
        filePath={route.filePath}
        onOpen={() => openInEditor(route.filePath, '', '1')}
      />

      <Section label="Props">
        {propEntries.length === 0 ? (
          <p className="m-0 text-[11px] text-rfm-text-400">No static props metadata.</p>
        ) : (
          <div className="flex flex-col gap-[5px]">
            {propEntries.map(([name, typeEntry]) => (
              <PropRow key={name} name={name} value={undefined} typeEntry={typeEntry} typeOnly />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

export function WorkspaceDetail({
  entry,
  route,
  props,
  propTypesMap,
}: {
  entry: DocEntry | null;
  route: RfmRoute | null;
  props: Record<string, unknown> | null;
  propTypesMap: PropTypesMap;
}) {
  if (!entry && !route) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="m-0 text-[11px] text-rfm-text-400 text-center leading-relaxed">
          Pick a component or select a route
          <br />
          to inspect its props.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {route ? (
        <RouteDetail route={route} />
      ) : entry ? (
        <ComponentDetail
          entry={entry}
          props={props}
          propTypesMap={propTypesMap}
        />
      ) : null}
    </div>
  );
}
