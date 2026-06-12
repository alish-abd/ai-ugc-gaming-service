import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  UserCircleIcon,
  BoltIcon,
  FireIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  PencilIcon,
  ShareIcon,
  SparklesIcon,
  PlayIcon,
  LinkIcon,
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
  RocketLaunchIcon,
  TrophyIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

// ─── Config ─────────────────────────────────────────────────────────────────
const AUTH_URL = "https://functions.poehali.dev/16228047-1a09-4827-af8c-d5ca8dd48885";
const API_URL  = "https://functions.poehali.dev/58712cb3-8e82-4bb3-9940-6fa8d4df92b0";
const TOKEN_KEY = "mission_token";

// ─── Palette ─────────────────────────────────────────────────────────────────
const G  = "#1a6640";   // тёмно-зелёный основной
const GL = "#eaf4ee";   // зелёный background
const GM = "#2e8c58";   // зелёный mid
const B  = "#7a4f2c";   // коричневый
const BL = "#f7ede0";   // коричневый background
const BM = "#9e6b3c";   // коричневый mid
const INK    = "#1a1208"; // почти-чёрный текст
const MUTED  = "#8c7a68"; // приглушённый текст
const BORDER = "#e2d5c4"; // бордер

const PHASE_CONFIG = {
  prep:      { label: "День 1–7", desc: "Подготовка", color: BM, bg: BL },
  publish:   { label: "День 8–21", desc: "Публикации", color: GM, bg: GL },
  monetize:  { label: "День 22–30", desc: "Монетизация", color: G, bg: GL },
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface User {
  id: number; username: string; email: string; avatar: string;
  xp: number; level: number; streak: number;
  platform?: string; onboarded?: boolean; bio_link?: string;
}
interface Profile extends User {
  lessons_done: number; missions_done: number; posts_count: number; season_day: number;
}
interface Lesson {
  id: number; day: number; title: string; subtitle: string;
  duration: number; phase: string;
  checklist: { text: string }[];
  completed: boolean;
}
interface Mission {
  id: number; title: string; product: string | null; format: string;
  goal: string; hooks: string[]; template: string; xp: number;
  unlock_after: number; status: string | null; unlocked: boolean;
}
interface PortfolioPost {
  id: number; user_id: number; username: string;
  mission_id: number | null; mission: string | null;
  url: string; platform: string; format: string; notes: string;
  views: number; likes: number; published_at: string; is_mine: boolean;
}
type Tab = "path" | "missions" | "portfolio" | "profile";

// ─── API ─────────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const apiPost = async (url: string, body: Record<string, unknown>) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Token": getToken() }, body: JSON.stringify(body) });
  return r.json();
};
const apiGet = async (url: string) => {
  const r = await fetch(url, { headers: { "X-Session-Token": getToken() } });
  return r.json();
};
const authPost = (b: Record<string, string>) => apiPost(AUTH_URL, b);
const api = (b: Record<string, unknown>) => apiPost(API_URL, b);

