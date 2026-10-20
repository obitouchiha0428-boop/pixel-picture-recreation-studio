import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { onShowEvent, tickPot, useShow } from "@/game/store";
import { sfx } from "@/game/audio";
import { Cuttle } from "./Cuttle";
import { CausticFloor, GodRays, Plankton, Stage } from "./World";
import { AttackSpot, CameraRig, HoloRing, Meeting, PrizeCoin, RadarPulse, ReviveRibbon } from "./Effects";
import { fx, pedestalPos } from "./fx";

function Lights() {
  const meeting = useShow((s) => s.meeting.active);
  const amb = useRef<THREE.AmbientLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-3 * dt);
    if (amb.current) amb.current.intensity += ((meeting ? 0.06 : 0.35) - amb.current.intensity) * k;
    if (dir.current) dir.current.intensity += ((meeting ? 0.15 : 1.6) - dir.current.intensity) * k;
  });
  return (
    <>
      <ambientLight ref={amb} intensity={0.35} color="#5aa9c4" />
      <directionalLight ref={dir} position={[4, 18, 6]} intensity={1.6} color="#bfefff" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 3, 2]} intensity={12} distance={14} color="#2fb6d6" />
    </>
  );
}

function Cuttles() {
  const cuttles = useShow((s) => s.cuttles);
  return (
    <>
      {cuttles.map((c) => {
        const [x, , z] = pedestalPos(c.id);
        return (
          <group key={c.id} position={[x, 0, z]} rotation-y={Math.atan2(-x, 12 - z) * 0.8}>
            <Cuttle index={c.id} status={c.status} />
          </group>
        );
      })}
    </>
  );
}

function StageLive() {
  const key = useShow((s) => s.cuttles.map((c) => (c.status === "eliminated" ? 1 : 0)).join(""));
  return <Stage empty={key.split("").map((k) => k === "1")} />;
}

function PotTicker() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      tickPot(Math.floor(Math.random() * 140 + 20));
    }
  });
  return null;
}

export function ArenaCanvas() {
  useEffect(
    () =>
      onShowEvent((e) => {
        const now = fx.clock;
        if (e.type === "attack") {
          fx.attackAt = now;
          fx.shake = Math.max(fx.shake, 0.55);
          sfx.attack();
        } else if (e.type === "eliminate") {
          fx.elimAt = now;
          fx.shake = 1;
          sfx.gong();
        } else if (e.type === "detect") {
          fx.radarAt = now;
          sfx.radar();
        } else if (e.type === "revive" && e.target !== undefined) {
          fx.reviveAt = now;
          fx.coinAt = now + 1.2;
          sfx.revive();
          setTimeout(sfx.coin, 2400);
        } else if (e.type === "meeting") {
          fx.shake = Math.max(fx.shake, 0.5);
          sfx.meeting();
          setTimeout(sfx.reveal, 3600);
        }
      }),
    [],
  );

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 6.2, 15.5], fov: 42, near: 0.1, far: 200 }}
    >
      <color attach="background" args={["#03111a"]} />
      <fog attach="fog" args={["#03111a", 14, 55]} />
      <Lights />
      <Suspense fallback={null}>
        <Environment resolution={64}>
          <Lightformer intensity={1.4} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} color="#7fe6ff" />
          <Lightformer intensity={0.6} color="#1d6b85" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
          <Lightformer intensity={0.5} color="#ffb347" position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[10, 1, 1]} />
        </Environment>
        <StageLive />
      </Suspense>
      <CausticFloor />
      <GodRays />
      <Plankton />
      <Cuttles />
      <HoloRing />
      <AttackSpot />
      <RadarPulse />
      <ReviveRibbon />
      <PrizeCoin />
      <Meeting />
      <CameraRig />
      <PotTicker />
      <EffectComposer multisampling={0}>
        <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.2} />
        <Bloom intensity={1.1} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
