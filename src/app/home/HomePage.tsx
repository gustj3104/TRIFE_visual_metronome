import { useState, useEffect, useContext, createContext, type ReactNode } from "react";
import { ImageWithFallback } from "./components/ImageWithFallback";
import trifeLogoSrc from "./assets/trife-logo.png";
import { submitApplication, ApplicationSubmitError } from "../lib/notionApplication";
import { fetchQuizQuestions, QUIZ_OPTIONS, type QuizQuestion } from "../lib/notionQuiz";
import { fetchActivities, ActivitiesFetchError, type RemoteActivity } from "../lib/notionActivities";
import {
  ChevronLeft, ChevronRight, Check, ArrowRight,
  MapPin, Clock, Zap, AlertCircle, CheckCircle2,
  Users, Heart, Shield, ChevronDown, Instagram, Home,
  Loader2, Calendar, Info, X, Compass, MessageCircle, ShieldCheck,
} from "lucide-react";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  darkGreen: "#345F45",
  midGreen: "#789B73",
  sage: "#B8C6A1",
  olive: "#D7D9C2",
  cream: "#F9F4EE",
  text: "#24352A",
  sub: "#667069",
  border: "#D9DED5",
  white: "#FFFFFF",
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
const HomeNavContext = createContext<(() => void) | null>(null);

