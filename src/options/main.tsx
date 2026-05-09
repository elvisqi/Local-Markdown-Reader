import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function OptionsRoot() {
  return (
    <main>
      <h1>Markdown Reader Settings</h1>
      <p>Reader preferences will appear here.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsRoot />
  </StrictMode>,
);
