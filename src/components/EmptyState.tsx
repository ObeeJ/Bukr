import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere, Text } from '@react-three/drei';
import { Button } from './ui/button';
import * as THREE from 'three';

const FloatingIcon = ({ icon }: { icon: string }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = time * 0.5;
    meshRef.current.position.y = Math.sin(time * 2) * 0.2;
  });

  return (
    <Box ref={meshRef} args={[1, 1, 0.1]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#0ea5e9" transparent opacity={0.8} />
    </Box>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: string;
}

const EmptyState = ({ title, description, action, icon = "📋" }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      {/* Three.js animated icon */}
      <div className="w-32 h-32 mb-6">
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, -5, 5]} intensity={0.5} color="#0ea5e9" />
          <FloatingIcon icon={icon} />
        </Canvas>
      </div>

      {/* Content */}
      <div className="space-y-4 max-w-md">
        <h3 className="text-2xl font-bold text-glow">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        
        {action && (
          <Button 
            variant="glow" 
            onClick={action.onClick}
            className="mt-6 px-8 py-3 text-lg"
          >
            {action.label}
          </Button>
        )}
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
          <ambientLight intensity={0.1} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Sphere
              key={i}
              args={[0.1, 8, 8]}
              position={[
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 5
              ]}
            >
              <meshStandardMaterial 
                color="#0ea5e9" 
                transparent 
                opacity={0.3} 
              />
            </Sphere>
          ))}
        </Canvas>
      </div>
    </div>
  );
};

export default EmptyState;