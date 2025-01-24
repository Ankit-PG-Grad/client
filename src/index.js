import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Workbox } from 'workbox-window';
import { FpjsProvider } from '@fingerprintjs/fingerprintjs-pro-react';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <FpjsProvider
      loadOptions={{
        apiKey: `${process.env.REACT_APP_FINGERPRINT_API_KEY}`,
        region: "ap"
      }}
    >
      <App />
    </FpjsProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/serviceWorker.js');
  
  wb.addEventListener('installed', event => {
    if (event.isUpdate) {
      if (window.confirm('New content is available! Click OK to refresh.')) {
        window.location.reload();
      }
    }
  });

  wb.register()
    .catch(err => console.error('Service worker registration failed:', err));
}
