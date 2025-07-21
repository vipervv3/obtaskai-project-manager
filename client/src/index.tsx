import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import App from './App';
import './index.css';

// Workaround for Browser Locker extension interference
const originalReplaceState = window.history.replaceState;
window.history.replaceState = function(...args) {
  try {
    return originalReplaceState.apply(this, args);
  } catch (error) {
    console.warn('Browser extension interference detected, ignoring:', error);
  }
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);