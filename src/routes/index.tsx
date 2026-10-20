import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArenaCanvas } from "@/components/arena/ArenaCanvas";
import { HoloHud } from "@/components/arena/HoloHud";
import { DebugPanel } from "@/components/DebugPanel";
import { connectShow } from "@/game/store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CUTTLE GAME — The Arena" },
      { name: "description", content: "A deep-sea survival show where payment services fight to stay alive." },
      { property: "og:title", content: "CUTTLE GAME — The Arena" },
      { property: "og:description", content: "A deep-sea survival show where payment services fight to stay alive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Arena,
});

function Arena() {
  useEffect(() => connectShow(), []);
  return (
    <div className="fixed inset-0 overflow-hidden bg-abyss">
      <ArenaCanvas />
      <HoloHud />
      <DebugPanel />
    </div>
  );
}
