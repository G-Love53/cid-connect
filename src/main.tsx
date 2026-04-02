
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Do not keep a controlling service worker — it intercepts navigations (back/forward)
// and can pair badly with CDN caches. Clear any legacy registration early and on load.
function unregisterAllServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      void reg.unregister();
    });
  });
}
unregisterAllServiceWorkers();
window.addEventListener("load", unregisterAllServiceWorkers);
