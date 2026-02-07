"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Avatar2D } from "@/components/canvas/Avatar2D";

interface AvatarProps {
  volume: number; // 0-1 normalized volume from AudioAnalyser
  modelPath?: string;
  fallbackImagePath?: string; // PNG/JPEG fallback
}

// Lerp function for smooth interpolation
function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

// 3D GLB Avatar Component
function Avatar3D({
  volume,
  modelPath,
}: {
  volume: number;
  modelPath: string;
}) {
  const { scene } = useGLTF(modelPath);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const mouthOpenRef = useRef<number>(0);

  // Find the mesh with morph targets
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
        // Store reference to the mesh
        if (!meshRef.current) {
          meshRef.current = child;
        }
      }
    });
  }, [scene]);

  // Update mouth animation based on volume
  useFrame(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    if (!mesh.morphTargetInfluences) return;

    // Smooth dampening to avoid jittery mouth (factor ~0.1)
    const targetVolume = volume * 0.5; // Scale down for more subtle animation
    mouthOpenRef.current = lerp(mouthOpenRef.current, targetVolume, 0.1);

    // Apply to morph target
    // Try common morph target indices
    const indicesToTry = [0, 1, 2]; // Common mouth open indices
    for (const index of indicesToTry) {
      if (mesh.morphTargetInfluences[index] !== undefined) {
        mesh.morphTargetInfluences[index] = mouthOpenRef.current;
      }
    }
  });

  return (
    <primitive
      object={scene}
      scale={1}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// Main Avatar Component with Fallback
export function Avatar({
  volume,
  modelPath = "/models/avatar.glb",
  fallbackImagePath = "/models/avatar.png", // Default fallback - can be .png, .jpg, .jpeg
}: AvatarProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if GLB exists by trying to fetch it
  useEffect(() => {
    fetch(modelPath, { method: "HEAD" })
      .then((response) => {
        setIsChecking(false);
        if (!response.ok) {
          setUseFallback(true);
        }
      })
      .catch(() => {
        setIsChecking(false);
        setUseFallback(true);
      });
  }, [modelPath]);

  // Show nothing while checking (or show fallback immediately)
  if (isChecking) {
    return null;
  }

  // If GLB doesn't exist, use 2D fallback
  if (useFallback) {
    return <Avatar2D volume={volume} imagePath={fallbackImagePath} />;
  }

  // Render 3D GLB avatar with Suspense for loading state
  return (
    <Suspense
      fallback={<Avatar2D volume={volume} imagePath={fallbackImagePath} />}
    >
      <Avatar3D volume={volume} modelPath={modelPath} />
    </Suspense>
  );
}

// Preload the model (with error handling)
try {
  useGLTF.preload("/models/avatar.glb");
} catch (e) {
  // Silently fail if GLB doesn't exist
}
