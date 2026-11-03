import { installLogging } from "./lib/logger.js";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.scss";
import "./thesis.scss";
import "./responsive.scss";

installLogging();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
