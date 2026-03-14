import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, KeyRound, UserCog } from "lucide-react";
import { usersApi } from "@/api";
import {
  PageHeader,
  Button,
  Table,
  Modal,
  Input,
  Select,
  SearchBar,
  Pagination,
  Confirm,
  Badge,
} from "@/components/ui";
import { fmtDate, ROLE_COLOR, getErrMsg } from "@/utils";

const ROLES = ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"];

function UserForm({ user, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: user
      ? { name: user.name, role: user.role, isActive: user.isActive }
      : { role: "WAREHOUSE_STAFF" },
  });

  const mut = useMutation(
    (d) => (isEdit ? usersApi.update(user.id, d) : usersApi.create(d)),
    {
      onSuccess: () => {
        toast.success(isEdit ? "User updated." : "User created.");
        qc.invalidateQueries("users");
        onClose();
      },
      onError: (e) => toast.error(getErrMsg(e)),
    }
  );

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <Input
        label="Full name"
        error={errors.name?.message}
        {...register("name", { required: "Required" })}
      />
      {!isEdit && (
        <>
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email", { required: "Required" })}
          />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register("password", {
              required: "Required",
              minLength: { value: 8, message: "Min 8 characters" },
            })}
          />
        </>
      )}
      <Select label="Role" {...register("role")}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.replace("_", " ")}
          </option>
        ))}
      </Select>
      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            {...register("isActive")}
            className="accent-accent w-4 h-4"
          />
          <label
            htmlFor="isActive"
            className="text-sm text-white/70 cursor-pointer"
          >
            Active
          </label>
        </div>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>
          {isEdit ? "Save changes" : "Create user"}
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm();
  const mut = useMutation((d) => usersApi.resetPassword(user.id, d), {
    onSuccess: () => {
      toast.success("Password reset.");
      onClose();
    },
    onError: (e) => toast.error(getErrMsg(e)),
  });
  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <div className="card-elevated p-3 text-sm text-white/60">
        Resetting password for{" "}
        <span className="text-white font-medium">{user.name}</span>
      </div>
      <Input
        label="New password"
        type="password"
        {...register("newPassword", { required: true, minLength: 8 })}
      />
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={mut.isLoading}>
          Reset password
        </Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [delTarget, setDel] = useState(null);

  const { data, isLoading } = useQuery(
    ["users", page, search],
    () => usersApi.list({ page, limit: 20, search }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const delMut = useMutation((id) => usersApi.delete(id), {
    onSuccess: () => {
      toast.success("User deactivated.");
      qc.invalidateQueries("users");
      setDel(null);
    },
    onError: (e) => toast.error(getErrMsg(e)),
  });

  const cols = [
    {
      key: "name",
      label: "Name",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0">
            {r.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{r.name}</p>
            <p className="text-xs text-white/30">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (r) => (
        <span
          className={`badge ${
            ROLE_COLOR[r.role] || "bg-white/5 text-white/50"
          }`}
        >
          {r.role?.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (r) => (
        <Badge status={r.isActive ? "DONE" : "CANCELED"}>
          {r.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    { key: "createdAt", label: "Joined", render: (r) => fmtDate(r.createdAt) },
    {
      key: "actions",
      label: "",
      cellClass: "text-right",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModal({ type: "edit", user: r })}
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModal({ type: "resetPw", user: r })}
          >
            <KeyRound size={13} className="text-amber-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDel(r)}>
            <Trash2 size={13} className="text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        sub="Manage team members and roles"
        actions={
          <div className="flex gap-2 items-center">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name or email…"
            />
            <Button
              variant="primary"
              onClick={() => setModal({ type: "create" })}
            >
              <Plus size={14} /> New user
            </Button>
          </div>
        }
      />

      <div className="card">
        <Table
          columns={cols}
          data={data?.data}
          loading={isLoading}
          emptyMsg="No users found."
        />
        <Pagination
          page={page}
          totalPages={data?.pagination?.totalPages}
          onChange={setPage}
        />
      </div>

      <Modal
        open={modal?.type === "create" || modal?.type === "edit"}
        onClose={() => setModal(null)}
        title={modal?.type === "edit" ? "Edit user" : "New user"}
      >
        {modal && <UserForm user={modal.user} onClose={() => setModal(null)} />}
      </Modal>

      <Modal
        open={modal?.type === "resetPw"}
        onClose={() => setModal(null)}
        title="Reset password"
      >
        {modal?.user && (
          <ResetPasswordModal
            user={modal.user}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>

      <Confirm
        open={!!delTarget}
        onClose={() => setDel(null)}
        onConfirm={() => delMut.mutate(delTarget?.id)}
        loading={delMut.isLoading}
        title="Deactivate user"
        message={`Deactivate "${delTarget?.name}"? They will lose access immediately.`}
      />
    </div>
  );
}
