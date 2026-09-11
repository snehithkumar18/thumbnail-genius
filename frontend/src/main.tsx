import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore theme preference
const savedTheme = localStorage.getItem("Thumbly-theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA in production, clean up in development
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered successfully:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Development mode: Unregistered stale service worker successfully');
            window.location.reload();
          }
        });
      }
    });
  }
}

