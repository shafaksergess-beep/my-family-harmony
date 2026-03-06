import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import "./lib/median"; // Initialize global isMedianApp

// Service worker is managed by vite-plugin-pwa (autoUpdate mode)
// It automatically skips waiting and claims clients on new deployments

createRoot(document.getElementById("root")!).render(<App />);
