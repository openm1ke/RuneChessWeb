import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BUILT_FOR_PLAYGAMA } from './buildTarget';
import { reportPlaygamaGameReady, startPlaygama } from './services/playgamaPlatform';
import { PROGRESS_STORAGE_KEYS } from './services/progressRepository';
import { LANGUAGE_STORAGE_KEY } from './services/languageRepository';
import './styles/global.css';

function render(): void {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

if (BUILT_FOR_PLAYGAMA) {
  // Bridge first, then the saves it holds, then the game: the app reads its
  // progress synchronously the moment it mounts. `game_ready` goes out once
  // the first frame has actually been painted, not merely scheduled.
  void startPlaygama([...PROGRESS_STORAGE_KEYS, LANGUAGE_STORAGE_KEY]).then(() => {
    render();
    requestAnimationFrame(() => requestAnimationFrame(reportPlaygamaGameReady));
  });
} else {
  render();
}
