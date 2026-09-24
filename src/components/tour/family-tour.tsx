"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Handshake, Lock, MousePointer2, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { useCopy } from "@/components/locale";
import { fill } from "@/lib/i18n";

/**
 * A 30-second tour of an example family: Priya writes her tree, Arjun writes
 * his, Mera Vansh notices they share a grandfather, and the trees link.
 * Drawn live (not a video file) so it stays sharp, speaks both languages and
 * weighs nothing; the same component is recorded to MP4 for sharing.
 */

const W = 960;
const H = 540;
const NODE_W = 190;
const NODE_H = 60;

/** Milliseconds from the start. */
const T = {
  priya: 500,
  parents: 4300,
  parentsB: 4650,
  parentsLines: 5000,
  grand: 6300,
  grandB: 6650,
  grandLines: 7000,
  kin: 7700,
  lock: 8800,
  lockOff: 10800,
  theirHeader: 11300,
  hari2: 11600,
  vikram: 12000,
  arjun: 12400,
  theirLines: 12800,
  link: 16300,
  card: 17200,
  r1: 17800,
  r2: 18300,
  r3: 18800,
  cursor: 19600,
  yes: 20400,
  both: 21300,
  cardOff: 23000,
  merge: 23300,
  mergedLines: 24100,
  newKin: 24700,
  banner: 25500,
  end: 29500,
};
const TOTAL = 33000;
const SCENES = [0, 4000, 11000, 16000, 23000, T.end];
/** The linked tree — what the player shows before anyone presses play. */
const POSTER = 28000;

type Cam = { cx: number; cy: number; z: number };
/** Where the camera looks, scene by scene. Phones zoom closer so names stay readable. */
const DESK: [number, Cam][] = [
  [0, { cx: 325, cy: 330, z: 1.7 }],
  [4000, { cx: 280, cy: 222, z: 1.3 }],
  [11000, { cx: 480, cy: 230, z: 1 }],
  [16000, { cx: 480, cy: 225, z: 1 }],
  [23000, { cx: 400, cy: 250, z: 1.15 }],
  [T.end, { cx: 480, cy: 270, z: 1 }],
];
const PHONE: [number, Cam][] = [
  [0, { cx: 325, cy: 320, z: 2.4 }],
  [4000, { cx: 325, cy: 290, z: 2 }],
  [7000, { cx: 290, cy: 200, z: 1.85 }],
  [11000, { cx: 860, cy: 222, z: 2 }],
  [16000, { cx: 590, cy: 150, z: 1.25 }],
  [17200, { cx: 645, cy: 250, z: 2.1 }],
  [23000, { cx: 430, cy: 240, z: 1.3 }],
  [25300, { cx: 480, cy: 380, z: 1.9 }],
  [T.end, { cx: 480, cy: 270, z: 1 }],
];
/** The recorded video burns subtitles into the bottom of the frame, so it frames a little wider at the end. */
const REC: [number, Cam][] = DESK.map(([at, cam]) => [at, at === 23000 ? { cx: 450, cy: 255, z: 1.02 } : cam]);
/** Height of the burned-in subtitle band in the recorded frame; the camera centres above it. */
const REC_BAND = 150;
const camAt = (list: [number, Cam][], t: number) => list.reduce((cam, [at, c]) => (t >= at ? c : cam), list[0][1]);

type Kin = { hi: string; en: string };

function Node({
  x,
  y,
  show,
  name,
  initials,
  tone,
  kin,
  kinTone = "text-brand",
  look = "plain",
  pulse = false,
  en,
}: {
  x: number;
  y: number;
  show: boolean;
  name: string;
  initials: string;
  tone: string;
  kin: Kin | null;
  kinTone?: string;
  look?: "plain" | "you" | "theirs" | "new";
  pulse?: boolean;
  en: boolean;
}) {
  const border = {
    plain: "border-ink/10",
    you: "border-brand/40 ring-4 ring-brand/15",
    theirs: "border-dashed border-ink/30",
    new: "border-grow-soft ring-4 ring-grow-soft/30",
  }[look];
  return (
    <div
      className="absolute left-0 top-0"
      style={{
        width: NODE_W,
        height: NODE_H,
        transform: `translate(${x - NODE_W / 2}px, ${y - NODE_H / 2}px)`,
        transition: "transform 900ms cubic-bezier(.45,0,.2,1)",
      }}
    >
      {pulse && <span className="absolute inset-0 animate-ping rounded-2xl ring-4 ring-brand/40" />}
      <div
        className={`relative flex h-full items-center gap-2.5 rounded-2xl border bg-white px-3 shadow-card transition-all duration-500 ${border} ${
          show ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${tone}`}>{initials}</span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[17px] font-semibold text-ink">{name}</span>
          <span className={`block truncate text-[13px] transition-opacity duration-500 ${kin ? "opacity-100" : "opacity-0"} ${kinTone}`}>
            <span className="font-devanagari">{kin?.hi ?? "·"}</span>
            {kin && en && <span className="text-ink/50"> · {kin.en}</span>}
          </span>
        </span>
      </div>
    </div>
  );
}

