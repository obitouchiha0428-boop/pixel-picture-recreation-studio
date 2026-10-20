import * as THREE from "three";

/** Mutable per-frame effect clock, written by event handlers, read inside useFrame. */
export const fx = {
  shake: 0,
  radarAt: -100,
  coinAt: -100,
  attackAt: -100,
  elimAt: -100,
  elimTarget: -1,
  reviveAt: -100,
  clock: 0,
};

export const COLORS = {
  alive: new THREE.Color("#5fe3ff"),
  stress: new THREE.Color("#ffb347"),
  danger: new THREE.Color("#ff3b2f"),
  impostor: new THREE.Color("#9b6bd6"),
  dead: new THREE.Color("#1a2a33"),
  gold: new THREE.Color("#ffcf5a"),
};

export const STAGE_RADIUS = 7;
const PED_R = 5;

/** Six pedestals on the far half-circle of the stage, 001 left to 006 right. */
export function pedestalPos(i: number): [number, number, number] {
  const a = Math.PI * (1.08 - (i / 5) * 1.16); // ~194deg to ~-14deg, upper half
  return [Math.cos(a) * PED_R, 0, -Math.sin(a) * PED_R * 0.85 + 0.6];
}
