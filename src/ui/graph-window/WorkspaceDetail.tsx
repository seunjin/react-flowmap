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
  meta,
  onOpen,
}: {
  name: string;
  filePath: string;
  meta?: string;
  onOpen: () => void;
}) {
  return (
    <div className="px-4 py-4 border-b border-rfm-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold text-rfm-text-900 truncate">{name}</h2>
          {meta ? (
            <p className="m-0 mt-1 text-[10px] text-rfm-text-400 truncate">{meta}</p>
          ) : null}
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

function formatRole(role: DocEntry['role'] | RfmRoute['type'] | undefined): string {
  if (!role) return 'Component';
  if (role === 'not-found') return 'Not Found';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function PropsSection({
  label = 'Props',
  props,
  symbolId,
  propTypesMap,
}: {
  label?: string;
  props: Record<string, unknown> | null;
  symbolId: string;
  propTypesMap: PropTypesMap;
}) {
  const propEntries = props ? Object.entries(props) : [];
  const compPropTypes = propTypesMap[symbolId];
  const propsDefLoc = compPropTypes?.propsDefLoc;

  return (
    <Section label={label}>
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

function StaticTypeSection({
  label,
  propTypes,
  emptyText,
}: {
  label: string;
  propTypes: Record<string, { type: string; optional: boolean }> | undefined;
  emptyText: string;
}) {
  const propEntries = Object.entries(propTypes ?? {});

  return (
    <Section label={label}>
      {propEntries.length === 0 ? (
        <p className="m-0 text-[11px] text-rfm-text-400">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-[5px]">
          {propEntries.map(([name, typeEntry]) => (
            <PropRow key={name} name={name} value={undefined} typeEntry={typeEntry} typeOnly />
          ))}
        </div>
      )}
    </Section>
  );
}

function LivePropsNotice({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Section label={title}>
      <p className="m-0 text-[11px] text-rfm-text-400 leading-relaxed">
        {body}
      </p>
    </Section>
  );
}

function ComponentDetail({
  entry,
  route,
  props,
  propTypesMap,
}: {
  entry: DocEntry;
  route?: RfmRoute | null;
  props: Record<string, unknown> | null;
  propTypesMap: PropTypesMap;
}) {
  const executionLabel = entry.executionKind === 'static' ? 'SERVER' : 'CLIENT';
  const role = route?.type ?? entry.role;

  return (
    <>
      <SelectionHeader
        name={entry.name}
        filePath={entry.filePath}
        meta={`${formatRole(role)} · ${executionLabel}`}
        onOpen={() => openInEditor(entry.filePath, entry.symbolId)}
      />
      <PropsSection props={props} symbolId={entry.symbolId} propTypesMap={propTypesMap} />
      {route ? (
        <StaticTypeSection
          label="Static Prop Types"
          propTypes={route.propTypes}
          emptyText="No static type metadata for this route file."
        />
      ) : null}
    </>
  );
}

function StaticComponentDetail({
  entry,
}: {
  entry: DocEntry;
}) {
  const isServerNode = entry.executionKind === 'static';
  const executionLabel = isServerNode ? 'SERVER component' : 'CLIENT boundary';
  const noticeBody = isServerNode
    ? 'Live props are unavailable for SERVER nodes because they are not mounted in the browser runtime. Flowmap can only show static ownership and source-derived type metadata here.'
    : 'This node is coming from static route ownership, not from a mounted browser instance. Select the mounted CLIENT node in the graph to inspect live props.';

  return (
    <>
      <SelectionHeader
        name={entry.name}
        filePath={entry.filePath}
        meta={executionLabel}
        onOpen={() => openInEditor(entry.filePath, '', '1')}
      />

      <LivePropsNotice
        title="Live Props"
        body={noticeBody}
      />
    </>
  );
}

function RouteDetail({
  route,
}: {
  route: RfmRoute;
}) {
  const routeRole = formatRole(route.type);
  const executionLabel = route.executionKind === 'static' ? 'SERVER' : 'CLIENT';
  const showLivePropsNotice = route.executionKind === 'static';

  return (
    <>
      <SelectionHeader
        name={route.componentName}
        filePath={route.filePath}
        meta={`${routeRole} · ${executionLabel}`}
        onOpen={() => openInEditor(route.filePath, '', '1')}
      />

      {showLivePropsNotice ? (
        <LivePropsNotice
          title="Live Props"
          body="Live props are unavailable for SERVER route files because they do not exist as mounted component instances in the browser. Only static prop types inferred from source can be shown here."
        />
      ) : null}

      <StaticTypeSection
        label="Static Prop Types"
        propTypes={route.propTypes}
        emptyText="No static type metadata for this route file."
      />
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
          Pick a component or select a route file
          <br />
          to inspect live props or static type metadata.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {route ? (
        entry && entry.executionKind === 'live' ? (
          <ComponentDetail
            entry={entry}
            route={route}
            props={props}
            propTypesMap={propTypesMap}
          />
        ) : (
          <RouteDetail route={route} />
        )
      ) : entry ? (
        entry.source === 'static-import' ? (
          <StaticComponentDetail entry={entry} />
        ) : (
          <ComponentDetail
            entry={entry}
            props={props}
            propTypesMap={propTypesMap}
          />
        )
      ) : null}
    </div>
  );
}
