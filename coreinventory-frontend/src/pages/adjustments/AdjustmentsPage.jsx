import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { adjustmentsApi, productsApi, warehousesApi } from "@/api";
import {
  PageHeader, Button, Table, Badge, Modal, Input, Select,
  Textarea, SearchBar, Pagination, Confirm,
} from "@/components/ui";
import { fmtDate, getErrMsg } from "@/utils";

const REASONS = ["CORRECTION","DAMAGED","LOST","FOUND","EXPIRED","OTHER"];
const STATUS_OPTS = ["", "DRAFT", "WAITING", "READY", "DONE", "CANCELED"];

function CreateAdjustmentModal({ onClose }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit } = useForm({
    defaultValues: { lines: [{ productId: "", warehouseId: "", countedQty: "", reason: "CORRECTION" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const { data: products }   = useQuery("products-all", () => productsApi.list({ limit: 200 }).then((r) => r.data.data));
  const { data: warehouses } = useQuery("warehouses",   () => warehousesApi.list().then((r) => r.data.data));

  const mut = useMutation((d) => adjustmentsApi.create(d), {
    onSuccess: () => { toast.success("Adjustment created."); qc.invalidateQueries("adjustments"); onClose(); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <Textarea label="Notes (optional)" {...register("notes")} />
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Adjustment lines</label>
          <Button type="button" variant="ghost" size="sm"
            onClick={() => append({ productId: "", warehouseId: "", countedQty: "", reason: "CORRECTION" })}>
            <Plus size={12} /> Add line
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <select className="input text-sm" {...register(`lines.${i}.productId`, { required: true })}>
                  <option value="">Product…</option>
                  {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <select className="input text-sm" {...register(`lines.${i}.warehouseId`, { required: true })}>
                  <option value="">Warehouse…</option>
                  {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input className="input text-sm" type="number" placeholder="Counted qty" step="0.01" min="0"
                  {...register(`lines.${i}.countedQty`, { required: true, min: 0 })} />
              </div>
              <div className="col-span-2">
                <select className="input text-sm" {...register(`lines.${i}.reason`)}>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-1 flex justify-center">
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="text-white/30 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 mt-2">
          System will automatically calculate the difference against current stock.
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>Create adjustment</Button>
      </div>
    </form>
  );
}

export default function AdjustmentsPage() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal]   = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  const { data, isLoading } = useQuery(
    ["adjustments", page, search, status],
    () => adjustmentsApi.list({ page, limit: 20, search, status }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const validateMut = useMutation((id) => adjustmentsApi.validate(id), {
    onSuccess: () => { toast.success("Adjustment validated. Stock corrected."); qc.invalidateQueries("adjustments"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });
  const cancelMut = useMutation((id) => adjustmentsApi.cancel(id), {
    onSuccess: () => { toast.success("Adjustment canceled."); qc.invalidateQueries("adjustments"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  const cols = [
    { key: "reference", label: "Reference", render: (r) => (
      <span className="font-mono text-xs text-accent">{r.reference}</span>
    )},
    { key: "lines", label: "Lines", render: (r) => r.lines?.length ?? 0 },
    { key: "diff",  label: "Net diff", render: (r) => {
      const total = r.lines?.reduce((s, l) => s + (l.difference ?? 0), 0) ?? 0;
      return (
        <span className={`font-mono text-sm ${total > 0 ? "text-accent" : total < 0 ? "text-red-400" : "text-white/40"}`}>
          {total > 0 ? "+" : ""}{total}
        </span>
      );
    }},
    { key: "status", label: "Status", render: (r) => <Badge status={r.status} /> },
    { key: "createdBy", label: "Created by", render: (r) => r.createdBy?.name ?? "—" },
    { key: "createdAt",  label: "Date", render: (r) => fmtDate(r.createdAt) },
    { key: "validatedAt", label: "Validated", render: (r) => fmtDate(r.validatedAt) },
    { key: "actions", label: "", cellClass: "text-right", render: (r) => (
      <div className="flex gap-1 justify-end">
        {!["DONE","CANCELED"].includes(r.status) && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setActionTarget({ type: "validate", item: r })}>
              <CheckCircle size={13} className="text-accent" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setActionTarget({ type: "cancel", item: r })}>
              <XCircle size={13} className="text-red-400" />
            </Button>
          </>
        )}
      </div>
    )},
  ];

  const confirmProps = {
    validate: {
      title: "Validate adjustment",
      message: "Apply stock corrections to the system? This cannot be undone.",
      onConfirm: () => validateMut.mutate(actionTarget?.item?.id),
      loading: validateMut.isLoading,
    },
    cancel: {
      title: "Cancel adjustment",
      message: "Cancel this adjustment?",
      onConfirm: () => cancelMut.mutate(actionTarget?.item?.id),
      loading: cancelMut.isLoading,
    },
  }[actionTarget?.type] || {};

  return (
    <div>
      <PageHeader
        title="Stock adjustments"
        sub="Fix mismatches between physical count and system stock"
        actions={
          <div className="flex gap-2 items-center">
            <select className="input text-sm py-1.5 w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
            </select>
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search reference…" />
            <Button variant="primary" onClick={() => setModal("create")}>
              <Plus size={14} /> New adjustment
            </Button>
          </div>
        }
      />

      <div className="card">
        <Table columns={cols} data={data?.data} loading={isLoading} emptyMsg="No adjustments found." />
        <Pagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="New stock adjustment" width="max-w-3xl">
        <CreateAdjustmentModal onClose={() => setModal(null)} />
      </Modal>

      <Confirm open={!!actionTarget} onClose={() => setActionTarget(null)} {...confirmProps} />
    </div>
  );
}
