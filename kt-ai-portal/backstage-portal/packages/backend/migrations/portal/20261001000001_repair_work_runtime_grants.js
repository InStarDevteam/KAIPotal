// public → portal로 이동한 09-24 업무 원장의 ACL은 자동으로 갱신되지 않는다.
// 테이블 소유자(migrator)만 실행하며 RLS/정책/소유권은 변경하지 않는다.
// 런타임 역할이 없는 로컬 환경에서는 생략한다.
const grantWorkRuntimeAccess = async (knex, role) => {
  const exists = await knex('pg_catalog.pg_roles')
    .where({ rolname: role })
    .first('rolname');
  if (!exists) return false;
  await knex.raw('GRANT USAGE ON SCHEMA portal TO ??', [role]);
  for (const table of [
    'fc_projects',
    'fc_project_members',
    'fc_work_requests',
  ]) {
    await knex.raw('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ?? TO ??', [
      `portal.${table}`,
      role,
    ]);
  }
  // 신청 이력은 조회·추가에 필요한 권한만 부여한다.
  await knex.raw(
    'GRANT SELECT, INSERT ON TABLE portal.fc_request_events TO ??',
    [role],
  );
  return true;
};

exports.grantWorkRuntimeAccess = grantWorkRuntimeAccess;
exports.up = async knex => {
  await grantWorkRuntimeAccess(knex, 'portal_runtime');
};
// 접근 권한을 다시 제거하면 기존 배포도 중단되므로 롤백으로 ACL을 회수하지 않는다.
exports.down = async () => {};
