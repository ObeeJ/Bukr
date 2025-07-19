import React from 'react';
import { Link } from 'react-router-dom';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  clickable?: boolean;
}

const AnimatedLogo = ({ size = 'md', className = '', clickable = false }: AnimatedLogoProps) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl', 
    lg: 'text-6xl md:text-8xl'
  };

  const logoContent = (
    <div className={`${sizeClasses[size]} ${className} animate-logo-load logo`}>
      <span className="text-glow" style={{ fontFamily: '"Clash Display", sans-serif', fontWeight: 500 }}>Bukr</span>
      <span className="text-primary inline-block ml-0.5 text-[0.3em] relative -top-1 animate-dot-bounce" style={{ borderRadius: '50%' }}>●</span>
    </div>
  );

  if (clickable) {
    // Simple auth check - in real app, this would use proper auth context
    const isSignedIn = false; // TODO: Replace with actual auth state
    const targetPath = isSignedIn ? "/app" : "/signin";
    
    return (
      <Link to={targetPath} className="cursor-pointer hover:scale-105 transition-transform duration-300">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

export default AnimatedLogo;