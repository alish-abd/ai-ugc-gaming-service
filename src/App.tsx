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
  LinkIcon,
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
  RocketLaunchIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

// ─── Config ──────────────────────────────────────────────────────────────────
const AUTH_URL  = "https://functions.poehali.dev/16228047-1a09-4827-af8c-d5ca8dd48885";
const API_URL   = "https://functions.poehali.dev/58712cb3-8e82-4bb3-9940-6fa8d4df92b0";
const TOKEN_KEY = "mission_token";

// ─── 16-bit palette ──────────────────────────────────────────────────────────
const G0 = "#1c1c1c";   // нейтральная тень
const G1 = "#333333";   // нейтральный тёмный
const G2 = "#2a8c2a";   // зелёный — только акцент
const G3 = "#36aa36";   // зелёный hover
const G4 = "#52c852";   // зелёный индикатор
const G5 = "#c8e8c8";   // бледный зелёный
const G6 = "#f0f0ee";   // нейтральный светлый
const G7 = "#f9f9f7";   // почти белый
const INK   = "#1c1c1c";
const PAPER = "#f7f7f5";
const MUTED = "#777770";

const PHASE_CFG = {
  prep:     { label: "ДЕНЬ 1-7",   desc: "ПОДГОТОВКА",   color: G1, bg: G6 },
  publish:  { label: "ДЕНЬ 8-21",  desc: "ПУБЛИКАЦИИ",   color: G2, bg: G6 },
  monetize: { label: "ДЕНЬ 22-30", desc: "МОНЕТИЗАЦИЯ",  color: G1, bg: G6 },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface User { id: number; username: string; email: string; avatar: string; xp: number; level: number; streak: number; platform?: string; onboarded?: boolean; }
interface Profile extends User { lessons_done: number; missions_done: number; posts_count: number; season_day: number; }
interface Lesson { id: number; day: number; title: string; subtitle: string; duration: number; phase: string; checklist: { text: string }[]; completed: boolean; }
interface Mission { id: number; title: string; product: string | null; format: string; goal: string; hooks: string[]; template: string; xp: number; unlock_after: number; status: string | null; unlocked: boolean; }
interface PortfolioPost { id: number; user_id: number; username: string; mission_id: number | null; mission: string | null; url: string; platform: string; format: string; notes: string; views: number; likes: number; published_at: string; is_mine: boolean; }
type Tab = "path" | "missions" | "portfolio" | "profile";

// ─── API ──────────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const apiPost  = async (url: string, body: Record<string, unknown>) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Token": getToken() }, body: JSON.stringify(body) });
  return r.json();
};
const apiGet   = async (url: string) => { const r = await fetch(url, { headers: { "X-Session-Token": getToken() } }); return r.json(); };
const authPost = (b: Record<string, string>) => apiPost(AUTH_URL, b);
const api      = (b: Record<string, unknown>) => apiPost(API_URL, b);

// ─── Pixel UI primitives ──────────────────────────────────────────────────────

