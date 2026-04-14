import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "med-reminder-data";

// --- Utility helpers ---
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  return `${months[d.getMonth()]}${d.getDate()}日`;
};

const formatWeekday = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["周日","周一","周二","周三","周四","周五","周六"];
  return days[d.getDay()];
};

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getDatesInRange = (start, end) => {
  const dates = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
};

const shouldTakeMed = (med, dateStr) => {
  if (dateStr < med.startDate) return false;
  if (med.endDate && dateStr > med.endDate) return false;
  const start = new Date(med.startDate + "T00:00:00");
  const check = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((check - start) / 86400000);
  return diffDays % med.cycleDays < med.takeDays;
};

const generateId = () => Math.random().toString(36).slice(2, 10);

// --- Icons ---
const PillIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 1.5l-8 8a4.95 4.95 0 007 7l8-8a4.95 4.95 0 00-7-7z"/>
    <path d="M8.5 8.5l7-7"/>
  </svg>
);

const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const BellIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);

const CalendarIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const HistoryIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

// --- Color palette for meds ---
const MED_COLORS = [
  { bg: "#E8F5E9", accent: "#43A047", text: "#1B5E20" },
  { bg: "#E3F2FD", accent: "#1E88E5", text: "#0D47A1" },
  { bg: "#FFF3E0", accent: "#FB8C00", text: "#E65100" },
  { bg: "#FCE4EC", accent: "#E91E63", text: "#880E4F" },
  { bg: "#F3E5F5", accent: "#8E24AA", text: "#4A148C" },
  { bg: "#E0F7FA", accent: "#00ACC1", text: "#006064" },
];

