import { Routes, Route, Navigate } from "react-router-dom";
import AppShell   from "@/components/layout/AppShell";
import AuthGuard  from "@/components/layout/AuthGuard";

import LoginPage                              from "@/pages/auth/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import DashboardPage   from "@/pages/dashboard/DashboardPage";
import ProductsPage    from "@/pages/products/ProductsPage";
import WarehousesPage  from "@/pages/warehouses/WarehousesPage";
import ReceiptsPage    from "@/pages/receipts/ReceiptsPage";
import DeliveriesPage  from "@/pages/deliveries/DeliveriesPage";
import TransfersPage   from "@/pages/transfers/TransfersPage";
import AdjustmentsPage from "@/pages/adjustments/AdjustmentsPage";
import LedgerPage      from "@/pages/ledger/LedgerPage";
import UsersPage       from "@/pages/users/UsersPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/"            element={<DashboardPage />} />
          <Route path="/products"    element={<ProductsPage />} />
          <Route path="/warehouses"  element={<WarehousesPage />} />
          <Route path="/receipts"    element={<ReceiptsPage />} />
          <Route path="/deliveries"  element={<DeliveriesPage />} />
          <Route path="/transfers"   element={<TransfersPage />} />
          <Route path="/adjustments" element={<AdjustmentsPage />} />
          <Route path="/ledger"      element={<LedgerPage />} />
          <Route path="/users"       element={<UsersPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