/** Пиксельная кнопка */
function PixelBtn({
  children, onClick, variant = "primary", size = "md", disabled = false, className = "", type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const base = "btn-pixel";
  const variants = {
    primary: "",
    outline: "btn-pixel-outline",
    ghost:   "btn-pixel-ghost",
    danger:  "btn-pixel-danger",
  };
  const sizes = {
    sm: "text-[8px] px-3 py-1.5",
    md: "text-[9px] px-4 py-2.5",
    lg: "text-[10px] px-5 py-3",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/** Пиксельная карточка */
function PixelCard({ children, className = "", green = false, style = {} }: { children: React.ReactNode; className?: string; green?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`${green ? "card-pixel-green" : "card-pixel"} ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Пиксельный прогресс-бар */
function PixelProgress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress-pixel">
      <div className="progress-pixel-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Пиксельный бейдж */
function PixelBadge({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <span className={dark ? "badge-pixel-dark" : "badge-pixel"}>{children}</span>;
}

/** Скелетон-заглушка */
function Skel({ h = 64 }: { h?: number }) {
  return (
    <div className="animate-pulse w-full" style={{ height: h, background: G6, border: `2px solid ${G5}` }} />
  );
}

const NAV: { id: Tab; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: "path",      label: "ПУТЬ",    Icon: MapIcon },
  { id: "missions",  label: "МИССИИ",  Icon: RocketLaunchIcon },
  { id: "portfolio", label: "ПОРТФО",  Icon: FolderOpenIcon },
  { id: "profile",   label: "ПРОФИЛЬ", Icon: UserCircleIcon },
];

const PLATFORMS = ["instagram", "tiktok", "telegram", "youtube"];
const FORMATS   = ["reel", "story", "post", "short", "carousel"];

// ─── Landing Screen ───────────────────────────────────────────────────────────
function LandingScreen({ onAuth }: { onAuth: (u: User) => void }) {
  const [showAuth, setShowAuth] = useState(false);
  const [visible, setVisible]   = useState<Set<string>>(new Set());

  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisible(v => new Set([...v, (e.target as HTMLElement).dataset.reveal!]));
      });
    }, { threshold: 0.15 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const reveal = (id: string, delay = 0) => ({
    "data-reveal": id,
    style: {
      opacity: visible.has(id) ? 1 : 0,
      transform: visible.has(id) ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.4s steps(6) ${delay}ms, transform 0.4s steps(6) ${delay}ms`,
    } as React.CSSProperties,
  });

  if (showAuth) return <AuthScreen onAuth={onAuth} />;

  const STEPS = [
    { day: "ДЕНЬ 0",   title: "РЕГИСТРАЦИЯ",          desc: "Создай аккаунт, пройди onboarding, получи первую миссию" },
    { day: "ДЕНЬ 1-7", title: "ПОДГОТОВКА",            desc: "Настрой аккаунт, свет, звук. Сними первое тестовое видео" },
    { day: "ДЕНЬ 8-21",title: "ПУБЛИКАЦИИ",            desc: "10-15 качественных постов по шаблонам и заданиям" },
    { day: "ДЕНЬ 22-30",title:"МОНЕТИЗАЦИЯ",           desc: "Первый партнёрский пост, портфолио, выбор следующей миссии" },
  ];

  const FEATURES = [
    { icon: MapIcon,          title: "LEARNING PATH",   desc: "Урок → чеклист → задание → следующий шаг. Не 40 минут теории, а 5-10 минут + действие." },
    { icon: RocketLaunchIcon, title: "MISSION SYSTEM",  desc: "Не думай о чём снимать. Получи миссию: тема + продукт + формат + шаблоны + хуки." },
    { icon: FolderOpenIcon,   title: "ПОРТФОЛИО",       desc: "Через 30 дней не сертификат, а живое портфолио: 10-15 публикаций и первые попытки монетизации." },
    { icon: LinkIcon,         title: "PARTNER LINKS",   desc: "Партнёрская ссылка + шаблон честной рекомендации. Открывается после базовых уроков." },
  ];

  const STATS = [
    { num: "30",  unit: "ДНЕЙ", label: "до первой монетизации" },
    { num: "15",  unit: "ПОСТОВ", label: "реальных публикаций" },
    { num: "4",   unit: "МИССИИ", label: "с хуками и шаблонами" },
    { num: "100%", unit: "ЧЕСТНО", label: "без обещаний стать звездой" },
  ];

  const MISSIONS_PREVIEW = [
    { title: "МОЙ ПЕРВЫЙ AI-КОНТЕНТ", product: "Korobka AI", xp: 500, format: "3 Reels + 2 Stories" },
    { title: "ЗАПУСК БЛОГА С НУЛЯ",   product: null,         xp: 400, format: "5 постов за 7 дней" },
    { title: "ТРАНСФОРМАЦИЯ ДО/ПОСЛЕ",product: null,         xp: 350, format: "Карусель + Reel" },
    { title: "ПЕРВЫЙ ПАРТНЁРСКИЙ ПОСТ",product: "Партнёр",   xp: 600, format: "Честный обзор" },
  ];

  return (
    <div className="min-h-screen" style={{ background: PAPER, fontFamily: "'VT323', monospace" }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 header-pixel">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: G2, border: `2px solid ${G0}` }}>
              <RocketLaunchIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-pixel text-[11px] text-white tracking-wider">YOUGEN</span>
          </div>
          <PixelBtn onClick={() => setShowAuth(true)} size="sm">
            ► ВОЙТИ
          </PixelBtn>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        {/* Scanline декор */}
        <div className="inline-block mb-6 px-4 py-1 font-pixel text-[8px]"
          style={{ background: G2, color: "#fff", border: `2px solid ${G0}`, boxShadow: `3px 3px 0 ${G0}` }}
          {...reveal("hero-badge")}>
          SEASON 01 — ОТКРЫТ НАБОР
        </div>

        <h1 className="font-pixel leading-loose mb-6"
          style={{ fontSize: "clamp(18px, 5vw, 36px)", color: INK, lineHeight: 1.6 }}
          {...reveal("hero-title", 100)}>
          ТЫ НЕ ПРОХОДИШЬ КУРС.<br />
          <span style={{ color: G2 }}>ТЫ ПОЛУЧАЕШЬ МИССИЮ</span><br />
          И ВЫПОЛНЯЕШЬ ЕЁ ПУБЛИЧНО.
        </h1>

        <p className="font-vt323 text-2xl max-w-2xl mx-auto mb-10" style={{ color: MUTED, lineHeight: 1.5 }}
          {...reveal("hero-sub", 200)}>
          За 30 дней — настроенный блог, 10-15 публикаций,
          понятный контент-процесс и первые попытки монетизации.
          Честно. Без обещаний стать популярным.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center" {...reveal("hero-cta", 300)}>
          <PixelBtn onClick={() => setShowAuth(true)} size="lg" className="text-lg px-8 py-4">
            ► ПОЛУЧИТЬ ПЕРВУЮ МИССИЮ
          </PixelBtn>
          <a href="#how" className="font-pixel text-[9px]" style={{ color: MUTED }}>
            КАК ЭТО РАБОТАЕТ ↓
          </a>
        </div>

        {/* Pixel character animation */}
        <div className="mt-14 flex justify-center gap-8 flex-wrap" {...reveal("hero-chars", 400)}>
          {["НОВИЧОК", "БЛОГЕР", "МОНЕТИЗАЦИЯ"].map((stage, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center font-pixel text-[8px] text-white"
                style={{
                  background: i === 2 ? G2 : i === 1 ? G1 : "#555",
                  border: `3px solid ${G0}`,
                  boxShadow: `4px 4px 0 ${G0}`,
                  animation: `march ${1 + i * 0.3}s steps(4) infinite`,
                  animationDelay: `${i * 200}ms`,
                }}>
                {i === 0 ? "?" : i === 1 ? "▶" : "★"}
              </div>
              <p className="font-pixel text-[7px]" style={{ color: i === 2 ? G2 : MUTED }}>{stage}</p>
            </div>
          ))}
          <div className="self-center font-pixel text-[14px]" style={{ color: G2 }}>→→→</div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: G1, borderTop: `4px solid ${G0}`, borderBottom: `4px solid ${G0}` }}>
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center" {...reveal(`stat-${i}`, i * 80)}>
              <p className="font-pixel text-2xl md:text-3xl" style={{ color: G4 }}>{s.num}</p>
              <p className="font-pixel text-[9px] mt-1" style={{ color: "#fff" }}>{s.unit}</p>
              <p className="font-vt323 text-lg mt-1" style={{ color: G5 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12" {...reveal("how-title")}>
          <p className="font-pixel text-[9px] mb-2" style={{ color: G2 }}>КАК ЭТО РАБОТАЕТ</p>
          <h2 className="font-pixel text-lg md:text-xl" style={{ color: INK, lineHeight: 1.8 }}>
            30 ДНЕЙ. 4 ЭТАПА. ОДИН РЕЗУЛЬТАТ.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STEPS.map((step, i) => (
            <div key={i} className="p-5" {...reveal(`step-${i}`, i * 100)}
              style={{
                background: "#fff",
                border: `3px solid ${G0}`,
                boxShadow: `5px 5px 0 ${G0}`,
                borderLeft: `6px solid ${i === 3 ? G2 : G1}`,
              }}>
              <div className="font-pixel text-[8px] mb-2 px-2 py-1 inline-block text-white"
                style={{ background: i === 3 ? G2 : G1, border: `2px solid ${G0}` }}>
                {step.day}
              </div>
              <h3 className="font-pixel text-[10px] mb-2 mt-3" style={{ color: INK }}>{step.title}</h3>
              <p className="font-vt323 text-xl" style={{ color: MUTED, lineHeight: 1.4 }}>{step.desc}</p>
              {i < 3 && (
                <div className="mt-3 font-pixel text-[18px]" style={{ color: G4 }}>↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: G6, borderTop: `3px solid #d4d4d0`, borderBottom: `3px solid #d4d4d0` }}>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12" {...reveal("feat-title")}>
            <p className="font-pixel text-[9px] mb-2" style={{ color: G2 }}>MVP ФУНКЦИИ</p>
            <h2 className="font-pixel text-lg" style={{ color: INK, lineHeight: 1.8 }}>4 ВЕЩИ, КОТОРЫЕ МЕНЯЮТ ВСЁ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-5 bg-white" {...reveal(`feat-${i}`, i * 80)}
                style={{ border: `3px solid ${G1}`, boxShadow: `4px 4px 0 ${G0}` }}>
                <div className="w-12 h-12 flex items-center justify-center mb-4"
                  style={{ background: i % 2 === 0 ? G2 : G1, border: `3px solid ${G0}`, boxShadow: `3px 3px 0 ${G0}` }}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-pixel text-[10px] mb-3" style={{ color: INK }}>{f.title}</h3>
                <p className="font-vt323 text-xl" style={{ color: MUTED, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSIONS PREVIEW ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12" {...reveal("miss-title")}>
          <p className="font-pixel text-[9px] mb-2" style={{ color: G2 }}>ПРИМЕРЫ МИССИЙ</p>
          <h2 className="font-pixel text-lg" style={{ color: INK, lineHeight: 1.8 }}>ЧТО ТЫ БУДЕШЬ ДЕЛАТЬ</h2>
        </div>
        <div className="space-y-3">
          {MISSIONS_PREVIEW.map((m, i) => (
            <div key={i} className="p-4 flex items-center gap-4 bg-white" {...reveal(`miss-${i}`, i * 60)}
              style={{ border: `3px solid ${G1}`, boxShadow: `4px 4px 0 ${G0}` }}>
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 font-pixel text-[10px] text-white"
                style={{ background: G1, border: `2px solid ${G0}` }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-pixel text-[9px]" style={{ color: INK }}>{m.title}</p>
                <p className="font-vt323 text-lg mt-1" style={{ color: MUTED }}>{m.format}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {m.product && (
                  <span className="font-pixel text-[7px] px-2 py-1"
                    style={{ background: G6, color: G1, border: `2px solid #d4d4d0` }}>
                    {m.product}
                  </span>
                )}
                <span className="font-pixel text-[9px]" style={{ color: G2 }}>+{m.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: G1, borderTop: `4px solid ${G0}` }}>
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div {...reveal("cta-title")}>
            <p className="font-pixel text-[8px] mb-4" style={{ color: G4 }}>► SEASON 01 ОТКРЫТ</p>
            <h2 className="font-pixel mb-4" style={{ fontSize: "clamp(14px, 3vw, 24px)", color: "#fff", lineHeight: 1.8 }}>
              ЧЕРЕЗ 30 ДНЕЙ У ТЕБЯ БУДЕТ<br />
              <span style={{ color: G4 }}>РЕАЛЬНОЕ ПОРТФОЛИО.</span><br />
              НЕ СЕРТИФИКАТ.
            </h2>
            <p className="font-vt323 text-2xl mb-10 max-w-xl mx-auto" style={{ color: G5 }}>
              Настроенный блог, 10-15 публикаций, понятный процесс
              и первые попытки честной монетизации.
            </p>
          </div>
          <div {...reveal("cta-btn", 200)}>
            <PixelBtn onClick={() => setShowAuth(true)} size="lg" className="text-base px-10 py-5">
              ► НАЧАТЬ СЕЙЧАС — БЕСПЛАТНО
            </PixelBtn>
            <p className="font-pixel text-[7px] mt-6 animate-blink" style={{ color: G5 }}>
              PRESS START TO CONTINUE
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: G0, borderTop: `3px solid ${G0}` }}>
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center" style={{ background: G2, border: `1px solid ${G1}` }}>
              <RocketLaunchIcon className="w-3 h-3 text-white" />
            </div>
            <span className="font-pixel text-[9px]" style={{ color: "#888" }}>YOUGEN © 2025</span>
          </div>
          <p className="font-vt323 text-lg" style={{ color: "#666" }}>
            Ты не проходишь курс. Ты получаешь миссию.
          </p>
        </div>
      </footer>
    </div>
  );
}

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
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4 p-4" style={{ background: G2, border: `4px solid ${G0}`, boxShadow: `6px 6px 0 ${G0}` }}>
            <RocketLaunchIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-pixel text-2xl mb-2" style={{ color: G1 }}>YOUGEN</h1>
          <div className="divider-pixel my-3" />
          <p className="font-vt323 text-xl" style={{ color: MUTED }}>
            Получи миссию. Выполни публично.
          </p>
        </div>

        <PixelCard className="p-5">
          {/* Mode toggle */}
          <div className="flex mb-5" style={{ border: `3px solid ${G1}` }}>
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2 font-pixel text-[9px] transition-none"
                style={mode === m ? { background: G2, color: "#fff" } : { background: "#fff", color: G1 }}>
                {m === "login" ? "ВОЙТИ" : "НАЧАТЬ"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <div>
                <p className="font-pixel text-[8px] mb-1" style={{ color: MUTED }}>ИМЯ</p>
                <input value={form.username} onChange={set("username")} placeholder="creator_name"
                  className="input-pixel" />
              </div>
            )}
            <div>
              <p className="font-pixel text-[8px] mb-1" style={{ color: MUTED }}>
                {mode === "register" ? "EMAIL" : "EMAIL ИЛИ ИМЯ"}
              </p>
              <input
                type={mode === "register" ? "email" : "text"}
                value={mode === "register" ? form.email : form.login}
                onChange={mode === "register" ? set("email") : set("login")}
                placeholder="you@example.com"
                className="input-pixel" />
            </div>
            <div>
              <p className="font-pixel text-[8px] mb-1" style={{ color: MUTED }}>ПАРОЛЬ</p>
              <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
                className="input-pixel" />
            </div>
            {error && (
              <div className="p-3 font-vt323 text-lg" style={{ background: "#fef2f2", border: "3px solid #c0392b", color: "#c0392b" }}>
                {error}
              </div>
            )}
            <PixelBtn type="submit" disabled={loading} size="lg" className="w-full mt-1">
              {loading ? "ЗАГРУЗКА..." : mode === "login" ? "► ВОЙТИ" : "► СТАРТ"}
            </PixelBtn>
          </form>
        </PixelCard>

        <p className="text-center font-vt323 text-lg mt-4 animate-blink" style={{ color: G3 }}>
          ► НАЖМИ ДЛЯ НАЧАЛА ◄
        </p>
      </div>
    </div>
  );
}

// ─── XP Toast ─────────────────────────────────────────────────────────────────
function XpToast({ xp, onDone }: { xp: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
      <div className="font-pixel text-[10px] text-white px-5 py-3 flex items-center gap-3"
        style={{ background: G2, border: `3px solid ${G0}`, boxShadow: `4px 4px 0 ${G0}` }}>
        <BoltIcon className="w-4 h-4" />+{xp} XP ПОЛУЧЕНО!
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

  const done  = lessons.filter(l => l.completed).length;
  const total = lessons.length;
  const phases = ["prep", "publish", "monetize"] as const;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h2 className="font-pixel text-sm mb-1" style={{ color: INK }}>ТВОЙ ПУТЬ</h2>
        <p className="font-vt323 text-xl" style={{ color: MUTED }}>30 дней от нуля до монетизации</p>
      </div>

      {/* Season progress */}
      {!loading && (
        <PixelCard className="p-4 animate-fade-in stagger-1">
          <div className="flex items-center justify-between mb-3">
            <p className="font-pixel text-[9px]" style={{ color: INK }}>ПРОГРЕСС СЕЗОНА</p>
            <PixelBadge dark>{done}/{total}</PixelBadge>
          </div>
          <PixelProgress value={done} max={total || 1} />
          <p className="font-vt323 text-lg mt-2" style={{ color: MUTED }}>{done} уроков выполнено из {total}</p>
        </PixelCard>
      )}

      {/* Phases */}
      {loading
        ? Array(5).fill(0).map((_, i) => <Skel key={i} h={68} />)
        : phases.map(phase => {
          const phaseLessons = lessons.filter(l => l.phase === phase);
          if (!phaseLessons.length) return null;
          const cfg = PHASE_CFG[phase];
          const pDone = phaseLessons.filter(l => l.completed).length;

          return (
            <div key={phase} className="space-y-2 animate-fade-in">
              {/* Phase label */}
              <div className="flex items-center gap-3 px-1">
                <div className="font-pixel text-[8px] px-3 py-1.5 text-white" style={{ background: cfg.color, border: `2px solid ${G0}` }}>
                  {cfg.desc}
                </div>
                <div className="divider-pixel flex-1" />
                <span className="font-pixel text-[8px]" style={{ color: cfg.color }}>{pDone}/{phaseLessons.length}</span>
              </div>

              {phaseLessons.map((lesson, i) => {
                const isOpen = open === lesson.id;
                const canDo  = lesson.completed || i === 0 || phaseLessons[i - 1]?.completed;

                return (
                  <PixelCard
                    key={lesson.id}
                    green={lesson.completed}
                    className={`overflow-hidden ${!canDo ? "opacity-50" : ""}`}
                    style={lesson.completed ? { borderColor: G2, boxShadow: `4px 4px 0 ${G1}` } : {}}
                  >
                    <button
                      className="w-full p-4 text-left flex items-center gap-3"
                      onClick={() => canDo && !lesson.completed && setOpen(isOpen ? null : lesson.id)}
                    >
                      {/* Day badge */}
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 font-pixel text-[10px]"
                        style={lesson.completed
                          ? { background: G2, border: `2px solid ${G0}`, color: "#fff" }
                          : !canDo
                            ? { background: G6, border: `2px solid ${G4}`, color: MUTED }
                            : { background: G7, border: `3px solid ${G1}`, color: G1 }}>
                        {lesson.completed
                          ? <CheckIcon className="w-5 h-5 text-white" />
                          : !canDo
                            ? <LockClosedIcon className="w-4 h-4" style={{ color: MUTED }} />
                            : `D${lesson.day}`}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-pixel text-[9px] leading-relaxed" style={{ color: lesson.completed ? G1 : INK }}>
                          {lesson.title}
                        </p>
                        <p className="font-vt323 text-base mt-0.5 truncate" style={{ color: MUTED }}>
                          {lesson.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-vt323 text-base" style={{ color: MUTED }}>
                          {lesson.duration}М
                        </span>
                        {canDo && !lesson.completed && (
                          <ChevronDownIcon className={`w-4 h-4 transition-none ${isOpen ? "rotate-180" : ""}`} style={{ color: G2 }} />
                        )}
                      </div>
                    </button>

                    {/* Expanded */}
                    {isOpen && canDo && !lesson.completed && (
                      <div className="px-4 pb-4 animate-fade-in border-t-2" style={{ borderColor: "#d4d4d0" }}>
                        <div className="p-3 my-3 space-y-2" style={{ background: G6, border: `2px solid #d4d4d0` }}>
                          {lesson.checklist.map((item, ci) => (
                            <div key={ci} className="flex items-start gap-2">
                              <div className="check-pixel mt-0.5">
                                <CheckIcon className="w-3 h-3" style={{ color: G2 }} />
                              </div>
                              <span className="font-vt323 text-xl leading-tight" style={{ color: INK }}>{item.text}</span>
                            </div>
                          ))}
                        </div>
                        <PixelBtn
                          onClick={() => complete(lesson)}
                          disabled={completing === lesson.id}
                          size="lg"
                          className="w-full"
                        >
                          {completing === lesson.id
                            ? "СОХРАНЯЕМ..."
                            : "✓ ВЫПОЛНЕНО — +50 XP"}
                        </PixelBtn>
                      </div>
                    )}
                  </PixelCard>
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
  const [missions, setMissions]   = useState<Mission[]>([]);
  const [loading, setLoading]     = useState(true);
  const [active, setActive]       = useState<Mission | null>(null);

  const load = useCallback(() => {
    api({ action: "get_missions" }).then(d => { if (d.missions) setMissions(d.missions); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const start = async (m: Mission) => {
    await api({ action: "start_mission", mission_id: m.id });
    load(); setActive(m);
  };
  const complete = async (m: Mission) => {
    const d = await api({ action: "complete_mission", mission_id: m.id });
    if (d.ok) { onXpGain(d.xp_gained, d.total_xp); load(); setActive(null); }
  };

  if (active) {
    return (
      <div className="space-y-5 animate-fade-in">
        <button onClick={() => setActive(null)} className="flex items-center gap-2 font-pixel text-[8px]" style={{ color: G2 }}>
          ◄ НАЗАД
        </button>

        {/* Mission header */}
        <div className="p-5 text-white" style={{ background: G1, border: `4px solid ${G0}`, boxShadow: `6px 6px 0 ${G0}` }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              {active.product && (
                <div className="inline-block font-pixel text-[7px] px-2 py-1 mb-2 text-white" style={{ background: G3, border: `2px solid ${G5}` }}>
                  {active.product}
                </div>
              )}
              <h2 className="font-pixel text-sm leading-relaxed">{active.title}</h2>
            </div>
            <div className="font-pixel text-[10px] px-3 py-2 ml-3 flex-shrink-0" style={{ background: G3, border: `2px solid ${G5}` }}>
              +{active.xp} XP
            </div>
          </div>
          <div className="divider-pixel my-3" />
          <p className="font-vt323 text-xl" style={{ color: "#c8e8c8" }}>{active.format}</p>
          <p className="font-vt323 text-lg mt-1" style={{ color: "#aaccaa" }}>{active.goal}</p>
        </div>

        {/* Hooks */}
        <PixelCard className="p-4">
          <p className="font-pixel text-[9px] mb-3" style={{ color: INK }}>► ХУКИ</p>
          <div className="space-y-2">
            {active.hooks.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-3" style={{ background: G6, border: `2px solid #d4d4d0` }}>
                <span className="font-pixel text-[9px] flex-shrink-0" style={{ color: G2 }}>{i + 1}.</span>
                <p className="font-vt323 text-xl leading-tight" style={{ color: INK }}>"{h}"</p>
              </div>
            ))}
          </div>
        </PixelCard>

        {/* Template */}
        {active.template && (
          <PixelCard className="p-4">
            <p className="font-pixel text-[9px] mb-3" style={{ color: G1 }}>► ШАБЛОН</p>
            <pre className="font-vt323 text-xl whitespace-pre-wrap leading-relaxed" style={{ color: MUTED }}>
              {active.template}
            </pre>
          </PixelCard>
        )}

        <PixelBtn onClick={() => complete(active)} size="lg" className="w-full">
          <TrophyIcon className="w-4 h-4" />
          МИССИЯ ВЫПОЛНЕНА — +{active.xp} XP
        </PixelBtn>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="font-pixel text-sm mb-1" style={{ color: INK }}>МИССИИ</h2>
        <p className="font-vt323 text-xl" style={{ color: MUTED }}>Получи миссию — выполни публично</p>
      </div>

      <div className="space-y-4">
        {loading ? Array(3).fill(0).map((_, i) => <Skel key={i} h={120} />) :
          missions.map((m, i) => (
            <PixelCard
              key={m.id}
              green={m.status === "active"}
              className={`overflow-hidden animate-fade-in stagger-${i + 1} ${!m.unlocked ? "opacity-50" : ""}`}
              style={m.status === "done" ? { borderColor: G3, boxShadow: `4px 4px 0 ${G2}` } : {}}
            >
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {/* Icon */}
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                    style={m.status === "done"
                      ? { background: G2, border: `3px solid ${G0}` }
                      : !m.unlocked
                        ? { background: G6, border: `2px solid ${G5}` }
                        : { background: G7, border: `3px solid ${G1}` }}>
                    {m.status === "done"
                      ? <CheckIcon className="w-6 h-6 text-white" />
                      : !m.unlocked
                        ? <LockClosedIcon className="w-5 h-5" style={{ color: MUTED }} />
                        : <RocketLaunchIcon className="w-5 h-5" style={{ color: G2 }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <p className="font-pixel text-[9px] leading-relaxed" style={{ color: INK }}>{m.title}</p>
                    </div>
                    {m.product && <PixelBadge>{m.product}</PixelBadge>}
                    <p className="font-vt323 text-lg mt-1" style={{ color: MUTED }}>{m.format}</p>
                    {!m.unlocked && (
                      <p className="font-pixel text-[7px] mt-1" style={{ color: G3 }}>
                        ОТКРЫТЬ ПОСЛЕ {m.unlock_after} УРОКОВ
                      </p>
                    )}
                  </div>

                  <div className="font-pixel text-[9px] flex-shrink-0" style={{ color: G2 }}>+{m.xp}</div>
                </div>

                {m.unlocked && m.status !== "done" && (
                  <PixelBtn
                    onClick={() => m.status === "active" ? setActive(m) : start(m)}
                    variant={m.status === "active" ? "primary" : "ghost"}
                    size="sm"
                    className="w-full"
                  >
                    <ArrowRightIcon className="w-3 h-3" />
                    {m.status === "active" ? "► ПРОДОЛЖИТЬ" : "► ВЗЯТЬ МИССИЮ"}
                  </PixelBtn>
                )}
                {m.status === "done" && (
                  <div className="font-pixel text-[8px] flex items-center gap-2" style={{ color: G2 }}>
                    <CheckCircleIcon className="w-4 h-4" />ВЫПОЛНЕНО
                  </div>
                )}
              </div>
            </PixelCard>
          ))}
      </div>
    </div>
  );
}

// ─── PORTFOLIO TAB ────────────────────────────────────────────────────────────
function PortfolioTab({ missions, onXpGain }: { missions: Mission[]; onXpGain: (xp: number, total: number) => void }) {
  const [posts, setPosts]       = useState<PortfolioPost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ post_url: "", platform: "instagram", format: "reel", notes: "", mission_id: "" });
  const [posting, setPosting]   = useState(false);

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
    <div className="space-y-5">
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h2 className="font-pixel text-sm mb-1" style={{ color: INK }}>ПОРТФОЛИО</h2>
          <p className="font-vt323 text-xl" style={{ color: MUTED }}>Твои публикации — твой результат</p>
        </div>
        <PixelBtn onClick={() => setShowForm(v => !v)} variant={showForm ? "danger" : "primary"} size="sm">
          {showForm ? "✕ ОТМЕНА" : "+ ДОБАВИТЬ"}
        </PixelBtn>
      </div>

      {showForm && (
        <PixelCard className="p-4 animate-fade-in">
          <p className="font-pixel text-[9px] mb-4" style={{ color: INK }}>► НОВАЯ ПУБЛИКАЦИЯ</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <p className="font-pixel text-[7px] mb-1" style={{ color: MUTED }}>ССЫЛКА НА ПОСТ</p>
              <input value={form.post_url} onChange={e => setForm(f => ({ ...f, post_url: e.target.value }))}
                placeholder="https://instagram.com/p/..."
                className="input-pixel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-pixel text-[7px] mb-1" style={{ color: MUTED }}>ПЛАТФОРМА</p>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="input-pixel">
                  {PLATFORMS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <p className="font-pixel text-[7px] mb-1" style={{ color: MUTED }}>ФОРМАТ</p>
                <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                  className="input-pixel">
                  {FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="font-pixel text-[7px] mb-1" style={{ color: MUTED }}>МИССИЯ</p>
              <select value={form.mission_id} onChange={e => setForm(f => ({ ...f, mission_id: e.target.value }))}
                className="input-pixel">
                <option value="">— без миссии —</option>
                {missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <p className="font-pixel text-[7px] mb-1" style={{ color: MUTED }}>ЗАМЕТКА</p>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Что снял, что понял..."
                className="input-pixel" />
            </div>
            <PixelBtn type="submit" disabled={posting || !form.post_url.trim()} size="lg" className="w-full">
              {posting ? "СОХРАНЯЕМ..." : "+ ДОБАВИТЬ — +100 XP"}
            </PixelBtn>
          </form>
        </PixelCard>
      )}

      {loading ? Array(3).fill(0).map((_, i) => <Skel key={i} h={88} />) : (
        <>
          {myPosts.length === 0 && !showForm && (
            <PixelCard className="p-8 text-center">
              <FolderOpenIcon className="w-12 h-12 mx-auto mb-3" style={{ color: G4 }} />
              <p className="font-pixel text-[9px] mb-2" style={{ color: INK }}>ПОРТФОЛИО ПУСТО</p>
              <p className="font-vt323 text-xl" style={{ color: MUTED }}>Добавь первую публикацию</p>
            </PixelCard>
          )}

          {myPosts.length > 0 && (
            <div className="space-y-3">
              <p className="font-pixel text-[8px]" style={{ color: INK }}>► МОИ ПУБЛИКАЦИИ</p>
              {myPosts.map((p, i) => (
                <PixelCard key={p.id} className={`p-4 animate-fade-in stagger-${i + 1}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                      style={{ background: G2, border: `2px solid ${G0}` }}>
                      <GlobeAltIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-1">
                        <PixelBadge dark>{p.platform.toUpperCase()}</PixelBadge>
                        <PixelBadge>{p.format.toUpperCase()}</PixelBadge>
                        {p.mission && <PixelBadge>{p.mission}</PixelBadge>}
                      </div>
                      {p.notes && <p className="font-vt323 text-xl mt-1" style={{ color: MUTED }}>{p.notes}</p>}
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 font-pixel text-[8px]" style={{ color: G2 }}>
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />ОТКРЫТЬ ПОСТ
                      </a>
                    </div>
                  </div>
                </PixelCard>
              ))}
            </div>
          )}

          {allPosts.length > 0 && (
            <div className="space-y-3">
              <p className="font-pixel text-[8px]" style={{ color: INK }}>► ДРУГИЕ УЧАСТНИКИ</p>
              {allPosts.map((p, i) => (
                <PixelCard key={p.id} className={`p-4 animate-fade-in stagger-${i + 1}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                      style={{ background: G6, border: `2px solid #d4d4d0` }}>
                      <UserCircleIcon className="w-6 h-6" style={{ color: MUTED }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-pixel text-[8px]" style={{ color: INK }}>{p.username}</span>
                        <PixelBadge>{p.platform.toUpperCase()}</PixelBadge>
                        {p.mission && <PixelBadge>{p.mission}</PixelBadge>}
                      </div>
                      {p.notes && <p className="font-vt323 text-lg mt-1" style={{ color: MUTED }}>{p.notes}</p>}
                    </div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" style={{ color: MUTED }} />
                    </a>
                  </div>
                </PixelCard>
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

  const nextXp    = (user.level + 1) * 300;
  const xpToNext  = Math.max(0, nextXp - user.xp);
  const p         = profile;

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <PixelCard className="p-5 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0"
            style={{ background: G2, border: `3px solid ${G0}`, boxShadow: `4px 4px 0 ${G0}` }}>
            <UserCircleIcon className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-pixel text-[10px] mb-0.5" style={{ color: INK }}>{user.username}</p>
            <p className="font-vt323 text-lg" style={{ color: MUTED }}>{user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <PixelBadge dark>LV.{user.level}</PixelBadge>
              <span className="font-pixel text-[9px]" style={{ color: G2 }}>{user.xp.toLocaleString()} XP</span>
              {user.streak > 0 && <span className="font-vt323 text-lg" style={{ color: G3 }}>{user.streak}Д СЕРИЯ</span>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between font-pixel text-[7px] mb-2" style={{ color: MUTED }}>
            <span>ДО LV.{user.level + 1}</span><span>{xpToNext} XP</span>
          </div>
          <PixelProgress value={user.xp} max={nextXp} />
        </div>
      </PixelCard>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in stagger-1">
        {[
          { value: p ? String(p.lessons_done) : "?", label: "УРОКОВ",     Icon: CheckCircleIcon },
          { value: p ? String(p.missions_done) : "?", label: "МИССИЙ",    Icon: RocketLaunchIcon },
          { value: p ? String(p.posts_count) : "?",   label: "ПОСТОВ",    Icon: FolderOpenIcon },
        ].map((s, i) => (
          <PixelCard key={i} className="p-3 text-center">
            <s.Icon className="w-6 h-6 mx-auto mb-1" style={{ color: G2 }} />
            <p className="font-pixel text-sm" style={{ color: INK }}>{s.value}</p>
            <p className="font-pixel text-[7px] mt-1" style={{ color: MUTED }}>{s.label}</p>
          </PixelCard>
        ))}
      </div>

      {/* Settings */}
      <div className="space-y-2 animate-fade-in stagger-2">
        <p className="font-pixel text-[8px] mb-3" style={{ color: INK }}>► НАСТРОЙКИ</p>
        {[
          { label: "РЕДАКТИРОВАТЬ ПРОФИЛЬ", Icon: PencilIcon },
          { label: "ПАРТНЁРСКИЕ ССЫЛКИ",   Icon: LinkIcon },
          { label: "УВЕДОМЛЕНИЯ",           Icon: BellIcon },
          { label: "ПОДЕЛИТЬСЯ ПОРТФОЛИО",  Icon: ShareIcon },
        ].map((item, i) => (
          <PixelCard key={i}>
            <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover-pixel">
              <item.Icon className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
              <span className="font-pixel text-[8px] flex-1" style={{ color: INK }}>{item.label}</span>
              <ChevronRightIcon className="w-4 h-4" style={{ color: MUTED }} />
            </button>
          </PixelCard>
        ))}
        <PixelCard>
          <button onClick={onLogout} className="w-full px-4 py-3 flex items-center gap-3 text-left hover-pixel">
            <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-pixel text-[8px] flex-1 text-red-600">ВЫЙТИ</span>
          </button>
        </PixelCard>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState<Tab>("path");
  const [user, setUser]         = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [xpToast, setXpToast]   = useState<number | null>(null);
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

  const handleAuth    = (u: User) => setUser(u);
  const handleLogout  = async () => { await authPost({ action: "logout" }); localStorage.removeItem(TOKEN_KEY); setUser(null); };
  const handleXpGain  = (xp: number, totalXp: number) => {
    setXpToast(xp);
    if (totalXp >= 0 && user) setUser(u => u ? { ...u, xp: totalXp, level: Math.max(1, Math.floor(totalXp / 300)) } : u);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 animate-pulse"
            style={{ background: G2, border: `3px solid ${G0}` }}>
            <RocketLaunchIcon className="w-8 h-8 text-white" />
          </div>
          <p className="font-pixel text-[10px] animate-blink" style={{ color: G2 }}>ЗАГРУЗКА...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LandingScreen onAuth={handleAuth} />;

  const activeMissions = missions.filter(m => m.status === "active").length;

  return (
    <div className="min-h-screen grid-bg">
      {xpToast !== null && <XpToast xp={xpToast} onDone={() => setXpToast(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-40 header-pixel">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: G3, border: `2px solid ${G0}` }}>
              <RocketLaunchIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-pixel text-[11px] text-white tracking-wider">YOUGEN</span>
          </div>
          <div className="flex items-center gap-2">
            {activeMissions > 0 && (
              <div className="font-pixel text-[7px] px-2 py-1 text-white" style={{ background: G3, border: `2px solid ${G5}` }}>
                {activeMissions} АКТИВНА
              </div>
            )}
            <div className="font-pixel text-[8px] px-3 py-1.5 flex items-center gap-2 text-white"
              style={{ background: G2, border: `2px solid ${G0}` }}>
              <BoltIcon className="w-3 h-3" />{user.xp.toLocaleString()} XP
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
        <div key={tab} className="animate-fade-in">
          {tab === "path"      && <PathTab onXpGain={handleXpGain} />}
          {tab === "missions"  && <MissionsTab onXpGain={handleXpGain} />}
          {tab === "portfolio" && <PortfolioTab missions={missions} onXpGain={handleXpGain} />}
          {tab === "profile"   && <ProfileTab user={user} onLogout={handleLogout} />}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 nav-pixel">
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(item => {
            const isActive = tab === item.id;
            const badge = item.id === "missions" ? activeMissions : 0;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 relative nav-pixel-item ${isActive ? "active" : ""}`}
              >
                {badge > 0 && (
                  <span className="absolute top-1.5 right-1/4 w-4 h-4 font-pixel text-[7px] text-white flex items-center justify-center"
                    style={{ background: G3, border: `1px solid ${G5}` }}>
                    {badge}
                  </span>
                )}
                <item.Icon className="w-5 h-5 mb-1" />
                <span>{item.label}</span>
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: G4 }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}