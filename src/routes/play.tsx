import { createFileRoute } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Cuttle } from "@/components/arena/Cuttle";
import { DebugPanel } from "@/components/DebugPanel";
import { FAIL_LINES, connectShow, fire, makeReceipt, onShowEvent, useShow, type Receipt } from "@/game/store";
import { sfx } from "@/game/audio";

export const Route = createFileRoute("/play")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CUTTLE GAME — Controller" },
      { name: "description", content: "Your phone is an ink pump. Hold to charge a payment, release to pay." },
      { property: "og:title", content: "CUTTLE GAME — Controller" },
      { property: "og:description", content: "Your phone is an ink pump. Hold to charge a payment, release to pay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Play,
});

const MAX_HOLD = 2.5; // seconds for a full charge
const amountFor = (p: number) => Math.max(1, Math.round(1 + p * p * 49));
const vibrate = (p: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

function Play() {
  useEffect(() => connectShow(), []);
  const player = useShow((s) => s.player);
  const meeting = useShow((s) => s.meeting);
  const spin = useRef(0);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(
    () =>
      onShowEvent((e) => {
        if (e.type === "pay_success") {
          setFail(null);
          setReceipt(makeReceipt(e.amount ?? 3));
          setBurst(Date.now());
          spin.current = Math.PI * 4;
          sfx.pay();
          vibrate([40, 30, 80]);
        } else if (e.type === "pay_fail") {
          setReceipt(null);
          setFail(FAIL_LINES[Math.floor(Math.random() * FAIL_LINES.length)] ?? "The deep said no.");
          sfx.fail();
          vibrate([200, 60, 200]);
        }
      }),
    [],
  );

  const pay = (amount: number) => {
    sfx.unlock();
    fire(Math.random() < 0.82 ? "pay_success" : "pay_fail", { amount });
  };

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden bg-abyss-gradient ${fail ? "animate-glitch" : ""}`}>
      {/* rank strip */}
      <div className="flex items-center justify-between border-b border-border px-5 py-2 text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">
        <span>
          SCORE <span className="font-display text-base text-foreground">{player.score}</span>
        </span>
        <span>
          PLACE <span className="font-display text-base text-gold">{player.rank}</span> / {player.room}
        </span>
      </div>

      {/* player cuttle */}
      <div className="relative h-[30vh] min-h-48">
        <Canvas camera={{ position: [0, 1.6, 5], fov: 40 }} dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 5, 4]} intensity={1.5} />
          <group position-y={-1.2}>
            <Cuttle index={0} status={fail ? "failing" : "alive"} solo spin={spin} />
          </group>
        </Canvas>
        <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-display text-4xl text-primary text-glow">
          475
        </div>
        <InkBurst key={burst} on={burst > 0} />
      </div>

      <InkPump onPay={pay} />

      {/* coffee hero pad */}
      <div className="px-5 pb-6">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => pay(3)}
          className="flex w-full items-center justify-between rounded-2xl border border-gold/50 bg-gold/10 px-6 py-5 shadow-glow-gold"
        >
          <span className="font-display text-3xl tracking-wider text-gold">COFFEE</span>
          <span className="font-display text-3xl text-foreground">3 EUR</span>
        </motion.button>
      </div>

      {/* receipt */}
      <AnimatePresence>
        {receipt && (
          <motion.div
            key={receipt.txId}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="holo-panel absolute inset-x-4 bottom-4 z-20 rounded-2xl bg-ink p-5"
            onClick={() => setReceipt(null)}
          >
            <div className="text-[11px] font-bold tracking-[0.4em] text-alive">PAYMENT ACCEPTED</div>
            <div className="mt-1 font-display text-6xl text-foreground">{receipt.amount.toFixed(2)} EUR</div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>{receipt.txId}</span>
              <span>{receipt.time}</span>
            </div>
            <div className="mt-3 text-center text-[10px] tracking-[0.3em] text-muted-foreground">TAP TO CLOSE</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* failure */}
      <AnimatePresence>
        {fail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="scanlines absolute inset-0 z-30 flex flex-col items-center justify-center bg-danger/85 px-8 text-center"
            onClick={() => setFail(null)}
          >
            <div className="font-display text-5xl leading-tight text-foreground">PAYMENT REFUSED</div>
            <div className="mt-2 text-sm font-semibold tracking-[0.2em] text-foreground/90">SERVICE UNAVAILABLE</div>
            <div className="mt-6 text-lg text-foreground">{fail}</div>
            <div className="mt-8 text-[10px] tracking-[0.3em] text-foreground/70">TAP TO RETRY</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* emergency meeting vote */}
      <AnimatePresence>{meeting.active && <Vote />}</AnimatePresence>

      <DebugPanel />
    </div>
  );
}

function InkPump({ onPay }: { onPay: (amount: number) => void }) {
  const [p, setP] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef(0);
  const lastTick = useRef(0);

  const loop = () => {
    if (start.current === null) return;
    const k = Math.min(1, (performance.now() - start.current) / 1000 / MAX_HOLD);
    setP(k);
    if (k - lastTick.current > 0.08) {
      lastTick.current = k;
      sfx.charge(k);
      vibrate(8);
    }
    raf.current = requestAnimationFrame(loop);
  };
  const down = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    sfx.unlock();
    start.current = performance.now();
    lastTick.current = 0;
    raf.current = requestAnimationFrame(loop);
  };
  const up = () => {
    if (start.current === null) return;
    cancelAnimationFrame(raf.current);
    start.current = null;
    const amt = amountFor(p);
    setP(0);
    vibrate(60);
    onPay(amt);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <motion.button
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        animate={{ scale: 1 + p * 0.08 }}
        className="relative aspect-square w-[68vw] max-w-72 touch-none select-none rounded-full"
        aria-label="Ink pump: hold to charge, release to pay"
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" className="stroke-secondary" strokeWidth="5" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            className={p > 0.85 ? "stroke-gold" : "stroke-alive"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - p)}
          />
        </svg>
        <div
          className="absolute inset-[12%] flex flex-col items-center justify-center rounded-full border border-border bg-ink shadow-glow-alive"
          style={{ boxShadow: `0 0 ${20 + p * 60}px color-mix(in oklab, var(--alive) ${30 + p * 50}%, transparent)` }}
        >
          <span className="text-[10px] font-bold tracking-[0.4em] text-muted-foreground">{p > 0 ? "CHARGING" : "HOLD TO PUMP"}</span>
          <span className="font-display text-6xl text-foreground tabular-nums">{p > 0 ? amountFor(p) : "INK"}</span>
          {p > 0 && <span className="text-xs font-semibold tracking-[0.3em] text-primary">EUR</span>}
        </div>
      </motion.button>
    </div>
  );
}

function InkBurst({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const d = 80 + (i % 4) * 30;
        const cls = ["bg-alive", "bg-gold", "bg-teal", "bg-foreground"][i % 4];
        return (
          <motion.span
            key={i}
            className={`absolute h-2.5 w-2.5 rounded-full ${cls}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.4 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 30, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

function Vote() {
  const cuttles = useShow((s) => s.cuttles);
  const impostor = useShow((s) => s.meeting.impostor);
  const [vote, setVote] = useState<number | null>(null);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex flex-col bg-abyss/95 px-5 pt-10"
    >
      <motion.div
        initial={{ scale: 2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center font-display text-5xl leading-none text-impostor text-glow"
      >
        EMERGENCY
        <br />
        MEETING
      </motion.div>
      <p className="mt-3 text-center text-sm text-muted-foreground">Tap the cuttle you think is the impostor.</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {cuttles.map((c) => {
          const picked = vote === c.id;
          const revealed = impostor === c.id;
          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.92 }}
              disabled={c.status === "eliminated" || vote !== null}
              onClick={() => {
                setVote(c.id);
                vibrate(40);
              }}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl border transition ${
                revealed ? "border-impostor bg-impostor/25" : picked ? "border-primary bg-primary/15" : "border-border bg-card"
              } disabled:opacity-60`}
            >
              <span className={`h-8 w-10 rounded-[50%] ${revealed ? "bg-impostor" : c.status === "eliminated" ? "bg-muted" : "bg-alive"} shadow-glow-alive`} />
              <span className="mt-2 font-display text-2xl">{c.label}</span>
              <span className="text-[9px] font-semibold tracking-[0.25em] text-muted-foreground">{c.service}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-6 text-center text-sm font-semibold tracking-[0.2em]">
        {impostor !== null && vote !== null ? (
          vote === impostor ? <span className="text-alive">YOU SPOTTED IT</span> : <span className="text-danger">WRONG CUTTLE</span>
        ) : vote !== null ? (
          <span className="text-muted-foreground">VOTE LOCKED. WAITING FOR REVEAL</span>
        ) : null}
      </div>
    </motion.div>
  );
}
