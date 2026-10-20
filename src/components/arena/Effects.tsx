import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useShow } from "@/game/store";
import { COLORS, fx, pedestalPos } from "./fx";

const coneMat = (color: string) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
      void main(){ float a=pow(1.-vUv.y,1.2)*.55*uI; gl_FragColor=vec4(uColor*a,1.); }`,
  });

/** Red spotlight that slams onto the attacked cuttle. */
export function AttackSpot() {
  const target = useShow((s) => s.attackTarget);
  const mat = useMemo(() => coneMat("#ff2a1a"), []);
  const g = useRef<THREE.Group>(null);
  const light = useRef<THREE.SpotLight>(null);
  const tgt = useMemo(() => new THREE.Object3D(), []);
  const I = useRef(0);
  useFrame((_, dt) => {
    const on = target !== null;
    I.current += ((on ? 1 : 0) - I.current) * (1 - Math.exp(-(on ? 14 : 3) * dt));
    mat.uniforms["uI"]!.value = I.current;
    if (target !== null && g.current) {
      const [x, , z] = pedestalPos(target);
      g.current.position.set(x, 0, z);
    }
    if (light.current) light.current.intensity = I.current * 120;
  });
  return (
    <group ref={g}>
      <mesh position-y={6} material={mat}>
        <cylinderGeometry args={[0.15, 1.6, 12, 20, 1, true]} />
      </mesh>
      <primitive object={tgt} position={[0, 0, 0]} />
      <spotLight ref={light} position={[0, 12, 0]} angle={0.22} penumbra={0.4} color="#ff3020" target={tgt} castShadow={false} />
    </group>
  );
}

/** Cyan radar sweep across the arena on detection. */
export function RadarPulse() {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#5fe3ff", transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  useFrame(() => {
    const e = fx.clock - fx.radarAt;
    const m = ring.current;
    if (!m) return;
    if (e < 0 || e > 2.4) {
      mat.opacity = 0;
      return;
    }
    const s = 0.5 + e * 12;
    m.scale.set(s, s, s);
    mat.opacity = (1 - e / 2.4) * 0.9;
  });
  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.08} material={mat}>
      <ringGeometry args={[0.92, 1, 64]} />
    </mesh>
  );
}

/** Ribbon of light from pedestal 006 to the revived pedestal. */
export function ReviveRibbon() {
  const from = useShow((s) => s.reviveFrom);
  const to = useShow((s) => s.reviveTarget);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uT: { value: 0 }, uP: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform float uT; uniform float uP; varying vec2 vUv;
          void main(){ if(vUv.x>uP) discard; float band=.5+.5*sin(vUv.x*40.-uT*12.);
          vec3 c=mix(vec3(.37,.89,1.),vec3(1.,.85,.4),band*.5); gl_FragColor=vec4(c*(.6+band),1.); }`,
      }),
    [],
  );
  const geo = useMemo(() => {
    if (from === null || to === null) return null;
    const a = new THREE.Vector3(...pedestalPos(from)).setY(1.6);
    const b = new THREE.Vector3(...pedestalPos(to)).setY(1.6);
    const mid = a.clone().lerp(b, 0.5).setY(5.5);
    const curve = new THREE.CatmullRomCurve3([a, mid.clone().add(new THREE.Vector3(0, 0, 1.5)), b]);
    return new THREE.TubeGeometry(curve, 80, 0.09, 6, false);
  }, [from, to]);
  useFrame((s) => {
    const e = fx.clock - fx.reviveAt;
    mat.uniforms["uT"]!.value = s.clock.elapsedTime;
    mat.uniforms["uP"]!.value = Math.min(1, e / 0.9) * (e > 2.6 ? Math.max(0, 1 - (e - 2.6) * 2) : 1);
  });
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} />;
}

/** Gold coin that arcs from the revived cuttle into the hologram pot. */
export function PrizeCoin() {
  const to = useShow((s) => s.reviveTarget);
  const m = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const e = fx.clock - (fx.coinAt);
    const mesh = m.current;
    if (!mesh) return;
    if (e < 0 || e > 1.6 || to === null) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const k = e / 1.6;
    const [x, , z] = pedestalPos(to);
    mesh.position.set(x * (1 - k), 1.8 + Math.sin(k * Math.PI) * 4 + k * 6.5, z * (1 - k) - k * 2);
    mesh.rotation.y = e * 14;
    const sc = 1 - k * 0.6;
    mesh.scale.set(sc, sc, sc);
  });
  return (
    <mesh ref={m} rotation-x={Math.PI / 2} visible={false}>
      <cylinderGeometry args={[0.35, 0.35, 0.08, 16]} />
      <meshStandardMaterial color="#ffcf5a" emissive="#ffb000" emissiveIntensity={2.4} metalness={1} roughness={0.2} toneMapped={false} />
    </mesh>
  );
}

