import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { STAGE_RADIUS, pedestalPos } from "./fx";
import { Text } from "@react-three/drei";

/** Dark glass floor with rippling caustics. */
export function CausticFloor() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; varying vec3 vW;
          void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW;
          float c(vec2 p){ float v=0.; for(int i=0;i<3;i++){ p+=vec2(sin(p.y*1.3+uTime*.4),cos(p.x*1.1-uTime*.35)); v+=abs(sin(p.x+p.y)); } return v/3.; }
          void main(){
            vec2 p=vW.xz*.35;
            float k=pow(1.-c(p),6.)*1.6;
            float d=length(vW.xz);
            float fade=smoothstep(60.,6.,d);
            vec3 base=vec3(.01,.035,.06);
            vec3 col=base+vec3(.15,.6,.75)*k*fade*.5;
            gl_FragColor=vec4(col, fade*.95);
          }`,
      }),
    [],
  );
  useFrame((s) => (mat.uniforms["uTime"]!.value = s.clock.elapsedTime));
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-4} material={mat}>
      <planeGeometry args={[140, 140, 1, 1]} />
    </mesh>
  );
}

/** Additive volumetric light shafts from the surface. */
export function GodRays() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform float uTime; varying vec2 vUv;
          void main(){ float a=pow(vUv.y,1.6)*.22; float f=.6+.4*sin(vUv.x*25.+uTime*.6)*sin(vUv.x*9.-uTime*.3);
          gl_FragColor=vec4(vec3(.35,.8,.95)*a*f,1.); }`,
      }),
    [],
  );
  const rays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: (i - 3) * 4.2 + Math.sin(i * 3) * 1.5,
        z: -6 + Math.cos(i * 2) * 4,
        rz: (i - 3) * 0.06,
        w: 1.5 + (i % 3),
      })),
    [],
  );
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    mat.uniforms["uTime"]!.value = s.clock.elapsedTime;
    if (g.current) g.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.05) * 0.1;
  });
  return (
    <group ref={g}>
      {rays.map((r, i) => (
        <mesh key={i} position={[r.x, 12, r.z]} rotation-z={r.rz} material={mat}>
          <cylinderGeometry args={[r.w, r.w * 3.2, 30, 12, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

/** Drifting plankton. */
export function Plankton({ count = 900 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 60;
      p[i * 3 + 1] = Math.random() * 25 - 5;
      p[i * 3 + 2] = (Math.random() - 0.5) * 50 - 5;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  useFrame((s, dt) => {
    const a = geo.attributes["position"] as THREE.BufferAttribute;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) + dt * 0.25;
      if (y > 20) y = -5;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.08);
    }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.07}
        color="#9ff2ff"
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Floating circular stage with six numbered pedestals. */
export function Stage({ empty }: { empty: boolean[] }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ring.current) ring.current.rotation.z = s.clock.elapsedTime * 0.05;
  });
  return (
    <group>
      <mesh position-y={-0.35} receiveShadow>
        <cylinderGeometry args={[STAGE_RADIUS, STAGE_RADIUS * 0.82, 0.7, 48]} />
        <meshStandardMaterial color="#0b1c26" roughness={0.25} metalness={0.7} flatShading />
      </mesh>
      <mesh position-y={0.005} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[STAGE_RADIUS - 0.1, 48]} />
        <meshStandardMaterial color="#0e2632" roughness={0.12} metalness={0.85} />
      </mesh>
      <mesh ref={ring} position-y={0.02} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[STAGE_RADIUS - 0.25, STAGE_RADIUS - 0.1, 64]} />
        <meshBasicMaterial color="#5fe3ff" toneMapped={false} />
      </mesh>
      <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.2, 2.26, 48]} />
        <meshBasicMaterial color="#2b8aa3" toneMapped={false} transparent opacity={0.6} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const [x, , z] = pedestalPos(i);
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position-y={0.3} castShadow receiveShadow>
              <cylinderGeometry args={[0.85, 1, 0.6, 8]} />
              <meshStandardMaterial color="#10303d" metalness={0.6} roughness={0.3} flatShading />
            </mesh>
            <mesh position-y={0.61} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.62, 0.78, 8]} />
              <meshBasicMaterial color={empty[i] ? "#ff3b2f" : "#5fe3ff"} toneMapped={false} />
            </mesh>
            <Text
              position={[0, 0.3, 0.98]}
              fontSize={0.28}
              color={empty[i] ? "#ff6a5f" : "#bff6ff"}
              anchorX="center"
              anchorY="middle"
              font="/fonts/anton.woff"
            >
              {String(i + 1).padStart(3, "0")}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
