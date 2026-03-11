import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { startKeepAlive } from './services/keepAlive';

// Keep the Render backend warm so cold-start delays are avoided
startKeepAlive();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
