-- 포털 업무 DB 역할 분리 템플릿 (DBA/migration job이 실행)
-- 지시서 §6: 런타임 계정은 owner/superuser/BYPASSRLS가 아니어야 하며 migration 계정과 분리한다.
--
-- 사용법: 대상 DB에 슈퍼유저로 접속 후 실행. 비밀번호는 Secret Manager/볼트에서 주입한다.
--   psql "postgresql://<admin>@<host>/portal_business" -v runtime_pw='...' -f roles.sql

-- migration 전용 계정: DDL + migration history만
CREATE ROLE portal_migrator LOGIN PASSWORD :'migrator_pw';
GRANT USAGE, CREATE ON SCHEMA portal TO portal_migrator;
GRANT ALL ON ALL TABLES IN SCHEMA portal TO portal_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA portal GRANT ALL ON TABLES TO portal_migrator;

-- 런타임 계정: DML만, RLS 우회 불가, 스키마 owner 아님
CREATE ROLE portal_runtime LOGIN
  PASSWORD :'runtime_pw'
  NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA portal TO portal_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA portal TO portal_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA portal
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portal_runtime;

-- 감사 원장은 append-only: 런타임 계정의 UPDATE/DELETE 회수
REVOKE UPDATE, DELETE ON portal.fc_audit_events FROM portal_runtime;

-- 사전 snapshot은 migration/import 전용. 런타임은 기술 메타데이터 조회만 한다.
-- 기존 테이블을 대상으로 역할 템플릿을 적용해도 broad DML을 남기지 않는다.
DO $$ DECLARE dictionary_table text; BEGIN
  FOREACH dictionary_table IN ARRAY ARRAY[
    'fc_metadata_releases', 'fc_metadata_domains', 'fc_metadata_words',
    'fc_metadata_terms', 'fc_metadata_codes', 'fc_metadata_columns'
  ] LOOP
    IF to_regclass('portal.' || dictionary_table) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON portal.%I FROM portal_runtime', dictionary_table);
      EXECUTE format('GRANT SELECT ON portal.%I TO portal_runtime', dictionary_table);
    END IF;
  END LOOP;
END $$;

-- 감사 조회 전용 계정(감사관/수집기): 읽기만
CREATE ROLE portal_audit_reader LOGIN
  PASSWORD :'audit_reader_pw'
  NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA portal TO portal_audit_reader;
GRANT SELECT ON portal.fc_audit_events TO portal_audit_reader;
