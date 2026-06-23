import * as React from "react";
import { useState, useEffect, useCallback } from "react";

const ADMIN_URL = "https://functions.poehali.dev/cf94d39b-65ea-4038-bc7e-1c867743c24a";
const ADMIN_TOKEN_KEY = "yougen_admin_token";

const INK = "#1c1c1c";
const PAPER = "#f7f7f5";
const MUTED = "#777770";
const G2 = "#2a8c2a";
const G6 = "#f0f0ee";
const BORDER = "#1c1c1c";

interface AdminUser { id: number; username: string; email: string; avatar: string; xp: number; level: number; streak: number; is_admin: boolean; created_at: string; }
interface AdminLesson { id?: number; day_number: number; title: string; subtitle: string; duration_min: number; phase: string; checklist: unknown; sort_order: number; video_url: string; video_xp: number; cover_url: string; }
interface AdminMission { id?: number; title: string; product: string; format: string; goal: string; hooks: unknown; template: string; xp_reward: number; days_available: number; unlock_after_lessons: number; sort_order: number; }

const card: React.CSSProperties = { background: "#fff", border: `2px solid ${BORDER}`, boxShadow: `4px 4px 0 ${INK}`, borderRadius: 0 };
const inputStyle: React.CSSProperties = { border: `2px solid ${BORDER}`, padding: "8px 10px", fontFamily: "inherit", fontSize: 14, width: "100%", borderRadius: 0, background: "#fff", color: INK };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: MUTED, marginBottom: 4, display: "block" };

