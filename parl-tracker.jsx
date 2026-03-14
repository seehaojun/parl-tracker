import { useState, useEffect, useCallback } from "react";

// ─── TASK TEMPLATE ───────────────────────────────────────────
const TASK_TEMPLATES = [
  {
    code: "A",
    title: "Post PQs + speech snippets on social media (incl. LinkedIn)",
    description: "Make sure PQs and speech snippets are posted on social media including LinkedIn.",
    deadlineRule: "Within 2 days after sitting",
    phase: "post",
    calcDeadline: (sitting) => addDays(sitting, 2),
  },
  {
    code: "B",
    title: "Inform Whip on bills we want to speak on",
    description: "Inform the Whip on which bills we want to speak on.",
    deadlineRule: "Within 1 week after sitting",
    phase: "post",
    calcDeadline: (sitting) => addDays(sitting, 7),
  },
  {
    code: "C1",
    title: "Check PQ answers, flag follow-ups, file PQs for next sitting, brief social media team",
    description:
      "Before LA meeting: Check the answers to PQs and anything interesting we need to follow up on. File PQs for next sitting and inform social media team on PQs we have filed.",
    deadlineRule: "Within 2 weeks after sitting (before LA meeting)",
    phase: "post",
    calcDeadline: (sitting) => addDays(sitting, 14),
  },
  {
    code: "C2",
    title: "Discuss SQ angles and bill speech points",
    description: "During LA meeting: Discuss angles on Supplementary Questions and points on bill speeches.",
    deadlineRule: "Within 2 weeks after sitting (during LA meeting)",
    phase: "post",
    calcDeadline: (sitting) => addDays(sitting, 14),
  },
  {
    code: "D",
    title: "Prepare ELI5 content",
    description: "Prepare Explain Like I'm 5 (ELI5) simplified explainer content on parliamentary topics.",
    deadlineRule: "Within 3 weeks after sitting",
    phase: "post",
    calcDeadline: (sitting) => addDays(sitting, 21),
  },
  {
    code: "E",
    title: "Social media posts on upcoming PQs should be live",
    description: "Social media posts previewing the PQs coming up for this sitting should be published and live.",
    deadlineRule: "By weekend before this sitting",
    phase: "pre",
    calcDeadline: (sitting) => getSaturdayBefore(sitting),
  },
  {
    code: "F",
    title: "Send SQs to Political Office Holders (POHes)",
    description:
      "When the Order Paper is out, send Supplementary Questions to Political Office Holders. Date is set manually when Order Paper is released.",
    deadlineRule: "When Order Paper is out (manual)",
    phase: "pre",
    calcDeadline: () => null, // always manual
  },
  {
    code: "G",
    title: '"Walk with me to Parliament" video recording',
    description:
      "Record the 'Walk with me to Parliament' social media video on the day of Parliament sitting. The MP walks to Parliament and records live. Cannot be done in advance.",
    deadlineRule: "Day of this sitting",
    phase: "pre",
    calcDeadline: (sitting) => sitting,
  },
];

