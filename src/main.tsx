
  import { createRoot } from "react-dom/client";
  import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
  import App from "./app/App";
  import HomePage from "./app/home/HomePage";
  import "./styles/index.css";

  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/trife" element={<HomePage />} />
        <Route path="/trife/visual-metronome" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>,
  );
