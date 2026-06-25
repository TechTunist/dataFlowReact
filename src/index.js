import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./styling/index.css";
import "./styling/mobile.css";
import App from "./App";
import PlausiblePageview from "./components/PlausiblePageview";
import { BrowserRouter } from "react-router-dom";
import { DataProvider } from "./DataContext";
import { registerAppRecovery } from "./utils/registerAppRecovery";

registerAppRecovery();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <DataProvider>
    <HelmetProvider>
      <React.StrictMode>
        <BrowserRouter>
          <PlausiblePageview />
          <App />
        </BrowserRouter>
      </React.StrictMode>
    </HelmetProvider>
  </DataProvider>
);