// --- Main App ---
export default function MedicationReminder() {
  const [meds, setMeds] = useState([]);
  const [records, setRecords] = useState({});
  const [view, setView] = useState("today"); // today | calendar | add | history
  const [loading, setLoading] = useState(true);
  const [editMed, setEditMed] = useState(null);
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  // --- Storage ---
  const loadData = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setMeds(data.meds || []);
        setRecords(data.records || {});
      }
    } catch {
      // No data yet
    }
    setLoading(false);
  }, []);

  const saveData = useCallback((newMeds, newRecords) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ meds: newMeds, records: newRecords }));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Med CRUD ---
  const addMed = (med) => {
    const newMeds = [...meds, { ...med, id: generateId(), colorIdx: meds.length % MED_COLORS.length }];
    setMeds(newMeds);
    saveData(newMeds, records);
    setView("today");
    showToast("💊 药物已添加");
  };

  const deleteMed = (id) => {
    const newMeds = meds.filter(m => m.id !== id);
    const newRecords = { ...records };
    Object.keys(newRecords).forEach(k => {
      if (k.startsWith(id + ":")) delete newRecords[k];
    });
    setMeds(newMeds);
    setRecords(newRecords);
    saveData(newMeds, newRecords);
    showToast("已删除药物");
  };

  const toggleRecord = (medId, dateStr, timeSlot) => {
    const key = `${medId}:${dateStr}:${timeSlot}`;
    const newRecords = { ...records };
    if (newRecords[key]) {
      delete newRecords[key];
    } else {
      newRecords[key] = new Date().toISOString();
    }
    setRecords(newRecords);
    saveData(meds, newRecords);
    if (newRecords[key]) showToast("✅ 已记录服药");
  };

  const isRecorded = (medId, dateStr, timeSlot) => !!records[`${medId}:${dateStr}:${timeSlot}`];

  // --- Today's tasks ---
  const todayStr = today();
  const todayMeds = meds.filter(m => shouldTakeMed(m, todayStr));
  const todayTotal = todayMeds.reduce((s, m) => s + m.times.length, 0);
  const todayDone = todayMeds.reduce((s, m) => s + m.times.filter(t => isRecorded(m.id, todayStr, t)).length, 0);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingPill}>💊</div>
        <p style={styles.loadingText}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Background decoration */}
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>药丸日记</h1>
            <p style={styles.subtitle}>{formatDate(todayStr)} {formatWeekday(todayStr)}</p>
          </div>
          <div style={styles.headerBadge}>
            <BellIcon size={18} />
            <span style={styles.badgeCount}>{todayTotal - todayDone > 0 ? todayTotal - todayDone : "✓"}</span>
          </div>
        </div>
        {todayTotal > 0 && (
          <div style={styles.progressWrap}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%` }} />
            </div>
            <span style={styles.progressLabel}>{todayDone}/{todayTotal} 已服药</span>
          </div>
        )}
      </header>

      {/* Content */}
      <main style={styles.main}>
        {view === "today" && <TodayView meds={todayMeds} todayStr={todayStr} isRecorded={isRecorded} toggleRecord={toggleRecord} allMeds={meds} deleteMed={deleteMed} setView={setView} />}
        {view === "add" && <AddMedView onAdd={addMed} onCancel={() => setView("today")} />}
        {view === "calendar" && <CalendarView meds={meds} records={records} isRecorded={isRecorded} toggleRecord={toggleRecord} weekOffset={calendarWeekOffset} setWeekOffset={setCalendarWeekOffset} todayStr={todayStr} />}
        {view === "history" && <HistoryView meds={meds} records={records} todayStr={todayStr} />}
      </main>

      {/* Bottom Nav */}
      <nav style={styles.nav}>
        {[
          { key: "today", icon: <PillIcon size={22} />, label: "今日" },
          { key: "calendar", icon: <CalendarIcon size={22} />, label: "日历" },
          { key: "add", icon: <PlusIcon size={26} />, label: "添加", special: true },
          { key: "history", icon: <HistoryIcon size={22} />, label: "记录" },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setView(item.key)}
            style={{
              ...styles.navBtn,
              ...(item.special ? styles.navBtnSpecial : {}),
              ...(view === item.key && !item.special ? styles.navBtnActive : {}),
            }}
          >
            {item.icon}
            <span style={{
              ...styles.navLabel,
              ...(view === item.key ? styles.navLabelActive : {}),
            }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// --- Today View ---
function TodayView({ meds, todayStr, isRecorded, toggleRecord, allMeds, deleteMed, setView }) {
  if (allMeds.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>💊</div>
        <h3 style={styles.emptyTitle}>还没有添加药物</h3>
        <p style={styles.emptyText}>点击下方"添加"按钮开始管理你的用药计划</p>
        <button style={styles.emptyBtn} onClick={() => setView("add")}>
          <PlusIcon size={18} /> 添加第一个药物
        </button>
      </div>
    );
  }

  if (meds.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🎉</div>
        <h3 style={styles.emptyTitle}>今天不需要吃药</h3>
        <p style={styles.emptyText}>好好休息，享受无药日吧！</p>
      </div>
    );
  }

  const timeLabels = { morning: "🌅 早上", noon: "☀️ 中午", evening: "🌙 晚上" };

  return (
    <div style={styles.todayList}>
      {meds.map(med => {
        const color = MED_COLORS[med.colorIdx || 0];
        const allDone = med.times.every(t => isRecorded(med.id, todayStr, t));
        return (
          <div key={med.id} style={{ ...styles.medCard, borderLeft: `4px solid ${color.accent}`, background: allDone ? `${color.bg}88` : "#fff", opacity: allDone ? 0.75 : 1 }}>
            <div style={styles.medCardHeader}>
              <div>
                <h3 style={{ ...styles.medName, color: color.text }}>{med.name}</h3>
                <p style={styles.medDosage}>{med.dosage} · 每{med.cycleDays}天吃{med.takeDays}天</p>
              </div>
              <button style={styles.deleteBtn} onClick={() => { if (confirm(`确认删除「${med.name}」？`)) deleteMed(med.id); }}>
                <TrashIcon size={14} />
              </button>
            </div>
            <div style={styles.timeSlots}>
              {med.times.map(t => {
                const done = isRecorded(med.id, todayStr, t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleRecord(med.id, todayStr, t)}
                    style={{
                      ...styles.timeSlot,
                      background: done ? color.accent : color.bg,
                      color: done ? "#fff" : color.text,
                      border: `1.5px solid ${done ? color.accent : color.accent + "40"}`,
                    }}
                  >
                    {done ? <CheckIcon size={14} /> : null}
                    <span>{timeLabels[t] || t}</span>
                  </button>
                );
              })}
            </div>
            {med.note && <p style={styles.medNote}>📝 {med.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

// --- Add Med View ---
function AddMedView({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [cycleDays, setCycleDays] = useState(7);
  const [takeDays, setTakeDays] = useState(5);
  const [times, setTimes] = useState(["morning"]);
  const [startDate, setStartDate] = useState(today());
  const [note, setNote] = useState("");

  const toggleTime = (t) => {
    setTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), dosage: dosage.trim() || "按医嘱", cycleDays, takeDays, times, startDate, note: note.trim(), endDate: null });
  };

  const timeOptions = [
    { key: "morning", label: "🌅 早上" },
    { key: "noon", label: "☀️ 中午" },
    { key: "evening", label: "🌙 晚上" },
  ];

  return (
    <div style={styles.addForm}>
      <h2 style={styles.formTitle}>添加药物</h2>

      <label style={styles.label}>药物名称 *</label>
      <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="如：氯雷他定片" />

      <label style={styles.label}>用量</label>
      <input style={styles.input} value={dosage} onChange={e => setDosage(e.target.value)} placeholder="如：每次1片" />

      <label style={styles.label}>用药周期</label>
      <div style={styles.cycleRow}>
        <span style={styles.cycleLabel}>每</span>
        <input style={styles.numInput} type="number" min={1} max={90} value={cycleDays} onChange={e => setCycleDays(Math.max(1, +e.target.value))} />
        <span style={styles.cycleLabel}>天为一个周期，吃</span>
        <input style={styles.numInput} type="number" min={1} max={cycleDays} value={takeDays} onChange={e => setTakeDays(Math.max(1, Math.min(cycleDays, +e.target.value)))} />
        <span style={styles.cycleLabel}>天</span>
      </div>
      <p style={styles.cycleHint}>即：吃 {takeDays} 天，停 {cycleDays - takeDays} 天，循环</p>

      <label style={styles.label}>每天服药时间</label>
      <div style={styles.timeOptions}>
        {timeOptions.map(t => (
          <button
            key={t.key}
            onClick={() => toggleTime(t.key)}
            style={{
              ...styles.timeOption,
              ...(times.includes(t.key) ? styles.timeOptionActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label style={styles.label}>开始日期</label>
      <input style={styles.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />

      <label style={styles.label}>备注</label>
      <input style={styles.input} value={note} onChange={e => setNote(e.target.value)} placeholder="如：饭后服用，配合鼻喷剂" />

      <div style={styles.formActions}>
        <button style={styles.cancelBtn} onClick={onCancel}>取消</button>
        <button style={{ ...styles.submitBtn, opacity: name.trim() ? 1 : 0.5 }} onClick={handleSubmit} disabled={!name.trim()}>添加药物</button>
      </div>
    </div>
  );
}

// --- Calendar View ---
function CalendarView({ meds, records, isRecorded, toggleRecord, weekOffset, setWeekOffset, todayStr }) {
  const weekStart = addDays(todayStr, weekOffset * 7 - new Date(todayStr + "T00:00:00").getDay());
  const dates = getDatesInRange(weekStart, addDays(weekStart, 6));
  const timeLabels = { morning: "早", noon: "午", evening: "晚" };

  return (
    <div>
      <div style={styles.calHeader}>
        <button style={styles.calArrow} onClick={() => setWeekOffset(weekOffset - 1)}>◀</button>
        <span style={styles.calTitle}>{formatDate(dates[0])} - {formatDate(dates[6])}</span>
        <button style={styles.calArrow} onClick={() => setWeekOffset(weekOffset + 1)}>▶</button>
        {weekOffset !== 0 && <button style={styles.calToday} onClick={() => setWeekOffset(0)}>回到本周</button>}
      </div>

      <div style={styles.calGrid}>
        {/* Day headers */}
        {dates.map(d => (
          <div key={d} style={{ ...styles.calDayHeader, ...(d === todayStr ? styles.calDayToday : {}) }}>
            <span style={styles.calDayName}>{formatWeekday(d)}</span>
            <span style={styles.calDayNum}>{new Date(d + "T00:00:00").getDate()}</span>
          </div>
        ))}

        {/* Med rows */}
        {meds.map(med => {
          const color = MED_COLORS[med.colorIdx || 0];
          return dates.map(d => {
            const active = shouldTakeMed(med, d);
            const doneCount = active ? med.times.filter(t => isRecorded(med.id, d, t)).length : 0;
            const total = med.times.length;
            return (
              <div key={`${med.id}-${d}`} style={{ ...styles.calCell, background: active ? (doneCount === total ? color.accent + "22" : "#fff") : "#f9f9f9" }}>
                {active ? (
                  <div style={styles.calCellInner}>
                    <span style={{ fontSize: 10, color: color.text, fontWeight: 600 }}>{med.name.slice(0, 3)}</span>
                    <div style={styles.calDots}>
                      {med.times.map(t => (
                        <button
                          key={t}
                          onClick={() => toggleRecord(med.id, d, t)}
                          title={`${timeLabels[t]} - ${med.name}`}
                          style={{
                            ...styles.calDot,
                            background: isRecorded(med.id, d, t) ? color.accent : color.accent + "30",
                          }}
                        >
                          <span style={{ fontSize: 8, color: isRecorded(med.id, d, t) ? "#fff" : color.text }}>{timeLabels[t]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 10, color: "#ccc" }}>—</span>
                )}
              </div>
            );
          });
        })}
      </div>

      {meds.length === 0 && (
        <p style={{ textAlign: "center", color: "#999", marginTop: 40, fontSize: 14 }}>还没有药物，请先添加</p>
      )}
    </div>
  );
}

// --- History View ---
function HistoryView({ meds, records, todayStr }) {
  const last7 = getDatesInRange(addDays(todayStr, -6), todayStr).reverse();

  const stats = meds.map(med => {
    let total = 0, done = 0;
    last7.forEach(d => {
      if (shouldTakeMed(med, d)) {
        med.times.forEach(t => {
          total++;
          if (records[`${med.id}:${d}:${t}`]) done++;
        });
      }
    });
    return { ...med, total, done, rate: total > 0 ? Math.round(done / total * 100) : 0 };
  });

  return (
    <div>
      <h2 style={styles.sectionTitle}>过去 7 天服药记录</h2>
      {stats.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999", marginTop: 40, fontSize: 14 }}>暂无数据</p>
      ) : (
        <div style={styles.statsList}>
          {stats.map(s => {
            const color = MED_COLORS[s.colorIdx || 0];
            return (
              <div key={s.id} style={{ ...styles.statCard, borderLeft: `4px solid ${color.accent}` }}>
                <div style={styles.statHeader}>
                  <h3 style={{ ...styles.medName, color: color.text }}>{s.name}</h3>
                  <span style={{ ...styles.statRate, color: s.rate >= 80 ? "#43A047" : s.rate >= 50 ? "#FB8C00" : "#E53935" }}>{s.rate}%</span>
                </div>
                <div style={styles.statBarOuter}>
                  <div style={{ ...styles.statBarInner, width: `${s.rate}%`, background: color.accent }} />
                </div>
                <p style={styles.statDetail}>{s.done}/{s.total} 次已服药</p>
                {/* Day-by-day dots */}
                <div style={styles.dayDots}>
                  {last7.map(d => {
                    const active = shouldTakeMed(s, d);
                    const allDone = active && s.times.every(t => records[`${s.id}:${d}:${t}`]);
                    const someDone = active && s.times.some(t => records[`${s.id}:${d}:${t}`]);
                    return (
                      <div key={d} style={styles.dayDotWrap}>
                        <div style={{
                          ...styles.dayDot,
                          background: !active ? "#eee" : allDone ? color.accent : someDone ? color.accent + "60" : color.accent + "20",
                          border: d === todayStr ? `2px solid ${color.accent}` : "2px solid transparent",
                        }} />
                        <span style={styles.dayDotLabel}>{new Date(d + "T00:00:00").getDate()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const styles = {
  container: {
    maxWidth: 440,
    margin: "0 auto",
    minHeight: "100vh",
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', -apple-system, sans-serif",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(170deg, #F1F8E9 0%, #FAFAFA 30%, #E8F5E9 100%)",
    display: "flex",
    flexDirection: "column",
  },
  bgBlob1: {
    position: "absolute", top: -60, right: -60, width: 200, height: 200,
    borderRadius: "50%", background: "radial-gradient(circle, #A5D6A740 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgBlob2: {
    position: "absolute", bottom: 80, left: -80, width: 250, height: 250,
    borderRadius: "50%", background: "radial-gradient(circle, #81C78440 0%, transparent 70%)",
    pointerEvents: "none",
  },
  toast: {
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
    background: "#2E7D32", color: "#fff", padding: "10px 24px", borderRadius: 30,
    fontSize: 14, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 20px #2E7D3240",
    animation: "fadeIn 0.3s ease",
  },
  header: {
    position: "relative", zIndex: 1, padding: "24px 20px 16px",
  },
  headerTop: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  },
  title: {
    margin: 0, fontSize: 28, fontWeight: 800, color: "#1B5E20",
    letterSpacing: -0.5,
  },
  subtitle: {
    margin: "4px 0 0", fontSize: 14, color: "#66BB6A", fontWeight: 500,
  },
  headerBadge: {
    display: "flex", alignItems: "center", gap: 6, background: "#fff",
    padding: "8px 14px", borderRadius: 20, boxShadow: "0 2px 12px #00000010",
    color: "#2E7D32",
  },
  badgeCount: { fontWeight: 700, fontSize: 14 },
  progressWrap: {
    marginTop: 16, display: "flex", alignItems: "center", gap: 12,
  },
  progressBar: {
    flex: 1, height: 8, background: "#C8E6C9", borderRadius: 10, overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "linear-gradient(90deg, #66BB6A, #2E7D32)",
    borderRadius: 10, transition: "width 0.5s ease",
  },
  progressLabel: { fontSize: 12, color: "#558B2F", fontWeight: 600, whiteSpace: "nowrap" },
  main: {
    flex: 1, position: "relative", zIndex: 1, padding: "0 16px 100px", overflowY: "auto",
  },
  // Today
  todayList: { display: "flex", flexDirection: "column", gap: 12 },
  medCard: {
    background: "#fff", borderRadius: 16, padding: 16,
    boxShadow: "0 2px 12px #00000008", transition: "all 0.2s",
  },
  medCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  medName: { margin: 0, fontSize: 17, fontWeight: 700 },
  medDosage: { margin: "3px 0 0", fontSize: 12, color: "#888" },
  medNote: { margin: "10px 0 0", fontSize: 12, color: "#888", background: "#f5f5f5", padding: "6px 10px", borderRadius: 8 },
  deleteBtn: {
    background: "none", border: "none", cursor: "pointer", color: "#ccc",
    padding: 6, borderRadius: 8, transition: "color 0.2s",
  },
  timeSlots: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  timeSlot: {
    display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
    borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: "none", transition: "all 0.2s", outline: "none",
  },
  // Empty
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: "#333" },
  emptyText: { margin: "8px 0 24px", fontSize: 14, color: "#888" },
  emptyBtn: {
    display: "inline-flex", alignItems: "center", gap: 8, background: "#2E7D32",
    color: "#fff", border: "none", padding: "12px 24px", borderRadius: 14,
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
  // Add form
  addForm: { padding: "4px 4px 20px" },
  formTitle: { margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#1B5E20" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#555", margin: "16px 0 6px" },
  input: {
    width: "100%", padding: "12px 14px", border: "1.5px solid #ddd", borderRadius: 12,
    fontSize: 15, outline: "none", boxSizing: "border-box", background: "#fff",
    transition: "border 0.2s", fontFamily: "inherit",
  },
  numInput: {
    width: 52, padding: "8px 6px", border: "1.5px solid #ddd", borderRadius: 10,
    fontSize: 15, textAlign: "center", outline: "none", fontFamily: "inherit",
  },
  cycleRow: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  cycleLabel: { fontSize: 14, color: "#555" },
  cycleHint: { fontSize: 12, color: "#999", margin: "6px 0 0" },
  timeOptions: { display: "flex", gap: 10, flexWrap: "wrap" },
  timeOption: {
    padding: "10px 18px", borderRadius: 12, border: "1.5px solid #ddd",
    background: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500,
    transition: "all 0.2s", fontFamily: "inherit", color: "#555",
  },
  timeOptionActive: {
    background: "#E8F5E9", borderColor: "#43A047", color: "#1B5E20",
  },
  formActions: {
    display: "flex", gap: 12, marginTop: 28,
  },
  cancelBtn: {
    flex: 1, padding: "14px", border: "1.5px solid #ddd", borderRadius: 14,
    background: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
    color: "#666", fontFamily: "inherit",
  },
  submitBtn: {
    flex: 2, padding: "14px", border: "none", borderRadius: 14,
    background: "linear-gradient(135deg, #43A047, #2E7D32)", color: "#fff",
    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 16px #2E7D3230",
  },
  // Calendar
  calHeader: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap",
  },
  calArrow: {
    background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px",
    cursor: "pointer", fontSize: 13, fontFamily: "inherit",
  },
  calTitle: { fontSize: 14, fontWeight: 600, color: "#333" },
  calToday: {
    background: "#E8F5E9", color: "#2E7D32", border: "none", borderRadius: 10,
    padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  calGrid: {
    display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3,
  },
  calDayHeader: {
    textAlign: "center", padding: "8px 2px", borderRadius: 10,
    background: "#fff",
  },
  calDayToday: { background: "#E8F5E9" },
  calDayName: { display: "block", fontSize: 11, color: "#888" },
  calDayNum: { display: "block", fontSize: 16, fontWeight: 700, color: "#333" },
  calCell: {
    minHeight: 48, borderRadius: 8, display: "flex", alignItems: "center",
    justifyContent: "center", padding: 3,
  },
  calCellInner: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
  },
  calDots: { display: "flex", gap: 3 },
  calDot: {
    width: 22, height: 18, borderRadius: 5, border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    fontFamily: "inherit",
  },
  // History / Stats
  sectionTitle: { margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: "#1B5E20" },
  statsList: { display: "flex", flexDirection: "column", gap: 14 },
  statCard: {
    background: "#fff", borderRadius: 16, padding: 16,
    boxShadow: "0 2px 12px #00000008",
  },
  statHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statRate: { fontSize: 24, fontWeight: 800 },
  statBarOuter: {
    height: 6, background: "#eee", borderRadius: 10, overflow: "hidden", marginTop: 10,
  },
  statBarInner: {
    height: "100%", borderRadius: 10, transition: "width 0.5s",
  },
  statDetail: { margin: "8px 0 0", fontSize: 12, color: "#888" },
  dayDots: { display: "flex", gap: 8, marginTop: 12, justifyContent: "center" },
  dayDotWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3 },
  dayDot: { width: 18, height: 18, borderRadius: "50%", transition: "all 0.2s" },
  dayDotLabel: { fontSize: 10, color: "#999" },
  // Nav
  nav: {
    position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 440, display: "flex", justifyContent: "space-around",
    alignItems: "center", padding: "10px 8px 20px", background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    borderTop: "1px solid #eee", zIndex: 10,
    boxSizing: "border-box",
  },
  navBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    background: "none", border: "none", cursor: "pointer", color: "#aaa",
    padding: "4px 8px", borderRadius: 12, transition: "all 0.2s", fontFamily: "inherit",
  },
  navBtnActive: { color: "#2E7D32" },
  navBtnSpecial: {
    background: "linear-gradient(135deg, #66BB6A, #2E7D32)", color: "#fff",
    borderRadius: 16, padding: "8px 16px", boxShadow: "0 4px 16px #2E7D3230",
  },
  navLabel: { fontSize: 11, fontWeight: 500 },
  navLabelActive: { fontWeight: 700, color: "#2E7D32" },
  // Loading
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" },
  loadingPill: { fontSize: 48, animation: "pulse 1s ease infinite" },
  loadingText: { color: "#888", fontSize: 14, marginTop: 12 },
};
