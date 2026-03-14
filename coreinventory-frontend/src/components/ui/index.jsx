import { cn, STATUS_COLOR, STATUS_LABEL } from "@/utils";
import { Loader2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { forwardRef } from "react";

// ── Badge ───────────────────────────────────────────────────────────
export const Badge = ({ status, children, className }) => (
  <span
    className={cn(
      "badge",
      STATUS_COLOR[status] || "bg-white/5 text-white/50",
      className
    )}
  >
    {children ?? STATUS_LABEL[status] ?? status}
  </span>
);

// ── Spinner ─────────────────────────────────────────────────────────
export const Spinner = ({ size = 16, className }) => (
  <Loader2 size={size} className={cn("animate-spin text-accent", className)} />
);

// ── Button ──────────────────────────────────────────────────────────
export const Button = ({
  variant = "ghost",
  size = "md",
  loading,
  children,
  className,
  ...props
}) => {
  const v =
    {
      primary: "btn-primary",
      ghost: "btn-ghost",
      danger: "btn-danger",
      outline: "btn-outline",
    }[variant] || "btn-ghost";
  const s =
    size === "sm"
      ? "text-xs px-3 py-1.5"
      : size === "lg"
      ? "text-base px-5 py-2.5"
      : "";
  return (
    <button
      className={cn(v, s, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size={14} className="text-current" />}
      {children}
    </button>
  );
};

// ── Input ───────────────────────────────────────────────────────────
export const Input = forwardRef(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="label">{label}</label>}

      <input
        ref={ref}
        {...props}
        className={cn(
          "input",
          error && "border-red-500/50 focus:border-red-500/50",
          className
        )}
      />

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
);

// ── Select ──────────────────────────────────────────────────────────
export const Select = ({ label, error, className, children, ...props }) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <select
      className={cn("input", error && "border-red-500/50", className)}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
);

// ── Textarea ─────────────────────────────────────────────────────────
export const Textarea = forwardRef(
  ({ label, error, className, rows = 3, id, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="label">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          {...props}
          className={cn(
            "input resize-none",
            error && "border-red-500/50",
            className
          )}
        />

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

// ── Modal ───────────────────────────────────────────────────────────
export const Modal = ({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-surface-900 border border-white/10 rounded-xl shadow-2xl animate-slide-up",
          width
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <h2 className="font-display font-700 text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ── Table ───────────────────────────────────────────────────────────
export const Table = ({
  columns,
  data,
  loading,
  emptyMsg = "No records found.",
}) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/6">
          {columns.map((col) => (
            <th
              key={col.key}
              className={cn(
                "px-4 py-3 text-left text-xs uppercase tracking-wider text-white/30 font-medium",
                col.className
              )}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-12 text-center">
              <Spinner size={20} className="mx-auto" />
            </td>
          </tr>
        ) : data?.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="px-4 py-12 text-center text-white/30"
            >
              {emptyMsg}
            </td>
          </tr>
        ) : (
          data?.map((row, i) => (
            <tr
              key={row.id || i}
              className="border-b border-white/4 table-row-hover"
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3", col.cellClass)}>
                  {col.render ? col.render(row) : row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ── Pagination ───────────────────────────────────────────────────────
export const Pagination = ({ page, totalPages, onChange }) => (
  <div className="flex items-center justify-between px-4 py-3 border-t border-white/6 text-xs text-white/40">
    <span>
      Page {page} of {totalPages || 1}
    </span>
    <div className="flex gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="btn-ghost px-2 py-1 text-xs disabled:opacity-30"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-ghost px-2 py-1 text-xs disabled:opacity-30"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  </div>
);

// ── SearchBar ───────────────────────────────────────────────────────
export const SearchBar = ({ value, onChange, placeholder = "Search…" }) => (
  <div className="relative">
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
    />
    <input
      className="input pl-8 pr-3 py-2 text-sm w-60"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button
        onClick={() => onChange("")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
      >
        <X size={12} />
      </button>
    )}
  </div>
);

// ── StatCard ─────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon: Icon, accent }) => (
  <div className="stat-card group">
    <div className="flex items-start justify-between">
      <span className="section-title">{label}</span>
      {Icon && (
        <span
          className={cn(
            "p-2 rounded",
            accent ? "bg-accent-subtle text-accent" : "bg-white/5 text-white/30"
          )}
        >
          <Icon size={14} />
        </span>
      )}
    </div>
    <div
      className={cn(
        "font-display font-700 text-3xl tracking-tight",
        accent ? "text-accent" : "text-white"
      )}
    >
      {value ?? "—"}
    </div>
    {sub && <p className="text-xs text-white/30">{sub}</p>}
  </div>
);

// ── Empty State ──────────────────────────────────────────────────────
export const Empty = ({ icon: Icon, title, desc, action }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
    {Icon && (
      <div className="p-4 rounded-full bg-white/5 text-white/20">
        <Icon size={28} />
      </div>
    )}
    <p className="font-medium text-white/50">{title}</p>
    {desc && <p className="text-sm text-white/30 max-w-xs">{desc}</p>}
    {action}
  </div>
);

// ── Confirm Dialog ───────────────────────────────────────────────────
export const Confirm = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading,
}) => (
  <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
    <p className="text-sm text-white/60 mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="danger" loading={loading} onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  </Modal>
);

// ── Page Header ──────────────────────────────────────────────────────
export const PageHeader = ({ title, sub, actions }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="page-title">{title}</h1>
      {sub && <p className="text-sm text-white/40 mt-0.5">{sub}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
