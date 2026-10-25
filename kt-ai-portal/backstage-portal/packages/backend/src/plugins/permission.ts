import { createBackendModule } from '@backstage/backend-plugin-api';
import { AuthorizeResult, PolicyDecision } from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
} from '@backstage/plugin-permission-node';
// policyExtensionPoint는 현재 버전에서 alpha export로만 제공된다.
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';

/**
 * 운영 전환 P0: allow-all 정책 모듈을 대체하는 기본 거부(deny-by-default) 정책.
 *
 * Backstage permission framework을 통과하는 모든 요청을 기본 거부한다.
 * 포털 업무 인가는 포털 BFF(`/api/portal/v1`)의 서버 인가 계층에서 수행하며,
 * Backstage 기본 플러그인 경로(catalog/search/scaffolder 등)에 대한 세부 허용
 * 정책은 P1 단계에서 역할·범위별로 추가한다. 그 전까지는 명시 허용 규칙이
 * 없는 요청은 모두 거부되어야 한다.
 */
class PortalDenyByDefaultPolicy implements PermissionPolicy {
  async handle(_request: PolicyQuery): Promise<PolicyDecision> {
    return { result: AuthorizeResult.DENY };
  }
}

export const portalPermissionPolicyModule = createBackendModule({
  pluginId: 'permission',
  moduleId: 'portal-deny-by-default-policy',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new PortalDenyByDefaultPolicy());
      },
    });
  },
});
