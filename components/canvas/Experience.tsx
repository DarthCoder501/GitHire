"use client";

import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Avatar } from "./Avatar";

interface ExperienceProps {
  volume: number;
}

export function Experience({ volume }: ExperienceProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 1.6, 3]} fov={50} />

      {/* Environment (optional, for better visuals) */}
      <Environment preset="sunset" />

      {/* Avatar */}
      <Avatar volume={volume} />

      {/* Controls for manual camera movement */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={5}
        target={[0, 1, 0]}
      />
    </>
  );
}
