// app/my/components/confirm-sheet.tsx
// Bottom sheet confirmation dialog for signing actions.
"use client";

import type { ReactNode } from "react";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ open, title, body, confirmLabel, onConfirm, onCancel }: ConfirmSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,72,81,0.35)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[480px] shadow-xl"
        style={{
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px",
          paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        }}
      >
        <h3 className="font-bold text-petrol text-[17px] mb-2">{title}</h3>
        <div className="text-petrol-60 text-sm leading-relaxed mb-6">{body}</div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 text-[15px] font-medium text-petrol rounded-3xl border border-slate bg-white"
            style={{ padding: "14px 0", cursor: "pointer", minHeight: 48 }}
          >
            Avbryt
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-[15px] font-semibold text-white rounded-3xl bg-accent border-0"
            style={{ padding: "14px 0", cursor: "pointer", minHeight: 48 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}