import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedSphere = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.x = Math.sin(time) * 0.3;
    meshRef.current.rotation.y = time * 0.5;
    meshRef.current.position.y = Math.sin(time * 2) * 0.1;
  });

  return (
    <Sphere ref={meshRef} args={[0.8, 32, 32]} position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#0ea5e9"
        transparent
        opacity={0.8}
        roughness={0.1}
        metalness={0.9}
      />
    </Sphere>
  );
};

const AnimatedText = () => {
  const textRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    textRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
  });

  return (
    <Text
      ref={textRef}
      fontSize={1.2}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      position={[0, 0, 1]}
      font="/fonts/inter-bold.woff"
    >
      Bukr
    </Text>
  );
};

interface AnimatedLogoProps {
  size?: number;
}

const AnimatedLogo = ({ size = 60 }: AnimatedLogoProps) => {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#0ea5e9" />
        <AnimatedSphere />
        <AnimatedText />
      </Canvas>
    </div>
  );
};

export default AnimatedLogo;