"use client";
// app/(employee)/my/page.tsx

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
import { MobileHeader } from "./components/mobile-header";
import { HomeView } from "./components/home-view";
import { TraineeView } from "./components/trainee-view";
import { SupervisorListView } from "./components/supervisor-list-view";
import { SupervisorSignView } from "./components/supervisor-sign-view";
import { ConfirmSheet } from "./components/confirm-sheet";

type View = "home" | "trainee" | "sup-list" | "sup-sign";

export default function MyPage() {
  const { currentUser, loading: userLoading } = useUser();
  const [view, setView]           = useState<View>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myLists, setMyLists]     = useState<MyChecklist[]>([]);
  const [supLists, setSupLists]   = useState<MyChecklist[]>([]);
  const [approvable, setApprovable] = useState<MyChecklist[]>([]);
  const [loading, setLoading]     = useState(true);

  // Approver confirmation sheet state
  const [approveId, setApproveId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const [my, sup, approve] = await Promise.all([
      fetchMyChecklists(currentUser.id),
      fetchSupervisableChecklists(currentUser.id),
      fetchApprovableChecklists(currentUser.id),
    ]);
    setMyLists(my);
    setSupLists(sup);
    setApprovable(approve);
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!userLoading && currentUser?.id) {
      setView("home");
      setSelectedId(null);
      loadData();
    }
  }, [currentUser?.id, userLoading, loadData]);

  const selected = [...myLists, ...supLists].find((c) => c.id === selectedId);
  const approveTarget = approvable.find((c) => c.id === approveId);

  // ——— Handlers ————————————————————————————————————————————————————————

  const handleTraineeSign = async (instanceId: string, signatureId: string) => {
    if (!currentUser?.id) return;
    await signAsTrainee(instanceId, signatureId, currentUser.id);
    await loadData();
  };

  const handleFinalizeAsTrainee = async (instanceId: string) => {
    if (!currentUser?.id) return;
    await finalizeAsTrainee(instanceId, currentUser.id);
    await loadData();
  };

  const handleSupSign = async (instanceId: string, signatureId: string) => {
    if (!currentUser?.id) return;
    await signAsSupervisor(instanceId, signatureId, currentUser.id);
    await loadData();
  };

  const handleSupUnsign = async (instanceId: string, signatureId: string) => {
    await unsignAsSupervisor(instanceId, signatureId);
    await loadData();
  };

  const handleApprove = async () => {
    if (!currentUser?.id || !approveId) return;
    await finalizeChecklist(approveId, currentUser.id);
    setApproveId(null);
    await loadData();
  };

  // ——— Loading splash ——————————————————————————————————————————————————

  if (userLoading) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "var(--color-sand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "var(--color-petrol-60)" }}>Laddar...</p>
      </div>
    );
  }

  // ——— Render ——————————————————————————————————————————————————————————

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "var(--color-sand)", fontFamily: "Arial, system-ui, sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 30 }}>
        <MobileHeader />
      </div>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px", paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))" }}>

        {view === "home" && (
          <HomeView
            myChecklists={myLists}
            supervisable={supLists}
            approvable={approvable}
            loading={loading}
            onOpenMy={(id) => { setSelectedId(id); setView("trainee"); }}
            onOpenSupervisorList={() => setView("sup-list")}
            onApprove={(id) => setApproveId(id)}
          />
        )}

        {view === "trainee" && selected && (
          <TraineeView
            checklist={selected}
            onBack={() => setView("home")}
            onSign={handleTraineeSign}
            onFinalizeAsTrainee={handleFinalizeAsTrainee}
          />
        )}

        {view === "sup-list" && (
          <SupervisorListView
            checklists={supLists}
            onBack={() => setView("home")}
            onOpen={(id) => { setSelectedId(id); setView("sup-sign"); }}
          />
        )}

        {view === "sup-sign" && selected && (
          <SupervisorSignView
            checklist={selected}
            onBack={() => setView("sup-list")}
            onSign={handleSupSign}
            onUnsign={handleSupUnsign}
          />
        )}
      </main>

      {/* Approver confirmation sheet */}
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