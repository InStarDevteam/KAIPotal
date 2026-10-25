import {
  changeUserCategory,
  emptyDefenseProfile,
  parseDefenseProfile,
  validateProfileForm,
} from './defenseProfileModel';

describe('defense profile editor', () => {
  it('clears military identifiers when converting to external user', () => {
    const external = changeUserCategory(
      {
        ...emptyDefenseProfile(),
        userCategory: 'military',
        personnelType: 'soldier',
        militaryNumber: '26-12345',
        rank: '대위',
        organization: '정보화부대',
      },
      'external',
    );
    expect(external).toMatchObject({
      userCategory: 'external',
      militaryNumber: '',
      rank: '',
      personnelType: '',
      organization: '정보화부대',
    });
  });
  it('clears external company and sponsor when converting to internal user', () => {
    expect(
      changeUserCategory(
        {
          ...emptyDefenseProfile(),
          userCategory: 'external',
          affiliation: '연구기관',
          sponsor: '담당자',
        },
        'military',
      ),
    ).toMatchObject({ affiliation: '', sponsor: '' });
  });
  it('requires category and validates optional military number', () => {
    expect(validateProfileForm(emptyDefenseProfile())).toBeTruthy();
    expect(
      validateProfileForm({
        ...emptyDefenseProfile(),
        userCategory: 'military',
        militaryNumber: '26-12345',
      }),
    ).toBeNull();
    expect(
      validateProfileForm({
        ...emptyDefenseProfile(),
        userCategory: 'external',
      }),
    ).toBeNull();
    expect(
      validateProfileForm({
        ...emptyDefenseProfile(),
        userCategory: 'military',
        militaryNumber: '<script>',
      }),
    ).toBeTruthy();
  });
  it('rejects incomplete server responses instead of inventing profile attributes', () => {
    expect(() => parseDefenseProfile(null)).toThrow();
    expect(() => parseDefenseProfile({})).toThrow();
    expect(parseDefenseProfile(emptyDefenseProfile())).toEqual(
      emptyDefenseProfile(),
    );
  });
});
