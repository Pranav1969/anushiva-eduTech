// src/app/student/components/ProfileDrawer.tsx
"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  Target,
  User,
  MapPin,
  Cake,
  Phone,
  Mail,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Sparkles,
  Clock,
  Fingerprint,
  Plus,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { supabase } from "@/utils/supabase";

/* ------------------------------------------------------------------ */
/*  Data shape: ONLY the columns a student should ever see.            */
/* ------------------------------------------------------------------ */
export interface StudentProfile {
  id: string;
  name: string;
  username: string;
  exam?: string | null;
  state?: string | null;
  district?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  phone_verified?: boolean | null;
  email?: string | null;
  email_verified?: boolean | null;
  current_plan?: string | null;
  plan_expires_at?: string | null;
  created_at?: string | null;
}

// Change these if your routes are different.
const UPGRADE_HREF = "/student/upgrade";
const PROFILE_HREF = "/student/profile";

// Only these columns are ever requested for the drawer.
const PROFILE_COLUMNS =
  "id, name, username, exam, state, district, gender, date_of_birth, phone, phone_verified, email, email_verified, current_plan, plan_expires_at, created_at";

/* ------------------------------ helpers ----------------------------- */
const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

const daysUntil = (iso?: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;

const ageFrom = (iso?: string | null) => {
  if (!iso) return null;
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/* --------------------------- small pieces --------------------------- */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const { theme: t } = useTheme();
  return (
    <section className={`rounded-2xl border p-4 ${t.panel}`}>
      <h3 className={`mb-1 text-sm font-bold ${t.text.heading}`}>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  right,
  last,
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  right?: ReactNode;
  last?: boolean;
}) {
  const { theme: t } = useTheme();
  return (
    <div className={`flex items-center gap-3 py-3 ${last ? "" : `border-b ${t.ui.dividerSoft}`}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${t.accent.iconWrap} ${t.accent.text}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] ${t.text.faint}`}>{label}</div>
        <div className={`truncate text-sm font-semibold ${t.text.heading}`}>
          {value || <span className={`font-normal italic ${t.text.faint}`}>Not added</span>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------ drawer ------------------------------ */
interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfile;
}

export default function ProfileDrawer({ open, onClose, student: base }: ProfileDrawerProps) {
  const { theme: t } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [fetched, setFetched] = useState<StudentProfile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [errorInfo, setErrorInfo] = useState("");

  useEffect(() => setMounted(true), []);

  // Load the logged-in student's own row, the same way useStudentSession does.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoadError(false);
      setErrorInfo("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (userError || !user) {
        setErrorInfo("not signed in");
        setLoadError(true);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select(PROFILE_COLUMNS)
        .eq("auth_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setErrorInfo(error.message);
        setLoadError(true);
      } else if (!data) {
        setErrorInfo("no student row linked to this login");
        setLoadError(true);
      } else {
        setFetched(data as unknown as StudentProfile);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, base.id]);

  // Esc closes, and the page behind stops scrolling while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const student = { ...base, ...(fetched ?? {}) } as StudentProfile;
  const showSkeleton = !fetched && !loadError;

  const plan = (student.current_plan || "free").toLowerCase();
  const isFree = plan === "free";
  const left = daysUntil(student.plan_expires_at);
  const expired = !isFree && left !== null && left < 0;
  const expiringSoon = !isFree && left !== null && left >= 0 && left <= 7;
  const age = ageFrom(student.date_of_birth);
  const location = [student.district, student.state].filter(Boolean).join(", ");

  // The header uses backdrop-blur, which traps `fixed` children, so we portal to <body>.
  return createPortal(
    <div
      className={`fixed inset-0 z-50 transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}
      aria-hidden={!open}
    >
      {/* overlay */}
      <button
        aria-label="Close profile"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 backdrop-blur-[2px] transition-opacity duration-300 ${t.drawer.overlay} ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Aspirant profile"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${t.drawer.surface} ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* top bar */}
        <div className={`flex items-center justify-between border-b px-5 py-3.5 backdrop-blur-md ${t.drawer.header}`}>
          <span className={`text-sm font-bold ${t.text.heading}`}>My profile</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`rounded-lg border p-1.5 transition-all active:scale-95 ${t.iconButton}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-lg ${t.ui.btnPrimary}`}>
                {initials(student.name) || <User size={22} />}
              </div>
              {student.phone_verified && (
                <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border ${t.ui.badgeGreen} ${t.drawer.surface}`}>
                  <ShieldCheck size={11} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className={`truncate text-xl font-extrabold tracking-tight ${t.text.heading}`}>{student.name}</h2>
              <p className={`truncate text-sm ${t.text.muted}`}>@{student.username}</p>
            </div>
          </div>

          {loadError && (
            <div className={`rounded-xl border p-3 text-xs ${t.ui.badgeRed}`}>
              Could not load your full profile. Close and reopen to try again.
              {errorInfo && <span className="mt-1 block font-mono opacity-80">Details: {errorInfo}</span>}
            </div>
          )}

          {showSkeleton ? (
            <div className="space-y-4" aria-busy="true">
              {[72, 120, 150, 150].map((h, i) => (
                <div key={i} style={{ height: h }} className={`animate-pulse rounded-2xl border ${t.panel}`} />
              ))}
            </div>
          ) : (
            <>
              {/* exam */}
              <div className={`flex items-center gap-3 rounded-2xl border p-4 ${t.accent.soft}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${t.accent.iconWrap} ${t.accent.text}`}>
                  <Target size={18} />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs ${t.text.muted}`}>Preparing for</div>
                  <div className={`truncate text-base font-bold ${t.accent.textStrong}`}>
                    {student.exam || "Exam not selected"}
                  </div>
                </div>
              </div>

              {/* plan */}
              {isFree ? (
                <div className={`rounded-2xl border border-dashed p-4 ${t.panelDashed}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs ${t.text.faint}`}>Current plan</div>
                      <div className={`text-lg font-extrabold ${t.text.heading}`}>Free</div>
                      <p className={`mt-1 text-xs leading-relaxed ${t.text.muted}`}>
                        Upgrade to unlock premium tests, full notes and detailed performance insights.
                      </p>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${t.amber.iconWrap} ${t.amber.icon}`}>
                      <Sparkles size={18} />
                    </div>
                  </div>
                  <Link
                    href={UPGRADE_HREF}
                    onClick={onClose}
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] ${t.ui.btnPrimary}`}
                  >
                    <Crown size={15} /> Upgrade your plan
                  </Link>
                </div>
              ) : (
                <div className={`rounded-2xl border p-4 shadow-lg ${t.ui.premiumCard}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs ${t.text.faint}`}>Current plan</div>
                      <div className={`flex items-center gap-2 text-lg font-extrabold ${t.ui.titlePremium}`}>
                        <Crown size={16} className={t.amber.icon} /> {cap(plan)}
                      </div>
                    </div>
                    <span
                      className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
                        expired ? t.ui.badgeRed : expiringSoon ? t.ui.badgeAmber : t.ui.badgeGreen
                      }`}
                    >
                      {expired ? "Expired" : expiringSoon ? `${left} day${left === 1 ? "" : "s"} left` : "Active"}
                    </span>
                  </div>

                  <div className={`mt-3 flex items-center gap-2 text-sm ${t.text.body}`}>
                    <Clock size={14} className={t.text.faint} />
                    {student.plan_expires_at ? (
                      <span>
                        {expired ? "Expired on " : "Valid until "}
                        <b className={t.text.heading}>{fmtDate(student.plan_expires_at)}</b>
                        {!expired && left !== null && <span className={t.text.muted}> ({left} days left)</span>}
                      </span>
                    ) : (
                      <span>No expiry date</span>
                    )}
                  </div>

                  {(expired || expiringSoon) && (
                    <Link
                      href={UPGRADE_HREF}
                      onClick={onClose}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] ${t.ui.btnPremium}`}
                    >
                      {expired ? "Renew your plan" : "Extend your plan"}
                    </Link>
                  )}
                </div>
              )}

              {/* contact */}
              <Section title="Contact">
                <Row
                  icon={<Phone size={15} />}
                  label="Phone"
                  value={student.phone}
                  right={
                    student.phone ? (
                      student.phone_verified ? (
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${t.ui.badgeGreen}`}>
                          <ShieldCheck size={12} /> Verified
                        </span>
                      ) : (
                        <Link
                          href={`${PROFILE_HREF}?focus=phone`}
                          onClick={onClose}
                          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors ${t.ui.badgeAmber}`}
                        >
                          <ShieldAlert size={12} /> Verify now
                        </Link>
                      )
                    ) : (
                      <Link
                        href={`${PROFILE_HREF}?focus=phone`}
                        onClick={onClose}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${t.accent.soft} ${t.accent.text}`}
                      >
                        <Plus size={12} /> Add
                      </Link>
                    )
                  }
                />
                <Row
                  icon={<Mail size={15} />}
                  label="Email"
                  value={student.email}
                  last
                  right={
                    !student.email ? (
                      <Link
                        href={`${PROFILE_HREF}?focus=email`}
                        onClick={onClose}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${t.accent.soft} ${t.accent.text}`}
                      >
                        <Plus size={12} /> Add email
                      </Link>
                    ) : student.email_verified ? (
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${t.ui.badgeGreen}`}>
                        <ShieldCheck size={12} /> Verified
                      </span>
                    ) : (
                      <Link
                        href={`${PROFILE_HREF}?focus=email`}
                        onClick={onClose}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors ${t.ui.badgeAmber}`}
                      >
                        <ShieldAlert size={12} /> Verify now
                      </Link>
                    )
                  }
                />
              </Section>

              {/* personal */}
              <Section title="Personal details">
                <Row icon={<User size={15} />} label="Gender" value={cap(student.gender)} />
                <Row
                  icon={<Cake size={15} />}
                  label="Date of birth"
                  value={
                    student.date_of_birth
                      ? `${fmtDate(student.date_of_birth)}${age !== null ? ` (${age} yrs)` : ""}`
                      : null
                  }
                />
                <Row icon={<MapPin size={15} />} label="Location" value={location} last />
              </Section>

              {/* account */}
              <Section title="Account">
                <Row icon={<Fingerprint size={15} />} label="Student ID" value={student.id.substring(0, 8)} />
                <Row icon={<CalendarDays size={15} />} label="Member since" value={fmtDate(student.created_at)} last />
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}