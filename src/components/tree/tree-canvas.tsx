"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { layoutTree, type LayoutPerson } from "@/lib/tree-layout";
import type { Rel } from "@/lib/graph";

type Props = {
  people: LayoutPerson[];
  relationships: Rel[];
  /** Person the layout is centred on (generation 0). */
  focusId: string;
  selectedId?: string | null;
  /** Short kinship label per person, e.g. "चाचा". */
  labels?: Map<string, string>;
  onSelect: (id: string) => void;
};

export type TreeCanvasHandle = {
  centerOn: (id: string, scale?: number) => void;
  fit: () => void;
  zoom: (factor: number) => void;
};

const MIN_K = 0.3;
const MAX_K = 2.2;

export const TreeCanvas = forwardRef<TreeCanvasHandle, Props>(function TreeCanvas(
  { people, relationships, focusId, selectedId, labels, onSelect },
  ref,
) {
  const layout = useMemo(
    () => layoutTree(focusId, people, relationships),
    [focusId, people, relationships],
  );
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 40, y: 40, k: 0.92 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; vx: number; vy: number; dist: number; k: number } | null>(null);
  const moved = useRef(false);

  const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

  const centerOn = useCallback(
    (id: string, scale?: number) => {
      const el = wrap.current;
      const node = layout.nodes.find((n) => n.id === id);
      if (!el || !node) return;
      const r = el.getBoundingClientRect();
      setView((v) => {
        const k = clampK(scale ?? v.k);
        return {
          k,
          x: r.width / 2 - (node.x + layout.nodeW / 2) * k,
          y: r.height / 2 - (node.y + layout.nodeH / 2) * k,
        };
      });
    },
    [layout],
  );

  const fit = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const k = clampK(Math.min(r.width / layout.width, r.height / layout.height, 1.1));
    setView({
      k,
      x: (r.width - layout.width * k) / 2,
      y: (r.height - layout.height * k) / 2,
    });
  }, [layout]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = px ?? r.width / 2;
    const my = py ?? r.height / 2;
    setView((v) => {
      const k = clampK(v.k * factor);
      return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
    });
  }, []);

  useImperativeHandle(ref, () => ({ centerOn, fit, zoom: (f) => zoomAt(f) }), [centerOn, fit, zoomAt]);

  // On a new layout: show the whole tree if it stays readable, otherwise centre on the focus person.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = 64; // clear the search and toolbar row
    const k = Math.min((r.width - 24) / layout.width, (r.height - top - 16) / layout.height, 1);
    if (k >= 0.62) {
      setView({ k, x: (r.width - layout.width * k) / 2, y: top + (r.height - top - layout.height * k) / 2 });
    } else {
      centerOn(focusId, 0.92);
    }
  }, [focusId, layout, centerOn]);

  // Wheel must be non-passive to stop the page from scrolling under the canvas.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        zoomAt(e.deltaY > 0 ? 0.9 : 1.1, e.clientX - r.left, e.clientY - r.top);
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const neighbours = useMemo(() => {
    const set = new Set<string>();
    if (!selectedId) return set;
    for (const r of relationships) {
      if (r.fromId === selectedId) set.add(r.toId);
      if (r.toId === selectedId) set.add(r.fromId);
    }
    return set;
  }, [relationships, selectedId]);

  return (
    <div
      ref={wrap}
      className="relative h-full w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
      onPointerDown={(e) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        moved.current = false;
        const pts = [...pointers.current.values()];
        if (pts.length === 1) {
          gesture.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, dist: 0, k: view.k };
        } else if (pts.length === 2) {
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          gesture.current = {
            x: (pts[0].x + pts[1].x) / 2,
            y: (pts[0].y + pts[1].y) / 2,
            vx: view.x,
            vy: view.y,
            dist,
            k: view.k,
          };
        }
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId) || !gesture.current) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...pointers.current.values()];
        const gst = gesture.current;
        if (pts.length >= 2 && gst.dist > 0) {
          const el = wrap.current!;
          const r = el.getBoundingClientRect();
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const mid = { x: (pts[0].x + pts[1].x) / 2 - r.left, y: (pts[0].y + pts[1].y) / 2 - r.top };
          const k = clampK((gst.k * dist) / gst.dist);
          const ox = gst.x - r.left;
          const oy = gst.y - r.top;
          setView({
            k,
            x: mid.x - ((ox - gst.vx) * k) / gst.k,
            y: mid.y - ((oy - gst.vy) * k) / gst.k,
          });
          moved.current = true;
          return;
        }
        const dx = e.clientX - gst.x;
        const dy = e.clientY - gst.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
        setView((v) => ({ ...v, x: gst.vx + dx, y: gst.vy + dy }));
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (!pointers.current.size) gesture.current = null;
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        if (!pointers.current.size) gesture.current = null;
      }}
    >
      <div
        style={{
          width: layout.width,
          height: layout.height,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          transformOrigin: "0 0",
        }}
        className="relative"
      >
        <svg className="absolute inset-0" width={layout.width} height={layout.height} fill="none">
          {layout.edges.map((e, i) => {
            const hot = selectedId && (e.a === selectedId || e.b === selectedId || (e.kind === "parent" && neighbours.has(e.b) && neighbours.has(e.a)));
            if (e.kind === "spouse") {
              return (
                <line
                  key={i}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke={hot ? "#6B1D2A" : "#C4A35A"}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            }
            const busY = e.y1 + (e.y2 - e.y1) / 2;
            return (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} V ${busY} H ${e.x2} V ${e.y2}`}
                stroke={hot ? "#6B1D2A" : "#8A7340"}
                strokeWidth={hot ? 2.4 : 1.6}
                strokeLinejoin="round"
                opacity={selectedId && !hot ? 0.55 : 1}
              />
            );
          })}
        </svg>
        {layout.nodes.map((n) => {
          const selected = n.id === selectedId;
          const root = n.isRoot;
          const label = labels?.get(n.id);
          return (
            <button
              key={n.id}
              data-node
              type="button"
              onClick={() => {
                if (!moved.current) onSelect(n.id);
              }}
              title={n.displayName}
              aria-label={`${n.displayName}${label ? ` — ${label}` : ""}`}
              style={{ left: n.x, top: n.y, width: layout.nodeW, height: layout.nodeH }}
              className={`absolute flex items-center gap-3 rounded-2xl border px-3 text-left shadow-card transition ${
                n.external ? "border-dashed" : ""
              } ${
                selected
                  ? "border-maroon bg-paper ring-2 ring-gold"
                  : root
                    ? "border-maroon/50 bg-paper"
                    : n.external
                      ? "border-gold-dim/60 bg-cream/90 hover:border-maroon/40"
                      : neighbours.has(n.id)
                        ? "border-maroon/40 bg-paper"
                        : "border-gold/35 bg-paper/95 hover:border-maroon/40"
              }`}
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  n.gender === "FEMALE"
                    ? "bg-maroon/15 text-maroon"
                    : n.gender === "MALE"
                      ? "bg-leaf/15 text-leaf"
                      : "bg-gold/20 text-gold-dim"
                }`}
              >
                {n.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium leading-tight">{n.displayName}</span>
                {n.nativeName && (
                  <span className="block truncate font-devanagari text-xs text-maroon-soft">{n.nativeName}</span>
                )}
                <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wider text-gold-dim">
                  <span className={n.isLiving ? "text-leaf" : "text-gold-dim"}>{n.isLiving ? "●" : "○"}</span>{" "}
                  {label ? <span className="font-devanagari normal-case tracking-normal text-maroon">{label}</span> : n.isLiving ? "" : "स्मृति"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-xl border border-gold/40 bg-paper/95 shadow-card backdrop-blur">
        <button type="button" className="px-3 py-2 text-sm hover:bg-gold/15" onClick={() => zoomAt(1.2)} aria-label="Zoom in" title="Zoom in">
          +
        </button>
        <button type="button" className="border-t border-gold/25 px-3 py-2 text-sm hover:bg-gold/15" onClick={() => zoomAt(1 / 1.2)} aria-label="Zoom out" title="Zoom out">
          −
        </button>
        <button type="button" className="border-t border-gold/25 px-3 py-2 text-xs hover:bg-gold/15" onClick={fit} aria-label="Fit whole tree" title="Fit whole tree">
          ⤢
        </button>
        <button type="button" className="border-t border-gold/25 px-3 py-2 text-xs hover:bg-gold/15" onClick={() => centerOn(selectedId || focusId, 1)} aria-label="Centre on selected" title="Centre on selected">
          ◎
        </button>
      </div>
    </div>
  );
});
