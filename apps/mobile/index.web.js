import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  // Expo's web index.html should include <div id="root"></div>
  // If it's missing for any reason, create and append it.
  const el = document.createElement('div');
  el.id = 'root';
  document.body.appendChild(el);
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
