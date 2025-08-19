import React from "react";
import ReactDOM from "react-dom/client";
import "./styling/index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { DataProvider } from "./DataContext";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <DataProvider>
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  </DataProvider>
);
