"use client";
// app/(employee)/my/page.tsx
// CHANGED: Added "sign" + "competences" tabs. View state extended.
// Competences data fetched here alongside existing checklist data.
// All existing handlers (handleTraineeSign, handleSupSign etc.) are untouched.

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import {
  fetchMyChecklists,
  fetchSupervisableChecklists,
  fetchApprovableChecklists,
  signAsSupervisor,
  unsignAsSupervisor,
  signAsTrainee,
  finalizeAsTrainee,
  finalizeChecklist,
  type MyChecklist,
} from "@/lib/queries/checklists";
import {
  fetchEmployeeLicences,
  type EmployeeLicence,
} from "@/lib/licence";
import { MobileHeader } from "./components/mobile-header";
import { TabBar }       from "./components/tab-bar";
import { HomeView }     from "./components/home-view";
import { SignView }     from "./components/sign-view";
import { CompetencesView } from "./components/competences-view";
import { TraineeView }        from "./components/trainee-view";
import { SupervisorSignView } from "./components/supervisor-sign-view";
// SupervisorListView no longer used — direct navigation from SignView
import { ConfirmSheet }       from "./components/confirm-sheet";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab  = "home" | "sign" | "competences";
type View = Tab | "trainee" | "sup-sign";

// ── Component ─────────────────────────────────────────────────────────────────

export default function MyPage() {
  const { currentUser, loading: userLoading } = useUser();

  // ── Checklist state (unchanged) ──────────────────────────────────────────
  const [view, setView]             = useState<View>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myLists, setMyLists]       = useState<MyChecklist[]>([]);
  const [supLists, setSupLists]     = useState<MyChecklist[]>([]);
  const [approvable, setApprovable] = useState<MyChecklist[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── Competences state (new) ───────────────────────────────────────────────
  const [licences, setLicences]       = useState<EmployeeLicence[]>([]);
  const [licLoading, setLicLoading]   = useState(false);

  // ── Approver confirmation (unchanged) ────────────────────────────────────
  const [approveId, setApproveId] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selected     = myLists.find((c) => c.id === selectedId)
                    ?? supLists.find((c) => c.id === selectedId)
                    ?? null;
  const approveTarget = approvable.find((c) => c.id === approveId) ?? null;

  // Which tab is "active" (for TabBar highlight + back navigation)
  const activeTab: Tab =
    view === "trainee"  ? "home"
    : view === "sup-sign" ? "sign"
    : view as Tab;

  // Tab badge counts
  const signBadge = supLists.length + approvable.length;

  // ── Data loading ──────────────────────────────────────────────────────────

  const reload = useCallback(async (employeeId: string) => {
    setLoading(true);
    const [my, sup, app] = await Promise.all([
      fetchMyChecklists(employeeId),
      fetchSupervisableChecklists(employeeId),
      fetchApprovableChecklists(employeeId),
    ]);
    setMyLists(my);
    setSupLists(sup);
    setApprovable(app);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) reload(currentUser.id);
  }, [currentUser, reload]);

  // Lazy-load licences when competences tab is first opened
  async function openCompetences() {
    setView("competences");
    if (licences.length === 0 && !licLoading) {
      setLicLoading(true);
      const data = await fetchEmployeeLicences();
      setLicences(data);
      setLicLoading(false);
    }
  }

  // ── Tab navigation ────────────────────────────────────────────────────────

  function handleTabChange(tab: Tab) {
    if (tab === "competences") { openCompetences(); return; }
    setView(tab);
  }

  // ── Existing sign handlers (unchanged) ───────────────────────────────────

  async function handleTraineeSign(instanceId: string, signatureId: string) {
    if (!currentUser) return;
    const ok = await signAsTrainee(instanceId, signatureId, currentUser.id);
    if (ok) reload(currentUser.id);
  }

  async function handleFinalizeAsTrainee(instanceId: string) {
    if (!currentUser) return;
    const ok = await finalizeAsTrainee(instanceId, currentUser.id);
    if (ok) { reload(currentUser.id); setView("home"); }
  }

  async function handleSupSign(instanceId: string, signatureId: string) {
    if (!currentUser) return;
    const ok = await signAsSupervisor(instanceId, signatureId, currentUser.id);
    if (ok) reload(currentUser.id);
  }

  async function handleSupUnsign(instanceId: string, signatureId: string) {
    if (!currentUser) return;
    const ok = await unsignAsSupervisor(instanceId, signatureId);
    if (ok) reload(currentUser.id);
  }

  async function handleApprove() {
    if (!currentUser || !approveId) return;
    const ok = await finalizeChecklist(approveId, currentUser.id);
    if (ok) { reload(currentUser.id); setApproveId(null); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "var(--color-sand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "var(--color-petrol-60)" }}>Laddar...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "var(--color-sand)", fontFamily: "Arial, system-ui, sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 30 }}>
        <MobileHeader />
        {/* Tab bar only on top-level views */}
        {(view === "home" || view === "sign" || view === "competences") && (
          <TabBar
            activeTab={activeTab}
            signBadge={signBadge}
            onChange={handleTabChange}
          />
        )}
      </div>

      <main style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "20px 16px",
        paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
      }}>

        {/* ── Tab: Home ──────────────────────────────────────────────────── */}
        {view === "home" && (
          <HomeView
            myChecklists={myLists}
            loading={loading}
            onOpenMy={(id) => { setSelectedId(id); setView("trainee"); }}
          />
        )}

        {/* ── Tab: Sign ──────────────────────────────────────────────────── */}
        {view === "sign" && (
          <SignView
            supervisable={supLists}
            approvable={approvable}
            loading={loading}
            onOpenSupervisor={(id) => { setSelectedId(id); setView("sup-sign"); }}
            onApprove={(id) => setApproveId(id)}
          />
        )}

        {/* ── Tab: Competences ───────────────────────────────────────────── */}
        {view === "competences" && (
          <CompetencesView
            licences={licences}
            currentEmployeeId={currentUser?.id ?? null}
            loading={licLoading}
          />
        )}

        {/* ── Detail: Trainee signing ────────────────────────────────────── */}
        {view === "trainee" && selected && (
          <TraineeView
            checklist={selected}
            onBack={() => setView("home")}
            onSign={handleTraineeSign}
            onFinalizeAsTrainee={handleFinalizeAsTrainee}
          />
        )}

        {/* ── Detail: Supervisor signing ─────────────────────────────────── */}
        {view === "sup-sign" && selected && (
          <SupervisorSignView
            checklist={selected}
            onBack={() => setView("sign")}
            onSign={handleSupSign}
            onUnsign={handleSupUnsign}
          />
        )}
      </main>

      {/* Approver confirmation sheet (unchanged) */}
      <ConfirmSheet
        open={!!approveId}
        title="Godkänn upplärning"
        body={
          approveTarget ? (
            <p>
              Du godkänner att{" "}
              <strong>{approveTarget.employee_name}</strong> genomfört{" "}
              <strong>{approveTarget.template_name}</strong> och beviljar
              behörighet. Åtgärden kan inte ångras.
            </p>
          ) : null
        }
        confirmLabel="Godkänn och bevilja behörighet"
        onConfirm={handleApprove}
        onCancel={() => setApproveId(null)}
      />
    </div>
  );
}