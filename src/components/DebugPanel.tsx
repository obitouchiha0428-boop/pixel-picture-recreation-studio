import { useState } from "react";
import { fire, resetShow, type ShowEventType } from "@/game/store";
import { sfx } from "@/game/audio";

const EVENTS: { type: ShowEventType; label: string }[] = [
  { type: "attack", label: "Attack" },
  { type: "eliminate", label: "Eliminate" },
  { type: "detect", label: "Detect" },
  { type: "revive", label: "Revive" },
  { type: "meeting", label: "Meeting" },
  { type: "pay_success", label: "Pay OK" },
  { type: "pay_fail", label: "Pay fail" },
];

/** Hidden demo panel: hover/tap the bottom-right corner to reveal. */
export function DebugPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-2 right-2 z-50 font-sans">
      {open ? (
        <div className="holo-panel flex w-44 flex-col gap-1 rounded-xl p-2">
          <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-bold tracking-[0.3em] text-muted-foreground">
            MOCK EVENTS
            <button onClick={() => setOpen(false)} className="text-foreground/70 hover:text-foreground" aria-label="Close debug panel">
              X
            </button>
          </div>
          {EVENTS.map((e) => (
            <button
              key={e.type}
              onClick={() => {
                sfx.unlock();
                fire(e.type, e.type === "pay_success" ? { amount: 3 } : {});
              }}
              className="rounded-md bg-secondary/80 px-2 py-1.5 text-left text-xs font-semibold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground"
            >
              {e.label}
            </button>
          ))}
          <button onClick={resetShow} className="mt-1 rounded-md px-2 py-1 text-left text-[11px] text-muted-foreground hover:text-foreground">
            Reset show
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            sfx.unlock();
            setOpen(true);
          }}
          aria-label="Open debug panel"
          className="h-6 w-6 rounded-full border border-border opacity-20 transition hover:opacity-100"
        />
      )}
    </div>
  );
}
