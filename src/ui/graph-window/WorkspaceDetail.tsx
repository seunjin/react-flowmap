import type React from 'react';
import { ExternalLink } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { PropTypesMap } from '../inspector/channel';
import { PropRow } from '../inspector/PropRow';
import type { RfmNextRoute } from '../inspector/types';
import { openInEditor } from '../inspector/utils';
import { getEntryScreenContext, getRouteScreenContext } from './workspace-detail-model';

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

function MetaGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[8px] border border-[rgba(229,231,235,0.8)] bg-[rgba(249,250,251,0.7)] px-2.5 py-2"
        >
          <div className="text-[9px] font-bold text-rfm-text-400 tracking-[0.06em] uppercase">
            {item.label}
          </div>
          <div className="mt-1 text-[12px] font-medium text-rfm-text-900 break-words">
            {item.value}
          </div>
        </div>
      ))}
    </div>
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

function ScreenContextSection({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <Section label="Screen context">
      <MetaGrid items={items} />
    </Section>
  );
}

function ComponentDetail({
  entry,
  props,
  propTypesMap,
  allRoutes,
  currentUrlPath,
}: {
  entry: DocEntry;
  props: Record<string, unknown> | null;
  propTypesMap: PropTypesMap;
  allRoutes: RfmNextRoute[];
  currentUrlPath: string;
}) {
  const screenContext = getEntryScreenContext(entry, allRoutes, currentUrlPath);
  const contextItems = screenContext.route
    ? [
        { label: 'Route', value: screenContext.route.componentName },
        { label: 'URL', value: screenContext.route.urlPath },
        ...(screenContext.parentLayout
          ? [{ label: 'Layout', value: screenContext.parentLayout.componentName }]
          : []),
      ]
    : [];

  return (
    <>
      <SelectionHeader
        name={entry.name}
        filePath={entry.filePath}
        onOpen={() => openInEditor(entry.filePath, entry.symbolId)}
      />
      <PropsSection props={props} symbolId={entry.symbolId} propTypesMap={propTypesMap} />
      <ScreenContextSection items={contextItems} />
    </>
  );
}

function RouteDetail({
  route,
  allRoutes,
}: {
  route: RfmNextRoute;
  allRoutes: RfmNextRoute[];
}) {
  const propEntries = Object.entries(route.propTypes ?? {});
  const screenContext = getRouteScreenContext(route, allRoutes);
  const contextItems = [
    { label: 'URL', value: route.urlPath },
    { label: 'Type', value: route.type },
    { label: 'Mode', value: route.isServer ? 'Server' : 'Client' },
    ...(screenContext.parentLayout
      ? [{ label: 'Parent layout', value: screenContext.parentLayout.componentName }]
      : []),
  ];

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

      <ScreenContextSection items={contextItems} />
    </>
  );
}

export function WorkspaceDetail({
  entry,
  route,
  allRoutes,
  props,
  propTypesMap,
  currentUrlPath,
}: {
  entry: DocEntry | null;
  route: RfmNextRoute | null;
  allRoutes: RfmNextRoute[];
  props: Record<string, unknown> | null;
  propTypesMap: PropTypesMap;
  currentUrlPath: string;
}) {
  if (!entry && !route) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="m-0 text-[11px] text-rfm-text-400 text-center leading-relaxed">
          Pick a component or select a route
          <br />
          to inspect its props and screen context.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {route ? (
        <RouteDetail route={route} allRoutes={allRoutes} />
      ) : entry ? (
        <ComponentDetail
          entry={entry}
          props={props}
          propTypesMap={propTypesMap}
          allRoutes={allRoutes}
          currentUrlPath={currentUrlPath}
        />
      ) : null}
    </div>
  );
}
