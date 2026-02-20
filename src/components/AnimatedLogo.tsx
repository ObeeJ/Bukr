/**
 * PRESENTATION LAYER - UI Component
 * 
 * AnimatedLogo: The face of Bukr - because every great app needs a logo that moves
 * 
 * Architecture Layer: Presentation (Pure UI)
 * Dependencies: AuthContext (Application Layer)
 * Responsibility: Render the logo, look pretty, navigate smartly
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Props for our logo - because even logos need options
 * Think of this as the logo's wardrobe and personality settings
 */
interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg';      // How big should we flex? (default: medium flex)
  className?: string;              // Extra styling sauce
  clickable?: boolean;             // Can users click me? (default: nope, just look)
}

/**
 * The AnimatedLogo component - Bukr's digital signature
 * 
 * What it does:
 * 1. Shows the "Bukr" text with a bouncing dot (because static is boring)
 * 2. If clickable, becomes a smart link (authenticated -> /app, guest -> /signin)
 * 3. Scales on hover (because we're fancy like that)
 * 
 * @param size - Logo size: 'sm' for shy, 'md' for confident, 'lg' for LOOK AT ME
 * @param className - Additional CSS classes (for the fashionistas)
 * @param clickable - Whether this logo doubles as a navigation button
 */
const AnimatedLogo = ({ size = 'md', className = '', clickable = false }: AnimatedLogoProps) => {
  // Check if user is authenticated - are they in the club or still outside?
  const { isAuthenticated } = useAuth();
  
  // Size mapping - because "md" is more readable than "text-2xl"
  const sizeClasses = {
    sm: 'text-xl',                    // Whisper mode
    md: 'text-2xl',                   // Normal conversation
    lg: 'text-6xl md:text-8xl'        // SHOUTING (but responsive shouting)
  };

  // The actual logo markup - separated for reusability (DRY principle, baby!)
  const logoContent = (
    <div className={`${sizeClasses[size]} ${className} animate-logo-load logo`}>
      {/* The main text - glowing because we're not basic */}
      <span className="text-glow">Bukr</span>
      
      {/* The bouncing dot - our signature move, like Nike's swoosh but rounder */}
      <span 
        className="text-primary inline-block ml-0.5 text-[0.3em] relative -top-1 animate-dot-bounce" 
        style={{ borderRadius: '50%' }}
      >
        ●
      </span>
    </div>
  );

  // Decision time: Are we a button or just eye candy?
  if (clickable) {
    // Smart navigation: Authenticated users go to app, guests go to signin
    // It's like a bouncer who knows where everyone should go
    const targetPath = isAuthenticated ? "/app" : "/signin";

    return (
      <Link 
        to={targetPath} 
        className="cursor-pointer hover:scale-105 transition-transform duration-300"
      >
        {logoContent}
      </Link>
    );
  }

  // Just a pretty logo, no clicking allowed - look but don't touch
  return logoContent;
};

export default AnimatedLogo;