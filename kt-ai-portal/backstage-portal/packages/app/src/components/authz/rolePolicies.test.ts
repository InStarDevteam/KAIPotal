import { permissionsForRoles, roleHasPermission } from './rolePolicies';

describe('rolePolicies', () => {
  it('general-user는 관리 성격 권한을 보유하지 않는다', () => {
    expect(roleHasPermission('general-user', 'krmf.view')).toBe(false);
    expect(roleHasPermission('general-user', 'user.manage')).toBe(false);
    expect(roleHasPermission('general-user', 'portal.view')).toBe(true);
  });

  it('portal-admin은 krmf.manage를 제외하고 krmf.view는 보유한다', () => {
    expect(roleHasPermission('portal-admin', 'krmf.manage')).toBe(false);
    expect(roleHasPermission('portal-admin', 'krmf.review')).toBe(false);
    expect(roleHasPermission('portal-admin', 'krmf.view')).toBe(true);
    expect(roleHasPermission('portal-admin', 'rbac.manage')).toBe(true);
  });

  it('security-auditor는 krmf 조회만 가능하고 증적 등록은 불가하다', () => {
    expect(roleHasPermission('security-auditor', 'krmf.view')).toBe(true);
    expect(roleHasPermission('security-auditor', 'krmf.evidence.submit')).toBe(
      false,
    );
    expect(roleHasPermission('security-auditor', 'audit.view')).toBe(true);
  });

  it('project-manager는 증적 등록과 프로젝트/작업환경 승인 권한을 보유한다', () => {
    expect(roleHasPermission('project-manager', 'krmf.evidence.submit')).toBe(
      true,
    );
    expect(roleHasPermission('project-manager', 'project.approve')).toBe(true);
    expect(roleHasPermission('project-manager', 'workspace.approve')).toBe(
      true,
    );
  });

  it('project-manager와 branch-admin은 general-user 권한의 상위집합이다', () => {
    const general = permissionsForRoles(['general-user']);
    const pm = permissionsForRoles(['project-manager']);
    const branch = permissionsForRoles(['branch-admin']);
    general.forEach(permission => {
      expect(pm.has(permission)).toBe(true);
      expect(branch.has(permission)).toBe(true);
    });
    expect(pm.size).toBeGreaterThan(general.size);
    expect(branch.size).toBeGreaterThan(general.size);
  });

  it('security-manager는 K-RMF 전 단계 권한을 보유한다', () => {
    expect(roleHasPermission('security-manager', 'krmf.view')).toBe(true);
    expect(
      roleHasPermission('security-manager', 'krmf.evidence.submit'),
    ).toBe(true);
    expect(roleHasPermission('security-manager', 'krmf.review')).toBe(true);
    expect(roleHasPermission('security-manager', 'krmf.manage')).toBe(true);
  });

  it('security-manager는 K-RMF 전 단계와 요구사항/연계 조회 권한을 보유한다', () => {
    expect(roleHasPermission('security-manager', 'krmf.manage')).toBe(true);
    expect(roleHasPermission('security-manager', 'requirement.view')).toBe(
      true,
    );
    expect(roleHasPermission('security-manager', 'integration.view')).toBe(
      true,
    );
  });

  it('permissionsForRoles는 여러 역할의 권한을 합집합한다', () => {
    const combined = permissionsForRoles(['general-user', 'security-auditor']);
    expect(combined.has('portal.view')).toBe(true);
    expect(combined.has('krmf.view')).toBe(true);
    expect(combined.has('user.manage')).toBe(false);
  });
});
