import { validPortalText } from './textValidation';

describe('포털 단일행/장문 입력', () => {
  it('accepts textarea line breaks and indentation only for long text', () => {
    const text = '첫째 줄\r\n\t둘째 줄\n셋째 줄';
    expect(validPortalText(text, 1, 2000, true)).toBe(true);
    expect(validPortalText(text, 1, 2000)).toBe(false);
  });

  it.each(['\u0000', '\u0008', '\u000b', '\u001b', '\u007f'])(
    'continues rejecting disallowed control character %p in long text',
    character => {
      expect(validPortalText(`정상${character}내용`, 1, 100, true)).toBe(false);
    },
  );

  it('uses meaningful minimum text and the complete stored-value maximum', () => {
    expect(validPortalText(' \n\t ', 1, 100, true)).toBe(false);
    expect(validPortalText(' \n\t ', 0, 100, true)).toBe(true);
    expect(validPortalText('  가  ', 1, 5, true)).toBe(true);
    expect(validPortalText('  가   ', 1, 5, true)).toBe(false);
    expect(validPortalText('가'.repeat(2000), 0, 2000, true)).toBe(true);
    expect(validPortalText('가'.repeat(2001), 0, 2000, true)).toBe(false);
  });

  it('does not relax tag or type restrictions', () => {
    expect(validPortalText('<script>내용</script>', 1, 100, true)).toBe(false);
    expect(validPortalText(null, 0, 100, true)).toBe(false);
    expect(validPortalText(42, 0, 100, true)).toBe(false);
  });
});
