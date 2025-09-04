import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './components/ui/button.css'

// Clean main entry point without service worker
createRoot(document.getElementById("root")!).render(<App />);