// ─── DATE HELPERS ────────────────────────────────────────────
function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getSaturdayBefore(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 6=Sat
  const diff = day === 0 ? 1 : day === 6 ? 0 : day + 1;
  // Go back to Saturday: if Mon(1)->2 days back, Tue(2)->3, etc.
  const sat = new Date(d);
  sat.setDate(sat.getDate() - (day === 0 ? 1 : (day === 6 ? 7 : day + 1)));
  return sat.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── STORAGE HELPERS ─────────────────────────────────────────
async function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [view, setView] = useState("dashboard");
  const [cycles, setCycles] = useState([]);
  const [team, setTeam] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [loading, setLoading] = useState(true);

  function handlePasscodeSubmit() {
    if (passcode === "8888") {
      setUnlocked(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  }

  // Load data on mount
  useEffect(() => {
    (async () => {
      const c = await loadData("parl-cycles", []);
      const t = await loadData("parl-team", []);
      setCycles(c);
      setTeam(t);
      setLoading(false);
    })();
  }, []);

  // Save whenever data changes
  const saveCycles = useCallback(
    (newCycles) => {
      setCycles(newCycles);
      saveData("parl-cycles", newCycles);
    },
    []
  );

  const saveTeam = useCallback(
    (newTeam) => {
      setTeam(newTeam);
      saveData("parl-team", newTeam);
    },
    []
  );

  // ─── ADD SITTING DATE ──────────────────────────────────────
  function addSittingDate(dateStr, notes) {
    // Check for duplicates
    if (cycles.some((c) => c.sittingDate === dateStr)) {
      alert("A cycle for this sitting date already exists.");
      return;
    }

    // Generate tasks for the new cycle
    const tasks = TASK_TEMPLATES.map((t) => ({
      id: generateId(),
      code: t.code,
      title: t.title,
      description: t.description,
      deadlineRule: t.deadlineRule,
      phase: t.phase,
      deadlineDate: t.calcDeadline(dateStr),
      status: "not_started",
      assignedTo: "",
      completedDate: null,
      notes: "",
    }));

    const newCycle = {
      id: generateId(),
      sittingDate: dateStr,
      notes: notes || "",
      status: "active",
      tasks,
    };

    const allCycles = [...cycles, newCycle];
    saveCycles(allCycles);
    setSelectedCycleId(newCycle.id);
    setView("cycle");
  }

  // ─── UPDATE TASK ───────────────────────────────────────────
  function updateTask(cycleId, taskId, updates) {
    const updated = cycles.map((c) => {
      if (c.id !== cycleId) return c;
      const updatedTasks = c.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, ...updates };
      });
      const allDone = updatedTasks.every((t) => t.status === "done");
      return {
        ...c,
        tasks: updatedTasks,
        status: allDone ? "completed" : "active",
      };
    });
    saveCycles(updated);
  }

  // ─── DELETE CYCLE ──────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function deleteCycle(cycleId) {
    if (confirmDeleteId !== cycleId) {
      setConfirmDeleteId(cycleId);
      return;
    }
    saveCycles(cycles.filter((c) => c.id !== cycleId));
    setConfirmDeleteId(null);
    setView("dashboard");
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  // Get selected cycle
  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  if (!unlocked) {
    return (
      <div style={styles.app}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 24,
        }}>
          <div style={styles.logo}>⏱</div>
          <h1 style={{ ...styles.headerTitle, color: "#1e3a5f", fontSize: 28, marginTop: 12 }}>
            Parl Tracker
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, fontFamily: "system-ui, sans-serif", marginBottom: 24 }}>
            Enter passcode to continue
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setPasscodeError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handlePasscodeSubmit()}
            placeholder="••••"
            style={{
              ...styles.input,
              width: 160,
              textAlign: "center",
              fontSize: 24,
              letterSpacing: 8,
              borderColor: passcodeError ? "#ef4444" : "#d1d5db",
            }}
          />
          {passcodeError && (
            <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8, fontFamily: "system-ui, sans-serif" }}>
              Incorrect passcode
            </p>
          )}
          <button onClick={handlePasscodeSubmit} style={{ ...styles.btnPrimary, marginTop: 16 }}>
            Enter
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <div style={styles.logo}>⏱</div>
            <div>
              <h1 style={styles.headerTitle}>Parl Tracker</h1>
              <p style={styles.headerSub}>Parliamentary Affairs Cycle Manager</p>
            </div>
          </div>
          <nav style={styles.nav}>
            {[
              ["dashboard", "Dashboard"],
              ["add", "+ Sitting Date"],
              ["tasks", "My Tasks"],
              ["team", "Team"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  ...styles.navBtn,
                  ...(view === v ? styles.navBtnActive : {}),
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ─── CONTENT ────────────────────────────────────────── */}
      <main style={styles.main}>
        {view === "dashboard" && (
          <DashboardView
            cycles={cycles}
            onSelect={(id) => {
              setSelectedCycleId(id);
              setView("cycle");
            }}
          />
        )}
        {view === "add" && (
          <AddSittingView onAdd={addSittingDate} onCancel={() => setView("dashboard")} />
        )}
        {view === "cycle" && selectedCycle && (
          <CycleDetailView
            cycle={selectedCycle}
            team={team}
            onUpdateTask={(taskId, updates) =>
              updateTask(selectedCycle.id, taskId, updates)
            }
            onDelete={() => deleteCycle(selectedCycle.id)}
            onCancelDelete={cancelDelete}
            confirmingDelete={confirmDeleteId === selectedCycle.id}
            onBack={() => setView("dashboard")}
          />
        )}
        {view === "tasks" && (
          <MyTasksView
            cycles={cycles}
            team={team}
            onGoToCycle={(id) => {
              setSelectedCycleId(id);
              setView("cycle");
            }}
          />
        )}
        {view === "team" && <TeamView team={team} onSave={saveTeam} />}
      </main>
    </div>
  );
}

