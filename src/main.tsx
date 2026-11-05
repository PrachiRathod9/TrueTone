import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "./routes/index";
import "./styles.css";

const queryClient = new QueryClient();
const Component = Route.options.component;

if (!Component) {
  throw new Error("TrueTone root component not found in routes/index");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>
  </React.StrictMode>
);
