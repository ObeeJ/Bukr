import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './lib/queryClient';
import App from './App.tsx'
import './index.css'
import './components/ui/button.css'

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);