import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Trash2, CheckCircle, XCircle, ArrowLeftRight } from "lucide-react";
import { transfersApi, productsApi, warehousesApi } from "@/api";
import {
  PageHeader, Button, Table, Badge, Modal, Input, Select,
  Textarea, SearchBar, Pagination, Confirm,
} from "@/components/ui";
import { fmtDate, fmtDateTime, getErrMsg } from "@/utils";

const STATUS_OPTS = ["", "DRAFT", "WAITING", "READY", "DONE", "CANCELED"];

function CreateTransferModal({ onClose }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: { lines: [{ productId: "", quantity: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const { data: products }   = useQuery("products-all", () => productsApi.list({ limit: 200 }).then((r) => r.data.data));
  const { data: warehouses } = useQuery("warehouses",   () => warehousesApi.list().then((r) => r.data.data));

  const srcWarehouseId = watch("sourceWarehouseId");
  const { data: srcLocs } = useQuery(
    ["locations", srcWarehouseId],
    () => warehousesApi.locations(srcWarehouseId).then((r) => r.data.data),
    { enabled: !!srcWarehouseId }
  );
  const dstWarehouseId = watch("destWarehouseId");
  const { data: dstLocs } = useQuery(
    ["locations", dstWarehouseId],
    () => warehousesApi.locations(dstWarehouseId).then((r) => r.data.data),
    { enabled: !!dstWarehouseId }
  );

  const mut = useMutation((d) => transfersApi.create(d), {
    onSuccess: () => { toast.success("Transfer created."); qc.invalidateQueries("transfers"); onClose(); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Select label="Source warehouse" {...register("sourceWarehouseId", { required: true })}>
            <option value="">Select…</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
        <div>
          <Select label="Source location (optional)" {...register("sourceLocationId")}>
            <option value="">Any location</option>
            {srcLocs?.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
          </Select>
        </div>
        <div>
          <Select label="Destination warehouse" {...register("destWarehouseId", { required: true })}>
            <option value="">Select…</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
        <div>
          <Select label="Destination location (optional)" {...register("destLocationId")}>
            <option value="">Any location</option>
            {dstLocs?.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
          </Select>
        </div>
        <div className="col-span-2">
          <Input label="Scheduled date (optional)" type="datetime-local" {...register("scheduledAt")} />
        </div>
      </div>
      <Textarea label="Notes (optional)" {...register("notes")} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Products to transfer</label>
          <Button type="button" variant="ghost" size="sm" onClick={() => append({ productId: "", quantity: "" })}>
            <Plus size={12} /> Add line
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-8">
                <select className="input text-sm" {...register(`lines.${i}.productId`, { required: true })}>
                  <option value="">Select product…</option>
                  {products?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <input className="input text-sm" type="number" placeholder="Qty" step="0.01"
                  {...register(`lines.${i}.quantity`, { required: true, min: 0.01 })} />
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
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>Create transfer</Button>
      </div>
    </form>
  );
}

export default function TransfersPage() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal]   = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  const { data, isLoading } = useQuery(
    ["transfers", page, search, status],
    () => transfersApi.list({ page, limit: 20, search, status }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const validateMut = useMutation((id) => transfersApi.validate(id), {
    onSuccess: () => { toast.success("Transfer completed. Stock moved."); qc.invalidateQueries("transfers"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });
  const cancelMut = useMutation((id) => transfersApi.cancel(id), {
    onSuccess: () => { toast.success("Transfer canceled."); qc.invalidateQueries("transfers"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  const cols = [
    { key: "reference", label: "Reference", render: (r) => (
      <span className="font-mono text-xs text-accent">{r.reference}</span>
    )},
    { key: "route", label: "Route", render: (r) => (
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-white/70">{r.sourceWarehouse?.name}</span>
        <ArrowLeftRight size={11} className="text-white/30 flex-shrink-0" />
        <span className="text-white/70">{r.destWarehouse?.name}</span>
      </div>
    )},
    { key: "lines", label: "Lines", render: (r) => r.lines?.length ?? 0 },
    { key: "status", label: "Status", render: (r) => <Badge status={r.status} /> },
    { key: "scheduledAt", label: "Scheduled", render: (r) => fmtDate(r.scheduledAt) },
    { key: "createdAt",   label: "Created",   render: (r) => fmtDate(r.createdAt)   },
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
    validate: { title: "Complete transfer", message: "Move stock between locations now?", onConfirm: () => validateMut.mutate(actionTarget?.item?.id), loading: validateMut.isLoading },
    cancel:   { title: "Cancel transfer",   message: "Cancel this transfer?",            onConfirm: () => cancelMut.mutate(actionTarget?.item?.id),   loading: cancelMut.isLoading  },
  }[actionTarget?.type] || {};

  return (
    <div>
      <PageHeader
        title="Internal transfers"
        sub="Move stock between warehouses and locations"
        actions={
          <div className="flex gap-2 items-center">
            <select className="input text-sm py-1.5 w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
            </select>
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search reference…" />
            <Button variant="primary" onClick={() => setModal("create")}>
              <Plus size={14} /> New transfer
            </Button>
          </div>
        }
      />

      <div className="card">
        <Table columns={cols} data={data?.data} loading={isLoading} emptyMsg="No transfers found." />
        <Pagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="New internal transfer" width="max-w-2xl">
        <CreateTransferModal onClose={() => setModal(null)} />
      </Modal>

      <Confirm open={!!actionTarget} onClose={() => setActionTarget(null)} {...confirmProps} />
    </div>
  );
}
