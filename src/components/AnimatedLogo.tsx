import React from 'react';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AnimatedLogo = ({ size = 'md', className = '' }: AnimatedLogoProps) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl', 
    lg: 'text-6xl md:text-8xl'
  };

  return (
    <div className={`font-bold italic ${sizeClasses[size]} ${className}`}>
      <span className="text-glow animate-pulse">Bukr</span>
      <span className="text-primary animate-bounce inline-block ml-1">.</span>
    </div>
  );
};

export default AnimatedLogo;