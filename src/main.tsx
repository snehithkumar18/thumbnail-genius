import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore theme preference
const savedTheme = localStorage.getItem("thumbai-theme");
if (savedTheme === "light") {
  document.documentElement.classList.add("light");
}

createRoot(document.getElementById("root")!).render(<App />);
