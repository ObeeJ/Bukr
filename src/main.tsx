import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './components/ui/button.css'
import * as serviceWorker from './serviceWorker'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
serviceWorker.register();
