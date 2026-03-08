"use client";
// app/(employee)/my/components/trainee-view.tsx

import { useState } from "react";
import type { MyChecklist } from "@/lib/queries/checklists";
import { BackButton, InstanceHeader, Hint, formatDate } from "./ui";
import { SectionRow } from "./section-row";
import { ConfirmSheet } from "./confirm-sheet";

interface TraineeViewProps {
  checklist: MyChecklist;
  onBack: () => void;
  onSign: (instanceId: string, signatureId: string) => void;
  onFinalizeAsTrainee: (instanceId: string) => void;
}

export function TraineeView({
  checklist,
  onBack,
  onSign,
  onFinalizeAsTrainee,
}: TraineeViewProps) {
  const [confirmSectionId, setConfirmSectionId] = useState<string | null>(null);
  const [confirmFinalize, setConfirmFinalize]   = useState(false);

  const confirmSection = checklist.sections.find(
    (s) => s.signature_id === confirmSectionId
  );

  const allTraineeSigned = checklist.sections.every(
    (s) => s.signed_by_trainee_id !== null
  );
  const alreadyFinalSigned = !!checklist.signed_by_trainee_at;

  return (
    <div>
      <BackButton onClick={onBack} />
      <InstanceHeader
        title={checklist.template_name}
        subtitle={checklist.work_task_name}
        tag={checklist.work_task_category ?? ""}
        sections={checklist.sections}
        mode="trainee"
      />
      <Hint text="Signera de rubriker du genomgått. Ordningsföljden för handledare och dig är fri." />

      {checklist.sections.map((sec) => (
        <SectionRow
          key={sec.signature_id}
          section={sec}
          mode="trainee"
          onSign={() => setConfirmSectionId(sec.signature_id)}
        />
      ))}

      {/* Trainee final sign block — shown when all sections are signed */}
      {allTraineeSigned && (
        <div
          className="bg-white rounded-xl border mt-4"
          style={{
            padding: "20px 18px",
            borderColor: alreadyFinalSigned
              ? "var(--color-success)"
              : "var(--color-petrol-40)",
          }}
        >
          {alreadyFinalSigned ? (
            <div className="flex items-start gap-3">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-petrol text-[14px]">
                  Du har slutsignerat
                </p>
                <p className="text-petrol-60 text-xs mt-0.5">
                  {formatDate(checklist.signed_by_trainee_at)} · Väntar på godkännande
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="font-semibold text-petrol text-[14px] mb-1">
                Alla rubriker signerade
              </p>
              <p className="text-petrol-60 text-[13px] mb-4 leading-relaxed">
                Intyga att du genomgått hela upplärningen och är redo för godkännande.
              </p>
              <button
                onClick={() => setConfirmFinalize(true)}
                className="w-full text-[14px] font-semibold text-white bg-accent rounded-3xl border-0"
                style={{ padding: "14px 0", cursor: "pointer", minHeight: 48 }}
              >
                Slutsignera upplärningen
              </button>
            </>
          )}
        </div>
      )}

      {/* Section sign confirmation */}
      <ConfirmSheet
        open={!!confirmSectionId}
        title="Signera rubrik"
        body={
          <>
            <p className="text-petrol-80 font-medium mb-1.5">
              {confirmSection?.title}
            </p>
            <p>Du bekräftar att du genomgått denna del av upplärningen.</p>
          </>
        }
        confirmLabel="Signera"
        onConfirm={() => {
          if (confirmSectionId) {
            onSign(checklist.id, confirmSectionId);
            setConfirmSectionId(null);
          }
        }}
        onCancel={() => setConfirmSectionId(null)}
      />

      {/* Trainee final sign confirmation */}
      <ConfirmSheet
        open={confirmFinalize}
        title="Slutsignera upplärningen"
        body={
          <p>
            Jag intygar att jag genomgått hela upplärningen för{" "}
            <strong>{checklist.template_name}</strong> och att samtliga moment
            är genomförda.
          </p>
        }
        confirmLabel="Jag intygar och slutsignerar"
        onConfirm={() => {
          onFinalizeAsTrainee(checklist.id);
          setConfirmFinalize(false);
        }}
        onCancel={() => setConfirmFinalize(false)}
      />
    </div>
  );
}