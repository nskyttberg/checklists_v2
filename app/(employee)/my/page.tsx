"use client";
// app/(employee)/my/page.tsx
//
// Layout decisions:
// - Full-height: min-h-[100dvh] uses dynamic viewport height (handles iOS Safari bar)
// - paddingBottom: safe-area-inset-bottom so content clears iPhone home indicator
// - No footer nav — single destination app, nav when needed
// - Background: sand (brand anchor)
// - Max-width 480px centered — phone-sized column even on tablet/desktop
// - Scroll: body scrolls, header is sticky

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import {
  fetchMyChecklists,
  fetchSupervisableChecklists,
  signAsSupervisor,
  unsignAsSupervisor,
  signAsTrainee,
  type MyChecklist,
} from "@/lib/queries/checklists";
import { MobileHeader } from "./components/mobile-header";
import { HomeView } from "./components/home-view";
import { TraineeView } from "./components/trainee-view";
import { SupervisorListView } from "./components/supervisor-list-view";
import { SupervisorSignView } from "./components/supervisor-sign-view";

type View = "home" | "trainee" | "sup-list" | "sup-sign";

export default function MyPage() {
  const { currentUser, loading: userLoading } = useUser();
  const [view, setView] = useState<View>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myLists, setMyLists] = useState<MyChecklist[]>([]);
  const [supLists, setSupLists] = useState<MyChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const [my, sup] = await Promise.all([
      fetchMyChecklists(currentUser.id),
      fetchSupervisableChecklists(currentUser.id),
    ]);
    setMyLists(my);
    setSupLists(sup);
    setLoading(false);
  }, [currentUser?.id]);

  // Reset view and reload when user switches
  useEffect(() => {
    if (!userLoading && currentUser?.id) {
      setView("home");
      setSelectedId(null);
      loadData();
    }
  }, [currentUser?.id, userLoading, loadData]);

  const selected = [...myLists, ...supLists].find((c) => c.id === selectedId);

  const handleTraineeSign = async (instanceId: string, signatureId: string) => {
    if (!currentUser?.id) return;
    await signAsTrainee(instanceId, signatureId, currentUser.id);
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

  // Initial load state
  if (userLoading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--color-sand)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: 14, color: "var(--color-petrol-60)" }}>
          Laddar...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-sand)",
        fontFamily: "Arial, system-ui, sans-serif",
      }}
    >
      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 30 }}>
        <MobileHeader />
      </div>

      {/* Content */}
      <main
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "20px 16px",
          paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
        }}
      >
        {view === "home" && (
          <HomeView
            myChecklists={myLists}
            supervisable={supLists}
            loading={loading}
            onOpenMy={(id) => {
              setSelectedId(id);
              setView("trainee");
            }}
            onOpenSupervisorList={() => setView("sup-list")}
          />
        )}

        {view === "trainee" && selected && (
          <TraineeView
            checklist={selected}
            onBack={() => setView("home")}
            onSign={handleTraineeSign}
          />
        )}

        {view === "sup-list" && (
          <SupervisorListView
            checklists={supLists}
            onBack={() => setView("home")}
            onOpen={(id) => {
              setSelectedId(id);
              setView("sup-sign");
            }}
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
    </div>
  );
}