function Btn({ children, onClick, variant = "primary", small, type }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "outline" | "danger"; small?: boolean; type?: "button" | "submit" }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: G2, color: "#fff" },
    outline: { background: "#fff", color: INK },
    danger: { background: "#fff", color: "#b62a2a", borderColor: "#b62a2a" },
  };
  return (
    <button type={type || "button"} onClick={onClick} style={{
      border: `2px solid ${variant === "danger" ? "#b62a2a" : BORDER}`, padding: small ? "5px 10px" : "9px 16px",
      fontWeight: 700, fontSize: small ? 12 : 14, cursor: "pointer", textTransform: "uppercase",
      boxShadow: `3px 3px 0 ${INK}`, borderRadius: 0, ...styles[variant],
    }}>{children}</button>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [tab, setTab] = useState<"dashboard" | "users" | "lessons" | "missions">("dashboard");
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<{ users: number; lessons: number; missions: number; posts: number } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [missions, setMissions] = useState<AdminMission[]>([]);
  const [editLesson, setEditLesson] = useState<AdminLesson | null>(null);
  const [editMission, setEditMission] = useState<AdminMission | null>(null);

  const call = useCallback(async (action: string, payload: object = {}) => {
    const res = await fetch(ADMIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка");
    return data;
  }, [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, u, l, m] = await Promise.all([
        call("dashboard"), call("list_users"), call("list_lessons"), call("list_missions"),
      ]);
      setStats(d); setUsers(u.users); setLessons(l.lessons); setMissions(m.missions);
      setAuthed(true);
    } catch {
      setAuthed(false);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setToken("");
    } finally { setLoading(false); }
  }, [call]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (token) loadAll(); }, []);

  const doLogin = async () => {
    setError("");
    try {
      const res = await fetch(ADMIN_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", login: loginVal, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка входа"); return; }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setTimeout(() => loadAll(), 0);
    } catch { setError("Ошибка соединения"); }
  };

  const logout = () => { localStorage.removeItem(ADMIN_TOKEN_KEY); setToken(""); setAuthed(false); };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: PAPER, color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'VT323', monospace", padding: 20 }}>
        <div style={{ ...card, padding: 28, width: 360 }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>🛡️ YOUGEN ADMIN</div>
          <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Панель управления платформой</div>
          <label style={labelStyle}>Логин или email</label>
          <input style={inputStyle} value={loginVal} onChange={e => setLoginVal(e.target.value)} placeholder="admin" />
          <div style={{ height: 12 }} />
          <label style={labelStyle}>Пароль</label>
          <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="••••••••" />
          {error && <div style={{ color: "#b62a2a", fontSize: 13, marginTop: 10 }}>{error}</div>}
          <div style={{ height: 18 }} />
          <Btn onClick={doLogin}>Войти</Btn>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Обзор" },
    { id: "users", label: "Пользователи" },
    { id: "lessons", label: "Уроки" },
    { id: "missions", label: "Миссии" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "'VT323', monospace" }}>
      <header style={{ borderBottom: `2px solid ${BORDER}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>🛡️ YOUGEN ADMIN</div>
        <Btn variant="outline" small onClick={logout}>Выйти</Btn>
      </header>

      <div style={{ display: "flex", gap: 8, padding: "16px 24px", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
            border: `2px solid ${BORDER}`, padding: "7px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer",
            textTransform: "uppercase", borderRadius: 0, fontFamily: "inherit",
            background: tab === t.id ? G2 : "#fff", color: tab === t.id ? "#fff" : INK,
            boxShadow: tab === t.id ? `3px 3px 0 ${INK}` : "none",
          }}>{t.label}</button>
        ))}
      </div>

      <main style={{ padding: "0 24px 60px" }}>
        {loading && <div style={{ color: MUTED }}>Загрузка...</div>}

        {tab === "dashboard" && stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, maxWidth: 720 }}>
            {[["Пользователи", stats.users], ["Уроки", stats.lessons], ["Миссии", stats.missions], ["Посты", stats.posts]].map(([k, v]) => (
              <div key={k as string} style={{ ...card, padding: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: G2 }}>{v as number}</div>
                <div style={{ color: MUTED, textTransform: "uppercase", fontSize: 13, fontWeight: 700 }}>{k as string}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <div style={{ ...card, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr style={{ background: G6, textTransform: "uppercase", fontSize: 12 }}>
                {["ID", "Юзер", "Email", "XP", "Lvl", "Стрик", "Админ", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: `2px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${G6}` }}>
                    <td style={{ padding: 10 }}>{u.id}</td>
                    <td style={{ padding: 10 }}>{u.avatar} {u.username}</td>
                    <td style={{ padding: 10, color: MUTED }}>{u.email}</td>
                    <td style={{ padding: 10 }}>
                      <input style={{ ...inputStyle, width: 70, padding: 4 }} type="number" value={u.xp}
                        onChange={e => setUsers(us => us.map(x => x.id === u.id ? { ...x, xp: +e.target.value } : x))} />
                    </td>
                    <td style={{ padding: 10 }}>
                      <input style={{ ...inputStyle, width: 50, padding: 4 }} type="number" value={u.level}
                        onChange={e => setUsers(us => us.map(x => x.id === u.id ? { ...x, level: +e.target.value } : x))} />
                    </td>
                    <td style={{ padding: 10 }}>
                      <input style={{ ...inputStyle, width: 50, padding: 4 }} type="number" value={u.streak}
                        onChange={e => setUsers(us => us.map(x => x.id === u.id ? { ...x, streak: +e.target.value } : x))} />
                    </td>
                    <td style={{ padding: 10 }}>
                      <input type="checkbox" checked={u.is_admin}
                        onChange={e => setUsers(us => us.map(x => x.id === u.id ? { ...x, is_admin: e.target.checked } : x))} />
                    </td>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                      <Btn small onClick={async () => { await call("update_user", u); }}>Сохр</Btn>{" "}
                      <Btn small variant="danger" onClick={async () => {
                        if (!confirm(`Удалить ${u.username}?`)) return;
                        await call("delete_user", { id: u.id }); setUsers(us => us.filter(x => x.id !== u.id));
                      }}>×</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "lessons" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Btn onClick={() => setEditLesson({ day_number: 1, title: "", subtitle: "", duration_min: 10, phase: "prep", checklist: [], sort_order: 0, video_url: "", video_xp: 30, cover_url: "" })}>+ Новый урок</Btn>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {lessons.map(l => (
                <div key={l.id} style={{ ...card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>День {l.day_number}: {l.title}</div>
                    <div style={{ color: MUTED, fontSize: 13 }}>{l.subtitle} · {l.phase} · {l.video_xp} XP</div>
                  </div>
                  <div style={{ whiteSpace: "nowrap" }}>
                    <Btn small variant="outline" onClick={() => setEditLesson(l)}>Изм</Btn>{" "}
                    <Btn small variant="danger" onClick={async () => {
                      if (!confirm("Удалить урок?")) return;
                      await call("delete_lesson", { id: l.id }); setLessons(ls => ls.filter(x => x.id !== l.id));
                    }}>×</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "missions" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Btn onClick={() => setEditMission({ title: "", product: "", format: "", goal: "", hooks: [], template: "", xp_reward: 500, days_available: 30, unlock_after_lessons: 0, sort_order: 0 })}>+ Новая миссия</Btn>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {missions.map(m => (
                <div key={m.id} style={{ ...card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{m.title}</div>
                    <div style={{ color: MUTED, fontSize: 13 }}>{m.format} · {m.xp_reward} XP · после {m.unlock_after_lessons} уроков</div>
                  </div>
                  <div style={{ whiteSpace: "nowrap" }}>
                    <Btn small variant="outline" onClick={() => setEditMission(m)}>Изм</Btn>{" "}
                    <Btn small variant="danger" onClick={async () => {
                      if (!confirm("Удалить миссию?")) return;
                      await call("delete_mission", { id: m.id }); setMissions(ms => ms.filter(x => x.id !== m.id));
                    }}>×</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {editLesson && (
        <Modal title={editLesson.id ? "Редактировать урок" : "Новый урок"} onClose={() => setEditLesson(null)}>
          <Field label="День"><input style={inputStyle} type="number" value={editLesson.day_number} onChange={e => setEditLesson({ ...editLesson, day_number: +e.target.value })} /></Field>
          <Field label="Заголовок"><input style={inputStyle} value={editLesson.title} onChange={e => setEditLesson({ ...editLesson, title: e.target.value })} /></Field>
          <Field label="Подзаголовок"><input style={inputStyle} value={editLesson.subtitle || ""} onChange={e => setEditLesson({ ...editLesson, subtitle: e.target.value })} /></Field>
          <Field label="Фаза (prep / publish / monetize)"><input style={inputStyle} value={editLesson.phase} onChange={e => setEditLesson({ ...editLesson, phase: e.target.value })} /></Field>
          <Field label="Длительность (мин)"><input style={inputStyle} type="number" value={editLesson.duration_min} onChange={e => setEditLesson({ ...editLesson, duration_min: +e.target.value })} /></Field>
          <Field label="XP за видео"><input style={inputStyle} type="number" value={editLesson.video_xp} onChange={e => setEditLesson({ ...editLesson, video_xp: +e.target.value })} /></Field>
          <Field label="Ссылка на видео"><input style={inputStyle} value={editLesson.video_url || ""} onChange={e => setEditLesson({ ...editLesson, video_url: e.target.value })} /></Field>
          <Field label="Обложка (URL)"><input style={inputStyle} value={editLesson.cover_url || ""} onChange={e => setEditLesson({ ...editLesson, cover_url: e.target.value })} /></Field>
          <Field label="Порядок"><input style={inputStyle} type="number" value={editLesson.sort_order} onChange={e => setEditLesson({ ...editLesson, sort_order: +e.target.value })} /></Field>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Btn onClick={async () => { await call("save_lesson", editLesson); setEditLesson(null); loadAll(); }}>Сохранить</Btn>
            <Btn variant="outline" onClick={() => setEditLesson(null)}>Отмена</Btn>
          </div>
        </Modal>
      )}

      {editMission && (
        <Modal title={editMission.id ? "Редактировать миссию" : "Новая миссия"} onClose={() => setEditMission(null)}>
          <Field label="Заголовок"><input style={inputStyle} value={editMission.title} onChange={e => setEditMission({ ...editMission, title: e.target.value })} /></Field>
          <Field label="Продукт"><input style={inputStyle} value={editMission.product || ""} onChange={e => setEditMission({ ...editMission, product: e.target.value })} /></Field>
          <Field label="Формат"><input style={inputStyle} value={editMission.format || ""} onChange={e => setEditMission({ ...editMission, format: e.target.value })} /></Field>
          <Field label="Цель"><textarea style={{ ...inputStyle, minHeight: 60 }} value={editMission.goal || ""} onChange={e => setEditMission({ ...editMission, goal: e.target.value })} /></Field>
          <Field label="Шаблон"><textarea style={{ ...inputStyle, minHeight: 60 }} value={editMission.template || ""} onChange={e => setEditMission({ ...editMission, template: e.target.value })} /></Field>
          <Field label="XP награда"><input style={inputStyle} type="number" value={editMission.xp_reward} onChange={e => setEditMission({ ...editMission, xp_reward: +e.target.value })} /></Field>
          <Field label="Дней доступно"><input style={inputStyle} type="number" value={editMission.days_available} onChange={e => setEditMission({ ...editMission, days_available: +e.target.value })} /></Field>
          <Field label="Разблок после N уроков"><input style={inputStyle} type="number" value={editMission.unlock_after_lessons} onChange={e => setEditMission({ ...editMission, unlock_after_lessons: +e.target.value })} /></Field>
          <Field label="Порядок"><input style={inputStyle} type="number" value={editMission.sort_order} onChange={e => setEditMission({ ...editMission, sort_order: +e.target.value })} /></Field>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Btn onClick={async () => { await call("save_mission", editMission); setEditMission(null); loadAll(); }}>Сохранить</Btn>
            <Btn variant="outline" onClick={() => setEditMission(null)}>Отмена</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto", zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ ...card, padding: 24, width: 480, maxWidth: "100%", marginTop: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}