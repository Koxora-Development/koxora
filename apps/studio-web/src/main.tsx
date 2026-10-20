import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Studio } from '@koxora/studio';
import '@koxora/ui/styles.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Studio />
  </StrictMode>,
);
