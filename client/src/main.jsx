import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import { AuthProvider } from "./shared/auth/AuthContext.jsx";
import { ToastProvider } from "./ui/components/ToastProvider.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
);

