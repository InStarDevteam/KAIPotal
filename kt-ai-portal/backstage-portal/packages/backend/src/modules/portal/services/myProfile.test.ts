import {
  emptyDefenseProfile,
  personalActivityCategory,
  validateDefenseProfile,
} from './myProfile';

describe('defense self profile validation', () => {
  it('accepts internal personnel attributes without changing identity or authorization', () => {
    const profile = {
      ...emptyDefenseProfile(),
      userCategory: 'military',
      personnelType: 'soldier',
      militaryNumber: '26-1234567',
      rank: '대위',
    };
    expect(validateDefenseProfile(profile)).toEqual(profile);
    expect(
      validateDefenseProfile({ ...profile, roles: ['portal-admin'] }),
    ).toBeNull();
    expect(
      validateDefenseProfile({ ...profile, user_id: 'another-user' }),
    ).toBeNull();
  });
  it('rejects invalid category, military number, overlong text and control characters', () => {
    const profile = emptyDefenseProfile();
    for (const patch of [
      { userCategory: 'admin' },
      { personnelType: 'superuser' },
      { militaryNumber: '12<script>' },
      { contact: 'a'.repeat(41) },
      { organization: 'unit\nsecond' },
    ]) {
      expect(validateDefenseProfile({ ...profile, ...patch })).toBeNull();
    }
  });
  it('does not retain military identifiers on external profiles', () => {
    const external = {
      ...emptyDefenseProfile(),
      userCategory: 'external',
      personnelType: 'researcher',
      affiliation: '연구기관',
    };
    expect(validateDefenseProfile(external)).toEqual(external);
    expect(
      validateDefenseProfile({ ...external, militaryNumber: '123456' }),
    ).toBeNull();
    expect(validateDefenseProfile({ ...external, rank: '대위' })).toBeNull();
    expect(
      validateDefenseProfile({ ...external, personnelType: 'soldier' }),
    ).toBeNull();
  });
  it('requires all allowlisted properties and rejects arrays and null', () => {
    expect(validateDefenseProfile({})).toBeNull();
    expect(validateDefenseProfile([])).toBeNull();
    expect(validateDefenseProfile(null)).toBeNull();
    expect(
      validateDefenseProfile({
        ...emptyDefenseProfile(),
        department: '  정보화  ',
      }),
    ).toMatchObject({ department: '정보화' });
  });
});

it('categorizes own history consistently with tenant audit history', () => {
  expect(personalActivityCategory('authz.permission.check')).toBe('security');
  expect(personalActivityCategory('client.session.start')).toBe('access');
  expect(personalActivityCategory('client.page.view')).toBe('usage');
  expect(personalActivityCategory('profile.update')).toBe('admin');
});
