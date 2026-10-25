export interface FirebaseAuthConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
}

export interface PreviewAuthState {
  loading: boolean;
  user: { email: string | null; displayName: string | null } | null;
  isAllowed: boolean;
  error: string | null;
}