/** Emergency meeting: sweeping spotlights and the impostor bubble. */
export function Meeting() {
  const meeting = useShow((s) => s.meeting);
  const mats = useMemo(() => [coneMat("#d9f6ff"), coneMat("#d9f6ff"), coneMat("#d9f6ff")], []);
  const cones = useRef<THREE.Mesh[]>([]);
  const bubble = useRef<THREE.Mesh>(null);
  const bubbleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9b6bd6",
        emissive: "#7a4bc0",
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0,
        roughness: 0,
        metalness: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  const I = useRef(0);
  const B = useRef(0);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    I.current += ((meeting.active ? 1 : 0) - I.current) * (1 - Math.exp(-3 * dt));
    const revealed = meeting.impostor !== null && meeting.active;
    cones.current.forEach((c, i) => {
      if (!c) return;
      let x = Math.sin(t * (0.9 + i * 0.3) + i * 2) * 5;
      let z = Math.cos(t * (0.7 + i * 0.2) + i) * 2.5 - 1.5;
      if (revealed && meeting.impostor !== null) {
        const [px, , pz] = pedestalPos(meeting.impostor);
        x = px;
        z = pz;
      }
      c.position.x += (x - c.position.x) * (1 - Math.exp(-(revealed ? 5 : 8) * dt));
      c.position.z += (z - c.position.z) * (1 - Math.exp(-(revealed ? 5 : 8) * dt));
      mats[i]!.uniforms["uI"]!.value = I.current * 0.8;
    });
    B.current += ((meeting.impostor !== null ? 1 : 0) - B.current) * (1 - Math.exp(-2.5 * dt));
    if (bubble.current && meeting.impostor !== null) {
      const [px, , pz] = pedestalPos(meeting.impostor);
      bubble.current.position.set(px, 1.7, pz);
      const sc = 1.5 * B.current + Math.sin(t * 2) * 0.03;
      bubble.current.scale.set(sc, sc, sc);
      bubbleMat.opacity = 0.28 * B.current;
    }
    if (bubble.current) bubble.current.visible = meeting.impostor !== null;
  });
  return (
    <>
      {mats.map((m, i) => (
        <mesh key={i} ref={(r) => { if (r) cones.current[i] = r; }} position={[0, 6, 0]} material={m}>
          <cylinderGeometry args={[0.1, 1.5, 12, 20, 1, true]} />
        </mesh>
      ))}
      <mesh ref={bubble} material={bubbleMat}>
        <icosahedronGeometry args={[1.3, 3]} />
      </mesh>
    </>
  );
}

/** Floating holographic ring above the stage. */
export function HoloRing() {
  const g = useRef<THREE.Group>(null);
  const tone = useShow((s) => s.banner?.tone ?? "cyan");
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#5fe3ff", toneMapped: false, transparent: true, opacity: 0.85 }), []);
  const mat2 = useMemo(() => new THREE.MeshBasicMaterial({ color: "#5fe3ff", toneMapped: false, transparent: true, opacity: 0.25, wireframe: true }), []);
  const col = useRef(COLORS.alive.clone());
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    if (g.current) {
      g.current.rotation.y = t * 0.15;
      g.current.position.y = 7.2 + Math.sin(t * 0.7) * 0.15;
    }
    const target = tone === "red" ? COLORS.danger : tone === "violet" ? COLORS.impostor : tone === "amber" ? COLORS.stress : COLORS.alive;
    col.current.lerp(target, 1 - Math.exp(-3 * dt));
    mat.color.copy(col.current);
    mat2.color.copy(col.current);
  });
  return (
    <group ref={g}>
      <mesh rotation-x={Math.PI / 2} material={mat}>
        <torusGeometry args={[4.2, 0.04, 6, 96]} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={-0.5} material={mat}>
        <torusGeometry args={[3.6, 0.02, 6, 96]} />
      </mesh>
      <mesh material={mat2}>
        <cylinderGeometry args={[4.2, 3.6, 0.5, 32, 1, true]} />
      </mesh>
    </group>
  );
}

/** Cinematic camera drift with trauma-based screen shake. */
export function CameraRig() {
  const { camera } = useThree();
  const meeting = useShow((s) => s.meeting.active);
  const base = useMemo(() => new THREE.Vector3(0, 6.2, 15.5), []);
  const look = useMemo(() => new THREE.Vector3(0, 2.6, -1.5), []);
  useFrame((s, raw) => {
    const dt = Math.min(raw, 0.05);
    fx.clock = s.clock.elapsedTime;
    const t = s.clock.elapsedTime;
    fx.shake *= Math.exp(-3.2 * dt);
    const k = fx.shake * fx.shake;
    const dolly = meeting ? -2.5 : 0;
    const target = new THREE.Vector3(
      base.x + Math.sin(t * 0.08) * 1.6,
      base.y + Math.sin(t * 0.11) * 0.3,
      base.z + dolly,
    );
    camera.position.lerp(target, 1 - Math.exp(-1.5 * dt));
    camera.position.x += (Math.random() - 0.5) * k * 0.9;
    camera.position.y += (Math.random() - 0.5) * k * 0.9;
    camera.lookAt(look);
    camera.rotation.z += (Math.random() - 0.5) * k * 0.05;
  });
  return null;
}
