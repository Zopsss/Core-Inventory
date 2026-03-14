import { useAtomValue } from "jotai";
import { Navigate, Outlet } from "react-router-dom";
import { isAuthAtom } from "@/atoms";

export default function AuthGuard() {
  const isAuth = useAtomValue(isAuthAtom);
  const rawToken = localStorage.getItem("ci_token");
  const hasTokenFallback = rawToken && rawToken !== "null";

  return (isAuth || hasTokenFallback) ? <Outlet /> : <Navigate to="/login" replace />;
}
