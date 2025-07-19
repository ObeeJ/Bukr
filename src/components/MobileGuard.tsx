import { useEffect, useState } from "react";
import AnimatedLogo from "./AnimatedLogo";

const MobileGuard = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(true);

  // We're now making the app fully responsive for all devices
  useEffect(() => {
    // Add viewport meta tag for better mobile experience
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    document.head.appendChild(meta);
    
    // Add CSS for safe area insets on iOS devices
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(meta);
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
};

export default MobileGuard;