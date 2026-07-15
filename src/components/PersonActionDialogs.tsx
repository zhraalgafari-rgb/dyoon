import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PersonFormDialog, type PersonEditing } from "@/components/PersonFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Person } from "@/hooks/useDashboardData";

export interface PersonActionDialogsProps {
  editingPerson: PersonEditing | null;
  setEditingPerson: (p: PersonEditing | null) => void;
  openPerson: boolean;
  setOpenPerson: (v: boolean) => void;
  delPerson: Person | null;
  setDelPerson: (p: Person | null) => void;
  archivePerson: Person | null;
  setArchivePerson: (p: Person | null) => void;
  refetch: () => Promise<unknown>;
}

export function PersonActionDialogs({
  editingPerson,
  setEditingPerson,
  openPerson,
  setOpenPerson,
  delPerson,
  setDelPerson,
  archivePerson,
  setArchivePerson,
  refetch,
}: PersonActionDialogsProps) {
  return (
    <>
      <PersonFormDialog
        open={openPerson}
        onOpenChange={(v) => {
          setOpenPerson(v);
          if (!v) setEditingPerson(null);
        }}
        editing={editingPerson}
        onSuccess={() => refetch()}
      />

      <ConfirmDialog
        open={!!archivePerson}
        onOpenChange={(v) => !v && setArchivePerson(null)}
        title={`أرشفة ${archivePerson?.name ?? ""}؟`}
        description="يمكن استعادته لاحقاً من صفحة الأرشيف."
        confirmLabel="أرشفة"
        onConfirm={async () => {
          if (!archivePerson) return;
          const { error } = await supabase
            .from("people")
            .update({ is_archived: true })
            .eq("id", archivePerson.id);
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("تمت الأرشفة");
          refetch();
        }}
      />

      <ConfirmDialog
        open={!!delPerson}
        onOpenChange={(v) => !v && setDelPerson(null)}
        title={`حذف ${delPerson?.name ?? ""} نهائياً؟`}
        description="لا يمكن الحذف إذا كانت لديه معاملات. استخدم الأرشفة بدلاً من ذلك."
        destructive
        confirmLabel="حذف"
        onConfirm={async () => {
          if (!delPerson) return;
          const { count } = await supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("person_id", delPerson.id);
          if ((count ?? 0) > 0) {
            toast.error("لا يمكن الحذف — لديه معاملات. استخدم الأرشفة.");
            return;
          }
          const { error } = await supabase.from("people").delete().eq("id", delPerson.id);
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("تم الحذف");
          refetch();
        }}
      />
    </>
  );
}
