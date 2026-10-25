import {
  fetchSearchSources,
  parseSearchData,
  parseSourcesData,
  parseSuggestData,
  PortalSearchValidationError,
  searchPortal,
  searchTypeLabel,
  sourceStatusLabel,
  suggestPortal,
  toSearchErrorInfo,
  validateSearchQuery,
  validateSuggestQuery,
} from './SearchApiClient';
import { PortalResponse } from '../portal-runtime/PortalRuntimeContext';

const okResponse = <T,>(data: T): PortalResponse<T> => ({
  data,
  meta: { requestId: 'req-1' },
});

type PortalRequestFn = <T>(
  path: string,
  init?: RequestInit,
) => Promise<PortalResponse<T>>;

const requestMock = (body: unknown): PortalRequestFn => {
  const fn = jest.fn();
  fn.mockResolvedValue(okResponse(body));
  return fn as unknown as PortalRequestFn;
};

describe('검색어 클라이언트 사전 검증', () => {
  it('검색어는 2자 미만이면 사전 검증에서 거부된다', () => {
    expect(validateSearchQuery('a')).toBe('검색어는 2자 이상 입력해 주세요.');
    expect(validateSearchQuery('  ')).toBe('검색어는 2자 이상 입력해 주세요.');
  });

  it('검색어는 100자를 초과하면 사전 검증에서 거부된다', () => {
    expect(validateSearchQuery('x'.repeat(101))).toBe(
      '검색어는 100자 이하여야 합니다.',
    );
    expect(validateSearchQuery('x'.repeat(100))).toBeNull();
  });

  it('검색어는 앞뒤 공백을 제거한 길이로 판정한다', () => {
    expect(validateSearchQuery(' 검색 ')).toBeNull();
  });

  it('자동완성은 빈 검색어를 호출하지 않고, 100자 초과만 거부한다', () => {
    expect(validateSuggestQuery('')).toBeNull();
    expect(validateSuggestQuery('x'.repeat(101))).toBe(
      '검색어는 100자 이하여야 합니다.',
    );
    expect(validateSuggestQuery('한글')).toBeNull();
  });
});

describe('라벨 매핑', () => {
  it('검색 결과 타입별 한글 라벨을 반환한다', () => {
    expect(searchTypeLabel('menu')).toBe('포털 메뉴');
    expect(searchTypeLabel('project')).toBe('프로젝트');
    expect(searchTypeLabel('organization')).toBe('조직');
    expect(searchTypeLabel('user')).toBe('사용자');
  });

  it('원천 상태 라벨은 available=검색 가능, 그 외=연동 대기이다', () => {
    expect(sourceStatusLabel('available')).toBe('검색 가능');
    expect(sourceStatusLabel('integration_pending')).toBe('연동 대기');
  });
});

describe('검색 응답 파싱', () => {
  const rawItem = {
    type: 'project',
    id: 'p-1',
    title: '프로젝트 A',
    summary: '요약',
    source_label: '프로젝트',
    source_status: 'available',
    link_path: '/project-workspace?project=p-1',
    updated_at: '2026-09-01T00:00:00.000Z',
  };

  it('계약 필드를 그대로 매핑하고 의미 기반 검색 상태를 not_available로 고정한다', () => {
    const data = parseSearchData({
      total: 1,
      page: 1,
      page_size: 20,
      results: [rawItem],
      took_ms: 12,
    });
    expect(data.total).toBe(1);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].link_path).toBe('/project-workspace?project=p-1');
    expect(data.search_semantic_status).toBe('not_available');
  });

  it('형식이 맞지 않는 결과 항목은 제외한다', () => {
    const data = parseSearchData({
      total: 3,
      page: 1,
      page_size: 20,
      results: [rawItem, { type: 'unknown' }, null],
      took_ms: 5,
    });
    expect(data.results).toHaveLength(1);
  });

  it('원천 목록은 포털/외부 원천을 그대로 반환한다', () => {
    const sources = parseSourcesData({
      sources: [
        { key: 'menu', label: '포털 메뉴', kind: 'portal', status: 'available' },
        {
          key: 'dataset',
          label: '데이터셋',
          kind: 'external',
          status: 'integration_pending',
          note: '외부 원천 연동 대기',
        },
      ],
    });
    expect(sources).toHaveLength(2);
    expect(sources[1].status).toBe('integration_pending');
  });

  it('자동완성은 최대 10건까지만 반환한다', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      type: 'project',
      id: `p-${i}`,
      title: `항목 ${i}`,
    }));
    const parsed = parseSuggestData({ q: '항목', suggestions: items });
    expect(parsed).toHaveLength(10);
  });
});

