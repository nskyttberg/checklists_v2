"use client";
// app/(employee)/my/components/supervisor-list-view.tsx

import type { MyChecklist } from "@/lib/queries/checklists";
import { BackButton, Card, Tag, ProgressBar, Icons, countSignedBySupervisor } from "./ui";

interface SupervisorListViewProps {
  checklists: MyChecklist[];
  onBack: () => void;
  onOpen: (id: string) => void;
}

export function SupervisorListView({ checklists, onBack, onOpen }: SupervisorListViewProps) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="font-bold text-petrol text-lg mb-1 mt-1">
        Signera som handledare
      </h2>
      <p className="text-petrol-60 text-sm mb-5 leading-relaxed">
        Signera rubriker för kollegor du handlett och bedömt.
      </p>

      <div className="flex flex-col gap-2.5">
        {checklists.map((inst) => {
          const signed = countSignedBySupervisor(inst.sections);
          const remaining = inst.sections.length - signed;
          return (
            <Card key={inst.id} onClick={() => onOpen(inst.id)}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-bold text-petrol text-[15px] mb-1">
                    {inst.employee_name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag label={inst.work_task_category ?? ""} />
                    <span className="text-petrol-60 text-[13px]">
                      {inst.work_task_name}
                    </span>
                  </div>
                </div>
                <div className="text-petrol-60 shrink-0 ml-2">
                  <Icons.chevronRight />
                </div>
              </div>
              <ProgressBar signed={signed} total={inst.sections.length} />
              {remaining === 1 && (
                <p className="text-success text-xs font-medium mt-1.5">
                  1 rubrik kvar
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
