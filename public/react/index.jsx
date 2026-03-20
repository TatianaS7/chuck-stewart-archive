import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { AppProvider } from "./components/AppContext";

const root = createRoot(document.getElementById('root'));
root.render(
    <AppProvider>
        <App />
    </AppProvider>
);