describe('검색 요청', () => {
  it('검색 경로와 파라미터를 BFF 계약에 맞게 구성한다', async () => {
    const body = { total: 0, page: 1, page_size: 20, results: [], took_ms: 1 };
    const request = requestMock(body);
    await searchPortal(request, {
      q: '장비',
      types: ['project', 'user'],
      page: 2,
      pageSize: 10,
    });
    expect(request).toHaveBeenCalledWith(
      '/v1/search?q=%EC%9E%A5%EB%B9%84&types=project%2Cuser&page=2&page_size=10',
    );
  });

  it('타입 미선택 시 types 파라미터를 별도 지정하지 않는다', async () => {
    const request = requestMock({
      total: 0,
      page: 1,
      page_size: 20,
      results: [],
      took_ms: 0,
    });
    await searchPortal(request, { q: '장비' });
    expect(request).toHaveBeenCalledWith(
      '/v1/search?q=%EC%9E%A5%EB%B9%84&page=1&page_size=20',
    );
  });

  it('사전 검증에 걸리면 요청 없이 즉시 실패한다', async () => {
    const request = requestMock({});
    await expect(searchPortal(request, { q: '한' })).rejects.toBeInstanceOf(
      PortalSearchValidationError,
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('원천 목록과 자동완성 경로를 호출한다', async () => {
    const sourcesRequest = requestMock({ sources: [] });
    await fetchSearchSources(sourcesRequest);
    expect(sourcesRequest).toHaveBeenCalledWith('/v1/search/sources');

    const suggestRequest = requestMock({ q: '장', suggestions: [] });
    await suggestPortal(suggestRequest, '장비');
    expect(suggestRequest).toHaveBeenCalledWith(
      '/v1/search/suggest?q=%EC%9E%A5%EB%B9%84',
    );
  });

  it('자동완성 사전 검증 실패 시 요청 없이 빈 배열을 반환한다', async () => {
    const request = requestMock({});
    await expect(suggestPortal(request, 'x'.repeat(101))).resolves.toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('에러 분류', () => {
  it('클아이언트 사전 검증 실패는 validation로 분류한다', () => {
    const info = toSearchErrorInfo(
      new PortalSearchValidationError('검색어는 2자 이상 입력해 주세요.'),
    );
    expect(info.kind).toBe('validation');
    expect(info.retryable).toBe(false);
  });

  it('401은 인증 만료로 분류한다', () => {
    const error = Object.assign(new Error('unauthenticated'), {
      status: 401,
      code: 'unauthenticated',
    });
    expect(toSearchErrorInfo(error).kind).toBe('unauthenticated');
  });

  it('403은 권한 없음으로 분류한다', () => {
    const error = Object.assign(new Error('forbidden'), { status: 403 });
    expect(toSearchErrorInfo(error).kind).toBe('forbidden');
  });

  it('5xx와 네트워크 오류는 재시도 가능한 서버 오류로 분류한다', () => {
    const serverError = Object.assign(new Error('internal_error'), {
      status: 500,
      code: 'internal_error',
    });
    const serverInfo = toSearchErrorInfo(serverError);
    expect(serverInfo.kind).toBe('server');
    expect(serverInfo.retryable).toBe(true);

    const networkInfo = toSearchErrorInfo(new Error('Failed to fetch'));
    expect(networkInfo.kind).toBe('server');
    expect(networkInfo.retryable).toBe(true);
  });
});

it("preserves a server request ID for actionable support feedback", () => {
  const error = Object.assign(new Error("일시 오류"), { status: 503, requestId: "request-42" });
  expect(toSearchErrorInfo(error).requestId).toBe("request-42");
});
