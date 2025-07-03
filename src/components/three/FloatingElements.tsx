import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere, Octahedron } from '@react-three/drei';
import * as THREE from 'three';

const FloatingShape = ({ position, geometry, color }: { 
  position: [number, number, number];
  geometry: 'box' | 'sphere' | 'octahedron';
  color: string;
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.x = time * 0.2;
    meshRef.current.rotation.y = time * 0.3;
    meshRef.current.position.y = position[1] + Math.sin(time + position[0]) * 0.5;
  });

  const ShapeComponent = {
    box: Box,
    sphere: Sphere,
    octahedron: Octahedron
  }[geometry];

  const renderShape = () => {
    switch (geometry) {
      case 'box':
        return (
          <Box ref={meshRef} position={position} args={[0.5, 0.5, 0.5]}>
            <meshStandardMaterial color={color} transparent opacity={0.6} roughness={0.4} metalness={0.6} />
          </Box>
        );
      case 'sphere':
        return (
          <Sphere ref={meshRef} position={position} args={[0.5, 16, 16]}>
            <meshStandardMaterial color={color} transparent opacity={0.6} roughness={0.4} metalness={0.6} />
          </Sphere>
        );
      case 'octahedron':
        return (
          <Octahedron ref={meshRef} position={position} args={[0.5]}>
            <meshStandardMaterial color={color} transparent opacity={0.6} roughness={0.4} metalness={0.6} />
          </Octahedron>
        );
    }
  };

  return renderShape();
};

const FloatingElements = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <pointLight position={[-5, -5, 5]} intensity={0.3} color="#0ea5e9" />
        
        <FloatingShape position={[-3, 2, -2]} geometry="box" color="#0ea5e9" />
        <FloatingShape position={[3, -1, -3]} geometry="sphere" color="#8b5cf6" />
        <FloatingShape position={[-2, -2, -1]} geometry="octahedron" color="#06b6d4" />
        <FloatingShape position={[2, 3, -4]} geometry="box" color="#3b82f6" />
        <FloatingShape position={[0, -3, -2]} geometry="sphere" color="#6366f1" />
        <FloatingShape position={[-4, 0, -3]} geometry="octahedron" color="#8b5cf6" />
      </Canvas>
    </div>
  );
};

export default FloatingElements;