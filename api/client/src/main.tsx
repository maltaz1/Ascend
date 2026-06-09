import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { seedDemoData } from "./lib/seedData";

// Populate with demo data on first load
seedDemoData();

createRoot(document.getElementById("root")!).render(<App />);