function TrifeLogo({ size = 32 }: { size?: number }) {
  const goHome = useContext(HomeNavContext);
  const content = (
    <div className="flex items-center gap-2">
      <ImageWithFallback
        src={trifeLogoSrc}
        alt="TRIFE 로고"
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      <span style={{ color: C.darkGreen, letterSpacing: "0.22em", fontWeight: 700, fontSize: 14 }}>
        TRIFE
      </span>
    </div>
  );

  if (!goHome) return content;

  return (
    <button
      type="button"
      onClick={goHome}
      className="focus:outline-none focus-visible:ring-2 rounded-lg"
      aria-label="홈으로 이동"
    >
      {content}
    </button>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ["안내", "참여 유형", "퀴즈", "수칙", "신청서"];
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center px-4 pb-3 pt-1">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5 w-12">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: done ? C.midGreen : active ? C.darkGreen : C.olive,
                  color: done || active ? C.white : C.sub,
                }}
              >
                {done ? <Check size={10} /> : n}
              </div>
              <span className="text-[9px] whitespace-nowrap" style={{ color: active ? C.darkGreen : C.sub, fontWeight: active ? 700 : 400 }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-6 h-px mb-3" style={{ background: done ? C.midGreen : C.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page shell (mobile) ──────────────────────────────────────────────────────
function PageShell({
  title,
  onBack,
  step,
  children,
  footer,
}: {
  title?: ReactNode;
  onBack?: () => void;
  step?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Top bar */}
      <div
        className="shrink-0 border-b"
        style={{ background: "rgba(249,244,238,0.97)", backdropFilter: "blur(12px)", borderColor: C.border }}
      >
        <div className="flex items-center gap-2 px-4 h-12">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 focus:outline-none focus-visible:ring-2"
              style={{ color: C.sub }}
              aria-label="뒤로가기"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1 flex items-center justify-center">
            {title ?? <TrifeLogo size={28} />}
          </div>
          {onBack && <div className="w-8" />}
        </div>
        {step !== undefined && <StepBar current={step} />}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto" style={{ background: C.cream, paddingLeft: 20, paddingRight: 20 }}>
        {children}
      </div>

      {/* Footer bar */}
      {footer && (
        <div
          className="shrink-0 border-t px-4 pt-3 pb-safe-bottom"
          style={{
            background: "rgba(249,244,238,0.97)",
            backdropFilter: "blur(12px)",
            borderColor: C.border,
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
type Status = "available" | "upcoming" | "closed" | "cancelled";
const STATUS_CFG: Record<Status, { label: string; bg: string; color: string; icon: ReactNode }> = {
  available: { label: "신청 가능", bg: "#E8F4EC", color: C.darkGreen, icon: <Check size={10} /> },
  upcoming:  { label: "모집 예정", bg: C.olive,    color: C.sub,       icon: <Clock size={10} /> },
  closed:    { label: "마감",     bg: "#EBEBEB",   color: "#888",      icon: <AlertCircle size={10} /> },
  cancelled: { label: "취소됨",   bg: "#FEE8E8",   color: "#C0392B",   icon: <X size={10} /> },
};
function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Activity data ────────────────────────────────────────────────────────────
// Sourced from the Notion "활동 일정 DB": an admin marks a row 공개여부(공개)
// to have it fetched from the Notion proxy worker and shown here.
interface Activity {
  id: string; activityId: string; date: string; isoDate: string; dayLabel: string;
  month: string; weekLabel: string; name: string; time: string; place: string;
  status: Status; intensity: string; detail: string;
}

const STATUS_MAP: Record<string, Status> = {
  "신청 가능": "available",
  "모집 예정": "upcoming",
  "신청 마감": "closed",
  "취소": "cancelled",
};

const ORDINAL_LABELS = ["첫째", "둘째", "셋째", "넷째", "다섯째"];
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function toActivity(remote: RemoteActivity): Activity {
  const parsed = new Date(`${remote.date}T00:00:00`);
  const dayOfMonth = String(parsed.getDate());
  const dayLabel = DAY_LABELS[parsed.getDay()] ?? "";
  const month = MONTH_LABELS[parsed.getMonth()] ?? "";
  const occurrence = Math.floor((parsed.getDate() - 1) / 7);
  const weekLabel = `${ORDINAL_LABELS[occurrence] ?? `${occurrence + 1}번째`} ${dayLabel}요일`;
  const time = remote.startTime && remote.endTime
    ? `${remote.startTime}–${remote.endTime}`
    : remote.startTime || remote.endTime;

  return {
    id: remote.id,
    activityId: remote.activityId,
    date: dayOfMonth,
    isoDate: remote.date,
    dayLabel,
    month,
    weekLabel,
    name: remote.name,
    time,
    place: remote.place,
    status: STATUS_MAP[remote.status] ?? "closed",
    intensity: remote.intensity,
    detail: remote.bottomText,
  };
}

// ─── Quiz data ────────────────────────────────────────────────────────────────
// Fallback shown when the Notion "퀴즈 DB" proxy isn't configured or the
// request fails, so the quiz step never breaks. Non-dev admins normally
// manage these questions directly in Notion (see worker/README.md).
const DEFAULT_QUIZ: QuizQuestion[] = [
  { id: "default-1", question: "시각장애인 참가자가 어려워 보이면 먼저 팔을 잡아 안내해야 한다.", correct: 1, explanation: "도움이 필요해 보이더라도 먼저 의사를 묻고, 동의를 받은 뒤 안내하는 것이 원칙입니다.", audience: "전체" },
  { id: "default-2", question: "TRIFE 활동 중 통증이나 어지러움이 생기면 즉시 운영진에게 알려야 한다.", correct: 0, explanation: "내 몸 상태를 솔직하게 알리는 것이 나와 함께하는 모두를 안전하게 합니다.", audience: "전체" },
  { id: "default-3", question: "TRIFE는 비장애인이 장애인을 돕는 봉사 프로그램이다.", correct: 1, explanation: "TRIFE는 봉사가 아닙니다. 장애인과 비장애인이 동료로서 함께 움직이는 커뮤니티입니다.", audience: "전체" },
  { id: "default-4", question: "가이드 콜사인은 활동 전에 운영진이 안내하며, 반드시 숙지해야 한다.", correct: 0, explanation: "콜사인은 안전한 가이드 러닝을 위한 약속 신호입니다. 참여 전 꼭 확인하세요.", audience: "전체" },
  { id: "default-5", question: "참가자 동의 없이 신체 접촉을 하거나 차별적 언행을 하는 것은 TRIFE 수칙에 어긋난다.", correct: 0, explanation: "모든 참가자는 동등한 존엄을 가집니다. 동의 없는 접촉과 차별적 언행은 허용되지 않습니다.", audience: "전체" },
];

const RULES = [
  { icon: <Heart size={16} />, text: "도움을 주기 전에 먼저 묻고 동의를 구합니다." },
  { icon: <Users size={16} />, text: "서로의 속도와 의사 표현을 존중합니다." },
  { icon: <Shield size={16} />, text: "가이드 콜사인과 운영진의 안전 안내를 따릅니다." },
  { icon: <AlertCircle size={16} />, text: "통증, 어지러움, 불편함이 생기면 즉시 알립니다." },
  { icon: <CheckCircle2 size={16} />, text: "동의 없는 신체 접촉과 차별적 언행을 하지 않습니다." },
];

const CORE_VALUES = [
  {
    icon: <Compass size={16} />,
    title: "함께 움직이며 가능성을 넓히기",
    paragraphs: [
      "같이 움직이는 경험은 누군가에게 즐거운 선택이 되고, 누군가에게는 새로운 길에 발을 내딛는 시작이 됩니다.",
      "같이 달린 거리만큼 익숙한 길과 경험이 늘어나고, 각자가 자유롭게 움직일 수 있는 영역도 함께 넓어집니다.",
    ],
  },
  {
    icon: <MessageCircle size={16} />,
    title: "서로의 감각과 방식을 존중하기",
    paragraphs: [
      "TRIFE는 정해진 하나의 방식에 사람을 맞추지 않습니다.",
      "어떤 속도가 편한지, 어떤 말이 잘 통하는지, 어떤 도움이 필요한지 먼저 묻고 함께 조율합니다. 서로의 감각을 빌리되, 각자의 선택과 의사를 존중합니다.",
    ],
  },
  {
    icon: <ShieldCheck size={16} />,
    title: "안전을 넘어 자유로 나아가기",
    paragraphs: [
      "안전은 함께 움직이기 위한 출발점입니다.",
      "TRIFE가 만들고 싶은 것은 단지 사고 없이 운동하는 환경이 아니라, 누구나 원하는 곳에서 마음껏 움직이고 새로운 길을 선택할 수 있는 경험입니다.",
    ],
  },
  {
    icon: <Users size={16} />,
    title: "함께 움직이기",
    paragraphs: ["장애 유무와 관계없이 같은 시간과 공간에서 움직이며 서로의 가능성을 넓혀갑니다."],
  },
  {
    icon: <Heart size={16} />,
    title: "서로의 방식 존중하기",
    paragraphs: ["도움을 먼저 가정하지 않고, 각자의 속도와 감각, 의사를 묻고 존중합니다."],
  },
  {
    icon: <Shield size={16} />,
    title: "안전하게 연결되기",
    paragraphs: ["테더와 충분한 소통을 바탕으로 서로를 신뢰할 수 있는 환경을 만듭니다."],
  },
  {
    icon: <ArrowRight size={16} />,
    title: "자유의 영역 넓히기",
    paragraphs: ["같이 움직인 경험이 더 많은 길과 선택으로 이어지도록 각자의 활동 반경을 함께 넓혀갑니다."],
  },
];

// ─── Bottom nav tabs ──────────────────────────────────────────────────────────
type Tab = "home" | "schedule" | "about";
function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; icon: ReactNode; label: string }[] = [
    { id: "home",     icon: <Home size={20} />,     label: "홈" },
    { id: "schedule", icon: <Calendar size={20} />, label: "활동 일정" },
    { id: "about",    icon: <Info size={20} />,     label: "소개" },
  ];
  return (
    <div
      className="shrink-0 border-t grid grid-cols-3"
      style={{
        background: C.white,
        borderColor: C.border,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 transition-colors focus:outline-none focus-visible:ring-2"
          style={{ color: tab === it.id ? C.darkGreen : C.sub }}
        >
          {it.icon}
          <span className="text-[10px] font-semibold">{it.label}</span>
          {tab === it.id && (
            <div className="absolute" style={{ bottom: 0, width: 24, height: 2, background: C.darkGreen, borderRadius: 1 }} />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Activity loading/error/empty states ───────────────────────────────────────
function ActivitiesLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10" style={{ color: C.sub }}>
      <Loader2 size={20} className="animate-spin" />
      <span className="text-xs">활동 일정을 불러오는 중...</span>
    </div>
  );
}

function ActivitiesError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center" style={{ color: C.sub }}>
      <AlertCircle size={20} />
      <span className="text-xs leading-[1.7]">{message}</span>
    </div>
  );
}

function ActivitiesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center" style={{ color: C.sub }}>
      <Calendar size={20} />
      <span className="text-xs">예정된 활동이 없습니다.</span>
    </div>
  );
}

// ─── HOME tab ─────────────────────────────────────────────────────────────────
function HomeTab({ activities, loadError, onApply, onSchedule }: {
  activities: Activity[] | null; loadError: string | null;
  onApply: (a: Activity) => void; onSchedule: () => void;
}) {
  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Soft background orbs */}
        <div
          className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.sage}, transparent 68%)`, opacity: 0.22, transform: "translate(35%, -35%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.olive}, transparent 68%)`, opacity: 0.28, transform: "translate(-35%, 35%)" }}
        />

        {/* ① Logo — top-center brand mark */}
        <div className="flex flex-col items-center pt-6 pb-0 px-6">
          <div className="relative w-full" style={{ marginBottom: 10 }}>
            {/* Halo behind logo */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${C.sage}55, transparent 70%)`, transform: "scale(1.1)" }}
            />
            <ImageWithFallback
              src={trifeLogoSrc}
              alt="TRIFE 로고 심볼"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
                objectPosition: "center",
                position: "relative",
                display: "block",
                marginTop: "-12%",
                marginBottom: "-15%",
              }}
            />
          </div>
        </div>

        {/* ④ Introduction copy — spacious block */}
        <div className="px-6 pb-4">
          <div
            className="rounded-2xl px-5 pt-6 pb-8"
            style={{ background: C.white, border: `1px solid ${C.border}`, position: "relative", zIndex: 10, marginTop: 20 }}
          >
            <p
              className="leading-[2.0] text-sm font-semibold mb-4"
              style={{ color: C.darkGreen }}
            >
              조금씩 더 넓어지는 일—
            </p>
            <p className="leading-[2.0] text-sm" style={{ color: C.sub }}>
              시각장애인과 비시각장애인이 함께 달리고 운동하는 포용적 웰니스 커뮤니티, TRIFE입니다.
            </p>
            <p className="leading-[2.0] text-sm mt-4" style={{ color: C.sub }}>
              누군가에게는 '함께 뛰는 것'이 조금 더 큰 의미가 돼요.
            </p>
            <p className="leading-[2.0] text-sm mt-4" style={{ color: C.sub }}>
              우리는 언제든 원하는 곳에서 마음껏 움직일 수 있는 자유를 같이 넓혀보려고 합니다.
            </p>
          </div>
        </div>

        {/* ⑤ Schedule badge + ⑥ CTA */}
        <div className="px-6 pt-6 pb-7 flex flex-col gap-3">
          <div className="flex justify-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: C.olive }}
            >
              <Calendar size={13} style={{ color: C.darkGreen }} />
              <span className="text-xs font-semibold" style={{ color: C.darkGreen }}>
                매월 둘째·넷째 일요일
              </span>
            </div>
          </div>

          <button
            onClick={onSchedule}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-[14px] font-semibold text-sm hover:opacity-90 transition-opacity min-h-[52px]"
            style={{ background: C.darkGreen, color: C.white }}
          >
            이번 달 활동 보기 <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* This month preview */}
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: C.text }}>이번 달 활동</h2>
          <button onClick={onSchedule} className="text-xs font-medium" style={{ color: C.midGreen }}>
            전체 보기
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {loadError ? (
            <ActivitiesError message={loadError} />
          ) : activities === null ? (
            <ActivitiesLoading />
          ) : activities.length === 0 ? (
            <ActivitiesEmpty />
          ) : (
            activities.slice(0, 1).map((act) => (
              <MiniCard key={act.id} act={act} onApply={onApply} />
            ))
          )}
        </div>
      </div>

      {/* Values */}
      <div className="px-5 pb-8">
        <h2 className="font-bold text-base mb-4" style={{ color: C.text }}>TRIFE는 이런 커뮤니티예요</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: <Users size={16} />, title: "함께 움직이기", desc: "장애 유무와 관계없이 같은 공간에서 달리고 운동합니다." },
            { icon: <Heart size={16} />, title: "서로의 방식 존중하기", desc: "각자의 속도와 의사 표현을 존중하며 함께합니다." },
            { icon: <Shield size={16} />, title: "안전하게 연결되기", desc: "안전 수칙과 콜사인으로 신뢰할 수 있는 커뮤니티를 만듭니다." },
          ].map((v, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-[16px] border" style={{ background: C.white, borderColor: C.border }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.olive, color: C.darkGreen }}>
                {v.icon}
              </div>
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: C.text }}>{v.title}</p>
                <p className="text-xs leading-[1.7]" style={{ color: C.sub }}>{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCard({ act, onApply }: { act: Activity; onApply: (a: Activity) => void }) {
  const disabled = act.status === "closed" || act.status === "cancelled";
  return (
    <div className="rounded-[16px] border p-4" style={{ background: C.white, borderColor: C.border }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: C.cream }}>
          <span className="font-bold text-lg leading-none" style={{ color: C.darkGreen }}>{act.date}</span>
          <span className="text-[9px] font-bold tracking-widest" style={{ color: C.midGreen }}>{act.month}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs mb-0.5" style={{ color: C.sub }}>{act.weekLabel}</p>
          <p className="font-bold text-sm leading-snug truncate" style={{ color: C.text }}>{act.name}</p>
          <StatusBadge status={act.status} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: C.sub }}>
        <span className="flex items-center gap-1"><Clock size={11} style={{ color: C.midGreen }} />{act.time}</span>
        <span className="flex items-center gap-1"><MapPin size={11} style={{ color: C.midGreen }} />{act.place}</span>
      </div>
      <button
        onClick={() => !disabled && onApply(act)}
        disabled={disabled}
        className="w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity min-h-[44px]"
        style={{ background: disabled ? C.olive : C.darkGreen, color: disabled ? C.sub : C.white, opacity: disabled ? 0.7 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {disabled ? STATUS_CFG[act.status].label : "자세히 보고 신청하기"}
      </button>
    </div>
  );
}

// ─── SCHEDULE tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ activities, loadError, onApply }: {
  activities: Activity[] | null; loadError: string | null; onApply: (a: Activity) => void;
}) {
  return (
    <div className="px-4 py-5" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg" style={{ color: C.text }}>활동 일정</h2>
        <div className="flex items-center gap-2">
          <button className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: C.border }} aria-label="이전 달"><ChevronLeft size={14} style={{ color: C.sub }} /></button>
          <span className="text-xs font-semibold" style={{ color: C.text }}>2026년 8월</span>
          <button className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: C.border }} aria-label="다음 달"><ChevronRight size={14} style={{ color: C.sub }} /></button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {loadError ? (
          <ActivitiesError message={loadError} />
        ) : activities === null ? (
          <ActivitiesLoading />
        ) : activities.length === 0 ? (
          <ActivitiesEmpty />
        ) : (
          activities.map((act) => <FullActivityCard key={act.id} act={act} onApply={onApply} />)
        )}
      </div>
    </div>
  );
}

function FullActivityCard({ act, onApply }: { act: Activity; onApply: (a: Activity) => void }) {
  const disabled = act.status === "closed" || act.status === "cancelled";
  return (
    <div className="rounded-[20px] border p-5" style={{ background: C.white, borderColor: C.border }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: C.cream }}>
          <span className="font-bold text-2xl leading-none" style={{ color: C.darkGreen }}>{act.date}</span>
          <span className="text-[9px] font-bold tracking-widest mt-0.5" style={{ color: C.midGreen }}>{act.month}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs mb-0.5" style={{ color: C.sub }}>{act.weekLabel} · {act.dayLabel}요일</p>
          <h3 className="font-bold text-base leading-snug" style={{ color: C.text }}>{act.name}</h3>
          <StatusBadge status={act.status} />
        </div>
      </div>
      <div className="flex flex-col gap-2 text-xs mb-4" style={{ color: C.sub }}>
        <div className="flex items-center gap-2"><Clock size={12} style={{ color: C.midGreen }} />{act.time}</div>
        <div className="flex items-center gap-2"><MapPin size={12} style={{ color: C.midGreen }} />{act.place}</div>
        {act.intensity && (
          <div className="flex items-center gap-2"><Zap size={12} style={{ color: C.midGreen }} />강도: {act.intensity}</div>
        )}
      </div>
      <button
        onClick={() => !disabled && onApply(act)}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-[12px] font-semibold text-sm transition-opacity min-h-[48px]"
        style={{ background: disabled ? C.olive : C.darkGreen, color: disabled ? C.sub : C.white, opacity: disabled ? 0.7 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {disabled ? <><AlertCircle size={14} />{STATUS_CFG[act.status].label}</> : <>자세히 보고 신청하기 <ArrowRight size={14} /></>}
      </button>
    </div>
  );
}

// ─── ABOUT tab ────────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <div className="px-4 py-5" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Identity block */}
      <div className="rounded-[20px] overflow-hidden mb-4" style={{ background: C.darkGreen }}>
        <div className="p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: C.sage, transform: "translate(30%, -30%)" }} />
          <p className="text-xs font-semibold mb-3" style={{ color: C.sage }}>TRIFE 소개</p>
          <h2 className="font-bold text-xl leading-snug mb-3 text-white">
            혼자 달릴 때는 몰랐던,<br />연결된 리듬
          </h2>
          <p className="text-xs leading-[1.8]" style={{ color: C.sage }}>
            TRIFE는 시각장애인과 비시각장애인이 함께 달리고 운동하며, 서로의 움직임을 넓혀가는 포용적 웰니스 커뮤니티입니다.
          </p>
          <p className="text-xs leading-[1.8] mt-3" style={{ color: C.sage }}>
            가이드러닝을 시작으로 각자의 속도와 감각, 의사 표현을 나누며 함께 움직이는 방법을 찾아갑니다. 누군가를 일방적으로 돕는 관계가 아니라, 서로에게 페이스가 되고 동료가 되어 나란히 나아갑니다.
          </p>
        </div>
        <div className="flex border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {["가이드 러닝", "보강운동", "움직임 세션", "포용 피트니스"].map((t, i, arr) => (
            <div key={t} className={`flex-1 py-2.5 text-center text-[9px] font-semibold ${i < arr.length - 1 ? "border-r" : ""}`}
              style={{ borderColor: "rgba(255,255,255,0.1)", color: C.sage }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule highlight */}
      <div className="rounded-[16px] border p-4 mb-4 flex items-center gap-4" style={{ background: C.white, borderColor: C.border }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: C.olive }}>
          <Calendar size={20} style={{ color: C.darkGreen }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: C.text }}>매월 둘째·넷째 일요일</p>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: C.sub }}>정기 활동이 진행됩니다.</p>
        </div>
      </div>

      {/* Core values */}
      <h3 className="font-bold text-sm mb-3" style={{ color: C.text }}>핵심 가치</h3>
      <div className="flex flex-col gap-3 mb-6">
        {CORE_VALUES.map((v, i) => (
          <div key={i} className="flex gap-3 p-4 rounded-[16px] border" style={{ background: C.white, borderColor: C.border }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.olive, color: C.darkGreen }}>{v.icon}</div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: C.text }}>{v.title}</p>
              {v.paragraphs.map((para, j) => (
                <p key={j} className={`text-xs leading-[1.7] ${j > 0 ? "mt-2" : ""}`} style={{ color: C.sub }}>{para}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm font-semibold leading-relaxed mb-6" style={{ color: C.darkGreen }}>
        앞서 가는 일이 아니라, 나란히 가는 일.
      </p>

      {/* Instagram CTA */}
      <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-4 rounded-[14px] border font-semibold text-sm min-h-[52px] transition-opacity hover:opacity-80"
        style={{ borderColor: C.border, color: C.text }}>
        <Instagram size={16} /> @trife_run 인스타그램
      </a>
    </div>
  );
}

// ─── Flow screens ─────────────────────────────────────────────────────────────
function ActivityDetailScreen({ act, onNext, onBack }: { act: Activity; onNext: () => void; onBack: () => void }) {
  return (
    <PageShell
      onBack={onBack}
      step={1}
      footer={
        <button onClick={onNext} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-bold text-sm min-h-[52px] hover:opacity-90" style={{ background: C.darkGreen, color: C.white }}>
          안내를 확인했어요 <ArrowRight size={15} />
        </button>
      }
    >
      <div className="px-4 py-5">
        {/* Summary */}
        <div className="rounded-[20px] border p-4 mb-5" style={{ background: C.white, borderColor: C.border }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: C.cream }}>
              <span className="font-bold text-2xl leading-none" style={{ color: C.darkGreen }}>{act.date}</span>
              <span className="text-[9px] font-bold tracking-widest" style={{ color: C.midGreen }}>{act.month}</span>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: C.sub }}>{act.weekLabel}</p>
              <h2 className="font-bold text-base leading-snug" style={{ color: C.text }}>{act.name}</h2>
              <StatusBadge status={act.status} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: C.sub }}>
            <span className="flex items-center gap-1.5"><Clock size={11} style={{ color: C.midGreen }} />{act.time}</span>
            <span className="flex items-center gap-1.5"><MapPin size={11} style={{ color: C.midGreen }} />{act.place}</span>
            {act.intensity && (
              <span className="flex items-center gap-1.5"><Zap size={11} style={{ color: C.midGreen }} />강도: {act.intensity}</span>
            )}
          </div>
        </div>

        {act.detail && (
          <div className="mb-5">
            <p className="text-xs font-bold mb-1.5" style={{ color: C.darkGreen }}>안내</p>
            <p className="text-sm leading-[1.8]" style={{ color: C.sub }}>{act.detail}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function ParticipantTypeScreen({ onSelect, onBack }: { onSelect: (t: "new" | "returning") => void; onBack: () => void }) {
  const [sel, setSel] = useState<"new" | "returning" | null>(null);
  return (
    <PageShell
      onBack={onBack}
      step={2}
      footer={
        <button
          onClick={() => sel && onSelect(sel)}
          disabled={!sel}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-bold text-sm min-h-[52px] transition-opacity"
          style={{ background: sel ? C.darkGreen : C.olive, color: sel ? C.white : C.sub, opacity: sel ? 1 : 0.7, cursor: sel ? "pointer" : "not-allowed" }}
          aria-disabled={!sel}
        >
          다음으로 <ArrowRight size={15} />
        </button>
      }
    >
      <div className="px-4 py-5">
        <h2 className="font-bold text-xl mb-1.5" style={{ color: C.text }}>TRIFE에 참여한 적이 있나요?</h2>
        <p className="text-sm mb-6" style={{ color: C.sub }}>해당하는 항목을 선택해 주세요.</p>
        <div className="flex flex-col gap-3">
          {([
            { key: "new" as const, title: "처음 참여해요", desc: "TRIFE 오프라인 활동에 처음 참여하거나, 신청만 하고 아직 참여하지 않은 경우" },
            { key: "returning" as const, title: "참여한 적이 있어요", desc: "TRIFE 오프라인 활동에 한 번 이상 참여한 경우" },
          ]).map((opt) => (
            <button key={opt.key} onClick={() => setSel(opt.key)}
              className="text-left p-5 rounded-[20px] border-2 transition-all focus:outline-none focus-visible:ring-2 min-h-[48px]"
              style={{ background: sel === opt.key ? "#EBF3EE" : C.white, borderColor: sel === opt.key ? C.darkGreen : C.border }}
              aria-pressed={sel === opt.key}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-base" style={{ color: C.text }}>{opt.title}</span>
                {sel === opt.key && <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2" style={{ background: C.darkGreen }}><Check size={10} color="white" /></div>}
              </div>
              <p className="text-sm leading-[1.7]" style={{ color: C.sub }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function QuizScreen({ questions, onComplete, onBack }: { questions: QuizQuestion[]; onComplete: (score: number, total: number) => void; onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(false);
  const [score, setScore] = useState(0);
  // idx is always kept within [0, questions.length) by handleNext, so this
  // index access is safe even though questions[idx] is typed as possibly undefined.
  const q = questions[idx]!;
  const correct = sel === q.correct;
  const total = questions.length;

  const handleNext = () => {
    if (!feedback) { setFeedback(true); setScore((s) => s + (correct ? 1 : 0)); return; }
    if (idx < total - 1) { setIdx((v) => v + 1); setSel(null); setFeedback(false); }
    else onComplete(score + (correct ? 1 : 0), total);
  };

  return (
    <PageShell
      onBack={onBack}
      step={3}
      footer={
        <button
          onClick={handleNext}
          disabled={sel === null}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-bold text-sm min-h-[52px] transition-opacity"
          style={{ background: sel !== null ? C.darkGreen : C.olive, color: sel !== null ? C.white : C.sub, opacity: sel !== null ? 1 : 0.7, cursor: sel !== null ? "pointer" : "not-allowed" }}
          aria-disabled={sel === null}
        >
          {!feedback ? "확인하기" : idx < total - 1 ? "다음 문제" : "결과 보기"}
          <ArrowRight size={15} />
        </button>
      }
    >
      <div className="px-4 py-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold" style={{ color: C.sub }}>{idx + 1} / {total}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.olive }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / total) * 100}%`, background: C.darkGreen }} />
          </div>
        </div>
        <h2 className="font-bold text-base mb-4" style={{ color: C.text }}>함께 움직이기 전,<br />잠깐 알아볼까요?</h2>

        <div className="rounded-[16px] border p-4 mb-4" style={{ background: C.white, borderColor: C.border }}>
          <p className="text-xs font-bold mb-2" style={{ color: C.midGreen }}>Q{idx + 1}</p>
          <p className="text-sm leading-[1.8] font-medium" style={{ color: C.text }}>{q.question}</p>
        </div>

        <div className="flex flex-col gap-2.5 mb-4" role="radiogroup" aria-label="선택지">
          {QUIZ_OPTIONS.map((opt, i) => {
            let bg = C.white, border = C.border, icon: ReactNode = null;
            if (feedback && sel === i) {
              bg = correct ? "#EBF3EE" : "#FEF9F0";
              border = correct ? C.darkGreen : "#D4A017";
              icon = correct ? <CheckCircle2 size={16} style={{ color: C.darkGreen }} /> : <AlertCircle size={16} style={{ color: "#B8860B" }} />;
            } else if (!feedback && sel === i) {
              bg = "#EBF3EE"; border = C.darkGreen;
            }
            return (
              <button key={i} onClick={() => !feedback && setSel(i)}
                className="flex items-center gap-3 p-4 rounded-[14px] border-2 text-left transition-all focus:outline-none focus-visible:ring-2 min-h-[52px]"
                style={{ background: bg, borderColor: border, cursor: feedback ? "default" : "pointer" }}
                role="radio" aria-checked={sel === i}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{ borderColor: sel === i ? border : C.border, background: sel === i ? border : "transparent" }}>
                  {sel === i && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="font-medium text-sm flex-1" style={{ color: C.text }}>{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="rounded-[16px] p-4" style={{ background: correct ? "#EBF3EE" : "#FEF9F0", border: `1px solid ${correct ? C.sage : "#E8D08A"}` }}>
            <div className="flex items-center gap-2 mb-2">
              {correct ? <CheckCircle2 size={16} style={{ color: C.darkGreen }} /> : <AlertCircle size={16} style={{ color: "#B8860B" }} />}
              <span className="font-bold text-sm" style={{ color: correct ? C.darkGreen : "#8B6914" }}>
                {correct ? "맞았어요!" : "함께 알아볼까요?"}
              </span>
            </div>
            <p className="text-xs leading-[1.7]" style={{ color: C.sub }}>{q.explanation}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function QuizResultScreen({ score, total, onNext, onBack }: { score: number; total: number; onNext: () => void; onBack: () => void }) {
  const pct = (score / total) * 100;
  const r = 44, circ = 2 * Math.PI * r;
  return (
    <PageShell
      onBack={onBack}
      step={3}
      footer={
        <button onClick={onNext} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-bold text-sm min-h-[52px] hover:opacity-90" style={{ background: C.darkGreen, color: C.white }}>
          활동 수칙 확인하기 <ArrowRight size={15} />
        </button>
      }
    >
      <div className="px-4 py-10 flex flex-col items-center text-center">
        <div className="relative w-32 h-32 mb-5">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke={C.olive} strokeWidth="8" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={C.darkGreen} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={`${(pct / 100) * circ} ${circ}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: C.darkGreen }}>{score}</span>
            <span className="text-xs" style={{ color: C.sub }}>/ {total}</span>
          </div>
        </div>
        <h2 className="font-bold text-2xl mb-2" style={{ color: C.text }}>함께 움직일 준비를<br />마쳤어요.</h2>
        <p className="text-sm mb-3" style={{ color: C.sub }}>{total}문제 중 {score}문제를 맞혔어요.</p>
        <p className="text-xs leading-[1.8] max-w-[300px]" style={{ color: C.sub }}>
          점수보다 중요한 것은 서로의 방식과 안전을 존중하는 마음입니다.
        </p>
      </div>
    </PageShell>
  );
}

function RulesScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <PageShell
      onBack={onBack}
      step={4}
      footer={
        <button
          onClick={() => agreed && onNext()}
          disabled={!agreed}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-bold text-sm min-h-[52px] transition-opacity"
          style={{ background: agreed ? C.darkGreen : C.olive, color: agreed ? C.white : C.sub, opacity: agreed ? 1 : 0.7, cursor: agreed ? "pointer" : "not-allowed" }}
          aria-disabled={!agreed}
        >
          신청서 작성하기 <ArrowRight size={15} />
        </button>
      }
    >
      <div className="px-4 py-5">
        <h2 className="font-bold text-xl mb-4" style={{ color: C.text }}>함께 움직이기 위한 약속</h2>
        <div className="rounded-[16px] p-4 mb-5" style={{ background: "#EBF3EE", border: `1px solid ${C.sage}` }}>
          <p className="text-sm leading-[1.8]" style={{ color: C.text }}>
            TRIFE는 누군가를 일방적으로 돕는 봉사활동이 아닙니다. 장애인과 비장애인이 서로의 방식과 속도를 존중하며 함께 움직이고 운동하는 커뮤니티입니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 mb-6">
          {RULES.map((r, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-[16px] border" style={{ background: C.white, borderColor: C.border }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.olive, color: C.darkGreen }}>{r.icon}</div>
              <div>
                <p className="text-[10px] font-bold mb-1" style={{ color: C.midGreen }}>수칙 {i + 1}</p>
                <p className="text-sm leading-[1.7]" style={{ color: C.text }}>{r.text}</p>
              </div>
            </div>
          ))}
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => setAgreed((v) => !v)}
            className="w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all"
            style={{ borderColor: agreed ? C.darkGreen : C.border, background: agreed ? C.darkGreen : C.white }}
            role="checkbox" aria-checked={agreed} tabIndex={0}
            onKeyDown={(e) => e.key === " " && setAgreed((v) => !v)}
          >
            {agreed && <Check size={13} color="white" />}
          </div>
          <span className="text-sm leading-[1.7]" style={{ color: C.text }}>
            위 내용을 모두 확인했으며, TRIFE의 활동 취지와 수칙에 동의합니다.
          </span>
        </label>
      </div>
    </PageShell>
  );
}

// ─── Application form ─────────────────────────────────────────────────────────
interface FormData { name: string; phone: string; gender: string; district: string; dong: string; age: string; frequency: string; privacy: boolean; }
type FormErrors = Partial<Record<keyof FormData, string>>;

function FormScreen({ act, score, total, participantType, onComplete, onBack }: {
  act: Activity; score: number; total: number; participantType: "new" | "returning"; onComplete: () => void; onBack: () => void;
}) {
  const [form, setForm] = useState<FormData>({ name: "", phone: "", gender: "", district: "", dong: "", age: "", frequency: "", privacy: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (k: keyof FormData) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const clearErr = (k: keyof FormData) => setErrors((e) => ({ ...e, [k]: "" }));

  const validate = () => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "필수 항목입니다.";
    if (!form.phone.trim()) e.phone = "필수 항목입니다.";
    else if (!/^010-\d{4}-\d{4}$/.test(form.phone)) e.phone = "연락처를 확인해 주세요. (010-1234-5678)";
    if (!form.gender) e.gender = "필수 항목입니다.";
    if (!form.district.trim()) e.district = "필수 항목입니다.";
    if (!form.dong.trim()) e.dong = "필수 항목입니다.";
    if (!form.age.trim()) e.age = "필수 항목입니다.";
    else if (isNaN(+form.age) || +form.age < 1) e.age = "올바른 나이를 입력해 주세요.";
    if (!form.frequency) e.frequency = "필수 항목입니다.";
    if (!form.privacy) e.privacy = "개인정보 동의가 필요합니다.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitApplication({
        name: form.name.trim(),
        phone: form.phone,
        gender: form.gender,
        district: form.district.trim(),
        dong: form.dong.trim(),
        age: +form.age,
        frequency: form.frequency,
        privacyConsent: form.privacy,
        rulesConsent: true,
        participantType: participantType === "new" ? "신규" : "기존",
        quizScore: score,
        quizTotal: total,
        activityName: act.name,
        activityDate: act.isoDate,
      });
      onComplete();
    } catch (err) {
      setSubmitError(
        err instanceof ApplicationSubmitError
          ? err.message
          : "신청서 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fmtPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  };

  const inputStyle = (k: keyof FormData) => ({
    background: C.white,
    borderColor: errors[k] ? "#C0392B" : (form[k] ? C.midGreen : C.border),
    color: C.text,
  });

  return (
    <PageShell
      onBack={onBack}
      step={5}
      footer={
        <div className="flex flex-col gap-2">
          {submitError && (
            <p className="text-xs text-center" style={{ color: "#C0392B" }} role="alert">{submitError}</p>
          )}
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-bold text-sm min-h-[52px] hover:opacity-90 transition-opacity"
            style={{ background: C.darkGreen, color: C.white }}>
            {submitting ? <><Loader2 size={15} className="animate-spin" />제출 중...</> : <>신청 제출하기 <ArrowRight size={15} /></>}
          </button>
        </div>
      }
    >
      <div className="px-4 py-5">
        <h2 className="font-bold text-xl mb-1" style={{ color: C.text }}>활동 신청 정보를<br />알려주세요.</h2>
        <p className="text-xs mb-6 leading-relaxed" style={{ color: C.sub }}>안전한 활동 운영을 위해 필요한 정보만 수집합니다.</p>

        <div className="flex flex-col gap-5">
          {/* Name */}
          <FField label="이름" error={errors.name}>
            <input type="text" value={form.name} placeholder="홍길동"
              onChange={(e) => { set("name")(e.target.value); clearErr("name"); }}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors min-h-[48px]"
              style={inputStyle("name")} aria-invalid={!!errors.name} />
          </FField>

          {/* Phone */}
          <FField label="연락처" error={errors.phone}>
            <input type="tel" inputMode="numeric" value={form.phone} placeholder="010-1234-5678"
              onChange={(e) => { set("phone")(fmtPhone(e.target.value)); clearErr("phone"); }}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors min-h-[48px]"
              style={inputStyle("phone")} aria-invalid={!!errors.phone} />
          </FField>

          {/* Gender */}
          <FField label="성별" error={errors.gender}>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {["여성", "남성", "기타", "답변하지 않음"].map((g) => (
                <button key={g} onClick={() => { set("gender")(g); clearErr("gender"); }}
                  className="py-3 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 min-h-[48px]"
                  style={{ background: form.gender === g ? "#EBF3EE" : C.white, borderColor: form.gender === g ? C.darkGreen : errors.gender ? "#C0392B" : C.border, color: form.gender === g ? C.darkGreen : C.text }}
                  role="radio" aria-checked={form.gender === g}>{g}</button>
              ))}
            </div>
          </FField>

          {/* Location */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: C.text }}>거주지 <span style={{ color: "#C0392B" }}>*</span></p>
            <div className="flex gap-2">
              {([["district", "자치구", "동대문구"], ["dong", "동", "전농동"]] as const).map(([k, label, ph]) => (
                <div key={k} className="flex-1">
                  <input type="text" value={form[k] as string} placeholder={ph} aria-label={label}
                    onChange={(e) => { set(k)(e.target.value); clearErr(k); }}
                    className="w-full px-3 py-3 rounded-xl border text-sm outline-none transition-colors min-h-[48px]"
                    style={inputStyle(k)} />
                  {errors[k] && <p className="text-[10px] mt-1" style={{ color: "#C0392B" }} role="alert">{errors[k]}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Age */}
          <FField label="만 나이" error={errors.age}>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="numeric" value={form.age} placeholder="25" min={1} max={120}
                onChange={(e) => { set("age")(e.target.value); clearErr("age"); }}
                className="w-24 px-4 py-3 rounded-xl border text-sm outline-none transition-colors min-h-[48px]"
                style={inputStyle("age")} aria-label="만 나이(세)" />
              <span className="text-sm" style={{ color: C.sub }}>세</span>
            </div>
          </FField>

          {/* Frequency */}
          <FField label="주간 운동 빈도" error={errors.frequency}>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {["주 0회", "주 1회", "주 2회", "주 3회", "주 4회", "주 5회 이상"].map((f) => (
                <button key={f} onClick={() => { set("frequency")(f); clearErr("frequency"); }}
                  className="py-3 rounded-xl border text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 min-h-[48px]"
                  style={{ background: form.frequency === f ? "#EBF3EE" : C.white, borderColor: form.frequency === f ? C.darkGreen : errors.frequency ? "#C0392B" : C.border, color: form.frequency === f ? C.darkGreen : C.text }}
                  role="radio" aria-checked={form.frequency === f}>{f}</button>
              ))}
            </div>
          </FField>

          {/* Privacy */}
          <div>
            <button onClick={() => setPrivacyOpen((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl border text-sm font-medium text-left focus:outline-none focus-visible:ring-2 min-h-[48px]"
              style={{ background: C.white, borderColor: C.border, color: C.text }}
              aria-expanded={privacyOpen}>
              <span>개인정보 수집·이용 안내</span>
              <ChevronDown size={15} style={{ color: C.sub, transform: privacyOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {privacyOpen && (
              <div className="px-4 py-3 rounded-xl border mt-1.5 text-xs leading-[1.8]" style={{ background: "#F5F8F5", borderColor: C.sage, color: C.sub }}>
                <p><strong style={{ color: C.text }}>수집 목적</strong>: TRIFE 활동 신청 확인 및 참가자 운영</p>
                <p className="mt-1.5"><strong style={{ color: C.text }}>수집 항목</strong>: 이름, 연락처, 성별, 거주 지역, 만 나이, 운동 빈도</p>
                <p className="mt-1.5"><strong style={{ color: C.text }}>보유 기간</strong>: 해당 활동 종료 후 1년</p>
                <p className="mt-1.5">동의를 거부하실 권리가 있으며, 거부 시 신청이 제한될 수 있습니다.</p>
              </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer mt-3">
              <div
                onClick={() => { set("privacy")(!form.privacy); clearErr("privacy"); }}
                className="w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all"
                style={{ borderColor: errors.privacy ? "#C0392B" : form.privacy ? C.darkGreen : C.border, background: form.privacy ? C.darkGreen : C.white }}
                role="checkbox" aria-checked={form.privacy} tabIndex={0}
                onKeyDown={(e) => e.key === " " && set("privacy")(!form.privacy)}>
                {form.privacy && <Check size={13} color="white" />}
              </div>
              <span className="text-sm leading-[1.7]" style={{ color: C.text }}>
                개인정보 수집 및 이용에 동의합니다.{" "}
                <span className="text-[10px] font-bold" style={{ color: "#C0392B" }}>필수</span>
              </span>
            </label>
            {errors.privacy && <p className="text-xs ml-9 mt-1" style={{ color: "#C0392B" }} role="alert">{errors.privacy}</p>}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function FField({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold mb-2" style={{ color: C.text }}>{label} <span style={{ color: "#C0392B" }}>*</span></p>
      {children}
      {error && <p className="text-[10px] mt-1" style={{ color: "#C0392B" }} role="alert">{error}</p>}
    </div>
  );
}

// ─── Completion ───────────────────────────────────────────────────────────────
function CompletionScreen({ act, onHome }: { act: Activity; onHome: () => void }) {
  return (
    <div className="flex flex-col min-h-full items-center justify-center px-5 py-12 text-center" style={{ fontFamily: "'Noto Sans KR', sans-serif", background: C.cream }}>
      <button
        type="button"
        onClick={onHome}
        className="w-20 h-20 mb-4 focus:outline-none focus-visible:ring-2 rounded-lg"
        aria-label="홈으로 이동"
      >
        <ImageWithFallback src={trifeLogoSrc} alt="TRIFE 로고" className="w-full h-full object-contain" />
      </button>
      <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: "#EBF3EE" }}>
        <CheckCircle2 size={22} style={{ color: C.darkGreen }} />
      </div>
      <h2 className="font-bold text-2xl mb-1.5" style={{ color: C.text }}>제출이 완료되었습니다.</h2>
      <p className="text-base mb-6" style={{ color: C.sub }}>트라이프에서 만나요!</p>

      <div className="w-full max-w-[380px] rounded-[20px] border p-4 mb-6 text-left" style={{ background: C.white, borderColor: C.border }}>
        <p className="text-xs font-bold mb-2" style={{ color: C.darkGreen }}>신청한 활동</p>
        <p className="font-bold text-base mb-2" style={{ color: C.text }}>{act.name}</p>
        <div className="flex flex-col gap-1.5 text-xs" style={{ color: C.sub }}>
          <span className="flex items-center gap-2"><Clock size={12} style={{ color: C.midGreen }} />{act.date} {act.month} ({act.weekLabel}) · {act.time}</span>
          <span className="flex items-center gap-2"><MapPin size={12} style={{ color: C.midGreen }} />{act.place}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[380px]">
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-4 rounded-[14px] border font-semibold text-sm min-h-[52px]"
          style={{ borderColor: C.border, color: C.text }}>
          <Instagram size={15} /> TRIFE 인스타그램 보기
        </a>
        <button onClick={onHome}
          className="flex items-center justify-center gap-2 py-4 rounded-[14px] font-semibold text-sm min-h-[52px] hover:opacity-90"
          style={{ background: C.darkGreen, color: C.white }}>
          <Home size={15} /> 처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────
type Screen =
  | { id: "main"; tab: Tab }
  | { id: "detail"; act: Activity }
  | { id: "participant"; act: Activity }
  | { id: "quiz"; act: Activity; pt: "new" | "returning" }
  | { id: "result"; act: Activity; pt: "new" | "returning"; score: number; total: number }
  | { id: "rules"; act: Activity; pt: "new" | "returning"; score: number; total: number }
  | { id: "form"; act: Activity; pt: "new" | "returning"; score: number; total: number }
  | { id: "complete"; act: Activity };

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>({ id: "main", tab: "home" });
  const [quiz, setQuiz] = useState<QuizQuestion[]>(DEFAULT_QUIZ);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuizQuestions().then((fetched) => {
      if (!cancelled && fetched) setQuiz(fetched);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchActivities()
      .then((remote) => {
        if (cancelled) return;
        setActivities(remote.map(toActivity));
      })
      .catch((err) => {
        if (cancelled) return;
        setActivitiesError(
          err instanceof ActivitiesFetchError
            ? err.message
            : "활동 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = document.querySelector(".overflow-y-auto");
    el?.scrollTo(0, 0);
  }, [screen.id]);

  const isMain = screen.id === "main";

  // Questions targeted at "전체" always show; "신규"/"기존" only show to the
  // matching participant type. Falls back to the full set if a misconfigured
  // audience filter would otherwise leave no questions.
  const quizFor = (pt: "new" | "returning"): QuizQuestion[] => {
    const audience = pt === "new" ? "신규" : "기존";
    const filtered = quiz.filter((q) => q.audience === "전체" || q.audience === audience);
    return filtered.length > 0 ? filtered : quiz;
  };

  return (
    <HomeNavContext.Provider value={() => setScreen({ id: "main", tab: "home" })}>
    <div
      className="flex items-start justify-center min-h-screen"
      style={{ background: C.cream, fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      {/* Phone frame */}
      <div
        className="relative flex flex-col overflow-hidden w-full"
        style={{
          maxWidth: 430,
          minHeight: "100svh",
          height: "100svh",
          background: C.cream,
          boxShadow: "0 0 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Status-bar-like spacer */}
        <div
          className="shrink-0"
          style={{ height: "env(safe-area-inset-top, 0px)", background: "rgba(249,244,238,0.97)" }}
        />

        {isMain ? (
          // Main shell with top bar + tabs
          <>
            {/* App header */}
            <div className="shrink-0 border-b px-4 h-14 flex items-center" style={{ background: "rgba(249,244,238,0.97)", backdropFilter: "blur(12px)", borderColor: C.border }}>
              <TrifeLogo size={32} />
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {screen.tab === "home" && (
                <HomeTab
                  activities={activities}
                  loadError={activitiesError}
                  onApply={(act) => setScreen({ id: "detail", act })}
                  onSchedule={() => setScreen({ id: "main", tab: "schedule" })}
                />
              )}
              {screen.tab === "schedule" && (
                <ScheduleTab
                  activities={activities}
                  loadError={activitiesError}
                  onApply={(act) => setScreen({ id: "detail", act })}
                />
              )}
              {screen.tab === "about" && <AboutTab />}
            </div>

            {/* Bottom nav */}
            <BottomNav tab={screen.tab} onChange={(tab) => setScreen({ id: "main", tab })} />
          </>
        ) : screen.id === "detail" ? (
          <ActivityDetailScreen
            act={screen.act}
            onNext={() => setScreen({ id: "participant", act: screen.act })}
            onBack={() => setScreen({ id: "main", tab: "schedule" })}
          />
        ) : screen.id === "participant" ? (
          <ParticipantTypeScreen
            onSelect={(pt) => setScreen({ id: "quiz", act: screen.act, pt })}
            onBack={() => setScreen({ id: "detail", act: screen.act })}
          />
        ) : screen.id === "quiz" ? (
          <QuizScreen
            questions={quizFor(screen.pt)}
            onComplete={(score, total) => setScreen({ id: "result", act: screen.act, pt: screen.pt, score, total })}
            onBack={() => setScreen({ id: "participant", act: screen.act })}
          />
        ) : screen.id === "result" ? (
          <QuizResultScreen
            score={screen.score}
            total={screen.total}
            onNext={() => setScreen({ id: "rules", act: screen.act, pt: screen.pt, score: screen.score, total: screen.total })}
            onBack={() => setScreen({ id: "quiz", act: screen.act, pt: screen.pt })}
          />
        ) : screen.id === "rules" ? (
          <RulesScreen
            onNext={() => setScreen({ id: "form", act: screen.act, pt: screen.pt, score: screen.score, total: screen.total })}
            onBack={() => setScreen({ id: "result", act: screen.act, pt: screen.pt, score: screen.score, total: screen.total })}
          />
        ) : screen.id === "form" ? (
          <FormScreen
            act={screen.act}
            score={screen.score}
            total={screen.total}
            participantType={screen.pt}
            onComplete={() => setScreen({ id: "complete", act: screen.act })}
            onBack={() => setScreen({ id: "rules", act: screen.act, pt: screen.pt, score: screen.score, total: screen.total })}
          />
        ) : screen.id === "complete" ? (
          <div className="flex-1 overflow-y-auto">
            <CompletionScreen act={screen.act} onHome={() => setScreen({ id: "main", tab: "home" })} />
          </div>
        ) : null}
      </div>
    </div>
    </HomeNavContext.Provider>
  );
}
