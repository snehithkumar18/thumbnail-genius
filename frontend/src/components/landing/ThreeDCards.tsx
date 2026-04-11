import { useRef, Suspense, useState, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { RoundedBox, Float, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

const categories = [
  { label: "💰 Finance", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=225&fit=crop" },
  { label: "🎮 Gaming", img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop" },
  { label: "💪 Fitness", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=225&fit=crop" },
  { label: "🤖 Tech", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=225&fit=crop" },
  { label: "✈️ Travel", img: "https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?w=400&h=225&fit=crop" },
];

function Card({
  position,
  rotationY,
  imgUrl,
  label,
}: {
  position: [number, number, number];
  rotationY: number;
  imgUrl: string;
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useLoader(THREE.TextureLoader, imgUrl);

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
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        <RoundedBox
          ref={meshRef}
          args={[2.4, 1.35, 0.08]}
          radius={0.08}
          smoothness={4}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={hovered ? 1.15 : 1}
        >
          <meshStandardMaterial
            map={texture}
            roughness={0.2}
            metalness={0.1}
          />
        </RoundedBox>
        {/* Label Background */}
        <mesh position={[0, -0.85, 0.05]}>
            <planeGeometry args={[1.5, 0.4]} />
            <meshStandardMaterial color="#8B47FF" transparent opacity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
      groupRef.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {categories.map((cat, i) => {
        const angle = (i / categories.length) * Math.PI * 2;
        const radius = 3.5;
        return (
          <Card
            key={cat.label}
            position={[
              Math.sin(angle) * radius,
              Math.sin(i * 0.5) * 0.5,
              Math.cos(angle) * radius,
            ]}
            rotationY={-angle + Math.PI}
            imgUrl={cat.img}
            label={cat.label}
          />
        );
      })}
    </group>
  );
}

const ThreeDCards = () => {
  return (
    <div className="w-full aspect-[4/3] relative">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.5, 7]} fov={40} />
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B47FF" />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background via-transparent to-transparent " />
    </div>
  );
};

export default ThreeDCards;
