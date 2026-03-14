import { useAtomValue } from "jotai";
import { Navigate, Outlet } from "react-router-dom";
import { isAuthAtom } from "@/atoms";

export default function AuthGuard() {
  const isAuth = useAtomValue(isAuthAtom);
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
