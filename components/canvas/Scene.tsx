"use client";

import { Canvas } from "@react-three/fiber";
import { Experience } from "./Experience";

interface SceneProps {
  volume: number;
}

export function Scene({ volume }: SceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ width: "100%", height: "100%" }}
    >
      <Experience volume={volume} />
    </Canvas>
  );
}
