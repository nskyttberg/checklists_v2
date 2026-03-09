"use client";
// app/(admin)/admin/licence/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import {
  fetchEmployeeLicences,
  fetchCompetenceDefinitionsForTask,
  hasHistoricalGrant,
  renewMethod,
  adjustMethod,
  worstStatus,
  computeExpiresAt,
  type EmployeeLicence,
  type LicenceMethod,
  type LicenceLevel,
  type GrantStatus,
  type CompetenceDefinitionSlot,
} from "@/lib/licence";

// -------------------------------------------------
// Status config (UI only — kept in page, not domain)
// -------------------------------------------------

const STATUS_CFG: Record<GrantStatus, {
  bg: string; text: string; border: string; dot: string; label: string;
}> = {
  valid:    { bg: "bg-success-light", text: "text-success", border: "border-success/30", dot: "bg-success", label: "Giltig" },
  expiring: { bg: "bg-accent/10",     text: "text-accent",  border: "border-accent/30",  dot: "bg-accent",  label: "Uppmärksamhet" },
  expired:  { bg: "bg-red-50",        text: "text-red-700", border: "border-red-200",    dot: "bg-red-500", label: "Utgången" },
};

// -------------------------------------------------
// Small shared components
// -------------------------------------------------

function StatusDot({ status, size = "w-2 h-2" }: { status: GrantStatus; size?: string }) {
  return <span className={`${size} rounded-full flex-shrink-0 ${STATUS_CFG[status].dot}`} />;
}

function StatusBadge({ status }: { status: GrantStatus }) {
  const s = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <StatusDot status={status} size="w-1.5 h-1.5" />
      {s.label}
    </span>
  );
}

function MethodChip({ method }: { method: LicenceMethod }) {
  const s = STATUS_CFG[method.worstStatus];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <StatusDot status={method.worstStatus} size="w-1.5 h-1.5" />
      {method.work_task_name}
    </span>
  );
}

function SummaryCard({ label, value, colorClass, bgClass }: {
  label: string; value: number; colorClass: string; bgClass: string;
}) {
  return (
    <div className={`${bgClass} border border-slate rounded-xl px-4 py-3 flex-1 min-w-[100px]`}>
      <div className={`text-2xl font-extrabold leading-none ${colorClass}`}>{value}</div>
      <div className="text-xs text-petrol-60 mt-1 font-medium">{label}</div>
    </div>
  );
}

// -------------------------------------------------
// Renew dialog
// -------------------------------------------------

