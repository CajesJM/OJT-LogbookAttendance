import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Optimize rendering
const root = createRoot(document.getElementById("root")!);

// Defer non-critical rendering
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }, { timeout: 100 });
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

