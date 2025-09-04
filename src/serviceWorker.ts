// src/service-worker.ts

// Type definitions for service worker configuration
interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
}

// Utility to check if running on localhost
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Register service worker
export function register(config?: ServiceWorkerConfig): void {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const publicUrl = new URL(import.meta.env.BASE_URL || '/', window.location.href);
    
    // Prevent service worker registration if origins don't match
    if (publicUrl.origin !== window.location.origin) {
      console.warn('Service worker registration skipped: PUBLIC_URL origin mismatch');
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL || '/'}service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.info('Service worker active on localhost. Learn more: https://bit.ly/CRA-PWA');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

// Register a valid service worker
function registerValidSW(swUrl: string, config?: ServiceWorkerConfig): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.info('New service worker content available. Close all tabs to update.');
              config?.onUpdate?.(registration);
            } else {
              console.info('Service worker content cached for offline use.');
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch((error: Error) => {
      console.error('Service worker registration failed:', error.message);
    });
}

// Validate service worker existence
function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig): void {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType && !contentType.includes('javascript'))
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.info('Offline mode: No internet connection. App running from cache.');
    });
}

// Unregister service worker
export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error: Error) => {
        console.error('Service worker unregistration failed:', error.message);
      });
  }
}