"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { live } from "@/lib/store";
import { SCENE_ORIGIN } from "../shared";
import { Dome } from "./Dome";
import { Lattice } from "./Lattice";
import { Terrain } from "./Terrain";

export function IntroScene() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = live.view === "intro";
  });
  return (
    <group ref={group}>
      <Terrain origin={SCENE_ORIGIN.intro} />
      <Dome origin={SCENE_ORIGIN.intro} />
      <Lattice />
    </group>
  );
}
