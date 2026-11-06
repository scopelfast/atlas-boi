"use client";

import { useState } from "react";
import type { CrudTab } from "@/components/crud/crud-page-layout";

export function useCrudPage(defaultTab: CrudTab = "lista") {
  const [tab, setTab] = useState<CrudTab>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const startNew = (resetForm: () => void) => {
    setEditing(null);
    resetForm();
    setError(null);
    setTab("dados");
  };

  const startEdit = (id: string, loadForm: () => void) => {
    setEditing(id);
    loadForm();
    setError(null);
    setTab("dados");
  };

  const cancelForm = (resetForm: () => void) => {
    setEditing(null);
    resetForm();
    setError(null);
    setTab("lista");
  };

  const afterSave = (resetForm: () => void) => {
    setEditing(null);
    resetForm();
    setTab("lista");
  };

  const applyFilters = () => setTab("lista");

  return {
    tab,
    setTab,
    error,
    setError,
    editing,
    setEditing,
    startNew,
    startEdit,
    cancelForm,
    afterSave,
    applyFilters,
  };
}
