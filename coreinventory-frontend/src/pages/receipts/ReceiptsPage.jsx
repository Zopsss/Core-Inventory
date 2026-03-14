import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Trash2, CheckCircle, XCircle, ArrowDownToLine } from "lucide-react";
import { receiptsApi, productsApi, warehousesApi } from "@/api";
import {
  PageHeader, Button, Table, Badge, Modal, Input, Select,
  Textarea, SearchBar, Pagination, Confirm, Empty, Spinner,
} from "@/components/ui";
import { fmtDate, fmtDateTime, getErrMsg } from "@/utils";

const STATUS_OPTS = ["", "DRAFT", "WAITING", "READY", "DONE", "CANCELED"];

function CreateReceiptModal({ onClose }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { lines: [{ productId: "", expectedQty: "", unitCost: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const { data: suppliers } = useQuery("suppliers", () => receiptsApi.suppliers().then((r) => r.data.data));
  const { data: products }  = useQuery("products-all", () => productsApi.list({ limit: 200 }).then((r) => r.data.data));

  const mut = useMutation((d) => receiptsApi.create(d), {
    onSuccess: () => { toast.success("Receipt created."); qc.invalidateQueries("receipts"); onClose(); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <Select label="Supplier" {...register("supplierId", { required: true })}>
        <option value="">Select supplier…</option>
        {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      <Textarea label="Notes (optional)" {...register("notes")} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Product lines</label>
          <Button type="button" variant="ghost" size="sm" onClick={() => append({ productId: "", expectedQty: "", unitCost: "" })}>
            <Plus size={12} /> Add line
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <select className="input text-sm" {...register(`lines.${i}.productId`, { required: true })}>
                  <option value="">Product…</option>
                  {products?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <input className="input text-sm" type="number" placeholder="Qty" step="0.01"
                  {...register(`lines.${i}.expectedQty`, { required: true, min: 0.01 })} />
              </div>
              <div className="col-span-3">
                <input className="input text-sm" type="number" placeholder="Unit cost" step="0.01"
                  {...register(`lines.${i}.unitCost`)} />
              </div>
              <div className="col-span-1 flex justify-center">
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="text-white/30 hover:text-red-400 transition-colors">
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
        <Button variant="primary" type="submit" loading={mut.isLoading}>Create receipt</Button>
      </div>
    </form>
  );
}

function ValidateModal({ receipt, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm();
  const { data: warehouses } = useQuery("warehouses", () => warehousesApi.list().then((r) => r.data.data));

  const mut = useMutation((d) => receiptsApi.validate(receipt.id, d), {
    onSuccess: () => { toast.success("Receipt validated. Stock updated."); qc.invalidateQueries("receipts"); onClose(); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <div className="card-elevated p-4 space-y-1">
        <p className="text-xs text-white/40">Validating receipt</p>
        <p className="font-mono text-sm text-accent">{receipt.reference}</p>
        <p className="text-sm text-white/60">{receipt.lines?.length} line(s) · {receipt.supplier?.name}</p>
      </div>
      <Select label="Destination warehouse" {...register("warehouseId", { required: true })}>
        <option value="">Select warehouse…</option>
        {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </Select>
      <p className="text-xs text-white/30">Stock will increase automatically after validation.</p>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>
          <CheckCircle size={14} /> Validate & increase stock
        </Button>
      </div>
    </form>
  );
}

export default function ReceiptsPage() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal]   = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading } = useQuery(
    ["receipts", page, search, status],
    () => receiptsApi.list({ page, limit: 20, search, status }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const cancelMut = useMutation((id) => receiptsApi.cancel(id), {
    onSuccess: () => { toast.success("Receipt canceled."); qc.invalidateQueries("receipts"); setCancelTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  const cols = [
    { key: "reference", label: "Reference", render: (r) => (
      <span className="font-mono text-xs text-accent">{r.reference}</span>
    )},
    { key: "supplier",  label: "Supplier", render: (r) => r.supplier?.name ?? "—" },
    { key: "lines",     label: "Lines", render: (r) => r.lines?.length ?? 0 },
    { key: "status",    label: "Status", render: (r) => <Badge status={r.status} /> },
    { key: "createdAt", label: "Created", render: (r) => fmtDate(r.createdAt) },
    { key: "validatedAt", label: "Validated", render: (r) => fmtDate(r.validatedAt) },
    { key: "actions", label: "", cellClass: "text-right", render: (r) => (
      <div className="flex gap-1 justify-end">
        {["DRAFT","WAITING","READY"].includes(r.status) && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setModal({ type: "validate", receipt: r })}>
              <CheckCircle size={13} className="text-accent" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(r)}>
              <XCircle size={13} className="text-red-400" />
            </Button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Receipts"
        sub="Incoming goods from suppliers"
        actions={
          <div className="flex gap-2 items-center">
            <select className="input text-sm py-1.5 w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
            </select>
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search reference…" />
            <Button variant="primary" onClick={() => setModal({ type: "create" })}>
              <Plus size={14} /> New receipt
            </Button>
          </div>
        }
      />

      <div className="card">
        <Table columns={cols} data={data?.data} loading={isLoading} emptyMsg="No receipts found." />
        <Pagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
      </div>

      <Modal open={modal?.type === "create"} onClose={() => setModal(null)} title="New receipt" width="max-w-2xl">
        <CreateReceiptModal onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === "validate"} onClose={() => setModal(null)} title="Validate receipt">
        {modal?.receipt && <ValidateModal receipt={modal.receipt} onClose={() => setModal(null)} />}
      </Modal>
      <Confirm
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMut.mutate(cancelTarget?.id)}
        loading={cancelMut.isLoading}
        title="Cancel receipt"
        message={`Cancel receipt "${cancelTarget?.reference}"? This cannot be undone.`}
      />
    </div>
  );
}
