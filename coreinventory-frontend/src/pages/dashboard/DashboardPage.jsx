import { useQuery } from "react-query";
import { useAtomValue } from "jotai";
import {
  Package, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, AlertTriangle, TrendingDown,
} from "lucide-react";
import { dashboardApi } from "@/api";
import { dashboardWarehouseAtom } from "@/atoms";
import { StatCard, Spinner, Badge, PageHeader } from "@/components/ui";
import { fmtRelative, fmtQty } from "@/utils";

export default function DashboardPage() {
  const warehouseId = useAtomValue(dashboardWarehouseAtom);

  const { data, isLoading } = useQuery(
    ["dashboard", warehouseId],
    () => dashboardApi.get(warehouseId ? { warehouseId } : {}).then((r) => r.data.data),
    { refetchInterval: 60_000 }
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size={28} /></div>
  );

  const k = data?.kpis || {};

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        sub="Real-time inventory snapshot"
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total stock qty"  value={fmtQty(k.totalStockQuantity)}     icon={Package}          accent />
        <StatCard label="Products tracked" value={k.totalDistinctProductsInStock}   icon={Package} />
        <StatCard label="Low stock items"  value={k.lowStockCount}                  icon={TrendingDown} />
        <StatCard label="Out of stock"     value={k.outOfStockCount}                icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <StatCard label="Pending receipts"   value={k.pendingReceipts}   icon={ArrowDownToLine} />
        <StatCard label="Pending deliveries" value={k.pendingDeliveries} icon={ArrowUpFromLine} />
        <StatCard label="Scheduled transfers" value={k.scheduledTransfers} icon={ArrowLeftRight} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Low stock alerts */}
        <div className="card">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <TrendingDown size={14} className="text-amber-400" />
            <span className="text-sm font-medium">Low stock alerts</span>
            {data?.alerts?.lowStockItems?.length > 0 && (
              <span className="ml-auto badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {data.alerts.lowStockItems.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data?.alerts?.lowStockItems?.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/30">All stocked up</p>
            ) : (
              data?.alerts?.lowStockItems?.slice(0, 6).map((p) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-white/30 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-amber-400">{fmtQty(p.totalQty, p.unitOfMeasure)}</p>
                    <p className="text-xs text-white/30">min {fmtQty(p.minStockLevel)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <span className="text-sm font-medium">Recent activity</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data?.recentActivity?.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/30">No activity yet</p>
            ) : (
              data?.recentActivity?.slice(0, 8).map((e) => (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      e.quantityChange > 0 ? "bg-accent" : "bg-red-400"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-white/50 truncate">{e.referenceType} · {e.referenceId.slice(0, 8)}</p>
                      <p className="text-xs text-white/30">{fmtRelative(e.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-medium flex-shrink-0 ${
                    e.quantityChange > 0 ? "text-accent" : "text-red-400"
                  }`}>
                    {e.quantityChange > 0 ? "+" : ""}{fmtQty(e.quantityChange)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
