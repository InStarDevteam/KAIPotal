/** runtime 계정은 감사 SELECT 정책만 존재하면 INSERT가 RLS로 차단된다.
 * 감사 서비스는 인증 전 거부 이벤트도 기록하므로 쓰기는 append-only 정책으로 허용한다.
 * DB 권한에서 UPDATE/DELETE를 회수하며 조회 범위는 기존 tenant SELECT 정책을 유지한다. */
exports.up = async knex => {
  await knex.raw(`CREATE POLICY fc_audit_events_append ON portal.fc_audit_events
    FOR INSERT WITH CHECK (true)`);
};
exports.down = async knex => {
  await knex.raw(
    'DROP POLICY IF EXISTS fc_audit_events_append ON portal.fc_audit_events',
  );
};
