import { useEffect } from "react";

const MobileGuard = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Update the existing viewport meta (already in index.html) rather than
    // appending a second one. Browsers use the first tag; duplicates are ignored
    // and accumulate on HMR. querySelector finds the existing tag and patches it.
    const existing = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (existing) {
      existing.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';
    }

    // Safe-area padding for iOS notch / home indicator.
    // Injected once here so it applies globally without duplicating in index.css.
    const style = document.createElement('style');
    style.id = 'bukr-safe-area';
    style.textContent = 'body { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }';
    if (!document.getElementById('bukr-safe-area')) {
      document.head.appendChild(style);
    }

    return () => { document.getElementById('bukr-safe-area')?.remove(); };
  }, []);

  return <>{children}</>;
};

export default MobileGuard;