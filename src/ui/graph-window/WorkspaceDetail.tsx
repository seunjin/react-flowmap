import type React from "react";
import { ExternalLink } from "lucide-react";
import type { DocEntry } from "../doc/build-doc-index";
import type { PropTypesMap } from "../inspector/channel";
import { PropRow } from "../inspector/PropRow";
import type { RfmRoute, RfmServerComponent } from "../inspector/types";
import { openInEditor } from "../inspector/utils";

const INTERNAL_COMPONENT_NAMES = new Set([
  "ReactFlowMap",
  "FlowmapProvider",
  "ComponentOverlay",
]);

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-3 border-b border-rfm-border">
      <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase block mb-3">
        {label}
      </span>
      {children}
    </section>
  );
}

function PropsSection({
  label = "Props",
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
        <p className="m-0 text-[11px] text-rfm-text-400">
          Syncing live props...
        </p>
      ) : propEntries.length === 0 ? (
        <p className="m-0 text-[11px] text-rfm-text-400">No props.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {propsDefLoc && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  openInEditor(propsDefLoc.file, "", String(propsDefLoc.line))
                }
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
              <PropRow
                key={name}
                name={name}
                value={value}
                typeEntry={compPropTypes?.props?.[name]}
              />
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
            <PropRow
              key={name}
              name={name}
              value={undefined}
              typeEntry={typeEntry}
              typeOnly
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function LivePropsNotice({ title, body }: { title: string; body: string }) {
  return (
    <Section label={title}>
      <p className="m-0 text-[11px] text-rfm-text-400 leading-relaxed">
        {body}
      </p>
    </Section>
  );
}

function matchesImportNode(
  node: RfmServerComponent,
  filePath: string,
  componentName: string,
): boolean {
  return node.filePath === filePath && node.componentName === componentName;
}

function findImportNode(
  children: RfmServerComponent[] | undefined,
  filePath: string,
  componentName: string,
): RfmServerComponent | null {
  for (const child of children ?? []) {
    if (matchesImportNode(child, filePath, componentName)) {
      return child;
    }
    const nested = findImportNode(child.children, filePath, componentName);
    if (nested) return nested;
  }
  return null;
}

function collectClientBoundaryNames(
  children: RfmServerComponent[] | undefined,
  seen = new Set<string>(),
): string[] {
  const names: string[] = [];

  for (const child of children ?? []) {
    if (
      INTERNAL_COMPONENT_NAMES.has(child.componentName) ||
      child.filePath.includes("react-flowmap")
    ) {
      continue;
    }

    if (child.nodeKind === "client-boundary") {
      if (!seen.has(child.componentName)) {
        seen.add(child.componentName);
        names.push(child.componentName);
      }
      continue;
    }

    names.push(...collectClientBoundaryNames(child.children, seen));
  }

  return names;
}

function getClientBoundariesForRoute(route: RfmRoute | null): string[] {
  if (!route) return [];
  return collectClientBoundaryNames(route.children);
}

function getClientBoundariesForEntry(
  entry: DocEntry,
  contextRoute: RfmRoute | null,
): string[] {
  if (!contextRoute) return [];
  if (
    contextRoute.filePath === entry.filePath &&
    contextRoute.componentName === entry.name
  ) {
    return collectClientBoundaryNames(contextRoute.children);
  }

  const importNode = findImportNode(
    contextRoute.children,
    entry.filePath,
    entry.name,
  );
  return collectClientBoundaryNames(importNode?.children);
}

function StructureSection({
  contextRoute,
  parentLayout,
  clientBoundaries,
}: {
  contextRoute: RfmRoute | null;
  parentLayout: RfmRoute | null;
  clientBoundaries: string[];
}) {
  const hasStructure =
    contextRoute !== null ||
    parentLayout !== null ||
    clientBoundaries.length > 0;

  if (!hasStructure) return null;

  return (
    <Section label="Screen Context">
      <div className="flex flex-col gap-3">
        {contextRoute ? (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-rfm-text-500">
              Owner Route
            </span>
            <span className="text-[11px] text-rfm-text-900">
              {contextRoute.componentName}
            </span>
          </div>
        ) : null}
        {parentLayout ? (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-rfm-text-500">
              Parent Layout
            </span>
            <span className="text-[11px] text-rfm-text-900">
              {parentLayout.componentName}
            </span>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-rfm-text-500">
            Client Boundaries Reached
          </span>
          {clientBoundaries.length === 0 ? (
            <span className="text-[11px] text-rfm-text-400">
              No client boundary is reachable from this server-owned node.
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {clientBoundaries.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-full bg-rfm-blue-light px-2 py-0.5 text-[10px] font-medium text-rfm-blue"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
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
  const isRouteEntry =
    !!route &&
    route.filePath === entry.filePath &&
    route.componentName === entry.name;

  return (
    <>
      <PropsSection
        props={props}
        symbolId={entry.symbolId}
        propTypesMap={propTypesMap}
      />
      {isRouteEntry ? (
        <StaticTypeSection
          label="Static Prop Types"
          propTypes={route?.propTypes}
          emptyText="No static type metadata for this route file."
        />
      ) : null}
    </>
  );
}

function StaticComponentDetail({
  entry,
  contextRoute,
  parentLayout,
}: {
  entry: DocEntry;
  contextRoute: RfmRoute | null;
  parentLayout: RfmRoute | null;
}) {
  const isServerNode = entry.executionKind === "static";
  const noticeBody = isServerNode
    ? "Static-only node. Live props are not available in the browser runtime."
    : "Static boundary node. Select the mounted CLIENT node to inspect live props.";
  const clientBoundaries = getClientBoundariesForEntry(entry, contextRoute);

  return (
    <>
      <StructureSection
        contextRoute={contextRoute}
        parentLayout={parentLayout}
        clientBoundaries={clientBoundaries}
      />
      <LivePropsNotice title="Runtime Data" body={noticeBody} />
    </>
  );
}

function RouteDetail({
  route,
  parentLayout,
}: {
  route: RfmRoute;
  parentLayout: RfmRoute | null;
}) {
  const showLivePropsNotice = route.executionKind === "static";
  const clientBoundaries = getClientBoundariesForRoute(route);

  return (
    <>
      {showLivePropsNotice ? (
        <StructureSection
          contextRoute={route}
          parentLayout={parentLayout}
          clientBoundaries={clientBoundaries}
        />
      ) : null}

      {showLivePropsNotice ? (
        <LivePropsNotice
          title="Runtime Data"
          body="Static route file. Live props are not available in the browser runtime."
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
  contextRoute,
  parentLayout,
  props,
  propTypesMap,
}: {
  entry: DocEntry | null;
  route: RfmRoute | null;
  contextRoute: RfmRoute | null;
  parentLayout: RfmRoute | null;
  props: Record<string, unknown> | null;
  propTypesMap: PropTypesMap;
}) {
  if (!entry && !route) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="m-0 text-[11px] text-rfm-text-400 text-center leading-relaxed">
          Pick a UI component or select a route file
          <br />
          to inspect ownership, source, and screen context.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {route ? (
        entry && entry.executionKind === "live" ? (
          <ComponentDetail
            entry={entry}
            route={contextRoute}
            props={props}
            propTypesMap={propTypesMap}
          />
        ) : (
          <RouteDetail route={route} parentLayout={parentLayout} />
        )
      ) : entry ? (
        entry.source === "static-import" ? (
          <StaticComponentDetail
            entry={entry}
            contextRoute={contextRoute}
            parentLayout={parentLayout}
          />
        ) : (
          <ComponentDetail
            entry={entry}
            route={contextRoute}
            props={props}
            propTypesMap={propTypesMap}
          />
        )
      ) : null}
    </div>
  );
}
