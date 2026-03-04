"use client";
// app/(employee)/my/components/trainee-view.tsx

import { useState } from "react";
import type { MyChecklist } from "@/lib/queries/checklists";
import { BackButton, InstanceHeader, Hint } from "./ui";
import { SectionRow } from "./section-row";
import { ConfirmSheet } from "./confirm-sheet";

interface TraineeViewProps {
  checklist: MyChecklist;
  onBack: () => void;
  onSign: (instanceId: string, signatureId: string) => void;
}

export function TraineeView({ checklist, onBack, onSign }: TraineeViewProps) {
  const [confirmSectionId, setConfirmSectionId] = useState<string | null>(null);

  const confirmSection = checklist.sections.find(
    (s) => s.signature_id === confirmSectionId
  );

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
      <Hint text="Signera de rubriker du genomgått. Du kan signera när handledaren redan signerat." />

      {checklist.sections.map((sec) => (
        <SectionRow
          key={sec.signature_id}
          section={sec}
          mode="trainee"
          onSign={() => setConfirmSectionId(sec.signature_id)}
        />
      ))}

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
    </div>
  );
}
