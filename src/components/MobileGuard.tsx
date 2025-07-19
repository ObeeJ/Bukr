import { useEffect, useState } from "react";
import AnimatedLogo from "./AnimatedLogo";

const MobileGuard = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      
      // Check if desktop/laptop (width >= 1024px or desktop user agents)
      const isDesktop = width >= 1024 || 
        /Windows NT|Macintosh|Linux/.test(userAgent) && 
        !/Mobile|Android|iPhone|iPad/.test(userAgent);
      
      setIsMobile(!isDesktop);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AnimatedLogo size="lg" className="mb-8" />
          <h1 className="text-2xl font-bold text-glow mb-4">Mobile Experience Only</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Bukr. is currently optimized for mobile and tablet use only. 
            Please switch to a mobile device for the best experience.
          </p>
          <div className="glass-card p-6">
            <p className="text-sm text-muted-foreground">
              📱 Access on mobile or tablet devices<br/>
              💻 Desktop support coming soon
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileGuard;