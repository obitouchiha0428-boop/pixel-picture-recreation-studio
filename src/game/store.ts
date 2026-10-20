import { useSyncExternalStore } from "react";

export type CuttleStatus = "alive" | "stressed" | "failing" | "eliminated" | "impostor";

export interface Cuttle {
  id: number;
  label: string;
  service: string;
  status: CuttleStatus;
  /** timestamp of the last status change, used to drive animations */
  since: number;
}

export type ShowEventType =
  | "attack"
  | "eliminate"
  | "detect"
  | "revive"
  | "meeting"
  | "pay_success"
  | "pay_fail";

export interface ShowEvent {
  type: ShowEventType;
  target?: number | undefined;
  at: number;
  id: string;
  amount?: number | undefined;
}

export interface Receipt {
  amount: number;
  txId: string;
  time: string;
}

export interface ShowState {
  trial: string;
  cuttles: Cuttle[];
  prizePot: number;
  ttd: number | null;
  ttr: number | null;
  banner: { text: string; tone: "red" | "cyan" | "amber" | "violet"; at: number } | null;
  graph: number[];
  lastEvent: ShowEvent | null;
  meeting: { active: boolean; impostor: number | null; at: number };
  attackTarget: number | null;
  reviveFrom: number | null;
  reviveTarget: number | null;
  player: { number: number; score: number; rank: number; room: number };
}

const SERVICES = ["GATEWAY", "LEDGER", "FRAUD", "WALLET", "SETTLE", "AUTH"];
const ATTACKS = ["DDOS SURGE", "LATENCY STORM", "TOKEN FLOOD", "CERT EXPIRY", "DB LOCKDOWN"];

const initial = (): ShowState => ({
  trial: "TRIAL 03 : THE DEEP CHECKOUT",
  cuttles: SERVICES.map((s, i) => ({
    id: i,
    label: String(i + 1).padStart(3, "0"),
    service: s,
    status: "alive",
    since: 0,
  })),
  prizePot: 4_812_300,
  ttd: null,
  ttr: null,
  banner: null,
  graph: Array.from({ length: 24 }, (_, i) => 0.18 + 0.08 * Math.sin(i * 1.3)),
  lastEvent: null,
  meeting: { active: false, impostor: null, at: 0 },
  attackTarget: null,
  reviveFrom: null,
  reviveTarget: null,
  player: { number: 475, score: 1280, rank: 12, room: 214 },
});

let state: ShowState = initial();
let attackStart = 0;
let elimStart = 0;
const listeners = new Set<() => void>();
const eventListeners = new Set<(e: ShowEvent) => void>();

function set(patch: Partial<ShowState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function useShow<T>(sel: (s: ShowState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(state),
    () => sel(state),
  );
}

export function onShowEvent(fn: (e: ShowEvent) => void) {
  eventListeners.add(fn);
  return () => {
    eventListeners.delete(fn);
  };
}

let channel: BroadcastChannel | null = null;
function getChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel("cuttle-game");
    channel.onmessage = (m) => apply(m.data as ShowEvent, false);
  }
  return channel;
}

