const PREVIEW_AUTH_KEY = 'kt-ai-portal-preview-authenticated';

export const isPreviewAuthenticated = (): boolean => {
  try {
    return sessionStorage.getItem(PREVIEW_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setPreviewAuthenticated = (): void => {
  try {
    sessionStorage.setItem(PREVIEW_AUTH_KEY, 'true');
  } catch {
    /* ignore */
  }
};

export const clearPreviewAuthenticated = (): void => {
  try {
    sessionStorage.removeItem(PREVIEW_AUTH_KEY);
  } catch {
    /* ignore */
  }
};
