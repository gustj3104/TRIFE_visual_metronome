import { useRef, useState, type MouseEvent } from "react";
import { ContactActionCard } from "./ContactActionCard";
import { ContactFormModal } from "./ContactFormModal";
import { CONTACT_CARDS, type ContactActionType } from "../lib/contactFormConfig";
import { TRIFE_COLORS as C } from "../theme";

export function ContactActionSection() {
  const [openType, setOpenType] = useState<ContactActionType | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openModal = (id: ContactActionType) => (e: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = e.currentTarget;
    setOpenType(id);
  };

  return (
    <div className="px-5 pb-8">
      <h2 className="font-bold text-base mb-1" style={{ color: C.text }}>
        TRIFE와 연결하기
      </h2>
      <p className="text-xs leading-[1.7] mb-4" style={{ color: C.sub }}>
        함께하고 싶은 활동과 궁금한 점,
        <br />
        더 나은 움직임을 위한 제안을 들려주세요.
      </p>
      <div className="flex flex-col gap-3">
        {CONTACT_CARDS.map((card) => (
          <ContactActionCard
            key={card.id}
            icon={card.icon}
            title={card.title}
            description={card.description}
            onClick={openModal(card.id)}
          />
        ))}
      </div>
      <ContactFormModal actionType={openType} onClose={() => setOpenType(null)} returnFocusRef={triggerRef} />
    </div>
  );
}