/** Call once on mount so tabs (arena + phone) share the mock event stream. */
export function connectShow() {
  getChannel();
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const setCuttle = (id: number, status: CuttleStatus) =>
  state.cuttles.map((c) => (c.id === id ? { ...c, status, since: performance.now() } : c));

export function fire(type: ShowEventType, opts: { target?: number; amount?: number } = {}) {
  const e: ShowEvent = {
    type,
    target: opts.target,
    amount: opts.amount,
    at: Date.now(),
    id: Math.random().toString(36).slice(2, 10),
  };
  // resolve a target deterministically before broadcasting so every tab agrees
  if (e.target === undefined) e.target = defaultTarget(type);
  apply(e, true);
}

function defaultTarget(type: ShowEventType): number | undefined {
  const cs = state.cuttles;
  const living = cs.filter((c) => c.status !== "eliminated" && c.id !== 5);
  if (type === "attack") return pick(living.length ? living : cs)!.id;
  if (type === "eliminate") {
    const hit = cs.find((c) => c.status === "failing" || c.status === "stressed");
    return (hit ?? pick(living.length ? living : cs))!.id;
  }
  if (type === "revive") return cs.find((c) => c.status === "eliminated")?.id;
  if (type === "meeting") return pick(cs.filter((c) => c.status !== "eliminated"))!.id;
  return undefined;
}

function apply(e: ShowEvent, broadcast: boolean) {
  if (broadcast) getChannel()?.postMessage(e);
  const now = Date.now();
  const t = e.target;
  switch (e.type) {
    case "attack": {
      if (t === undefined) break;
      attackStart = now;
      set({
        cuttles: setCuttle(t, "failing"),
        attackTarget: t,
        banner: { text: `ATTACK : ${pick(ATTACKS)}`, tone: "red", at: now },
        ttd: 0,
        ttr: null,
      });
      break;
    }
    case "eliminate": {
      if (t === undefined) break;
      elimStart = now;
      set({
        cuttles: setCuttle(t, "eliminated"),
        attackTarget: null,
        banner: { text: `${state.cuttles[t]!.label} ELIMINATED`, tone: "red", at: now },
        ttr: 0,
      });
      break;
    }
    case "detect": {
      const ttd = attackStart ? (now - attackStart) / 1000 : 1.8 + Math.random() * 2;
      const g = [...state.graph.slice(6), 0.4, 0.62, 0.95, 1, 0.7, 0.45];
      set({
        graph: g,
        ttd: Math.min(ttd, 99.9),
        banner: { text: "ANOMALY DETECTED", tone: "cyan", at: now },
        cuttles: state.cuttles.map((c) =>
          c.status === "failing" ? { ...c, status: "stressed", since: performance.now() } : c,
        ),
      });
      attackStart = 0;
      break;
    }
    case "revive": {
      if (t === undefined) {
        set({ banner: { text: "ALL CUTTLES STANDING", tone: "cyan", at: now } });
        break;
      }
      const ttr = elimStart ? Math.min((now - elimStart) / 1000, 99.9) : 7.2;
      set({
        reviveFrom: 5,
        reviveTarget: t,
        cuttles: setCuttle(t, "alive"),
        ttr,
        prizePot: state.prizePot + 25_000,
        banner: { text: `REVIVED IN ${ttr.toFixed(1)}S`, tone: "cyan", at: now },
      });
      elimStart = 0;
      setTimeout(() => set({ reviveFrom: null, reviveTarget: null }), 3200);
      break;
    }
    case "meeting": {
      if (t === undefined) break;
      set({
        meeting: { active: true, impostor: null, at: now },
        banner: { text: "EMERGENCY MEETING", tone: "violet", at: now },
      });
      setTimeout(() => {
        set({
          meeting: { active: true, impostor: t, at: now },
          cuttles: setCuttle(t, "impostor"),
          banner: { text: `${state.cuttles[t]!.label} IS THE IMPOSTOR`, tone: "violet", at: Date.now() },
        });
      }, 3600);
      setTimeout(() => set({ meeting: { active: false, impostor: t, at: now } }), 9000);
      break;
    }
    case "pay_success": {
      const amt = e.amount ?? 3;
      set({
        prizePot: state.prizePot + Math.round(amt * 100),
        player: { ...state.player, score: state.player.score + Math.round(amt * 10), rank: Math.max(1, state.player.rank - 1) },
      });
      break;
    }
    case "pay_fail":
      break;
  }
  set({ lastEvent: e });
  eventListeners.forEach((l) => l(e));
}

/** Slow ambient prize-pot tick, run from the arena only. */
export function tickPot(amount: number) {
  set({ prizePot: state.prizePot + amount });
}

export function resetShow() {
  state = initial();
  listeners.forEach((l) => l());
}

export const FAIL_LINES = [
  "The ledger cuttle is napping. Again.",
  "Your coins got lost in the deep.",
  "A shark ate the checkout. Try later.",
  "Ink everywhere. Nothing processed.",
  "The gateway is holding its breath.",
];

export function makeReceipt(amount: number): Receipt {
  const d = new Date();
  return {
    amount,
    txId: "TX-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.floor(Math.random() * 9000 + 1000),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}
