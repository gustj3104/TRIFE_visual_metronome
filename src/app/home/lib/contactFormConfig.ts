import { Sparkles, MessageCircle, Handshake, type LucideIcon } from "lucide-react";
import type { ContactCategory } from "../../lib/notionContact";

export type ContactActionType = "activity" | "inquiry" | "collab";

export interface ContactCardConfig {
  id: ContactActionType;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const CONTACT_CARDS: readonly ContactCardConfig[] = [
  {
    id: "activity",
    icon: Sparkles,
    title: "활동 추천하기",
    description: "TRIFE에서 함께하고 싶은 운동이나 활동을 알려주세요.",
  },
  {
    id: "inquiry",
    icon: MessageCircle,
    title: "문의 남기기",
    description: "활동 참여와 운영에 관한 궁금한 점을 남겨주세요.",
  },
  {
    id: "collab",
    icon: Handshake,
    title: "협업 제안하기",
    description: "기업·기관·협회와 함께할 방법을 제안해 주세요.",
  },
];

export interface ContactFormCopy {
  category: ContactCategory;
  modalTitle: string;
  description: string;
  nameLabel: string;
  titleLabel: string;
  titlePlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  submitLabel: string;
}

export const CONTACT_FORM_COPY: Record<ContactActionType, ContactFormCopy> = {
  activity: {
    category: "활동 제안",
    modalTitle: "활동 추천하기",
    description: "TRIFE에서 함께해 보고 싶은 운동이나 활동을 알려주세요.",
    nameLabel: "이름",
    titleLabel: "제안 제목",
    titlePlaceholder: "어떤 활동을 제안하고 싶나요?",
    bodyLabel: "제안 내용",
    bodyPlaceholder: "TRIFE에서 함께하고 싶은 활동과 추천하는 이유를 자유롭게 적어주세요.",
    submitLabel: "활동 제안 보내기",
  },
  inquiry: {
    category: "문의",
    modalTitle: "문의 남기기",
    description: "활동 참여와 운영에 관한 궁금한 내용을 남겨주세요.",
    nameLabel: "이름",
    titleLabel: "문의 제목",
    titlePlaceholder: "무엇이 궁금한가요?",
    bodyLabel: "문의 내용",
    bodyPlaceholder: "활동 참여나 운영에 관해 궁금한 내용을 적어주세요.",
    submitLabel: "문의 보내기",
  },
  collab: {
    category: "협업 제안",
    modalTitle: "협업 제안하기",
    description: "기업·기관·협회와 함께 만들고 싶은 활동이나 협업 방향을 들려주세요.",
    nameLabel: "이름 또는 소속",
    titleLabel: "제안 제목",
    titlePlaceholder: "어떤 협업을 제안하고 싶나요?",
    bodyLabel: "제안 내용",
    bodyPlaceholder: "함께 진행하고 싶은 프로그램이나 협업 방향을 자유롭게 적어주세요.",
    submitLabel: "협업 제안 보내기",
  },
};

export const CONTACT_TITLE_MAX_LENGTH = 60;
export const CONTACT_BODY_MAX_LENGTH = 1000;
