export interface ContactFormValues {
  name: string;
  contact: string;
  title: string;
  body: string;
}

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

const MIN_NAME_LENGTH = 2;

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "이름을 입력해 주세요.";
  else if (name.length < MIN_NAME_LENGTH) errors.name = "이름을 정확히 입력해 주세요.";

  if (!values.contact.trim()) errors.contact = "연락처를 입력해 주세요.";

  if (!values.title.trim()) errors.title = "제목을 입력해 주세요.";

  if (!values.body.trim()) errors.body = "내용을 입력해 주세요.";

  return errors;
}