function RenewDialog({
  employee,
  method,
  grantedById,
  onSuccess,
  onClose,
}: {
  employee: EmployeeLicence;
  method: LicenceMethod;
  grantedById: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const newExpiry = new Date();
  newExpiry.setMonth(newExpiry.getMonth() + 24);
  const expiryStr = newExpiry.toLocaleDateString("sv-SE");

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await renewMethod(employee.employee_id, method.levels, grantedById);
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Något gick fel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-petrol/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <h3 className="text-base font-extrabold text-petrol mb-1">Förnya behörighet</h3>
        <p className="text-sm text-petrol-60 mb-5">
          Du signerar härmed förnyad behörighet för{" "}
          <span className="font-bold text-petrol">{employee.employee_name}</span> på{" "}
          <span className="font-bold text-petrol">{method.work_task_name}</span>:
        </p>

        <div className="bg-cream rounded-xl p-4 mb-5 space-y-2">
          {method.levels.map((l, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-petrol">
              <StatusDot status={l.status} size="w-2 h-2" />
              {l.label}
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-slate flex justify-between items-center">
            <span className="text-xs text-petrol-60">Ny giltighetstid</span>
            <span className="text-xs font-bold text-success">Giltig till {expiryStr}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-3xl border border-slate bg-white text-petrol text-sm font-semibold hover:bg-cream transition-colors disabled:opacity-50">
            Avbryt
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-4 py-2 rounded-3xl bg-success text-white text-sm font-semibold hover:bg-success/90 transition-colors disabled:opacity-50">
            {saving ? "Sparar..." : "Signera förnyelse"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------
// Adjust dialog
// -------------------------------------------------

type AdjustStep = "adjust" | "warning" | "confirm";

function AdjustDialog({
  employee,
  method,
  grantedById,
  onSuccess,
  onClose,
}: {
  employee: EmployeeLicence;
  method: LicenceMethod;
  grantedById: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [step, setStep]             = useState<AdjustStep>("adjust");
  const [allDefs, setAllDefs]       = useState<CompetenceDefinitionSlot[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [noHistory, setNoHistory]   = useState<CompetenceDefinitionSlot[]>([]);
  const [note, setNote]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loadingDefs, setLoadingDefs] = useState(true);

  // Pre-select currently active levels
  useEffect(() => {
    fetchCompetenceDefinitionsForTask(method.work_task_id).then((defs) => {
      setAllDefs(defs);
      const activeIds = new Set(
        defs
          .filter(def =>
            method.levels.some(
              l => l.grant.competence_type === def.competence_type && l.grant.level === def.level,
            ),
          )
          .map(d => d.id),
      );
      setSelectedIds(activeIds);
      setLoadingDefs(false);
    });
  }, [method]);

  function toggleDef(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedDefs = allDefs.filter(d => selectedIds.has(d.id));
  const activeDefs   = allDefs.filter(d =>
    method.levels.some(l => l.grant.competence_type === d.competence_type && l.grant.level === d.level),
  );
  const newDefs      = selectedDefs.filter(d => !activeDefs.some(a => a.id === d.id));
  const removedDefs  = activeDefs.filter(d => !selectedIds.has(d.id));

  async function handleNext() {
    // Check history for newly added defs
    const noHist: CompetenceDefinitionSlot[] = [];
    for (const def of newDefs) {
      const has = await hasHistoricalGrant(
        employee.employee_id,
        def.work_task_id,
        def.competence_type,
        def.level,
      );
      if (!has) noHist.push(def);
    }
    setNoHistory(noHist);
    setStep(noHist.length > 0 ? "warning" : "confirm");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await adjustMethod(
        employee.employee_id,
        method.levels,
        selectedDefs,
        grantedById,
      );
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Något gick fel");
      setSaving(false);
    }
  }

  const newExpiry = new Date();
  newExpiry.setMonth(newExpiry.getMonth() + 24);
  const expiryStr = newExpiry.toLocaleDateString("sv-SE");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-petrol/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl">

        {/* ── Step 1: Adjust ── */}
        {step === "adjust" && (
          <>
            <h3 className="text-base font-extrabold text-petrol mb-1">Justera nivåer</h3>
            <p className="text-sm text-petrol-60 mb-4">
              {employee.employee_name} · {method.work_task_name}
            </p>

            {loadingDefs ? (
              <p className="text-sm text-petrol-60 py-4 text-center">Laddar...</p>
            ) : (
              <div className="space-y-2 mb-5">
                {allDefs.map((def) => {
                  const isActive  = activeDefs.some(a => a.id === def.id);
                  const isChecked = selectedIds.has(def.id);
                  const isNew     = isChecked && !isActive;
                  const isRemoving = !isChecked && isActive;
                  const label = `Nivå ${def.level} · ${def.display_name}`;

                  return (
                    <label key={def.id} className={`
                      flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all
                      ${isNew     ? "bg-success-light border-success/30" : ""}
                      ${isRemoving ? "bg-red-50 border-red-200" : ""}
                      ${!isNew && !isRemoving ? "bg-cream border-slate" : ""}
                    `}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDef(def.id)}
                        className="w-4 h-4 accent-petrol cursor-pointer"
                      />
                      <span className={`text-sm font-semibold flex-1 ${isRemoving ? "line-through text-red-500" : "text-petrol"}`}>
                        {label}
                      </span>
                      {isNew     && <span className="text-xs font-bold text-success bg-success-light border border-success/30 rounded-full px-2 py-0.5">Ny</span>}
                      {isRemoving && <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Tas bort</span>}
                      {isActive && isChecked && <span className="text-xs text-petrol-40">Aktiv</span>}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-3xl border border-slate bg-white text-petrol text-sm font-semibold hover:bg-cream transition-colors">
                Avbryt
              </button>
              <button
                onClick={handleNext}
                disabled={selectedIds.size === 0 || loadingDefs}
                className="px-4 py-2 rounded-3xl bg-accent text-white text-sm font-semibold hover:bg-accent-80 transition-colors disabled:opacity-40"
              >
                Nästa →
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Warning ── */}
        {step === "warning" && (
          <>
            <div className="flex gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-warning-light border border-warning/30 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#92400E" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M8 6v3.5M8 11h.01" stroke="#92400E" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-petrol">Behörighet utan tidigare historik</h3>
                <p className="text-xs text-petrol-60 mt-0.5">Följande nivåer saknar godkänd checklista i systemet:</p>
              </div>
            </div>

            <div className="bg-warning-light border border-warning/30 rounded-xl p-3 mb-4 space-y-1">
              {noHistory.map((d, i) => (
                <div key={i} className="text-sm font-semibold text-warning">
                  ⚠ Nivå {d.level} · {d.display_name}
                </div>
              ))}
            </div>

            <p className="text-sm font-semibold text-petrol mb-3">
              Är du säker? {employee.employee_name} har inte haft dessa behörigheter tidigare i systemet.
            </p>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anledning (t.ex. tidigare erfarenhet, extern utbildning)..."
              rows={3}
              className="w-full border border-slate rounded-xl px-3 py-2.5 text-sm text-petrol resize-none mb-4 focus:outline-none focus:border-petrol-60"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setStep("adjust")} className="px-4 py-2 rounded-3xl border border-slate bg-white text-petrol text-sm font-semibold hover:bg-cream transition-colors">
                ← Tillbaka
              </button>
              <button onClick={() => setStep("confirm")} className="px-4 py-2 rounded-3xl bg-warning text-white text-sm font-semibold hover:opacity-90 transition-colors">
                Ja, fortsätt
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === "confirm" && (
          <>
            <h3 className="text-base font-extrabold text-petrol mb-1">Signera behörighet</h3>
            <p className="text-sm text-petrol-60 mb-4">
              Du signerar härmed följande behörigheter för{" "}
              <span className="font-bold text-petrol">{employee.employee_name}</span> på{" "}
              <span className="font-bold text-petrol">{method.work_task_name}</span>:
            </p>

            <div className="bg-cream rounded-xl p-4 mb-4 space-y-2">
              {selectedDefs.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-petrol">
                  <StatusDot status="valid" size="w-1.5 h-1.5" />
                  Nivå {d.level} · {d.display_name}
                  {newDefs.some(n => n.id === d.id) && (
                    <span className="ml-auto text-xs font-bold text-success">Ny</span>
                  )}
                </div>
              ))}
              {removedDefs.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-red-500 line-through">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  Nivå {d.level} · {d.display_name}
                  <span className="ml-auto text-xs font-bold text-red-500 no-underline" style={{ textDecoration: "none" }}>Återkallas</span>
                </div>
              ))}
              <div className="pt-2 mt-1 border-t border-slate flex justify-between">
                <span className="text-xs text-petrol-60">Ny giltighetstid</span>
                <span className="text-xs font-bold text-success">Giltig till {expiryStr}</span>
              </div>
            </div>

            {note && (
              <div className="bg-warning-light border border-warning/30 rounded-xl px-3 py-2 mb-4 text-xs text-warning">
                <span className="font-bold">Anteckning:</span> {note}
              </div>
            )}

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStep(noHistory.length > 0 ? "warning" : "adjust")}
                disabled={saving}
                className="px-4 py-2 rounded-3xl border border-slate bg-white text-petrol text-sm font-semibold hover:bg-cream transition-colors disabled:opacity-50"
              >
                ← Tillbaka
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-3xl bg-success text-white text-sm font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Signera"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------
// Method card (inside expanded employee row)
// -------------------------------------------------

function MethodCard({
  employee,
  method,
  grantedById,
  onRefresh,
}: {
  employee: EmployeeLicence;
  method: LicenceMethod;
  grantedById: string;
  onRefresh: () => void;
}) {
  const [dialog, setDialog] = useState<"renew" | "adjust" | null>(null);

  function handleSuccess() {
    setDialog(null);
    onRefresh();
  }

  return (
    <>
      <div className="bg-white border border-slate rounded-xl overflow-hidden max-w-2xl">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cream border-b border-slate">
          <div className="flex items-center gap-2">
            <StatusDot status={method.worstStatus} size="w-2 h-2" />
            <span className="text-sm font-bold text-petrol">{method.work_task_name}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDialog("adjust")}
              className="px-3 py-1.5 rounded-3xl border border-slate bg-white text-petrol-60 text-xs font-semibold hover:bg-cream transition-colors"
            >
              Justera nivåer
            </button>
            <button
              onClick={() => setDialog("renew")}
              className="px-3 py-1.5 rounded-3xl bg-accent text-white text-xs font-semibold hover:bg-accent-80 transition-colors"
            >
              Förnya
            </button>
          </div>
        </div>

        {/* Levels */}
        {method.levels.map((level, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${
              i < method.levels.length - 1 ? "border-b border-slate/60" : ""
            }`}
          >
            <div className="flex items-center gap-2.5">
              <StatusDot status={level.status} size="w-1.5 h-1.5" />
              <span className="text-petrol">{level.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={level.status} />
              <span className="text-xs text-petrol-40 font-mono">{level.expires}</span>
            </div>
          </div>
        ))}
      </div>

      {dialog === "renew" && (
        <RenewDialog
          employee={employee}
          method={method}
          grantedById={grantedById}
          onSuccess={handleSuccess}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "adjust" && (
        <AdjustDialog
          employee={employee}
          method={method}
          grantedById={grantedById}
          onSuccess={handleSuccess}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

// -------------------------------------------------
// Main page
// -------------------------------------------------

export default function LicencePage() {
  const { currentUser } = useUser();
  const [licences, setLicences]     = useState<EmployeeLicence[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState<GrantStatus | "all">("all");
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployeeLicences();
      setLicences(data);
    } catch (e: any) {
      setError(e.message ?? "Kunde inte hämta behörigheter");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Summary
  const allLevels = licences.flatMap(e => e.methods.flatMap(m => m.levels));
  const summary = {
    total:    allLevels.length,
    valid:    allLevels.filter(l => l.status === "valid").length,
    expiring: allLevels.filter(l => l.status === "expiring").length,
    expired:  allLevels.filter(l => l.status === "expired").length,
  };

  const filtered = licences.filter(emp => {
    const matchSearch = !search ||
      emp.employee_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" ||
      emp.methods.some(m => m.levels.some(l => l.status === filterStatus));
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-petrol-60 text-sm">Laddar behörigheter...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-petrol">Körkort</h1>
          <p className="text-sm text-petrol-60 mt-0.5">Behörighetsöversikt — alla medarbetare</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-2.5 mb-5 flex-wrap">
        <SummaryCard label="Aktiva nivåer"  value={summary.total}    colorClass="text-petrol"  bgClass="bg-white" />
        <SummaryCard label="Giltiga"        value={summary.valid}    colorClass="text-success" bgClass="bg-success-light" />
        <SummaryCard label="Uppmärksamhet"  value={summary.expiring} colorClass="text-accent"  bgClass="bg-accent/10" />
        <SummaryCard label="Utgångna"       value={summary.expired}  colorClass="text-red-700" bgClass="bg-red-50" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Sök medarbetare..."
          className="border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm w-56 outline-none"
        />
        {(["all", "valid", "expiring", "expired"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filterStatus === s
                ? "bg-petrol text-white border-petrol"
                : "bg-white text-petrol-60 border-slate hover:bg-cream"
            }`}
          >
            {s === "all" ? "Alla" : STATUS_CFG[s].label}
          </button>
        ))}
      </div>

      {/* Employee table */}
      <div className="bg-white rounded-xl border border-slate overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1.5fr_3fr_64px] px-5 py-2.5 bg-cream border-b border-slate">
          {["Medarbetare", "Enhet", "Behörigheter", ""].map((h, i) => (
            <span key={i} className="text-[11px] font-bold tracking-widest uppercase text-petrol-60">{h}</span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-petrol-60">
            Inga medarbetare matchar filtret.
          </div>
        )}

        {filtered.map((emp, i) => {
          const isExpanded = expanded === emp.employee_id;
          const isLast     = i === filtered.length - 1;

          return (
            <div key={emp.employee_id}>
              {/* Row */}
              <div
                onClick={() => setExpanded(isExpanded ? null : emp.employee_id)}
                className={`grid grid-cols-[2fr_1.5fr_3fr_64px] px-5 py-3.5 items-center cursor-pointer transition-colors ${
                  isExpanded ? "bg-petrol/[0.04]" : "hover:bg-cream"
                } ${!isLast || isExpanded ? "border-b border-slate/60" : ""}`}
              >
                {/* Name */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-petrol-20 flex items-center justify-center text-[11px] font-extrabold text-petrol flex-shrink-0">
                    {emp.employee_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-petrol">{emp.employee_name}</div>
                    {emp.employee_site && (
                      <div className="text-xs text-petrol-60">{emp.employee_site}</div>
                    )}
                  </div>
                </div>

                {/* Site (repeated for grid alignment) */}
                <div className="text-xs text-petrol-60 hidden sm:block">
                  {emp.employee_site ?? "—"}
                </div>

                {/* Method chips */}
                <div className="flex flex-wrap gap-1.5">
                  {emp.methods.map((m, mi) => (
                    <MethodChip key={mi} method={m} />
                  ))}
                  {emp.methods.length === 0 && (
                    <span className="text-xs text-petrol-40 italic">Inga behörigheter</span>
                  )}
                </div>

                {/* Arrow + worst status dot */}
                <div className="flex items-center justify-end gap-2">
                  {emp.worstStatus !== "valid" && (
                    <StatusDot status={emp.worstStatus} size="w-2 h-2" />
                  )}
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className={`text-petrol-40 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                  >
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className={`bg-petrol/[0.03] px-5 py-4 pl-16 space-y-3 ${!isLast ? "border-b border-slate/60" : ""}`}>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-petrol-60 mb-3">
                    Behörighetsdetaljer
                  </p>
                  {emp.methods.map((m, mi) => (
                    <MethodCard
                      key={mi}
                      employee={emp}
                      method={m}
                      grantedById={currentUser?.id ?? ""}
                      onRefresh={load}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-petrol-40 mt-3 text-right">
        {filtered.length} av {licences.length} medarbetare visas
      </p>
    </div>
  );
}