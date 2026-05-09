import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function ReaderRoot() {
  return (
    <main>
      <h1>Markdown Reader</h1>
      <p>Open a local folder to start reading Markdown files.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReaderRoot />
  </StrictMode>,
);
