import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { productsApi } from "@/api";
import {
  PageHeader, Button, Table, Badge, Modal, Input, Select, Textarea,
  SearchBar, Pagination, Confirm, Empty, Spinner,
} from "@/components/ui";
import { fmtDate, getErrMsg } from "@/utils";

const UNITS = ["PIECE","KG","GRAM","LITER","ML","BOX","METER","CM","DOZEN","PACK"];

function ProductForm({ product, categories, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: product || { unitOfMeasure: "PIECE", minStockLevel: 0 },
  });

  const mut = useMutation(
    (d) => isEdit ? productsApi.update(product.id, d) : productsApi.create(d),
    {
      onSuccess: () => {
        toast.success(isEdit ? "Product updated." : "Product created.");
        qc.invalidateQueries("products");
        onClose();
      },
      onError: (e) => toast.error(getErrMsg(e)),
    }
  );

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Product name" error={errors.name?.message}
            {...register("name", { required: "Required" })} />
        </div>
        {!isEdit && (
          <div className="col-span-2">
            <Input label="SKU / Code" error={errors.sku?.message}
              {...register("sku", { required: "Required" })} />
          </div>
        )}
        <Select label="Category" {...register("categoryId", { required: true })}>
          <option value="">Select…</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Unit of measure" {...register("unitOfMeasure")}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
        <Input label="Min stock level" type="number" step="0.01" {...register("minStockLevel")} />
        {!isEdit && (
          <Input label="Initial stock (optional)" type="number" step="0.01" {...register("initialStock")} />
        )}
      </div>
      <Textarea label="Description" {...register("description")} />
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(null); // null | "create" | product
  const [delTarget, setDel]   = useState(null);

  const { data, isLoading } = useQuery(
    ["products", page, search],
    () => productsApi.list({ page, limit: 20, search }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const { data: catData } = useQuery("categories", () =>
    productsApi.categories().then((r) => r.data.data)
  );

  const delMut = useMutation((id) => productsApi.delete(id), {
    onSuccess: () => { toast.success("Product deactivated."); qc.invalidateQueries("products"); setDel(null); },
    onError:   (e) => toast.error(getErrMsg(e)),
  });

  const cols = [
    { key: "name", label: "Product", render: (r) => (
      <div>
        <p className="font-medium text-sm">{r.name}</p>
        <p className="text-xs text-white/30 font-mono">{r.sku}</p>
      </div>
    )},
    { key: "category", label: "Category", render: (r) => r.category?.name ?? "—" },
    { key: "unitOfMeasure", label: "Unit" },
    { key: "stock", label: "Total stock", render: (r) => {
      const total = r.stockItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
      const low   = total <= r.minStockLevel;
      return <span className={low && total > 0 ? "text-amber-400" : total === 0 ? "text-red-400" : "text-accent"}>{total}</span>;
    }},
    { key: "isActive", label: "Status", render: (r) => (
      <Badge status={r.isActive ? "DONE" : "CANCELED"}>{r.isActive ? "Active" : "Inactive"}</Badge>
    )},
    { key: "createdAt", label: "Created", render: (r) => fmtDate(r.createdAt) },
    { key: "actions", label: "", render: (r) => (
      <div className="flex gap-1 justify-end">
        <Button variant="ghost" size="sm" onClick={() => setModal(r)}><Pencil size={13} /></Button>
        <Button variant="ghost" size="sm" onClick={() => setDel(r)}><Trash2 size={13} className="text-red-400" /></Button>
      </div>
    ), cellClass: "text-right" },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        sub="Manage your product catalog"
        actions={
          <>
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search SKU or name…" />
            <Button variant="primary" onClick={() => setModal("create")}><Plus size={14} /> New product</Button>
          </>
        }
      />

      <div className="card">
        <Table columns={cols} data={data?.data} loading={isLoading} emptyMsg="No products found." />
        <Pagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "New product" : "Edit product"}
        width="max-w-xl"
      >
        {modal && (
          <ProductForm
            product={modal === "create" ? null : modal}
            categories={catData}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>

      <Confirm
        open={!!delTarget}
        onClose={() => setDel(null)}
        onConfirm={() => delMut.mutate(delTarget?.id)}
        loading={delMut.isLoading}
        title="Deactivate product"
        message={`Are you sure you want to deactivate "${delTarget?.name}"?`}
      />
    </div>
  );
}
