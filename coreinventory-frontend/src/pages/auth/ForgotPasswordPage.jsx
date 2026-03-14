import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Package, ArrowLeft } from "lucide-react";
import { authApi } from "@/api";
import { Button, Input } from "@/components/ui";
import { getErrMsg } from "@/utils";

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data);
      setSent(true);
      toast.success("OTP sent to your email.");
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
            <Package size={14} className="text-ink" />
          </div>
          <span className="font-display font-700 text-sm">CoreInventory</span>
        </div>
        {!sent ? (
          <>
            <h1 className="font-display font-700 text-2xl mb-1">Reset password</h1>
            <p className="text-sm text-white/40 mb-8">We'll send an OTP to your email.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Email" type="email" placeholder="you@company.com" {...register("email", { required: true })} />
              <Button type="submit" variant="primary" loading={loading} className="w-full justify-center">Send OTP</Button>
            </form>
          </>
        ) : (
          <div className="card p-6 text-center">
            <div className="w-10 h-10 bg-accent-subtle rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-accent text-lg">✓</span>
            </div>
            <p className="font-medium mb-1">Check your email</p>
            <p className="text-sm text-white/40 mb-4">Use the OTP to reset your password.</p>
            <Link to="/reset-password" className="text-accent text-sm hover:underline">Enter OTP →</Link>
          </div>
        )}
        <Link to="/login" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white mt-6 transition-colors">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authApi.resetPassword(data);
      toast.success("Password reset successfully.");
      navigate("/login");
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slide-up">
        <h1 className="font-display font-700 text-2xl mb-1">New password</h1>
        <p className="text-sm text-white/40 mb-8">Enter your OTP and new password.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" {...register("email", { required: true })} />
          <Input label="OTP" placeholder="6-digit code" {...register("otp", { required: true })} />
          <Input label="New password" type="password" {...register("newPassword", { required: true })} />
          <Button type="submit" variant="primary" loading={loading} className="w-full justify-center">Reset password</Button>
        </form>
        <Link to="/login" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white mt-6 transition-colors">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    </div>
  );
}
