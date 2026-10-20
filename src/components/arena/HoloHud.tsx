import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { useShow } from "@/game/store";

function Pot() {
  const pot = useShow((s) => s.prizePot);
  const spring = useSpring(pot, { stiffness: 60, damping: 20 });
  useEffect(() => spring.set(pot), [pot, spring]);
  const text = useTransform(spring, (v) => Math.round(v).toLocaleString("en-US").replace(/,/g, " "));
  return <motion.span>{text}</motion.span>;
}

function Timer({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">{label}</span>
      <span className="font-display text-3xl text-primary text-glow tabular-nums">
        {value === null ? "--.-" : value.toFixed(1)}
        <span className="text-base opacity-70">S</span>
      </span>
    </div>
  );
}

function Graph() {
  const g = useShow((s) => s.graph);
  const pts = g.map((v, i) => `${(i / (g.length - 1)) * 160},${50 - v * 44}`).join(" ");
  const spike = Math.max(...g) > 0.7;
  return (
    <svg viewBox="0 0 160 50" className="h-12 w-40">
      <line x1="0" x2="160" y1={50 - 0.7 * 44} y2={50 - 0.7 * 44} className="stroke-stress" strokeDasharray="3 3" strokeWidth="1" />
      <polyline points={pts} fill="none" className={spike ? "stroke-alive" : "stroke-teal"} strokeWidth="1.8" />
    </svg>
  );
}

const toneClass = {
  red: "text-danger",
  cyan: "text-alive",
  amber: "text-stress",
  violet: "text-impostor",
} as const;

export function HoloHud() {
  const trial = useShow((s) => s.trial);
  const ttd = useShow((s) => s.ttd);
  const ttr = useShow((s) => s.ttr);
  const banner = useShow((s) => s.banner);
  const meeting = useShow((s) => s.meeting);
  const last = useShow((s) => s.lastEvent);
  const [pulse, setPulse] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!last) return;
    if (last.type === "attack" || last.type === "eliminate") setPulse(last.at);
    if (last.type === "detect") setFlash("cyan");
    if (last.type === "eliminate") setFlash("red");
    const t = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(t);
  }, [last]);

  const [showBanner, setShowBanner] = useState(false);
  useEffect(() => {
    if (!banner) return;
    setShowBanner(true);
    const t = setTimeout(() => setShowBanner(false), 3200);
    return () => clearTimeout(t);
  }, [banner]);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* hologram panel */}
      <div className="absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center">
        <div className="text-[11px] font-semibold tracking-[0.5em] text-primary/80">CUTTLE GAME</div>
        <div className="mt-1 font-display text-lg tracking-[0.25em] text-foreground/90">{trial}</div>
        <div className="holo-panel scanlines mt-3 flex items-center gap-10 rounded-2xl px-10 py-4">
          <Timer label="TIME TO DETECT" value={ttd} />
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-semibold tracking-[0.4em] text-gold">PRIZE POT</span>
            <span className="font-display text-6xl leading-none text-gold text-glow tabular-nums">
              <Pot />
              <span className="ml-2 text-3xl">EUR</span>
            </span>
          </div>
          <Timer label="TIME TO REVIVE" value={ttr} />
          <Graph />
        </div>
        <AnimatePresence>
          {showBanner && banner && (
            <motion.div
              key={banner.at}
              initial={{ opacity: 0, scale: 1.6, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className={`mt-4 font-display text-4xl tracking-[0.15em] text-glow ${toneClass[banner.tone]}`}
            >
              {banner.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* edge pulse on attacks */}
      <AnimatePresence>
        {pulse > 0 && (
          <motion.div
            key={pulse}
            className="absolute inset-0"
            style={{ boxShadow: "inset 0 0 180px 40px var(--danger)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 0.8, 0] }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {flash && (
        <motion.div
          className={`absolute inset-0 ${flash === "red" ? "bg-danger" : "bg-alive"}`}
          initial={{ opacity: 0.25 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* emergency meeting */}
      <AnimatePresence>
        {meeting.active && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-abyss/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {meeting.impostor === null && (
              <motion.div
                initial={{ scale: 3, opacity: 0, letterSpacing: "0.6em" }}
                animate={{ scale: 1, opacity: 1, letterSpacing: "0.08em" }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="text-center"
              >
                <div className="font-display text-8xl text-impostor text-glow">EMERGENCY MEETING</div>
                <div className="mt-4 text-sm font-semibold tracking-[0.5em] text-muted-foreground">
                  ONE OF THEM IS NOT WHAT IT SEEMS
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom roster */}
      <Roster />
    </div>
  );
}

function Roster() {
  const cuttles = useShow((s) => s.cuttles);
  const col = {
    alive: "text-alive",
    stressed: "text-stress",
    failing: "text-danger",
    eliminated: "text-muted-foreground line-through",
    impostor: "text-impostor",
  } as const;
  return (
    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-8">
      {cuttles.map((c) => (
        <div key={c.id} className="flex flex-col items-center">
          <span className={`font-display text-2xl ${col[c.status]}`}>{c.label}</span>
          <span className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">{c.service}</span>
        </div>
      ))}
    </div>
  );
}
