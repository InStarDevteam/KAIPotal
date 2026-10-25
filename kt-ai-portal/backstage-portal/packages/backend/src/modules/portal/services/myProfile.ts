/** Self-declared profile data never participates in authorization. */
export const PROFILE_LIMITS = {
  userCategory: 20,
  personnelType: 20,
  militaryNumber: 30,
  rank: 40,
  organization: 120,
  department: 120,
  position: 80,
  contact: 40,
  affiliation: 120,
  sponsor: 80,
} as const;
export type DefenseProfile = Record<keyof typeof PROFILE_LIMITS, string>;
export const emptyDefenseProfile = (): DefenseProfile => ({
  userCategory: '',
  personnelType: '',
  militaryNumber: '',
  rank: '',
  organization: '',
  department: '',
  position: '',
  contact: '',
  affiliation: '',
  sponsor: '',
});
export const validateDefenseProfile = (
  value: unknown,
): DefenseProfile | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      key => !Object.prototype.hasOwnProperty.call(PROFILE_LIMITS, key),
    )
  )
    return null;
  const result = emptyDefenseProfile();
  for (const [key, max] of Object.entries(PROFILE_LIMITS)) {
    const entry = input[key];
    if (
      typeof entry !== 'string' ||
      entry.length > max ||
      /[<>]/.test(entry) ||
      Array.from(entry).some(
        character =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    )
      return null;
    result[key as keyof DefenseProfile] = entry.trim();
  }
  if (!['', 'military', 'external'].includes(result.userCategory)) return null;
  if (
    !['', 'soldier', 'civilian', 'contractor', 'researcher', 'other'].includes(
      result.personnelType,
    )
  )
    return null;
  if (
    result.userCategory === 'external' &&
    (result.militaryNumber ||
      result.rank ||
      ['soldier', 'civilian'].includes(result.personnelType))
  )
    return null;
  if (
    result.userCategory === 'military' &&
    ['contractor', 'researcher'].includes(result.personnelType)
  )
    return null;
  if (
    result.militaryNumber &&
    !/^[a-zA-Z0-9-]{3,30}$/.test(result.militaryNumber)
  )
    return null;
  return result;
};

export const personalActivityCategory = (action: string): string => {
  if (action.startsWith('authz.') || action.startsWith('security.'))
    return 'security';
  if (
    ['client.session.', 'context.', 'authn.'].some(prefix =>
      action.startsWith(prefix),
    )
  )
    return 'access';
  if (action.startsWith('client.')) return 'usage';
  return 'admin';
};
