import { describe, expect, it } from 'vitest';
import { validateContactForm, type ContactFormValues } from '../../src/app/home/lib/contactFormValidation';

const VALID: ContactFormValues = {
  name: '홍길동',
  contact: '010-1234-5678',
  title: '제목',
  body: '내용입니다.',
};

describe('validateContactForm', () => {
  it('passes with all fields filled', () => {
    expect(validateContactForm(VALID)).toEqual({});
  });

  it('requires a name', () => {
    expect(validateContactForm({ ...VALID, name: '' }).name).toBe('이름을 입력해 주세요.');
  });

  it('rejects a whitespace-only name', () => {
    expect(validateContactForm({ ...VALID, name: '   ' }).name).toBeTruthy();
  });

  it('rejects a too-short name', () => {
    expect(validateContactForm({ ...VALID, name: 'ㄱ' }).name).toBeTruthy();
  });

  it('requires contact info', () => {
    expect(validateContactForm({ ...VALID, contact: '' }).contact).toBe('연락처를 입력해 주세요.');
  });

  it('rejects a whitespace-only contact', () => {
    expect(validateContactForm({ ...VALID, contact: '   ' }).contact).toBeTruthy();
  });

  it('accepts an email as contact info', () => {
    expect(validateContactForm({ ...VALID, contact: 'trife@example.com' }).contact).toBeUndefined();
  });

  it('requires a title', () => {
    expect(validateContactForm({ ...VALID, title: '' }).title).toBe('제목을 입력해 주세요.');
  });

  it('requires a body', () => {
    expect(validateContactForm({ ...VALID, body: '' }).body).toBe('내용을 입력해 주세요.');
  });
});