function Line({ d, show, tone = "#A7A3BC", width = 2.5 }: { d: string; show: boolean; tone?: string; width?: number }) {
  return (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={tone}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ strokeDasharray: 1, strokeDashoffset: show ? 0 : 1, transition: "stroke-dashoffset 700ms ease" }}
    />
  );
}

function Chip({ x, y, show, children, className = "" }: { x: number; y: number; show: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute left-0 top-0 whitespace-nowrap transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"} ${className}`}
      style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
    >
      {children}
    </div>
  );
}

export function FamilyTour({ record = false }: { record?: boolean }) {
  const { c, locale } = useCopy();
  const en = locale === "en";
  const stageRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(record ? 0 : POSTER);
  const playingRef = useRef(false);
  const startedRef = useRef(false);
  const autoPausedRef = useRef(false);
  const userPausedRef = useRef(false);
  const [t, setT] = useState(record ? 0 : POSTER);
  const [playing, setPlayingState] = useState(false);
  const [started, setStarted] = useState(false);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  const setPlaying = useCallback((v: boolean) => {
    playingRef.current = v;
    setPlayingState(v);
  }, []);
  const seek = useCallback((ms: number) => {
    tRef.current = ms;
    setT(ms);
  }, []);
  const start = useCallback(
    (from: number) => {
      startedRef.current = true;
      setStarted(true);
      seek(from);
      setPlaying(true);
    },
    [seek, setPlaying],
  );

  // The clock.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      tRef.current = Math.min(TOTAL, tRef.current + (now - last));
      last = now;
      setT(tRef.current);
      if (tRef.current >= TOTAL) {
        setPlaying(false);
        if (record) (window as unknown as { __tourDone?: boolean }).__tourDone = true;
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [playing, record, setPlaying]);

  // Size the drawing to the frame.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Play when it scrolls into view; pause when it leaves. Reduced motion: wait for a tap.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (record) {
      const id = window.setTimeout(() => start(0), 800);
      return () => window.clearTimeout(id);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (reduce || userPausedRef.current) return;
          if (!startedRef.current) start(0);
          else if (autoPausedRef.current && tRef.current < TOTAL) {
            autoPausedRef.current = false;
            setPlaying(true);
          }
        } else if (playingRef.current) {
          autoPausedRef.current = true;
          setPlaying(false);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [record, start, setPlaying]);

  const at = (ms: number) => t >= ms;
  const ended = started && at(T.end);
  const merged = at(T.merge);
  const scene = Math.max(0, SCENES.findLastIndex((s) => t >= s));
  const caps = [c.tourCap1, c.tourCap2, c.tourCap3, c.tourCap4, c.tourCap5];
  const caption = !started ? c.tourBody : scene < 5 ? caps[scene] : "";

  const w = box?.w ?? W;
  const h = box?.h ?? H;
  const phone = w < 560;
  const cam = started ? camAt(record ? REC : phone ? PHONE : DESK, t) : { cx: 480, cy: 250, z: 1 };
  const s = (w / W) * cam.z;
  const tx = w / 2 - cam.cx * s;
  const ty = (h - (record ? REC_BAND : 0)) / 2 - cam.cy * s;

  const n = (hi: string, enName: string) => (en ? enName : hi);
  const kinOn = at(T.kin);

  function toggle() {
    if (ended || !started) {
      userPausedRef.current = false;
      start(0);
      return;
    }
    userPausedRef.current = playing;
    autoPausedRef.current = false;
    setPlaying(!playing);
  }

  const drawing = (
    <div
      className="absolute left-0 top-0"
      aria-hidden
      style={{
        width: W,
        height: H,
        transformOrigin: "0 0",
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        transition: started ? "transform 1200ms cubic-bezier(.45,0,.2,1)" : "none",
        opacity: box ? 1 : 0,
      }}
    >
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line d="M210 90 H230" show={at(T.grandLines)} />
        <Line d="M220 90 V192" show={at(T.grandLines)} />
        <Line d="M315 222 H335" show={at(T.parentsLines)} />
        <Line d="M325 222 V324" show={at(T.parentsLines)} tone="#5B4BF5" />
        <Line d="M860 120 V192" show={at(T.theirLines) && !merged} />
        <Line d="M860 252 V324" show={at(T.theirLines) && !merged} />
        <Line d="M420 90 H765" show={at(T.link) && !merged} tone="#5B4BF5" width={3} />
        <Line d="M220 160 H640 V192" show={at(T.mergedLines)} tone="#34C79A" width={3} />
        <Line d="M640 252 V324" show={at(T.mergedLines)} tone="#34C79A" width={3} />
      </svg>

      <Chip x={220} y={24} show={at(T.priya)}>
        <span className="rounded-full bg-brand-tint px-3 py-1 text-[14px] font-semibold text-brand">{c.tourPriya}</span>
      </Chip>
      <Chip x={860} y={24} show={at(T.theirHeader) && !merged}>
        <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-[14px] font-semibold text-ink/70">{c.tourArjun}</span>
      </Chip>

      <Node x={115} y={90} show={at(T.grand)} name={n("कमला", "Kamla")} initials="KD" tone="bg-amber-100 text-amber-700" kin={kinOn ? { hi: "दादी", en: "grandmother" } : null} en={en} />
      <Node
        x={325}
        y={90}
        show={at(T.grandB)}
        name={n("हरिशंकर", "Harishankar")}
        initials="HS"
        tone="bg-violet-100 text-violet-700"
        kin={kinOn ? { hi: "दादा", en: "grandfather" } : null}
        pulse={at(T.link) && !merged}
        en={en}
      />
      <Node x={220} y={222} show={at(T.parents)} name={n("राजेश", "Rajesh")} initials="RS" tone="bg-sky-100 text-sky-700" kin={kinOn ? { hi: "पिता", en: "father" } : null} en={en} />
      <Node x={430} y={222} show={at(T.parentsB)} name={n("सुनीता", "Sunita")} initials="SS" tone="bg-rose-100 text-rose-700" kin={kinOn ? { hi: "माँ", en: "mother" } : null} en={en} />
      <Node x={325} y={354} show={at(T.priya)} name={n("प्रिया", "Priya")} initials="PS" tone="bg-brand text-white" kin={{ hi: "आप", en: "you" }} look="you" en={en} />

      <Node
        x={merged ? 325 : 860}
        y={90}
        show={at(T.hari2) && !at(T.merge + 600)}
        name="Hari Shankar"
        initials="HS"
        tone="bg-slate-100 text-slate-600"
        kin={null}
        look="theirs"
        pulse={at(T.link) && !merged}
        en={en}
      />
      <Node
        x={merged ? 640 : 860}
        y={222}
        show={at(T.vikram)}
        name={n("विक्रम", "Vikram")}
        initials="VS"
        tone="bg-teal-100 text-teal-700"
        kin={at(T.newKin) ? { hi: "चाचा", en: "uncle" } : null}
        kinTone="text-grow"
        look={at(T.newKin) ? "new" : "theirs"}
        en={en}
      />
      <Node
        x={merged ? 640 : 860}
        y={354}
        show={at(T.arjun)}
        name={n("अर्जुन", "Arjun")}
        initials="AS"
        tone="bg-emerald-100 text-emerald-700"
        kin={at(T.newKin) ? { hi: "चचेरा भाई", en: "cousin" } : null}
        kinTone="text-grow"
        look={at(T.newKin) ? "new" : "theirs"}
        en={en}
      />

      <Chip x={525} y={90} show={at(T.lock) && !at(T.lockOff)}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[14px] font-medium text-ink/75 shadow-card">
          <Lock className="h-4 w-4 text-brand" /> {c.tourLock}
        </span>
      </Chip>

      <div
        className={`absolute left-0 top-0 w-[220px] transition-all duration-500 ${at(T.card) && !at(T.cardOff) ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        style={{ transform: "translate(535px, 158px)" }}
      >
        <div className="rounded-2xl border border-ink/10 bg-white p-3.5 shadow-lift">
          <div className="flex items-center justify-between text-[13px] font-semibold">
            <span className="inline-flex items-center gap-1 text-brand">
              <Sparkles className="h-4 w-4" /> {c.tourMatch}
            </span>
            <span className="rounded-full bg-grow-tint px-2 py-0.5 text-grow">91%</span>
          </div>
          <ul className="mt-2.5 space-y-1.5 text-[13px] leading-snug text-ink/80">
            {[
              [T.r1, c.tourR1],
              [T.r2, c.tourR2],
              [T.r3, c.tourR3],
            ].map(([ms, label]) => (
              <li key={label as string} className={`flex items-start gap-1.5 transition-opacity duration-500 ${at(ms as number) ? "opacity-100" : "opacity-0"}`}>
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-grow" /> {label}
              </li>
            ))}
          </ul>
          <div className="relative mt-3">
            {at(T.both) ? (
              <p className="flex items-center gap-1.5 rounded-xl bg-grow-tint px-3 py-2 text-[13px] font-semibold text-grow">
                <Check className="h-4 w-4" /> {c.tourBoth}
              </p>
            ) : (
              <span
                className={`flex items-center justify-center rounded-xl px-3 py-2 text-[13px] font-semibold text-white transition ${
                  at(T.yes) ? "scale-95 bg-brand-deep" : "bg-brand"
                }`}
              >
                {c.tourYes}
              </span>
            )}
            <MousePointer2
              className={`absolute h-6 w-6 fill-ink text-white transition-all duration-700 ${at(T.cursor) && !at(T.both) ? "opacity-100" : "opacity-0"}`}
              style={{ left: at(T.cursor) ? "58%" : "92%", top: at(T.cursor) ? "45%" : "130%" }}
            />
          </div>
        </div>
      </div>

      <Chip x={480} y={432} show={at(T.banner)}>
        <span className="inline-flex items-center gap-2 rounded-full bg-grow px-5 py-2.5 text-[17px] font-semibold text-white shadow-lift">
          <Handshake className="h-5 w-5" /> {c.tourLinked}
        </span>
      </Chip>
    </div>
  );

  if (record) {
    return (
      <div ref={stageRef} className="dot-grid relative h-full w-full overflow-hidden bg-canvas">
        {drawing}
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/55 to-transparent px-24 pb-9 pt-20 text-center transition-opacity duration-500 ${caption && started && !ended ? "opacity-100" : "opacity-0"}`}>
          <p className="mx-auto max-w-4xl text-[30px] font-semibold leading-snug text-white">{caption}</p>
        </div>
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white/85 text-center backdrop-blur-sm transition-opacity duration-700 ${ended ? "opacity-100" : "opacity-0"}`}>
          <LogoMark size={88} />
          <p className="max-w-3xl font-display text-6xl font-bold tracking-tight text-ink">{c.tourEndTitle}</p>
          <p className="text-4xl font-semibold text-brand">meravansh.lol</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-ink/[0.08] bg-white shadow-lift">
      <div ref={stageRef} className="dot-grid relative aspect-[4/3] overflow-hidden bg-canvas sm:aspect-video">
        {drawing}

        {!started && (
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 grid place-items-center bg-white/35 transition hover:bg-white/20"
            aria-label={c.tourWatch}
          >
            <span className="inline-flex items-center gap-3 rounded-full bg-brand py-3 pl-3 pr-5 text-sm font-semibold text-white shadow-glow sm:text-base">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
                <Play className="h-4 w-4 fill-white" />
              </span>
              {c.tourWatch}
            </span>
          </button>
        )}

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 px-6 text-center backdrop-blur-sm transition-opacity duration-700 sm:gap-4 ${
            ended ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <LogoMark size={44} />
          <p className="max-w-lg font-display text-xl font-bold tracking-tight text-ink sm:text-3xl">{c.tourEndTitle}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/register" className="btn-primary" tabIndex={ended ? 0 : -1}>
              {c.tourStart}
            </Link>
            <button type="button" className="btn-ghost" onClick={toggle} tabIndex={ended ? 0 : -1}>
              <RotateCcw className="h-4 w-4" /> {c.tourReplay}
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-ink/[0.06] px-4 py-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {started && scene < 5 ? fill(c.tourChapter, { n: scene + 1 }) : c.tourEyebrow}
        </p>
        <p className="mt-1 min-h-[3rem] text-[15px] font-medium leading-snug text-ink sm:min-h-[2.75rem] sm:text-base">{caption || c.tourEndTitle}</p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? c.tourPause : ended ? c.tourReplay : c.tourPlay}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white shadow-glow transition hover:bg-brand-deep"
          >
            {playing ? <Pause className="h-4 w-4 fill-white" /> : ended ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
          </button>
          <div className="flex flex-1 gap-1.5">
            {SCENES.slice(0, 5).map((from, i) => {
              const to = SCENES[i + 1];
              const done = started ? Math.min(1, Math.max(0, (t - from) / (to - from))) : 0;
              return (
                <button
                  key={from}
                  type="button"
                  className="group flex-1 py-2"
                  aria-label={fill(c.tourChapter, { n: i + 1 })}
                  onClick={() => {
                    userPausedRef.current = false;
                    start(from);
                  }}
                >
                  <span className="block h-1.5 overflow-hidden rounded-full bg-ink/10 group-hover:bg-ink/20">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${done * 100}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sr-only">
        <p>{c.tourTranscript}</p>
        <ol>
          {caps.map((cap) => (
            <li key={cap}>{cap}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
