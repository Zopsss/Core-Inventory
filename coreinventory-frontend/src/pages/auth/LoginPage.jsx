import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSetAtom } from "jotai";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Package, ArrowRight } from "lucide-react";
import { tokenAtom, userAtom } from "@/atoms";
import { authApi } from "@/api";
import { Button, Input } from "@/components/ui";
import { getErrMsg } from "@/utils";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const setToken = useSetAtom(tokenAtom);
  const setUser = useSetAtom(userAtom);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      console.log(res);
      setToken(res.data.data.token);
      setUser(res.data.data.user);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-surface-900 border-r border-white/6 p-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <Package size={16} className="text-ink" />
          </div>
          <span className="font-display font-700 text-base tracking-tight">
            CoreInventory
          </span>
        </div>
        <div>
          <p className="font-display font-700 text-4xl leading-tight mb-4">
            Stock operations,
            <br />
            <span className="text-accent">centralized.</span>
          </p>
          <p className="text-sm text-white/40 leading-relaxed">
            Real-time inventory management across warehouses, with full audit
            trails and zero spreadsheets.
          </p>
        </div>
        <div className="space-y-3">
          {[
            "Receipts & deliveries",
            "Internal transfers",
            "Stock adjustments",
            "Move history ledger",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-sm text-white/40"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
              <Package size={14} className="text-ink" />
            </div>
            <span className="font-display font-700 text-sm">CoreInventory</span>
          </div>

          <h1 className="font-display font-700 text-2xl mb-1">Sign in</h1>
          <p className="text-sm text-white/40 mb-8">
            Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              error={errors.email?.message}
              {...register("email", { required: "Email is required" })}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password", { required: "Password is required" })}
            />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-white/40 hover:text-accent transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full justify-center mt-2"
            >
              Sign in <ArrowRight size={14} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
