import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export const cn = (...inputs) => twMerge(clsx(inputs));

export const fmtDate = (d) => d ? format(new Date(d), "dd MMM yyyy") : "—";
export const fmtDateTime = (d) => d ? format(new Date(d), "dd MMM yyyy, HH:mm") : "—";
export const fmtRelative = (d) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "—";
export const fmtQty = (n, unit = "") => `${Number(n ?? 0).toLocaleString()}${unit ? " " + unit : ""}`;

export const STATUS_COLOR = {
  DRAFT:    "bg-white/5 text-white/40 border border-white/10",
  WAITING:  "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  READY:    "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  DONE:     "bg-accent-subtle text-accent border border-accent-subtle",
  CANCELED: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export const STATUS_LABEL = {
  DRAFT: "Draft", WAITING: "Waiting", READY: "Ready", DONE: "Done", CANCELED: "Canceled",
};

export const ROLE_COLOR = {
  ADMIN:               "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  INVENTORY_MANAGER:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  WAREHOUSE_STAFF:     "bg-white/5 text-white/50 border border-white/10",
};

export const getErrMsg = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong.";
