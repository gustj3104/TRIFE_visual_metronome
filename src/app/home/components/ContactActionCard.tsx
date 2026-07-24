import type { MouseEvent } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { TRIFE_COLORS as C } from "../theme";

interface ContactActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function ContactActionCard({ icon: Icon, title, description, onClick }: ContactActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-[16px] border text-left transition-colors min-h-[44px] hover:bg-[#F5F3EE] active:bg-[#EFEDE5] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ background: C.white, borderColor: C.border, ["--tw-ring-color" as string]: C.darkGreen }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: C.olive, color: C.darkGreen }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-semibold text-sm mb-0.5" style={{ color: C.text }}>
          {title}
        </p>
        <p className="text-xs leading-[1.5]" style={{ color: C.sub, minHeight: "2.25em" }}>
          {description}
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0" style={{ color: C.midGreen }} />
    </button>
  );
}
