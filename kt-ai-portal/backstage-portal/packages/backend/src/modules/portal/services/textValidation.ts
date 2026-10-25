/** Keep single-line identifiers free of control characters while accepting
 * ordinary line breaks and indentation in descriptions entered in textareas.
 * The minimum counts meaningful (trimmed) text; the maximum bounds the full
 * stored value, including whitespace, so client/server limits remain equal. */
export const validPortalText = (
  value: unknown,
  min: number,
  max: number,
  multiline = false,
): value is string =>
  typeof value === 'string' &&
  value.trim().length >= min &&
  value.length <= max &&
  !/[<>]/.test(value) &&
  Array.from(value).every(character => {
    const code = character.charCodeAt(0);
    return (
      (code >= 32 && code !== 127) ||
      (multiline && [9, 10, 13].includes(code))
    );
  });
