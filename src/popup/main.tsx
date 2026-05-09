import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function PopupRoot() {
  return (
    <main>
      <h1>Markdown Reader</h1>
      <button type="button">Open Reader</button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupRoot />
  </StrictMode>,
);
