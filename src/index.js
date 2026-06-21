import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./styling/index.css";
import App from "./App";
import PlausiblePageview from "./components/PlausiblePageview";
import { BrowserRouter } from "react-router-dom";
import { DataProvider } from "./DataContext";


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
