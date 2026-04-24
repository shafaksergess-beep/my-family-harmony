import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import "./lib/median"; // Initialize global isMedianApp

// Service worker is managed by vite-plugin-pwa (autoUpdate mode)
// It automatically skips waiting and claims clients on new deployments

const rootEl = document.getElementById("root")!;
// Remove the inline boot skeleton injected in index.html so React owns the tree
const boot = document.getElementById("ks-boot");
if (boot) boot.remove();

createRoot(rootEl).render(<App />);