// ─── UI primitives ────────────────────────────────────────────────────────────
function Pill({ children, color = G, bg = GL }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{ color, background: bg, border: `1px solid ${color}25` }}>
      {children}
    </span>
  );
}
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-white rounded-2xl ${className}`} style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", ...style }}>
      {children}
    </div>
  );
}
function Skel({ h = 16 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl w-full" style={{ height: h, background: "#f0e8dc" }} />;
}

const NAV: { id: Tab; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: "path",      label: "Путь",      Icon: MapIcon },
  { id: "missions",  label: "Миссии",    Icon: RocketLaunchIcon },
  { id: "portfolio", label: "Портфолио", Icon: FolderOpenIcon },
  { id: "profile",   label: "Профиль",   Icon: UserCircleIcon },
];

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", email: "", login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const body = mode === "register"
      ? { action: "register", username: form.username, email: form.email, password: form.password }
      : { action: "login", login: form.login, password: form.password };
    const data = await authPost(body);
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    localStorage.setItem(TOKEN_KEY, data.token);
    onAuth(data.user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-rubik" style={{ background: "#faf7f2" }}>
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: G }}>
              <RocketLaunchIcon className="w-6 h-6 text-white" />
            </div>
            <span className="font-mono-rubik text-3xl tracking-tight" style={{ color: INK }}>MISSION</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
            Ты не проходишь курс.<br />
            <strong style={{ color: G }}>Ты получаешь миссию и выполняешь её публично.</strong>
          </p>
        </div>

        <Card className="p-6">
          {/* Toggle */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "#f5ede0" }}>
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={mode === m ? { background: "#fff", color: G, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" } : { color: BM }}>
                {m === "login" ? "Войти" : "Начать"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Имя</label>
                <input value={form.username} onChange={set("username")} placeholder="creator_name"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }} />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>
                {mode === "register" ? "Email" : "Email или имя"}
              </label>
              <input
                type={mode === "register" ? "email" : "text"}
                value={mode === "register" ? form.email : form.login}
                onChange={mode === "register" ? set("email") : set("login")}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: MUTED }}>Пароль</label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }} />
            </div>
            {error && <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm mt-1 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: G }}>
              {loading ? <ClockIcon className="w-4 h-4 animate-spin" /> : <RocketLaunchIcon className="w-4 h-4" />}
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Получить первую миссию"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ─── XP Bar ───────────────────────────────────────────────────────────────────
function XpBar({ progress, color = G }: { progress: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#e2d5c4" }}>
      <div className="h-full rounded-full relative overflow-hidden transition-all duration-500"
        style={{ width: `${Math.min(100, progress)}%`, background: color }}>
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
    </div>
  );
}

// ─── XP Toast ─────────────────────────────────────────────────────────────────
function XpToast({ xp, onDone }: { xp: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
      <div className="px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2"
        style={{ background: G, boxShadow: `0 6px 24px ${G}50` }}>
        <BoltIcon className="w-4 h-4" />+{xp} XP
      </div>
    </div>
  );
}

// ─── PATH TAB ─────────────────────────────────────────────────────────────────
function PathTab({ onXpGain }: { onXpGain: (xp: number, total: number) => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);

  useEffect(() => {
    apiGet(API_URL).then(d => { if (d.lessons) setLessons(d.lessons); setLoading(false); });
  }, []);

  const complete = async (lesson: Lesson) => {
    if (lesson.completed || completing) return;
    setCompleting(lesson.id);
    const d = await api({ action: "complete_lesson", lesson_id: lesson.id });
    setCompleting(null);
    if (d.ok) {
      setLessons(ls => ls.map(l => l.id === lesson.id ? { ...l, completed: true } : l));
      if (!d.already) onXpGain(d.xp_gained, d.total_xp);
    }
  };

  const done = lessons.filter(l => l.completed).length;
  const total = lessons.length;
  const phases = ["prep", "publish", "monetize"] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold" style={{ color: INK }}>Твой путь</h2>
        <p className="text-sm mt-0.5" style={{ color: MUTED }}>30 дней от нуля до первой монетизации</p>
      </div>

      {/* Progress bar */}
      {!loading && (
        <Card className="p-5 animate-fade-in stagger-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-sm" style={{ color: INK }}>Прогресс сезона</p>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>{done} из {total} уроков выполнено</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ color: G }}>{done}</p>
              <p className="text-xs" style={{ color: MUTED }}>/ {total}</p>
            </div>
          </div>
          <XpBar progress={total > 0 ? (done / total) * 100 : 0} />
        </Card>
      )}

      {/* Phases */}
      {loading ? (
        <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skel key={i} h={72} />)}</div>
      ) : phases.map(phase => {
        const phaseLessons = lessons.filter(l => l.phase === phase);
        if (!phaseLessons.length) return null;
        const cfg = PHASE_CONFIG[phase];
        const pDone = phaseLessons.filter(l => l.completed).length;
        return (
          <div key={phase} className="space-y-2 animate-fade-in">
            {/* Phase header */}
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                {phase === "prep" && <ClockIcon className="w-4 h-4" style={{ color: cfg.color }} />}
                {phase === "publish" && <SparklesIcon className="w-4 h-4" style={{ color: cfg.color }} />}
                {phase === "monetize" && <BoltIcon className="w-4 h-4" style={{ color: cfg.color }} />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: INK }}>{cfg.desc}</p>
                <p className="text-xs" style={{ color: MUTED }}>{cfg.label} · {pDone}/{phaseLessons.length}</p>
              </div>
              <Pill color={cfg.color} bg={cfg.bg}>{pDone}/{phaseLessons.length}</Pill>
            </div>

            {phaseLessons.map((lesson, i) => {
              const isOpen = open === lesson.id;
              const canDo = lesson.completed || i === 0 || phaseLessons[i - 1]?.completed;

              return (
                <Card key={lesson.id} className="overflow-hidden" style={lesson.completed ? { borderColor: `${G}40`, background: GL } : !canDo ? { opacity: 0.5 } : {}}>
                  <button
                    className="w-full p-4 text-left flex items-center gap-3"
                    onClick={() => canDo && setOpen(isOpen ? null : lesson.id)}>
                    {/* Status icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={lesson.completed ? { background: G } : !canDo ? { background: "#f0e8dc" } : { background: GL, border: `1px solid ${G}30` }}>
                      {lesson.completed
                        ? <CheckIcon className="w-5 h-5 text-white" />
                        : !canDo
                          ? <LockClosedIcon className="w-4 h-4" style={{ color: MUTED }} />
                          : <span className="text-xs font-black" style={{ color: G }}>{lesson.day}</span>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: lesson.completed ? G : INK }}>{lesson.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>{lesson.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                        <ClockIcon className="w-3 h-3" />{lesson.duration}м
                      </span>
                      {canDo && !lesson.completed && (
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: MUTED }} />
                      )}
                    </div>
                  </button>

                  {/* Expanded checklist */}
                  {isOpen && canDo && !lesson.completed && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <div className="rounded-xl p-3 mb-4 space-y-2" style={{ background: "#faf7f2" }}>
                        {lesson.checklist.map((item, ci) => (
                          <div key={ci} className="flex items-start gap-2 text-sm" style={{ color: INK }}>
                            <CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: `${G}60` }} />
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => complete(lesson)}
                        disabled={completing === lesson.id}
                        className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                        style={{ background: G }}>
                        {completing === lesson.id
                          ? <ClockIcon className="w-4 h-4 animate-spin" />
                          : <CheckIcon className="w-4 h-4" />}
                        {completing === lesson.id ? "Сохраняем..." : "Выполнено — +50 XP"}
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── MISSIONS TAB ─────────────────────────────────────────────────────────────
function MissionsTab({ onXpGain }: { onXpGain: (xp: number, total: number) => void }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Mission | null>(null);

  const load = useCallback(() => {
    api({ action: "get_missions" }).then(d => { if (d.missions) setMissions(d.missions); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const start = async (m: Mission) => {
    await api({ action: "start_mission", mission_id: m.id });
    load();
    setActive(m);
  };

  const complete = async (m: Mission) => {
    const d = await api({ action: "complete_mission", mission_id: m.id });
    if (d.ok) { onXpGain(d.xp_gained, d.total_xp); load(); setActive(null); }
  };

  if (active) {
    return (
      <div className="space-y-5 animate-fade-in">
        <button onClick={() => setActive(null)} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: G }}>
          <ChevronRightIcon className="w-4 h-4 rotate-180" /> Назад к миссиям
        </button>

        <div className="rounded-3xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${G}, ${GM})` }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <Pill color="white" bg="rgba(255,255,255,0.2)">{active.product || "Свободная миссия"}</Pill>
              <h2 className="text-2xl font-black mt-2">{active.title}</h2>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
              <BoltIcon className="w-4 h-4" /><span className="font-bold text-sm">+{active.xp} XP</span>
            </div>
          </div>
          <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
            <strong>Формат:</strong> {active.format}
          </div>
          <div className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
            <strong>Цель:</strong> {active.goal}
          </div>
        </div>

        {/* Hooks */}
        <Card className="p-5">
          <p className="font-bold text-sm mb-3" style={{ color: INK }}>Хуки для контента</p>
          <div className="space-y-2">
            {active.hooks.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: GL }}>
                <span className="text-xs font-black w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: G, color: "#fff" }}>{i + 1}</span>
                <p className="text-sm italic" style={{ color: INK }}>"{h}"</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Template */}
        {active.template && (
          <Card className="p-5">
            <p className="font-bold text-sm mb-3" style={{ color: INK }}>Шаблон публикации</p>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed font-rubik" style={{ color: MUTED }}>{active.template}</pre>
          </Card>
        )}

        <button onClick={() => complete(active)}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: G }}>
          <TrophyIcon className="w-5 h-5" />Миссия выполнена — получить {active.xp} XP
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold" style={{ color: INK }}>Миссии</h2>
        <p className="text-sm mt-0.5" style={{ color: MUTED }}>Получи миссию — выполни её публично</p>
      </div>

      <div className="space-y-4">
        {loading ? Array(3).fill(0).map((_, i) => <Skel key={i} h={120} />) :
          missions.map((m, i) => (
            <Card key={m.id} className={`overflow-hidden animate-fade-in stagger-${i + 1}`}
              style={!m.unlocked ? { opacity: 0.55 } : m.status === "done" ? { borderColor: `${G}40` } : {}}>
              {m.status === "active" && <div className="h-1 w-full" style={{ background: G }} />}
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={m.status === "done" ? { background: G } : !m.unlocked ? { background: "#f0e8dc" } : { background: GL, border: `1px solid ${G}30` }}>
                    {m.status === "done"
                      ? <CheckIcon className="w-6 h-6 text-white" />
                      : !m.unlocked
                        ? <LockClosedIcon className="w-5 h-5" style={{ color: MUTED }} />
                        : <RocketLaunchIcon className="w-5 h-5" style={{ color: G }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-sm" style={{ color: INK }}>{m.title}</h3>
                      {m.product && <Pill color={B} bg={BL}>{m.product}</Pill>}
                    </div>
                    <p className="text-xs" style={{ color: MUTED }}>{m.format}</p>
                    {!m.unlocked && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: BM }}>
                        <LockClosedIcon className="w-3 h-3" />Открывается после {m.unlock_after} уроков
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <BoltIcon className="w-4 h-4" style={{ color: G }} />
                    <span className="font-bold text-sm" style={{ color: G }}>+{m.xp}</span>
                  </div>
                </div>

                {m.unlocked && m.status !== "done" && (
                  <button onClick={() => m.status === "active" ? setActive(m) : start(m)}
                    className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={m.status === "active"
                      ? { background: G, color: "#fff" }
                      : { background: GL, color: G, border: `1px solid ${G}30` }}>
                    <ArrowRightIcon className="w-4 h-4" />
                    {m.status === "active" ? "Продолжить миссию" : "Взять миссию"}
                  </button>
                )}
                {m.status === "done" && (
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold" style={{ color: G }}>
                    <CheckCircleIcon className="w-4 h-4" />Миссия выполнена
                  </div>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}

// ─── PORTFOLIO TAB ────────────────────────────────────────────────────────────
const PLATFORMS = ["instagram", "tiktok", "telegram", "youtube"];
const FORMATS   = ["reel", "story", "post", "short", "carousel"];
const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e1306c", tiktok: "#010101", telegram: "#2aabee", youtube: "#ff0000"
};

function PortfolioTab({ missions, onXpGain }: { missions: Mission[]; onXpGain: (xp: number, total: number) => void }) {
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ post_url: "", platform: "instagram", format: "reel", notes: "", mission_id: "" });
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    api({ action: "get_portfolio" }).then(d => { if (d.posts) setPosts(d.posts); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.post_url.trim()) return;
    setPosting(true);
    const d = await api({ action: "add_post", ...form, mission_id: form.mission_id ? parseInt(form.mission_id) : null });
    setPosting(false);
    if (d.ok) { setShowForm(false); setForm({ post_url: "", platform: "instagram", format: "reel", notes: "", mission_id: "" }); load(); onXpGain(d.xp_gained, d.total_xp); }
  };

  const myPosts  = posts.filter(p => p.is_mine);
  const allPosts = posts.filter(p => !p.is_mine);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: INK }}>Портфолио</h2>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>Твои публикации — твой результат</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: showForm ? B : G }}>
          {showForm ? <XMarkIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
          {showForm ? "Отмена" : "Добавить"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="p-5 animate-fade-in" style={{ borderColor: `${G}40` }}>
          <p className="font-bold text-sm mb-4" style={{ color: INK }}>Добавить публикацию</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: MUTED }}>Ссылка на пост</label>
              <input value={form.post_url} onChange={e => setForm(f => ({ ...f, post_url: e.target.value }))}
                placeholder="https://instagram.com/p/..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: MUTED }}>Платформа</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: MUTED }}>Формат</label>
                <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }}>
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: MUTED }}>Миссия (необязательно)</label>
              <select value={form.mission_id} onChange={e => setForm(f => ({ ...f, mission_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }}>
                <option value="">— без миссии —</option>
                {missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: MUTED }}>Заметка</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Что снял, что понял..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#faf7f2", border: `1px solid ${BORDER}`, color: INK }} />
            </div>
            <button type="submit" disabled={posting || !form.post_url.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
              style={{ background: G }}>
              {posting ? <ClockIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
              {posting ? "Сохраняем..." : "Добавить публикацию — +100 XP"}
            </button>
          </form>
        </Card>
      )}

      {/* My posts */}
      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skel key={i} h={88} />)}</div>
      ) : (
        <>
          {myPosts.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>Мои публикации</p>
              {myPosts.map((p, i) => (
                <Card key={p.id} className={`p-4 animate-fade-in stagger-${i + 1}`} style={{ borderColor: `${G}30` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${PLATFORM_COLORS[p.platform] || G}18` }}>
                      <GlobeAltIcon className="w-5 h-5" style={{ color: PLATFORM_COLORS[p.platform] || G }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill color={PLATFORM_COLORS[p.platform] || G} bg={`${PLATFORM_COLORS[p.platform] || G}15`}>{p.platform}</Pill>
                        <Pill color={BM} bg={BL}>{p.format}</Pill>
                        {p.mission && <Pill color={G} bg={GL}>{p.mission}</Pill>}
                      </div>
                      {p.notes && <p className="text-sm mt-1.5" style={{ color: MUTED }}>{p.notes}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
                          style={{ color: G }}>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />Открыть пост
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {myPosts.length === 0 && !showForm && (
            <Card className="p-8 text-center">
              <FolderOpenIcon className="w-12 h-12 mx-auto mb-3" style={{ color: `${G}50` }} />
              <p className="font-bold text-sm" style={{ color: INK }}>Портфолио пока пусто</p>
              <p className="text-xs mt-1" style={{ color: MUTED }}>Добавь первую публикацию — она станет частью твоего портфолио</p>
            </Card>
          )}

          {/* Community posts */}
          {allPosts.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>Другие участники</p>
              {allPosts.map((p, i) => (
                <Card key={p.id} className={`p-4 animate-fade-in stagger-${i + 1}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: GL }}>
                      <UserCircleIcon className="w-6 h-6" style={{ color: G }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: INK }}>{p.username}</span>
                        <Pill color={PLATFORM_COLORS[p.platform] || G} bg={`${PLATFORM_COLORS[p.platform] || G}15`}>{p.platform}</Pill>
                        {p.mission && <Pill color={G} bg={GL}>{p.mission}</Pill>}
                      </div>
                      {p.notes && <p className="text-xs mt-1" style={{ color: MUTED }}>{p.notes}</p>}
                    </div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    api({ action: "get_profile" }).then(d => { if (d.profile) setProfile(d.profile); });
  }, []);

  const nextLevelXp = (user.level + 1) * 300;
  const p = profile;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="p-6 animate-fade-in" style={{ background: `linear-gradient(135deg, ${GL}, #fff)`, borderColor: `${G}30` }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: GL, border: `2px solid ${G}50` }}>
              <UserCircleIcon className="w-12 h-12" style={{ color: G }} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: B }}>
              {user.level}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black" style={{ color: INK }}>{user.username}</h2>
            <p className="text-sm" style={{ color: MUTED }}>{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <BoltIcon className="w-4 h-4" style={{ color: G }} />
              <span className="font-bold" style={{ color: G }}>{user.xp.toLocaleString()} XP</span>
              {user.streak > 0 && (
                <><span style={{ color: BORDER }}>·</span>
                  <FireIcon className="w-4 h-4" style={{ color: B }} />
                  <span className="font-semibold text-sm" style={{ color: B }}>{user.streak} дней</span></>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: MUTED }}>
            <span>Уровень {user.level}</span>
            <span>До {user.level + 1}: {Math.max(0, nextLevelXp - user.xp)} XP</span>
          </div>
          <XpBar progress={(user.xp / nextLevelXp) * 100} />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in stagger-1">
        {[
          { value: p ? String(p.lessons_done) : "—", label: "уроков", Icon: CheckCircleIcon, bg: GL, color: G },
          { value: p ? String(p.missions_done) : "—", label: "миссий", Icon: RocketLaunchIcon, bg: GL, color: G },
          { value: p ? String(p.posts_count) : "—", label: "публикаций", Icon: FolderOpenIcon, bg: BL, color: B },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: s.bg }}>
              <s.Icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-black" style={{ color: INK }}>{s.value}</p>
            <p className="text-[11px]" style={{ color: MUTED }}>{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Settings */}
      <div className="space-y-2 animate-fade-in stagger-2">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Аккаунт</p>
        {[
          { label: "Редактировать профиль", Icon: PencilIcon, color: G, bg: GL },
          { label: "Партнёрские ссылки",    Icon: LinkIcon,   color: B, bg: BL },
          { label: "Уведомления",           Icon: BellIcon,   color: BM, bg: BL },
          { label: "Поделиться портфолио",  Icon: ShareIcon,  color: GM, bg: GL },
        ].map((item, i) => (
          <Card key={i} className="overflow-hidden">
            <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-stone-50 transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
                <item.Icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: INK }}>{item.label}</span>
              <ChevronRightIcon className="w-4 h-4" style={{ color: MUTED }} />
            </button>
          </Card>
        ))}
        <Card className="overflow-hidden">
          <button onClick={onLogout} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-red-50 transition-colors">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fef2f2" }}>
              <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500 flex-1">Выйти из аккаунта</span>
          </button>
        </Card>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>("path");
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const missionsLoaded = useRef(false);

  const checkSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setAuthChecked(true); return; }
    const d = await apiGet(AUTH_URL);
    if (d.user) setUser(d.user);
    else localStorage.removeItem(TOKEN_KEY);
    setAuthChecked(true);
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  useEffect(() => {
    if (user && !missionsLoaded.current) {
      missionsLoaded.current = true;
      api({ action: "get_missions" }).then(d => { if (d.missions) setMissions(d.missions); });
    }
  }, [user]);

  const handleAuth = (u: User) => setUser(u);

  const handleLogout = async () => {
    await authPost({ action: "logout" });
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const handleXpGain = (xp: number, totalXp: number) => {
    setXpToast(xp);
    if (totalXp >= 0 && user)
      setUser(u => u ? { ...u, xp: totalXp, level: Math.max(1, Math.floor(totalXp / 300)) } : u);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf7f2" }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse" style={{ background: GL }}>
            <RocketLaunchIcon className="w-8 h-8" style={{ color: G }} />
          </div>
          <p className="text-sm font-rubik" style={{ color: MUTED }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  const activeMissions = missions.filter(m => m.status === "active").length;
  const doneMissions   = missions.filter(m => m.status === "done").length;

  return (
    <div className="min-h-screen font-rubik" style={{ background: "#faf7f2" }}>
      {xpToast !== null && <XpToast xp={xpToast} onDone={() => setXpToast(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: "rgba(250,247,242,0.95)", backdropFilter: "blur(12px)", borderColor: BORDER }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: G }}>
              <RocketLaunchIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-mono-rubik text-base tracking-tight" style={{ color: INK }}>MISSION</span>
          </div>
          <div className="flex items-center gap-2">
            {activeMissions > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: GL, color: G }}>
                <RocketLaunchIcon className="w-3 h-3" />{activeMissions} активна
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: GL, color: G }}>
              <BoltIcon className="w-3 h-3" />{user.xp.toLocaleString()} XP
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        <div key={tab}>
          {tab === "path"      && <PathTab onXpGain={handleXpGain} />}
          {tab === "missions"  && <MissionsTab onXpGain={handleXpGain} />}
          {tab === "portfolio" && <PortfolioTab missions={missions} onXpGain={handleXpGain} />}
          {tab === "profile"   && <ProfileTab user={user} onLogout={handleLogout} />}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t" style={{ borderColor: BORDER }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex" style={{ background: "rgba(250,247,242,0.98)", backdropFilter: "blur(12px)" }}>
            {NAV.map(item => {
              const isActive = tab === item.id;
              const badge = item.id === "missions" ? activeMissions : item.id === "portfolio" ? doneMissions : 0;
              return (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors"
                  style={isActive ? { color: G } : { color: MUTED }}>
                  {badge > 0 && (
                    <span className="absolute top-2 right-1/4 w-4 h-4 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ background: G }}>
                      {badge}
                    </span>
                  )}
                  <item.Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                  {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: G }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
