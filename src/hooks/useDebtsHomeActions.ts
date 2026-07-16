import { useState } from "react";
import type { Person } from "@/hooks/useDashboardData";
import { PersonFormDialog, type PersonEditing } from "@/components/PersonFormDialog";

export interface PersonActionHandlers {
  editingPerson: PersonEditing | null;
  setEditingPerson: (p: PersonEditing | null) => void;
  openPerson: boolean;
  setOpenPerson: (v: boolean) => void;
  delPerson: Person | null;
  setDelPerson: (p: Person | null) => void;
  archivePerson: Person | null;
  setArchivePerson: (p: Person | null) => void;
  onEdit: (p: Person) => void;
  onArchive: (p: Person) => void;
  onDelete: (p: Person) => void;
}

export function useDebtsHomeActions(): PersonActionHandlers {
  const [editingPerson, setEditingPerson] = useState<PersonEditing | null>(null);
  const [openPerson, setOpenPerson] = useState(false);
  const [delPerson, setDelPerson] = useState<Person | null>(null);
  const [archivePerson, setArchivePerson] = useState<Person | null>(null);

  const onEdit = (p: Person) => {
    setEditingPerson({
      id: p.id,
      name: p.name,
      phone: p.phone,
      type: p.type,
      notes: p.notes ?? null,
      avatar_color: p.avatar_color,
      credit_limit: p.credit_limit ?? null,
    });
    setOpenPerson(true);
  };

  const onArchive = (p: Person) => {
    setArchivePerson(p);
  };

  const onDelete = (p: Person) => {
    setDelPerson(p);
  };

  return {
    editingPerson,
    setEditingPerson,
    openPerson,
    setOpenPerson,
    delPerson,
    setDelPerson,
    archivePerson,
    setArchivePerson,
    onEdit,
    onArchive,
    onDelete,
  };
}
