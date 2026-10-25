import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@backstage/ui/css/styles.css';

// 게스트 세션 갱신 요청이 브라우저 캐시에 의해 404로 처리되는 것을 방지합니다.
const originalFetch = window.fetch;
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const request = typeof input === 'string' && input === '/api/auth/guest/refresh'
    ? `/api/auth/guest/refresh?_=${Date.now()}` : input;
  return originalFetch(request, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
