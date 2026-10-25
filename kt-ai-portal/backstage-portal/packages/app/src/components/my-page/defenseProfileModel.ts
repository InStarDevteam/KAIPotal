export interface DefenseProfile {
  userCategory: string;
  personnelType: string;
  militaryNumber: string;
  rank: string;
  organization: string;
  department: string;
  position: string;
  contact: string;
  affiliation: string;
  sponsor: string;
}
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
export const changeUserCategory = (
  profile: DefenseProfile,
  userCategory: string,
): DefenseProfile => ({
  ...profile,
  userCategory,
  personnelType: '',
  ...(userCategory === 'external'
    ? { militaryNumber: '', rank: '' }
    : { affiliation: '', sponsor: '' }),
});
export const personnelLabels: Record<string, string> = {
  soldier: '군인',
  civilian: '군무원',
  contractor: '수행사',
  researcher: '연구기관',
  other: '기타',
};
export const parseDefenseProfile = (value: unknown): DefenseProfile => {
  if (!value || typeof value !== 'object')
    throw new Error('프로필 응답 형식을 확인할 수 없습니다.');
  const profile = emptyDefenseProfile();
  for (const key of Object.keys(profile) as Array<keyof DefenseProfile>) {
    const field = (value as Record<string, unknown>)[key];
    if (typeof field !== 'string')
      throw new Error('프로필 응답 형식을 확인할 수 없습니다.');
    profile[key] = field;
  }
  return profile;
};
export const validateProfileForm = (profile: DefenseProfile): string | null => {
  if (!['military', 'external'].includes(profile.userCategory))
    return '군 내부 사용자 또는 외부 사용자를 선택하세요.';
  if (
    profile.militaryNumber &&
    !/^[a-zA-Z0-9-]{3,30}$/.test(profile.militaryNumber)
  )
    return '군번·직원번호는 영문, 숫자, 하이픈으로 3~30자 이내로 입력하세요.';
  return null;
};
