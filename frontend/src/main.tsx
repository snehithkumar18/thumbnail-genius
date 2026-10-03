import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore theme preference
const savedTheme = localStorage.getItem("Thumbly-theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);

// Auto-recovery for stale asset script errors when new builds are deployed
window.addEventListener('error', (e) => {
  const isChunkError = e.message && (
    e.message.includes('Failed to load module script') ||
    e.message.includes('Loading chunk') ||
    e.message.includes('dynamically imported module')
  );
  if (isChunkError && !sessionStorage.getItem('chunk_reload_attempted')) {
    sessionStorage.setItem('chunk_reload_attempted', 'true');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
    window.location.reload();
  }
});

// Register Service Worker for PWA in production, clean up in development
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registered successfully:', reg.scope);
          // Check for service worker updates automatically
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New update available, reloading page...');
                  window.location.reload();
                }
              };
            }
          };
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Development mode: Unregistered stale service worker successfully');
          }
        });
      }
    });
  }
}

