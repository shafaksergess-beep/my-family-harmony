import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import "./lib/median"; // Initialize global isMedianApp

createRoot(document.getElementById("root")!).render(<App />);
