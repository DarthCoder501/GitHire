"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

interface Avatar2DProps {
  volume: number; // 0-1 normalized volume from AudioAnalyser
  imagePath: string;
}

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function Avatar2D({ volume, imagePath }: Avatar2DProps) {
  const texture = useTexture(imagePath);
  const meshRef = useRef<THREE.Mesh>(null);
  const mouthScaleRef = useRef<number>(1);
  const baseScaleRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 1, 1));

  const geometry = new THREE.PlaneGeometry(2, 2);

  useFrame(() => {
    if (!meshRef.current) return;

    const targetScale = 1 + volume * 0.2;
    mouthScaleRef.current = lerp(mouthScaleRef.current, targetScale, 0.1);

    const scaleY = baseScaleRef.current.y * mouthScaleRef.current;
    meshRef.current.scale.set(
      baseScaleRef.current.x,
      scaleY,
      baseScaleRef.current.z,
    );

    if (baseScaleRef.current.x === 1 && baseScaleRef.current.y === 1) {
      baseScaleRef.current.copy(meshRef.current.scale);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]}>
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}