// ─── DASHBOARD VIEW ──────────────────────────────────────────
function DashboardView({ cycles, onSelect }) {
  const [filter, setFilter] = useState("active");
  const sorted = [...cycles].sort(
    (a, b) => new Date(b.sittingDate) - new Date(a.sittingDate)
  );
  const filtered =
    filter === "all" ? sorted : sorted.filter((c) => c.status === "active");

  return (
    <div>
      <div style={styles.viewHeader}>
        <h2 style={styles.viewTitle}>Dashboard</h2>
        <div style={styles.filterGroup}>
          {["active", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
            >
              {f === "active" ? "Active" : "All Cycles"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <p style={styles.emptyText}>No cycles yet.</p>
          <p style={styles.emptySubtext}>
            Add a Parliament sitting date to get started.
          </p>
        </div>
      ) : (
        <div style={styles.cycleGrid}>
          {filtered.map((cycle) => {
            const done = cycle.tasks.filter((t) => t.status === "done").length;
            const total = cycle.tasks.length;
            const overdue = cycle.tasks.filter(
              (t) => t.status !== "done" && isOverdue(t.deadlineDate)
            ).length;
            const pct = Math.round((done / total) * 100);

            return (
              <button
                key={cycle.id}
                onClick={() => onSelect(cycle.id)}
                style={styles.cycleCard}
              >
                <div style={styles.cycleCardTop}>
                  <span
                    style={{
                      ...styles.statusDot,
                      background:
                        cycle.status === "completed"
                          ? "#22c55e"
                          : overdue > 0
                          ? "#ef4444"
                          : "#f59e0b",
                    }}
                  />
                  <span style={styles.cycleDate}>
                    {formatDate(cycle.sittingDate)}
                  </span>
                </div>
                <div style={styles.progressBarOuter}>
                  <div
                    style={{
                      ...styles.progressBarInner,
                      width: `${pct}%`,
                      background:
                        cycle.status === "completed" ? "#22c55e" : "#1e3a5f",
                    }}
                  />
                </div>
                <div style={styles.cycleCardBottom}>
                  <span style={styles.cycleProgress}>
                    {done}/{total} tasks done
                  </span>
                  {overdue > 0 && (
                    <span style={styles.overdueTag}>{overdue} overdue</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADD SITTING DATE VIEW ───────────────────────────────────
function AddSittingView({ onAdd, onCancel }) {
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.viewTitle}>Add Parliament Sitting Date</h2>
      <p style={styles.formHint}>
        This will auto-generate 8 tasks with calculated deadlines and update any previous cycle's pre-sitting tasks.
      </p>
      <div style={styles.formGroup}>
        <label style={styles.label}>Sitting Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Budget debate, Motion on housing..."
          style={styles.textarea}
        />
      </div>
      <div style={styles.formActions}>
        <button onClick={onCancel} style={styles.btnSecondary}>
          Cancel
        </button>
        <button
          onClick={() => {
            if (!date) return alert("Please pick a date.");
            onAdd(date, notes);
          }}
          style={styles.btnPrimary}
        >
          Create Cycle
        </button>
      </div>
    </div>
  );
}

// ─── CYCLE DETAIL VIEW ───────────────────────────────────────
function CycleDetailView({
  cycle,
  team,
  onUpdateTask,
  onDelete,
  onCancelDelete,
  confirmingDelete,
  onBack,
}) {
  const postTasks = cycle.tasks.filter((t) => t.phase === "post");
  const preTasks = cycle.tasks.filter((t) => t.phase === "pre");

  function downloadPDF() {
    const taskRows = cycle.tasks
      .map((t) => {
        const status = t.status === "done" ? "✅ Done" : t.status === "in_progress" ? "🔄 In Progress" : "⬜ Not Started";
        const deadline = t.deadlineDate ? formatDate(t.deadlineDate) : "TBC";
        const assigned = t.assignedTo || "Unassigned";
        const overdue = t.status !== "done" && t.deadlineDate && isOverdue(t.deadlineDate);
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-weight:700;color:#1e3a5f;">[${t.code}]</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${t.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;${overdue ? 'color:#ef4444;font-weight:700;' : ''}">${deadline}${overdue ? ' (OVERDUE)' : ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${assigned}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${status}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html><head><title>Parl Tracker – ${formatDate(cycle.sittingDate)}</title>
<style>
  body { font-family: Georgia, serif; margin: 40px; color: #1a1a1a; }
  h1 { color: #1e3a5f; font-size: 22px; margin-bottom: 4px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; font-family: system-ui, sans-serif; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; font-family: system-ui, sans-serif; }
  th { text-align: left; padding: 8px 12px; background: #1e3a5f; color: white; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .notes { color: #64748b; font-size: 13px; margin-top: 4px; font-family: system-ui, sans-serif; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>Parliament Sitting – ${formatDate(cycle.sittingDate)}</h1>
${cycle.notes ? `<p class="notes">${cycle.notes}</p>` : ""}
<p class="sub">Generated ${formatDate(new Date().toISOString().split("T")[0])}</p>
<table>
  <thead><tr><th>Code</th><th>Task</th><th>Deadline</th><th>Assigned</th><th>Status</th></tr></thead>
  <tbody>${taskRows}</tbody>
</table>
<script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  return (
    <div>
      <button onClick={onBack} style={styles.backBtn}>
        ← Back to Dashboard
      </button>
      <div style={styles.cycleHeader}>
        <div>
          <h2 style={styles.viewTitle}>
            Sitting: {formatDate(cycle.sittingDate)}
          </h2>
          {cycle.notes && <p style={styles.cycleNotes}>{cycle.notes}</p>}
        </div>
        <div style={styles.cycleActions}>
          <button onClick={downloadPDF} style={styles.btnPrimary}>
            📄 Download PDF
          </button>
          <span
            style={{
              ...styles.statusBadge,
              background:
                cycle.status === "completed" ? "#dcfce7" : "#fef3c7",
              color: cycle.status === "completed" ? "#166534" : "#92400e",
            }}
          >
            {cycle.status === "completed" ? "✓ Completed" : "Active"}
          </span>
          <button onClick={onDelete} style={styles.btnDanger}>
            {confirmingDelete ? "Confirm Delete?" : "Delete Cycle"}
          </button>
          {confirmingDelete && (
            <button onClick={onCancelDelete} style={styles.btnSecondary}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Post-Sitting Tasks</h3>
        <span style={styles.sectionSub}>After {formatDate(cycle.sittingDate)}</span>
      </div>
      {postTasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          team={team}
          onUpdate={(updates) => onUpdateTask(task.id, updates)}
        />
      ))}

      <div style={{ ...styles.sectionHeader, marginTop: 32 }}>
        <h3 style={styles.sectionTitle}>Pre-Sitting Tasks</h3>
        <span style={styles.sectionSub}>
          Before {formatDate(cycle.sittingDate)}
        </span>
      </div>
      {preTasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          team={team}
          onUpdate={(updates) => onUpdateTask(task.id, updates)}
        />
      ))}
    </div>
  );
}

// ─── TASK ROW ────────────────────────────────────────────────
function TaskRow({ task, team, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const overdue = task.status !== "done" && isOverdue(task.deadlineDate);
  const days = daysUntil(task.deadlineDate);
  const isDone = task.status === "done";

  function toggleDone() {
    if (isDone) {
      onUpdate({ status: "not_started", completedDate: null });
    } else {
      onUpdate({
        status: "done",
        completedDate: new Date().toISOString().split("T")[0],
      });
    }
  }

  return (
    <div
      style={{
        ...styles.taskRow,
        borderLeft: overdue
          ? "4px solid #ef4444"
          : isDone
          ? "4px solid #22c55e"
          : "4px solid #d1d5db",
        opacity: isDone ? 0.7 : 1,
      }}
    >
      <div style={styles.taskMain}>
        <button onClick={toggleDone} style={styles.checkbox}>
          {isDone ? "☑" : "☐"}
        </button>
        <div style={styles.taskInfo}>
          <div style={styles.taskTitleRow}>
            <span style={styles.taskCode}>[{task.code}]</span>
            <span
              style={{
                ...styles.taskTitle,
                textDecoration: isDone ? "line-through" : "none",
              }}
            >
              {task.title}
            </span>
          </div>
          <div style={styles.taskMeta}>
            <span style={styles.deadlineRule}>{task.deadlineRule}</span>
            {task.deadlineDate ? (
              <span
                style={{
                  ...styles.deadlineDate,
                  color: overdue ? "#ef4444" : days !== null && days <= 2 ? "#f59e0b" : "#64748b",
                }}
              >
                Due: {formatDate(task.deadlineDate)}
                {!overdue && days !== null && days >= 0 && ` (${days}d left)`}
              </span>
            ) : (
              <span style={styles.deadlinePending}>Date TBC</span>
            )}
            {overdue && (
              <span style={{
                fontSize: 11,
                color: "#ef4444",
                background: "#fef2f2",
                padding: "2px 8px",
                borderRadius: 10,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
              }}>
                🔴 {days !== null ? `${Math.abs(days)}d overdue` : "OVERDUE"}
              </span>
            )}
            {task.assignedTo && (
              <span style={styles.assignedTag}>→ {task.assignedTo}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={styles.expandBtn}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <div style={styles.taskExpanded}>
          <p style={styles.taskDesc}>{task.description}</p>
          <div style={styles.taskFields}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Status</label>
              <select
                value={task.status}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdate({
                    status: val,
                    completedDate:
                      val === "done"
                        ? new Date().toISOString().split("T")[0]
                        : null,
                  });
                }}
                style={styles.select}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Assigned To</label>
              <select
                value={task.assignedTo}
                onChange={(e) => onUpdate({ assignedTo: e.target.value })}
                style={styles.select}
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.role ? `(${m.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {task.code === "F" && (
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  Manual Deadline (Order Paper date)
                </label>
                <input
                  type="date"
                  value={task.deadlineDate || ""}
                  onChange={(e) =>
                    onUpdate({ deadlineDate: e.target.value || null })
                  }
                  style={styles.input}
                />
              </div>
            )}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Notes</label>
              <textarea
                value={task.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="Add notes..."
                style={styles.textareaSmall}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MY TASKS VIEW ───────────────────────────────────────────
function MyTasksView({ cycles, team, onGoToCycle }) {
  const [filterPerson, setFilterPerson] = useState("");

  // Gather all tasks from active cycles
  const allTasks = cycles
    .filter((c) => c.status === "active")
    .flatMap((c) =>
      c.tasks.map((t) => ({
        ...t,
        cycleId: c.id,
        sittingDate: c.sittingDate,
      }))
    )
    .filter((t) => t.status !== "done")
    .filter((t) => !filterPerson || t.assignedTo === filterPerson)
    .sort((a, b) => {
      if (!a.deadlineDate) return 1;
      if (!b.deadlineDate) return -1;
      return new Date(a.deadlineDate) - new Date(b.deadlineDate);
    });

  return (
    <div>
      <div style={styles.viewHeader}>
        <h2 style={styles.viewTitle}>Outstanding Tasks</h2>
        <select
          value={filterPerson}
          onChange={(e) => setFilterPerson(e.target.value)}
          style={styles.select}
        >
          <option value="">All team members</option>
          {team.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {allTasks.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✅</div>
          <p style={styles.emptyText}>All clear!</p>
          <p style={styles.emptySubtext}>No outstanding tasks.</p>
        </div>
      ) : (
        allTasks.map((task) => (
          <div key={task.id + task.cycleId} style={styles.myTaskRow}>
            <div style={styles.myTaskLeft}>
              <span style={styles.taskCode}>[{task.code}]</span>
              <span style={styles.taskTitle}>{task.title}</span>
            </div>
            <div style={styles.myTaskRight}>
              {task.assignedTo && (
                <span style={styles.assignedTag}>{task.assignedTo}</span>
              )}
              <span
                style={{
                  ...styles.deadlineDate,
                  color:
                    task.deadlineDate && isOverdue(task.deadlineDate)
                      ? "#ef4444"
                      : "#64748b",
                }}
              >
                {task.deadlineDate
                  ? formatDate(task.deadlineDate)
                  : "Date TBC"}
              </span>
              <button
                onClick={() => onGoToCycle(task.cycleId)}
                style={styles.linkBtn}
              >
                View →
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── TEAM VIEW ───────────────────────────────────────────────
function TeamView({ team, onSave }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  function addMember() {
    if (!name.trim()) return;
    onSave([...team, { id: generateId(), name: name.trim(), role: role.trim() }]);
    setName("");
    setRole("");
  }

  function removeMember(id) {
    onSave(team.filter((m) => m.id !== id));
  }

  return (
    <div>
      <h2 style={styles.viewTitle}>Team Members</h2>
      <p style={styles.formHint}>
        Add team members here. You can then assign them to tasks in each cycle.
      </p>

      <div style={styles.teamAddRow}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          style={{ ...styles.input, flex: 2 }}
          onKeyDown={(e) => e.key === "Enter" && addMember()}
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (optional)"
          style={{ ...styles.input, flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && addMember()}
        />
        <button onClick={addMember} style={styles.btnPrimary}>
          Add
        </button>
      </div>

      {team.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👥</div>
          <p style={styles.emptyText}>No team members yet.</p>
        </div>
      ) : (
        <div style={styles.teamList}>
          {team.map((m) => (
            <div key={m.id} style={styles.teamRow}>
              <div>
                <span style={styles.teamName}>{m.name}</span>
                {m.role && <span style={styles.teamRole}>{m.role}</span>}
              </div>
              <button
                onClick={() => removeMember(m.id)}
                style={styles.removeBtn}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = {
  app: {
    fontFamily: '"Source Serif 4", "Georgia", serif',
    background: "#f8f6f1",
    minHeight: "100vh",
    color: "#1a1a1a",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#f8f6f1",
  },
  loadingText: {
    fontFamily: '"Source Serif 4", Georgia, serif',
    fontSize: 18,
    color: "#64748b",
  },
  header: {
    background: "#1e3a5f",
    color: "white",
    padding: "16px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 900,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logo: { fontSize: 28 },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    fontFamily: '"Source Serif 4", Georgia, serif',
    letterSpacing: "-0.02em",
  },
  headerSub: {
    margin: 0,
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'system-ui, sans-serif',
  },
  nav: { display: "flex", gap: 4, flexWrap: "wrap" },
  navBtn: {
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 500,
    transition: "all 0.15s",
  },
  navBtnActive: {
    background: "rgba(255,255,255,0.15)",
    color: "white",
    borderColor: "rgba(255,255,255,0.4)",
  },
  main: { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },

  // View header
  viewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  viewTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#1e3a5f",
  },

  // Filters
  filterGroup: { display: "flex", gap: 4 },
  filterBtn: {
    background: "white",
    border: "1px solid #d1d5db",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: 'system-ui, sans-serif',
    color: "#64748b",
  },
  filterBtnActive: {
    background: "#1e3a5f",
    color: "white",
    borderColor: "#1e3a5f",
  },

  // Empty state
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 600, color: "#1e3a5f", margin: "0 0 4px" },
  emptySubtext: { fontSize: 14, color: "#64748b", margin: 0 },

  // Cycle cards
  cycleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  cycleCard: {
    background: "white",
    border: "1px solid #e2e0db",
    borderRadius: 10,
    padding: 20,
    textAlign: "left",
    cursor: "pointer",
    transition: "box-shadow 0.15s, transform 0.15s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    width: "100%",
    fontFamily: "inherit",
  },
  cycleCardTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  cycleDate: { fontSize: 16, fontWeight: 600, color: "#1e3a5f" },
  progressBarOuter: {
    height: 6,
    background: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarInner: { height: "100%", borderRadius: 3, transition: "width 0.3s" },
  cycleCardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cycleProgress: { fontSize: 13, color: "#64748b", fontFamily: "system-ui, sans-serif" },
  overdueTag: {
    fontSize: 11,
    color: "#ef4444",
    background: "#fef2f2",
    padding: "2px 8px",
    borderRadius: 10,
    fontWeight: 600,
    fontFamily: "system-ui, sans-serif",
  },

  // Forms
  formContainer: { maxWidth: 500 },
  formHint: { color: "#64748b", fontSize: 14, marginBottom: 24, fontFamily: "system-ui, sans-serif" },
  formGroup: { marginBottom: 20 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
    fontFamily: "system-ui, sans-serif",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 15,
    fontFamily: "inherit",
    background: "white",
    boxSizing: "border-box",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 15,
    fontFamily: "inherit",
    minHeight: 80,
    resize: "vertical",
    boxSizing: "border-box",
    outline: "none",
  },
  textareaSmall: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "system-ui, sans-serif",
    minHeight: 50,
    resize: "vertical",
    boxSizing: "border-box",
    outline: "none",
  },
  select: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "system-ui, sans-serif",
    background: "white",
    cursor: "pointer",
    outline: "none",
  },
  formActions: { display: "flex", gap: 10, marginTop: 24 },
  btnPrimary: {
    background: "#1e3a5f",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "system-ui, sans-serif",
  },
  btnSecondary: {
    background: "white",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
  },
  btnDanger: {
    background: "white",
    color: "#ef4444",
    border: "1px solid #fecaca",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "system-ui, sans-serif",
  },

  // Cycle detail
  backBtn: {
    background: "none",
    border: "none",
    color: "#1e3a5f",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    padding: "4px 0",
    marginBottom: 16,
  },
  cycleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  cycleNotes: { color: "#64748b", fontSize: 14, margin: "4px 0 0", fontFamily: "system-ui, sans-serif" },
  cycleActions: { display: "flex", gap: 10, alignItems: "center" },
  statusBadge: {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "system-ui, sans-serif",
  },

  // Section headers
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "2px solid #1e3a5f",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#1e3a5f",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontFamily: "system-ui, sans-serif",
  },
  sectionSub: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "system-ui, sans-serif",
  },

  // Task rows
  taskRow: {
    background: "white",
    border: "1px solid #e2e0db",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  taskMain: {
    display: "flex",
    alignItems: "flex-start",
    padding: "12px 16px",
    gap: 12,
  },
  checkbox: {
    background: "none",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
    marginTop: 2,
  },
  taskInfo: { flex: 1, minWidth: 0 },
  taskTitleRow: { display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" },
  taskCode: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e3a5f",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  taskTitle: { fontSize: 15, fontWeight: 500, color: "#1a1a1a" },
  taskMeta: {
    display: "flex",
    gap: 12,
    marginTop: 4,
    flexWrap: "wrap",
    alignItems: "center",
  },
  deadlineRule: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "system-ui, sans-serif",
  },
  deadlineDate: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "system-ui, sans-serif",
  },
  deadlinePending: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: 600,
    fontFamily: "system-ui, sans-serif",
  },
  assignedTag: {
    fontSize: 11,
    color: "#1e3a5f",
    background: "#e8f0fe",
    padding: "2px 8px",
    borderRadius: 10,
    fontFamily: "system-ui, sans-serif",
    fontWeight: 500,
  },
  expandBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    color: "#94a3b8",
    padding: "4px 8px",
    flexShrink: 0,
  },

  // Expanded task
  taskExpanded: {
    padding: "0 16px 16px 50px",
    borderTop: "1px solid #f1f1ef",
  },
  taskDesc: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 1.5,
    fontFamily: "system-ui, sans-serif",
  },
  taskFields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fieldGroup: {},
  fieldLabel: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontFamily: "system-ui, sans-serif",
  },

  // My Tasks
  myTaskRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    border: "1px solid #e2e0db",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 6,
    gap: 12,
    flexWrap: "wrap",
  },
  myTaskLeft: { display: "flex", gap: 8, alignItems: "baseline", flex: 1, minWidth: 0 },
  myTaskRight: { display: "flex", gap: 10, alignItems: "center", flexShrink: 0 },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#1e3a5f",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "system-ui, sans-serif",
  },

  // Team
  teamAddRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  teamList: {},
  teamRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    border: "1px solid #e2e0db",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 6,
  },
  teamName: { fontSize: 15, fontWeight: 600, color: "#1a1a1a" },
  teamRole: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 10,
    fontFamily: "system-ui, sans-serif",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 16,
    padding: "4px 8px",
  },
};
