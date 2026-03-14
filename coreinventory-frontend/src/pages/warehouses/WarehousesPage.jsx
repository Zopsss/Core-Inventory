import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Warehouse, MapPin, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { warehousesApi } from "@/api";
import {
  PageHeader, Button, Table, Modal, Input, Confirm,
  Empty, Spinner, PageHeader as PH,
} from "@/components/ui";
import { getErrMsg } from "@/utils";

function WarehouseForm({ warehouse, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!warehouse;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: warehouse || {},
  });
  const mut = useMutation(
    (d) => isEdit ? warehousesApi.update(warehouse.id, d) : warehousesApi.create(d),
    {
      onSuccess: () => {
        toast.success(isEdit ? "Warehouse updated." : "Warehouse created.");
        qc.invalidateQueries("warehouses");
        onClose();
      },
      onError: (e) => toast.error(getErrMsg(e)),
    }
  );
  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <Input label="Warehouse name" error={errors.name?.message}
        {...register("name", { required: "Required" })} />
      <Input label="Address (optional)" {...register("address")} />
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>
          {isEdit ? "Save changes" : "Create warehouse"}
        </Button>
      </div>
    </form>
  );
}

function LocationForm({ warehouseId, location, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!location;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: location || {},
  });
  const mut = useMutation(
    (d) => isEdit
      ? warehousesApi.updateLocation(warehouseId, location.id, d)
      : warehousesApi.createLocation(warehouseId, d),
    {
      onSuccess: () => {
        toast.success(isEdit ? "Location updated." : "Location created.");
        qc.invalidateQueries(["locations", warehouseId]);
        onClose();
      },
      onError: (e) => toast.error(getErrMsg(e)),
    }
  );
  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <Input label="Location name" error={errors.name?.message}
        {...register("name", { required: "Required" })} />
      <Input label="Code" placeholder="e.g. RACK-A1" error={errors.code?.message}
        {...register("code", { required: "Required" })} />
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>
          {isEdit ? "Save" : "Add location"}
        </Button>
      </div>
    </form>
  );
}

function WarehouseRow({ warehouse }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(null);
  const [delTarget, setDel] = useState(null);

  const { data: locations, isLoading } = useQuery(
    ["locations", warehouse.id],
    () => warehousesApi.locations(warehouse.id).then((r) => r.data.data),
    { enabled: expanded }
  );

  const delLocMut = useMutation(
    (lid) => warehousesApi.deleteLocation(warehouse.id, lid),
    {
      onSuccess: () => { toast.success("Location deactivated."); qc.invalidateQueries(["locations", warehouse.id]); setDel(null); },
      onError: (e) => toast.error(getErrMsg(e)),
    }
  );

  return (
    <div className="card mb-3 overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-2 rounded bg-white/5 text-white/40">
          <Warehouse size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{warehouse.name}</p>
          {warehouse.address && (
            <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {warehouse.address}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">
            {warehouse.locations?.length ?? 0} locations
          </span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setModal({ type: "editWarehouse" }); }}>
            <Pencil size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setModal({ type: "addLocation" }); }}>
            <Plus size={13} />
          </Button>
          {expanded ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] bg-surface-950/50">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : locations?.length === 0 ? (
            <p className="px-5 py-6 text-sm text-white/30 text-center">No locations added yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {locations?.map((loc) => (
                <div key={loc.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm">{loc.name}</span>
                    <span className="ml-2 text-xs font-mono text-white/30">{loc.code}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setModal({ type: "editLocation", location: loc })}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDel(loc)}>
                      <Trash2 size={12} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={modal?.type === "editWarehouse"} onClose={() => setModal(null)} title="Edit warehouse">
        <WarehouseForm warehouse={warehouse} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === "addLocation"} onClose={() => setModal(null)} title="Add location">
        <LocationForm warehouseId={warehouse.id} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === "editLocation"} onClose={() => setModal(null)} title="Edit location">
        {modal?.location && (
          <LocationForm warehouseId={warehouse.id} location={modal.location} onClose={() => setModal(null)} />
        )}
      </Modal>
      <Confirm
        open={!!delTarget}
        onClose={() => setDel(null)}
        onConfirm={() => delLocMut.mutate(delTarget?.id)}
        loading={delLocMut.isLoading}
        title="Deactivate location"
        message={`Deactivate location "${delTarget?.name}"?`}
      />
    </div>
  );
}

export default function WarehousesPage() {
  const [modal, setModal] = useState(false);
  const { data, isLoading } = useQuery("warehouses", () =>
    warehousesApi.list().then((r) => r.data.data)
  );

  return (
    <div>
      <PageHeader
        title="Warehouses"
        sub="Manage storage locations and racks"
        actions={
          <Button variant="primary" onClick={() => setModal(true)}>
            <Plus size={14} /> New warehouse
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : data?.length === 0 ? (
        <Empty icon={Warehouse} title="No warehouses yet" desc="Create your first warehouse to start tracking stock." />
      ) : (
        data?.map((w) => <WarehouseRow key={w.id} warehouse={w} />)
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New warehouse">
        <WarehouseForm onClose={() => setModal(false)} />
      </Modal>
    </div>
  );
}
