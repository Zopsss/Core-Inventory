import { useState } from "react";
import { useQuery } from "react-query";
import { ScrollText, TrendingUp, TrendingDown } from "lucide-react";
import { ledgerApi, productsApi, warehousesApi } from "@/api";
import {
  PageHeader, Table, Badge, SearchBar, Pagination, StatCard, Spinner,
} from "@/components/ui";
import { fmtDateTime, fmtQty } from "@/utils";

const REF_TYPES = ["", "RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"];

const TYPE_STYLE = {
  RECEIPT:    "bg-accent-subtle text-accent border border-accent-subtle",
  DELIVERY:   "bg-red-500/10 text-red-400 border border-red-500/20",
  INTERNAL:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  ADJUSTMENT: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export default function LedgerPage() {
  const [page, setPage]         = useState(1);
  const [refType, setRefType]   = useState("");
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const { data, isLoading } = useQuery(
    ["ledger", page, refType, productId, warehouseId],
    () => ledgerApi.list({ page, limit: 30, referenceType: refType, productId, warehouseId }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const { data: summary } = useQuery("ledger-summary", () =>
    ledgerApi.summary().then((r) => r.data.data)
  );

  const { data: products }   = useQuery("products-all",  () => productsApi.list({ limit: 200 }).then((r) => r.data.data));
  const { data: warehouses } = useQuery("warehouses",    () => warehousesApi.list().then((r) => r.data.data));

  const totalIn  = data?.data?.filter((e) => e.quantityChange > 0).reduce((s, e) => s + e.quantityChange, 0) ?? 0;
  const totalOut = data?.data?.filter((e) => e.quantityChange < 0).reduce((s, e) => s + e.quantityChange, 0) ?? 0;

  const cols = [
    { key: "createdAt", label: "Date/Time", render: (r) => (
      <span className="text-xs font-mono text-white/50">{fmtDateTime(r.createdAt)}</span>
    )},
    { key: "referenceType", label: "Type", render: (r) => (
      <span className={`badge text-xs ${TYPE_STYLE[r.referenceType] || "bg-white/5 text-white/50"}`}>
        {r.referenceType}
      </span>
    )},
    { key: "product", label: "Product", render: (r) => (
      <div>
        <p className="text-sm">{r.product?.name ?? "—"}</p>
        <p className="text-xs font-mono text-white/30">{r.product?.sku}</p>
      </div>
    )},
    { key: "warehouse", label: "Warehouse", render: (r) => r.warehouse?.name ?? "—" },
    { key: "quantityChange", label: "Change", render: (r) => (
      <span className={`font-mono font-medium ${r.quantityChange > 0 ? "text-accent" : "text-red-400"}`}>
        {r.quantityChange > 0 ? "+" : ""}{fmtQty(r.quantityChange)}
      </span>
    )},
    { key: "quantityAfter", label: "Balance after", render: (r) => (
      <span className="font-mono text-white/60">{fmtQty(r.quantityAfter)}</span>
    )},
    { key: "notes", label: "Notes", render: (r) => (
      <span className="text-xs text-white/30 truncate max-w-xs block">{r.notes ?? "—"}</span>
    )},
    { key: "referenceId", label: "Ref ID", render: (r) => (
      <span className="font-mono text-xs text-white/30">{r.referenceId?.slice(0, 8)}…</span>
    )},
  ];

  return (
    <div>
      <PageHeader title="Move history" sub="Complete stock movement audit trail" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total entries"  value={data?.pagination?.total ?? "—"} icon={ScrollText} />
        <StatCard label="Page stock in"  value={`+${fmtQty(totalIn)}`}          icon={TrendingUp}  accent />
        <StatCard label="Page stock out" value={fmtQty(totalOut)}               icon={TrendingDown} />
        <StatCard label="Low stock items" value={summary?.filter((p) => p.isLowStock).length ?? "—"} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="input text-sm py-1.5 w-40" value={refType} onChange={(e) => { setRefType(e.target.value); setPage(1); }}>
          {REF_TYPES.map((t) => <option key={t} value={t}>{t || "All types"}</option>)}
        </select>
        <select className="input text-sm py-1.5 w-48" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1); }}>
          <option value="">All products</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input text-sm py-1.5 w-44" value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}>
          <option value="">All warehouses</option>
          {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      <div className="card">
        <Table columns={cols} data={data?.data} loading={isLoading} emptyMsg="No ledger entries found." />
        <Pagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
