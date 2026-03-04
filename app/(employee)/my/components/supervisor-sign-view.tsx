"use client";
// app/(employee)/my/components/supervisor-sign-view.tsx

import { useState } from "react";
import type { MyChecklist } from "@/lib/queries/checklists";
import { BackButton, InstanceHeader, Hint } from "./ui";
import { SectionRow } from "./section-row";
import { ConfirmSheet } from "./confirm-sheet";

interface SupervisorSignViewProps {
  checklist: MyChecklist;
  onBack: () => void;
  onSign: (instanceId: string, signatureId: string) => void;
  onUnsign: (instanceId: string, signatureId: string) => void;
}

export function SupervisorSignView({
  checklist,
  onBack,
  onSign,
  onUnsign,
}: SupervisorSignViewProps) {
  const [confirmSectionId, setConfirmSectionId] = useState<string | null>(null);

  const confirmSection = checklist.sections.find(
    (s) => s.signature_id === confirmSectionId
  );

  return (
    <div>
      <BackButton onClick={onBack} />
      <InstanceHeader
        title={checklist.employee_name}
        subtitle={checklist.template_name}
        tag={checklist.work_task_category ?? ""}
        sections={checklist.sections}
        mode="supervisor"
      />
      <Hint text="Signera de rubriker du handlett och bedömt att kollegan behärskar." />

      {checklist.sections.map((sec) => (
        <SectionRow
          key={sec.signature_id}
          section={sec}
          mode="supervisor"
          onSign={() => setConfirmSectionId(sec.signature_id)}
          onUnsign={() => onUnsign(checklist.id, sec.signature_id)}
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
            <p>
              Du bekräftar att du handlett {checklist.employee_name} och bedömt
              att hen behärskar detta moment.
            </p>
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
