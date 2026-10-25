import { useCallback, useEffect, useRef, useState } from 'react';

export type KrmfErrorKind = 'permission' | 'unavailable';

export interface KrmfQueryError {
  kind: KrmfErrorKind;
  message: string;
}

export const classifyKrmfError = (error: unknown): KrmfQueryError => {
  const status = (error as { status?: number } | null)?.status;
  const message =
    error instanceof Error && error.message
      ? error.message
      : '데이터를 불러오지 못했습니다.';
  if (status === 403) return { kind: 'permission', message };
  return { kind: 'unavailable', message };
};

export interface KrmfQueryState<T> {
  data: T | null;
  loading: boolean;
  error: KrmfQueryError | null;
  reload: () => void;
}

export const useKrmfQuery = <T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<string | boolean | number | null | undefined>,
): KrmfQueryState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<KrmfQueryError | null>(null);
  const [refresh, setRefresh] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const scope = JSON.stringify(deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then(result => {
        if (!active) return;
        setData(result);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setData(null);
        setError(classifyKrmfError(e));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope, refresh]);

  const reload = useCallback(() => setRefresh(value => value + 1), []);
  return { data, loading, error, reload };
};
