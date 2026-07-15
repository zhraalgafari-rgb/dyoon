import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useDashboardData,
  type Person,
  type Currency,
  type PersonCurrencyBalance,
  type RpcTotalsRow,
} from "@/hooks/useDashboardData";
import {
  useDashboardFilter,
  type ViewMode,
  type Sort,
  type Filter,
} from "@/hooks/useDashboardFilter";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useDebtsHomeActions } from "@/hooks/useDebtsHomeActions";
import { PersonActionDialogs } from "@/components/PersonActionDialogs";
import { DebtsHeader } from "@/features/debts/DebtsHeader";
import { PersonRowV2 } from "@/features/debts/PersonRowV2";
import { PersonTable } from "@/features/debts/PersonTable";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFilterBar } from "@/components/DashboardFilterBar";
import { MobileDashboardActions } from "@/components/MobileDashboardActions";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { AiChatPanel } from "@/components/ai/AiChatPanel";
import { PersonRowSkeleton } from "@/components/common/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { FabButton } from "@/components/common/FabButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({ component: DebtsHome });

function DebtsHome() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("cards");

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem("people_view") as ViewMode;
      if (v) setView(v);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("people_view", view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const [openAdd, setOpenAdd] = useState(false);
  const [openAiChat, setOpenAiChat] = useState(false);

  const { data, isLoading: loading, refetch } = useDashboardData(user?.id);

  const pullDist = usePullToRefresh(() => {
    refetch().catch(console.error);
  });

  const people = data?.people ?? [];
  const personBalances = data?.personBalances ?? new Map();
  const personCurrencyBalances: Map<string, PersonCurrencyBalance[]> =
    data?.personCurrencyBalances ?? new Map();
  const rpcTotalsData: RpcTotalsRow[] = data?.rpcTotals ?? [];
  const currencies = data?.currencies ?? [];

  const { q, setQ, deferredQ, filter, setFilter, sort, setSort, filtered } = useDashboardFilter(
    people,
    personCurrencyBalances,
  );

  const [visibleCount, setVisibleCount] = useState(30);
  useEffect(() => {
    setVisibleCount(30);
  }, [deferredQ, filter, sort]);

  const visibleList = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 30, filtered.length));
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filtered.length]);

  const hasActiveBalances = rpcTotalsData.some((r) => r.owed > 0 || r.owe > 0);
  const activePeople = people.filter((p) => {
    const balances = personCurrencyBalances.get(p.id);
    return balances && balances.some((b) => Math.abs(b.net) > 0.001);
  }).length;

  const actions = useDebtsHomeActions();

  return (
    <div className="space-y-4 animate-fade-in-up">
      {pullDist > 10 && (
        <div
          className="flex justify-center text-primary"
          style={{ height: Math.min(pullDist, 60) }}
        >
          <Loader2
            className={`size-5 ${pullDist > 70 ? "animate-spin" : ""}`}
            style={{ transform: `rotate(${pullDist * 3}deg)` }}
          />
        </div>
      )}

      <DashboardHeader
        peopleCount={people.length}
        hasActiveBalances={hasActiveBalances}
        activePeople={activePeople}
        onOpenAiChat={() => setOpenAiChat(true)}
        onOpenNewPerson={() => {
          actions.setEditingPerson(null);
          actions.setOpenPerson(true);
        }}
        onOpenAdd={() => setOpenAdd(true)}
      />

      <DebtsHeader
        rpcTotals={rpcTotalsData}
        currencies={currencies}
        peopleCount={people.length}
        filter={filter}
        onFilterChange={setFilter}
      />

      <DashboardFilterBar
        q={q}
        onQChange={setQ}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        filter={filter}
        onFilterChange={setFilter}
      />

      {loading ? (
        <PersonRowSkeleton count={5} />
      ) : filtered.length === 0 ? (
        people.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="ابدأ بإضافة أول معاملة"
            description="سجّل ما لك وما عليك بسهولة، وسنحتفظ لك بكل التفاصيل."
            action={
              <Button
                onClick={() => setOpenAdd(true)}
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                <Plus className="size-4" /> إضافة أول معاملة
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="لا توجد نتائج"
            description="جرّب كلمة بحث أخرى أو ألغِ التصفية."
            variant="compact"
          />
        )
      ) : view === "table" ? (
        <PersonTable
          rows={visibleList.map((p) => ({
            person: p,
            balance: personBalances.get(p.id) ?? {
              net: 0,
              count: 0,
              lastDate: 0,
              totalCredit: 0,
              totalDebit: 0,
            },
            currencyBalances: personCurrencyBalances.get(p.id) ?? [],
            currencies,
          }))}
          onEdit={actions.onEdit}
          onArchive={actions.onArchive}
          onDelete={actions.onDelete}
        />
      ) : (
        <div className="space-y-2">
          {visibleList.map((p, i) => (
            <PersonRowV2
              key={p.id}
              person={p}
              balance={personBalances.get(p.id) ?? { net: 0, count: 0, lastDate: 0 }}
              currencyBalances={personCurrencyBalances.get(p.id) ?? []}
              currencies={currencies}
              onEdit={() => actions.onEdit(p)}
              onArchive={() => actions.onArchive(p)}
              onDelete={() => actions.onDelete(p)}
            />
          ))}
        </div>
      )}

      {visibleList.length > 0 && visibleList.length < filtered.length && (
        <div
          ref={loadMoreRef}
          className="h-20 flex items-center justify-center text-muted-foreground pb-20"
        >
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      <MobileDashboardActions
        onOpenAiChat={() => setOpenAiChat(true)}
        onOpenNewPerson={() => {
          actions.setEditingPerson(null);
          actions.setOpenPerson(true);
        }}
        onOpenAdd={() => setOpenAdd(true)}
      />

      <AiChatPanel open={openAiChat} onClose={() => setOpenAiChat(false)} />

      <AddTransactionDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        people={people}
        currencies={currencies}
        onSuccess={() => refetch()}
      />

      <PersonActionDialogs
        editingPerson={actions.editingPerson}
        setEditingPerson={actions.setEditingPerson}
        openPerson={actions.openPerson}
        setOpenPerson={actions.setOpenPerson}
        delPerson={actions.delPerson}
        setDelPerson={actions.setDelPerson}
        archivePerson={actions.archivePerson}
        setArchivePerson={actions.setArchivePerson}
        refetch={refetch}
      />
    </div>
  );
}
