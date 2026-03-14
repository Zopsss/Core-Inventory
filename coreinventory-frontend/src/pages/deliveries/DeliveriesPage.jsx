import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Trash2, Package, Boxes, CheckCircle, XCircle, ArrowUpFromLine } from "lucide-react";
import { deliveriesApi, productsApi, warehousesApi } from "@/api";
import {
  PageHeader, Button, Table, Badge, Modal, Input, Select,
  Textarea, SearchBar, Pagination, Confirm, Empty,
} from "@/components/ui";
import { fmtDate, getErrMsg } from "@/utils";

const STATUS_OPTS = ["", "DRAFT", "WAITING", "READY", "DONE", "CANCELED"];

function CreateDeliveryModal({ onClose }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit } = useForm({
    defaultValues: { lines: [{ productId: "", orderedQty: "", warehouseId: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const { data: products }   = useQuery("products-all", () => productsApi.list({ limit: 200 }).then((r) => r.data.data));
  const { data: warehouses } = useQuery("warehouses", () => warehousesApi.list().then((r) => r.data.data));

  const mut = useMutation((d) => deliveriesApi.create(d), {
    onSuccess: () => { toast.success("Delivery order created."); qc.invalidateQueries("deliveries"); onClose(); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Customer name" {...register("customerName", { required: true })} />
        </div>
        <div className="col-span-2">
          <Input label="Customer email (optional)" type="email" {...register("customerEmail")} />
        </div>
      </div>
      <Textarea label="Notes (optional)" {...register("notes")} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Order lines</label>
          <Button type="button" variant="ghost" size="sm"
            onClick={() => append({ productId: "", orderedQty: "", warehouseId: "" })}>
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
              <div className="col-span-2">
                <input className="input text-sm" type="number" placeholder="Qty" step="0.01"
                  {...register(`lines.${i}.orderedQty`, { required: true, min: 0.01 })} />
              </div>
              <div className="col-span-5">
                <select className="input text-sm" {...register(`lines.${i}.warehouseId`, { required: true })}>
                  <option value="">Warehouse…</option>
                  {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
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
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>Create delivery order</Button>
      </div>
    </form>
  );
}

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal]   = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  const { data, isLoading } = useQuery(
    ["deliveries", page, search, status],
    () => deliveriesApi.list({ page, limit: 20, search, status }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const pickMut = useMutation((id) => deliveriesApi.pick(id), {
    onSuccess: () => { toast.success("Marked as picked."); qc.invalidateQueries("deliveries"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });
  const packMut = useMutation((id) => deliveriesApi.pack(id), {
    onSuccess: () => { toast.success("Marked as packed."); qc.invalidateQueries("deliveries"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });
  const validateMut = useMutation((id) => deliveriesApi.validate(id), {
    onSuccess: () => { toast.success("Delivery validated. Stock decreased."); qc.invalidateQueries("deliveries"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });
  const cancelMut = useMutation((id) => deliveriesApi.cancel(id), {
    onSuccess: () => { toast.success("Delivery canceled."); qc.invalidateQueries("deliveries"); setActionTarget(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  const cols = [
    { key: "reference", label: "Reference", render: (r) => (
      <span className="font-mono text-xs text-accent">{r.reference}</span>
    )},
    { key: "customerName", label: "Customer" },
    { key: "lines", label: "Lines", render: (r) => r.lines?.length ?? 0 },
    { key: "status", label: "Status", render: (r) => <Badge status={r.status} /> },
    { key: "createdAt", label: "Created", render: (r) => fmtDate(r.createdAt) },
    { key: "actions", label: "", cellClass: "text-right", render: (r) => (
      <div className="flex gap-1 justify-end">
        {r.status === "DRAFT" && (
          <Button variant="ghost" size="sm" onClick={() => setActionTarget({ type: "pick", item: r })}>
            <Package size={13} />
          </Button>
        )}
        {r.status === "WAITING" && (
          <Button variant="ghost" size="sm" onClick={() => setActionTarget({ type: "pack", item: r })}>
            <Boxes size={13} />
          </Button>
        )}
        {r.status === "READY" && (
          <Button variant="ghost" size="sm" onClick={() => setActionTarget({ type: "validate", item: r })}>
            <CheckCircle size={13} className="text-accent" />
          </Button>
        )}
        {!["DONE", "CANCELED"].includes(r.status) && (
          <Button variant="ghost" size="sm" onClick={() => setActionTarget({ type: "cancel", item: r })}>
            <XCircle size={13} className="text-red-400" />
          </Button>
        )}
      </div>
    )},
  ];

  const confirmProps = {
    pick:     { title: "Mark as picked",    message: "Confirm items have been picked from shelves?",   onConfirm: () => pickMut.mutate(actionTarget?.item?.id),     loading: pickMut.isLoading },
    pack:     { title: "Mark as packed",    message: "Confirm items have been packed for shipment?",   onConfirm: () => packMut.mutate(actionTarget?.item?.id),     loading: packMut.isLoading },
    validate: { title: "Validate delivery", message: "This will decrease stock. Proceed?",             onConfirm: () => validateMut.mutate(actionTarget?.item?.id), loading: validateMut.isLoading },
    cancel:   { title: "Cancel delivery",   message: "Cancel this delivery order? Cannot be undone.", onConfirm: () => cancelMut.mutate(actionTarget?.item?.id),   loading: cancelMut.isLoading },
  }[actionTarget?.type] || {};

  return (
    <div>
      <PageHeader
        title="Deliveries"
        sub="Outgoing stock to customers"
        actions={
          <div className="flex gap-2 items-center">
            <select className="input text-sm py-1.5 w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
            </select>
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search…" />
            <Button variant="primary" onClick={() => setModal("create")}>
              <Plus size={14} /> New delivery
            </Button>
          </div>
        }
      />

      <div className="card">
        <Table columns={cols} data={data?.data} loading={isLoading} emptyMsg="No delivery orders found." />
        <Pagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="New delivery order" width="max-w-2xl">
        <CreateDeliveryModal onClose={() => setModal(null)} />
      </Modal>

      <Confirm
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        {...confirmProps}
      />
    </div>
  );
}
