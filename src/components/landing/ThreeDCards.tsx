import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

const categories = [
  { label: "💰 Finance", color: "#FF4500" },
  { label: "🎮 Gaming", color: "#8B5CF6" },
  { label: "💪 Fitness", color: "#10B981" },
  { label: "🤖 Tech", color: "#3B82F6" },
  { label: "✈️ Travel", color: "#F59E0B" },
];

function Card({
  position,
  rotationY,
  color,
  label,
}: {
  position: [number, number, number];
  rotationY: number;
  color: string;
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        rotationY,
        0.05
      );
    }
  });

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[2.4, 1.35, 0.08]}
        radius={0.08}
        smoothness={4}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.08 : 1}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.1}
        />
      </RoundedBox>
    </group>
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {categories.map((cat, i) => {
        const angle = (i / categories.length) * Math.PI * 2;
        const radius = 3;
        return (
          <Card
            key={cat.label}
            position={[
              Math.sin(angle) * radius,
              Math.sin(i * 0.5) * 0.3,
              Math.cos(angle) * radius,
            ]}
            rotationY={-angle + Math.PI}
            color={cat.color}
            label={cat.label}
          />
        );
      })}
    </group>
  );
}

import { useState } from "react";

const ThreeDCards = () => {
  return (
    <div className="w-full aspect-[4/3]">
      <Canvas
        camera={{ position: [0, 1.5, 6], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-3, 2, 4]} intensity={0.4} color="#FF4500" />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ThreeDCards;
