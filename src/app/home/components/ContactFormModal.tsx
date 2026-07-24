import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { TRIFE_COLORS as C } from "../theme";
import {
  CONTACT_FORM_COPY,
  CONTACT_TITLE_MAX_LENGTH,
  CONTACT_BODY_MAX_LENGTH,
  type ContactActionType,
} from "../lib/contactFormConfig";
import { validateContactForm, type ContactFormValues, type ContactFormErrors } from "../lib/contactFormValidation";
import { submitContactMessage } from "../../lib/notionContact";

const EMPTY_FORM: ContactFormValues = { name: "", contact: "", title: "", body: "" };
const FIELD_ORDER: (keyof ContactFormValues)[] = ["name", "contact", "title", "body"];
const SUBMIT_ERROR_MESSAGE = "전송 중 문제가 발생했어요.\n입력한 내용을 확인한 뒤 다시 시도해 주세요.";

type Status = "idle" | "submitting" | "success" | "error";

interface ContactFormModalProps {
  actionType: ContactActionType | null;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

export function ContactFormModal({ actionType, onClose, returnFocusRef }: ContactFormModalProps) {
  const [form, setForm] = useState<ContactFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [status, setStatus] = useState<Status>("idle");

  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const open = actionType !== null;
  const copy = actionType ? CONTACT_FORM_COPY[actionType] : null;
  const isDirty = form.name !== "" || form.contact !== "" || form.title !== "" || form.body !== "";

  const resetAndClose = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
    setStatus("idle");
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (status !== "success" && isDirty) {
      if (!window.confirm("작성 중인 내용이 있어요. 정말 닫으시겠어요?")) return;
    }
    resetAndClose();
  }, [status, isDirty, resetAndClose]);

  // Lock background scroll and focus the first field while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('[name="name"]')?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(timer);
    };
  }, [open]);

  // Return focus to the card that opened the modal once it closes.
  useEffect(() => {
    if (wasOpenRef.current && !open) returnFocusRef.current?.focus();
    wasOpenRef.current = open;
  }, [open, returnFocusRef]);

  // ESC to close + Tab focus trap.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, requestClose]);

  const handleChange = (key: keyof ContactFormValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async () => {
    if (status === "submitting" || !actionType || !copy) return;

    const nextErrors = validateContactForm(form);
    setErrors(nextErrors);
    const firstErrorField = FIELD_ORDER.find((key) => nextErrors[key]);
    if (firstErrorField) {
      dialogRef.current?.querySelector<HTMLElement>(`[name="${firstErrorField}"]`)?.focus();
      return;
    }

    setStatus("submitting");
    try {
      await submitContactMessage({
        category: copy.category,
        name: form.name.trim(),
        contact: form.contact.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (!open || !copy || !actionType) return null;

  const titleId = "contact-form-modal-title";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(36,53,42,0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full flex-col overflow-hidden rounded-t-[24px] sm:max-w-[420px] sm:rounded-[24px]"
        style={{
          background: C.cream,
          maxHeight: "min(88svh, 720px)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: C.border, background: C.white }}
        >
          <h2 id={titleId} className="font-bold text-base" style={{ color: C.text }}>
            {copy.modalTitle}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label={`${copy.modalTitle} 닫기`}
            className="flex h-9 w-9 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ color: C.sub, ["--tw-ring-color" as string]: C.darkGreen }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {status === "success" ? (
            <SuccessPanel onConfirm={resetAndClose} />
          ) : (
            <>
              <p className="text-xs leading-[1.7] mb-5" style={{ color: C.sub }}>
                {copy.description}
              </p>

              {status === "error" && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl px-3 py-2.5 text-xs leading-[1.6]"
                  style={{ color: "#B23B3B", background: "#FBEDEA", whiteSpace: "pre-line" }}
                >
                  {SUBMIT_ERROR_MESSAGE}
                </p>
              )}

              <div className="flex flex-col gap-4">
                <Field name="name" label={copy.nameLabel} error={errors.name}>
                  <input
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange("name")}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "contact-name-error" : undefined}
                    className="w-full min-h-[48px] rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                    style={fieldStyle(!!errors.name, !!form.name)}
                  />
                </Field>

                <Field name="contact" label="연락처" error={errors.contact}>
                  <input
                    name="contact"
                    type="text"
                    value={form.contact}
                    onChange={handleChange("contact")}
                    placeholder="전화번호 또는 이메일을 입력해 주세요."
                    aria-invalid={!!errors.contact}
                    aria-describedby={errors.contact ? "contact-contact-error" : undefined}
                    className="w-full min-h-[48px] rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                    style={fieldStyle(!!errors.contact, !!form.contact)}
                  />
                </Field>

                <Field
                  name="title"
                  label={copy.titleLabel}
                  error={errors.title}
                  count={`${form.title.length}/${CONTACT_TITLE_MAX_LENGTH}`}
                >
                  <input
                    name="title"
                    type="text"
                    value={form.title}
                    maxLength={CONTACT_TITLE_MAX_LENGTH}
                    onChange={handleChange("title")}
                    placeholder={copy.titlePlaceholder}
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? "contact-title-error" : undefined}
                    className="w-full min-h-[48px] rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                    style={fieldStyle(!!errors.title, !!form.title)}
                  />
                </Field>

                <Field
                  name="body"
                  label={copy.bodyLabel}
                  error={errors.body}
                  count={`${form.body.length}/${CONTACT_BODY_MAX_LENGTH}`}
                >
                  <textarea
                    name="body"
                    value={form.body}
                    maxLength={CONTACT_BODY_MAX_LENGTH}
                    onChange={handleChange("body")}
                    placeholder={copy.bodyPlaceholder}
                    aria-invalid={!!errors.body}
                    aria-describedby={errors.body ? "contact-body-error" : undefined}
                    rows={5}
                    className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                    style={{ ...fieldStyle(!!errors.body, !!form.body), minHeight: 140 }}
                  />
                </Field>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {status !== "success" && (
          <div
            className="shrink-0 border-t px-5 pt-3"
            style={{
              borderColor: C.border,
              background: C.white,
              paddingBottom: "max(16px, env(safe-area-inset-bottom))",
            }}
          >
            <p className="mb-2.5 text-center text-[11px] leading-[1.6]" style={{ color: C.sub }}>
              작성한 정보는 제안과 문의 확인 및 답변 목적으로만 사용됩니다.
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === "submitting"}
              className="mb-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-sm font-bold transition-opacity"
              style={{ background: C.darkGreen, color: C.white, opacity: status === "submitting" ? 0.75 : 1 }}
            >
              {status === "submitting" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  보내는 중...
                </>
              ) : (
                copy.submitLabel
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function fieldStyle(hasError: boolean, hasValue: boolean) {
  return {
    background: C.white,
    borderColor: hasError ? "#C0392B" : hasValue ? C.midGreen : C.border,
    color: C.text,
  };
}

function Field({
  name,
  label,
  error,
  count,
  children,
}: {
  name: string;
  label: string;
  error?: string | undefined;
  count?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: C.text }}>
          {label} <span style={{ color: "#C0392B" }}>*</span>
        </p>
        {count && (
          <span className="text-[10px]" style={{ color: C.sub }}>
            {count}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p id={`contact-${name}-error`} role="alert" className="mt-1.5 text-[11px]" style={{ color: "#C0392B" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function SuccessPanel({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "#EBF3EE" }}
      >
        <CheckCircle2 size={26} style={{ color: C.darkGreen }} />
      </div>
      <p className="mb-6 text-sm leading-[1.8]" style={{ color: C.text }}>
        의견을 남겨주셔서 감사합니다.
        <br />
        TRIFE 운영진이 내용을 확인하겠습니다.
      </p>
      <button
        type="button"
        onClick={onConfirm}
        className="flex min-h-[52px] w-full items-center justify-center rounded-[14px] text-sm font-bold"
        style={{ background: C.darkGreen, color: C.white }}
      >
        확인
      </button>
    </div>
  );
}
