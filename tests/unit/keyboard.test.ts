import { describe, expect, it } from 'vitest';
import { isEditableTarget } from '../../src/app/lib/keyboard';

describe('isEditableTarget', () => {
  it('treats input, textarea, select, and contentEditable elements as editable', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);

    const editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', 'true');
    expect(isEditableTarget(editableDiv)).toBe(true);
  });

  it('treats a plain button/div/null as not editable', () => {
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
