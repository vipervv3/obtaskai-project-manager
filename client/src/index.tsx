import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Minimal working app without Redux/Router for production testing
const MinimalApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Obtask AI - Working!</h1>
      <p>Timestamp: {new Date().toLocaleString()}</p>
      <p>Environment: Production Test</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Status: ✅ App is Running</h2>
        <p>This confirms the basic React app works in production.</p>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<MinimalApp />);