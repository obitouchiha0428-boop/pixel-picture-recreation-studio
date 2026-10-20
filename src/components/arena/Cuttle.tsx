import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CuttleStatus } from "@/game/store";
import { COLORS, fx } from "./fx";

interface Props {
  index: number;
  status: CuttleStatus;
  /** when true renders a smaller standalone cuttle (phone) */
  solo?: boolean;
  spin?: React.MutableRefObject<number>;
}

const SEGMENTS = 4;

/** Stylised low-poly cuttlefish built from primitives. Skin colour = health. */
export function Cuttle({ index, status, solo, spin }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const tentacles = useRef<THREE.Group[]>([]);
  const fall = useRef({ y: 0, vy: 0, rx: 0, rz: 0, scale: 1 });
  const color = useRef(COLORS.alive.clone());

  const skin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5fe3ff",
        emissive: "#5fe3ff",
        emissiveIntensity: 0.6,
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
        flatShading: true,
      }),
    [],
  );
  const fin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5fe3ff",
        emissive: "#5fe3ff",
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    [],
  );
  const eye = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#eaffff", emissive: "#eaffff", emissiveIntensity: 2.5 }),
    [],
  );
  const pupil = useMemo(() => new THREE.MeshBasicMaterial({ color: "#04121a" }), []);

  const phase = index * 1.37;

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const t = state.clock.elapsedTime + phase;
    const r = root.current;
    const b = body.current;
    if (!r || !b) return;

    // --- colour target by health
    let target = COLORS.alive;
    let pulse = 0;
    if (status === "stressed") {
      target = COLORS.stress;
      pulse = 0.5 + 0.5 * Math.sin(t * 6);
    } else if (status === "failing") {
      target = COLORS.danger;
      pulse = 0.5 + 0.5 * Math.sin(t * 12);
    } else if (status === "impostor") {
      target = COLORS.impostor;
      pulse = 0.3 + 0.3 * Math.sin(t * 3);
    } else if (status === "eliminated") target = COLORS.dead;
    color.current.lerp(target, 1 - Math.exp(-4 * dt));
    skin.color.copy(color.current);
    skin.emissive.copy(color.current);
    skin.emissiveIntensity = 0.45 + pulse * 1.4;
    fin.color.copy(color.current);
    fin.emissive.copy(color.current);
    fin.emissiveIntensity = 1 + pulse * 2;
    eye.emissiveIntensity = status === "eliminated" ? 0.1 : 2.5;

    // --- falling / revive physics
    const f = fall.current;
    if (status === "eliminated") {
      f.vy -= 14 * dt;
      f.y += f.vy * dt;
      f.rx += 2.2 * dt;
      f.rz += 1.4 * dt;
      if (f.y < -40) f.vy = 0;
      f.scale += (0.85 - f.scale) * (1 - Math.exp(-2 * dt));
    } else {
      // pulled back up
      f.vy = Math.max(f.vy, 0);
      f.y += (0 - f.y) * (1 - Math.exp(-3 * dt));
      f.rx *= Math.exp(-4 * dt);
      f.rz *= Math.exp(-4 * dt);
      f.scale += (1 - f.scale) * (1 - Math.exp(-3 * dt));
      if (Math.abs(f.y) < 0.01) f.vy = 0;
    }

    const breathe = 1 + Math.sin(t * 1.6) * 0.04;
    const shake = status === "failing" ? 0.08 : status === "stressed" ? 0.025 : 0;
    r.position.set(
      (Math.random() - 0.5) * shake,
      f.y + 1.55 + Math.sin(t * 0.9) * 0.12,
      (Math.random() - 0.5) * shake,
    );
    r.rotation.set(f.rx, Math.sin(t * 0.4) * 0.25 + (spin ? spin.current : 0), f.rz);
    if (spin) spin.current *= Math.exp(-3 * dt);
    const limp = status === "eliminated" ? 0.75 : 1;
    b.scale.set(breathe * f.scale, (2 - breathe) * f.scale * limp, breathe * f.scale);

    // --- tentacle sway
    const amp = status === "eliminated" ? 0.05 : status === "failing" ? 0.6 : 0.28;
    const speed = status === "failing" ? 6 : 1.8;
    tentacles.current.forEach((g, k) => {
      let node: THREE.Object3D | undefined = g;
      let s = 0;
      while (node) {
        node.rotation.x = Math.sin(t * speed + k * 0.8 + s * 0.7) * amp * (0.4 + s * 0.3);
        node.rotation.z = Math.cos(t * speed * 0.7 + k) * amp * 0.4;
        node = node.children.find((c) => c.type === "Group");
        s++;
      }
    });
    void fx;
  });

  const tentacleChains = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    return (
      <group
        key={k}
        position={[Math.cos(a) * 0.32, -0.55, Math.sin(a) * 0.32 + 0.35]}
        ref={(g) => {
          if (g) tentacles.current[k] = g;
        }}
      >
        <Segment depth={0} mat={skin} />
      </group>
    );
  });

  return (
    <group ref={root} scale={solo ? 1.4 : 1}>
      <group ref={body}>
        {/* mantle */}
        <mesh material={skin} castShadow scale={[0.75, 0.62, 1.15]}>
          <icosahedronGeometry args={[1, 2]} />
        </mesh>
        {/* undulating side fin */}
        <mesh material={fin} rotation-x={Math.PI / 2} scale={[1, 1.45, 1]} position-y={-0.1}>
          <torusGeometry args={[0.78, 0.09, 4, 24]} />
        </mesh>
        {/* head */}
        <mesh material={skin} position={[0, -0.25, 0.95]} scale={[0.62, 0.5, 0.55]}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        {/* eyes */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.42, -0.08, 1.12]}>
            <mesh material={eye}>
              <sphereGeometry args={[0.19, 12, 10]} />
            </mesh>
            <mesh material={pupil} position={[0, -0.02, 0.15]} scale={[1, 0.45, 0.4]}>
              <sphereGeometry args={[0.1, 10, 8]} />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[0, 0, 0.2]}>{tentacleChains}</group>
    </group>
  );
}

function Segment({ depth, mat }: { depth: number; mat: THREE.Material }) {
  const r = 0.09 * (1 - depth / (SEGMENTS + 1));
  return (
    <group position={[0, depth === 0 ? 0 : -0.24, depth === 0 ? 0 : 0.04]}>
      <mesh material={mat} position={[0, -0.12, 0]}>
        <cylinderGeometry args={[r, r * 0.8, 0.26, 5]} />
      </mesh>
      {depth < SEGMENTS - 1 && <Segment depth={depth + 1} mat={mat} />}
    </group>
  );
}
