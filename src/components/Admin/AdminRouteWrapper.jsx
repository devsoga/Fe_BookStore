import React from "react";
import { useLocation } from "react-router-dom";
import { AdminLanguageProvider } from "~/i18n/AdminLanguageProvider";

const AdminRouteWrapper = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <AdminLanguageProvider>{children}</AdminLanguageProvider>;
  }

  return children;
};

export default AdminRouteWrapper;
