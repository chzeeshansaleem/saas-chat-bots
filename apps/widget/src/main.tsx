import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './styles.css?inline';

type WidgetUser = { id?: string; email?: string; name?: string; signature?: string; jwt?: string; bearerToken?: string };
type InitOptions = {
  apiUrl?: string;
  tenantId: string;
  botId: string;
  user?: WidgetUser;
  tokenStorageKeys?: string[];
  cookieTokenNames?: string[];
};

type WidgetConfig = {
  tenantId: string;
  botId: string;
  name: string;
  avatarUrl?: string;
  welcomeMessage: string;
  placeholder: string;
  themeColor: string;
  position: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
  zIndex: number;
  suggestedQuestions: string[];
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confirmationId?: string;
};

const DEFAULT_API = 'http://localhost:4000/api';
const DEFAULT_TOKEN_KEYS = [
  'accessToken',
  'access_token',
  'authToken',
  'token',
  'jwt',
  'idToken',
  'id_token',
  'bearerToken',
  'ideawakeToken',
  'auth',
  'session',
  'user',
  'currentUser',
];
const TOKEN_VALUE_KEYS = ['accessToken', 'access_token', 'authToken', 'token', 'jwt', 'idToken', 'id_token', 'bearerToken'];

function App({ options }: { options: InitOptions }) {
  const apiUrl = options.apiUrl || DEFAULT_API;
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig>();
  const [sessionToken, setSessionToken] = useState('');
  const [chatSessionId, setChatSessionId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function boot() {
      const cfg = await widgetFetch<WidgetConfig>(apiUrl, `/widget/config/${options.botId}`);
      setConfig(cfg);
      setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: cfg.welcomeMessage }]);
      const session = await widgetFetch<{ sessionToken: string; chatSessionId: string }>(apiUrl, '/widget/session', {
        method: 'POST',
        body: JSON.stringify({ tenantId: options.tenantId, botId: options.botId, user: options.user || {} }),
      });
      setSessionToken(session.sessionToken);
      setChatSessionId(session.chatSessionId);
    }
    boot().catch((err) => setError(err instanceof Error ? err.message : 'Could not load chat widget'));
  }, [apiUrl, options.botId, options.tenantId, options.user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function sendMessage(value: string) {
    if (!value.trim() || !sessionToken) return;
    const text = value.trim();
    setInput('');
    setBusy(true);
    setError('');
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: text }]);
    try {
      const response = await widgetFetch<{ message: string; chatSessionId: string; type: string; confirmation?: { id: string } }>(apiUrl, '/widget/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionToken, chatSessionId, message: text }),
      });
      setChatSessionId(response.chatSessionId);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: response.message, confirmationId: response.confirmation?.id },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(confirmationId: string) {
    setBusy(true);
    try {
      const response = await widgetFetch<{ result: unknown }>(apiUrl, `/widget/actions/${confirmationId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ sessionToken }),
      });
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: `Action completed successfully.\n\n${JSON.stringify(response.result, null, 2)}` },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(confirmationId: string) {
    await widgetFetch(apiUrl, `/widget/actions/${confirmationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ sessionToken }),
    });
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: 'Action cancelled.' }]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  const position = config?.position === 'BOTTOM_LEFT' ? 'bottom-left' : 'bottom-right';

  return (
    <div className={`aiw-root ${position}`} style={{ '--aiw-color': config?.themeColor || '#2563eb', '--aiw-z': config?.zIndex || 2147483000 } as React.CSSProperties}>
      {!open && (
        <button className="aiw-launcher" aria-label="Open chat" onClick={() => setOpen(true)}>
          ✦
        </button>
      )}
      {open && (
        <section className="aiw-drawer" role="dialog" aria-label={config?.name || 'AI chatbot'}>
          <header className="aiw-header">
            <div className="aiw-bot">
              <div className="aiw-avatar">{config?.avatarUrl ? <img src={config.avatarUrl} alt="" /> : config?.name?.slice(0, 1) || 'AI'}</div>
              <div>
                <p className="aiw-title">{config?.name || 'AI Assistant'}</p>
                <p className="aiw-status">Online</p>
              </div>
            </div>
            <button className="aiw-icon-button" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </header>
          <div ref={scrollRef} className="aiw-messages">
            {messages.map((message) => (
              <div key={message.id} className={`aiw-bubble ${message.role === 'user' ? 'aiw-user' : 'aiw-assistant'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                {message.confirmationId && (
                  <div className="aiw-card">
                    <strong>Confirmation required</strong>
                    <div className="aiw-card-actions">
                      <button className="aiw-primary" onClick={() => confirm(message.confirmationId!)}>Confirm</button>
                      <button className="aiw-secondary" onClick={() => cancel(message.confirmationId!)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="aiw-bubble aiw-assistant">Typing...</div>}
            {error && <div className="aiw-card">{error}</div>}
          </div>
          {!!config?.suggestedQuestions.length && (
            <div className="aiw-suggestions">
              {config.suggestedQuestions.slice(0, 4).map((question) => (
                <button key={question} className="aiw-suggestion" onClick={() => sendMessage(question)}>{question}</button>
              ))}
            </div>
          )}
          <form className="aiw-composer" onSubmit={submit}>
            <textarea
              className="aiw-input"
              placeholder={config?.placeholder || 'Ask me anything...'}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button className="aiw-send" disabled={busy} aria-label="Send">→</button>
          </form>
          <div className="aiw-footer">Powered by AI Knowledge Assistant</div>
        </section>
      )}
    </div>
  );
}

async function widgetFetch<T>(apiUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload?.error?.message || payload?.error || 'Request failed');
  return payload.data ?? payload;
}

function mount(options: InitOptions) {
  const resolvedOptions = withResolvedToken(options);
  const host = document.createElement('div');
  host.id = 'ai-chatbot-widget-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const root = document.createElement('div');
  shadow.append(style, root);
  document.body.appendChild(host);
  createRoot(root).render(<App options={resolvedOptions} />);
}

function optionsFromScript(script: HTMLScriptElement): InitOptions {
  const tokenStorageKeys = [
    ...splitList(script.dataset.tokenStorageKeys || script.dataset.tokenStorageKey),
    ...splitList(script.dataset.localStorageKey),
    ...splitList(script.dataset.sessionStorageKey),
  ];
  const cookieTokenNames = splitList(script.dataset.cookieTokenNames || script.dataset.cookieTokenName);
  return {
    apiUrl: script.dataset.apiUrl,
    tenantId: script.dataset.tenantId || '',
    botId: script.dataset.botId || '',
    tokenStorageKeys,
    cookieTokenNames,
    user: {
      id: script.dataset.userId,
      email: script.dataset.userEmail,
      name: script.dataset.userName,
      signature: script.dataset.userSignature,
      jwt: script.dataset.userJwt || script.dataset.bearerToken,
    },
  };
}

function withResolvedToken(options: InitOptions): InitOptions {
  const explicitToken = normalizeBearerToken(options.user?.jwt || options.user?.bearerToken);
  const storageToken = explicitToken || readHostBearerToken(options.tokenStorageKeys, options.cookieTokenNames);
  if (!storageToken) return options;
  return {
    ...options,
    user: {
      ...(options.user || {}),
      jwt: storageToken,
      bearerToken: storageToken,
    },
  };
}

function readHostBearerToken(storageKeys: string[] = [], cookieNames: string[] = []) {
  const keys = unique([...storageKeys, ...DEFAULT_TOKEN_KEYS]);
  for (const key of keys) {
    const token = normalizeBearerToken(readStorageValue('localStorage', key)) || normalizeBearerToken(readStorageValue('sessionStorage', key));
    if (token) return token;
  }
  for (const key of keys) {
    const token = extractTokenFromValue(readStorageValue('localStorage', key)) || extractTokenFromValue(readStorageValue('sessionStorage', key));
    if (token) return token;
  }
  const cookies = parseCookies();
  for (const name of unique([...cookieNames, ...DEFAULT_TOKEN_KEYS])) {
    const token = normalizeBearerToken(cookies[name]) || extractTokenFromValue(cookies[name]);
    if (token) return token;
  }
  return '';
}

function readStorageValue(storageName: 'localStorage' | 'sessionStorage', key: string) {
  try {
    return window[storageName]?.getItem(key) || '';
  } catch {
    return '';
  }
}

function extractTokenFromValue(value?: string | null): string {
  const normalized = normalizeBearerToken(value);
  if (normalized && looksLikeToken(normalized)) return normalized;
  if (!value) return '';
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return findTokenInObject(parsed);
  } catch {
    return '';
  }
}

function findTokenInObject(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const object = value as Record<string, unknown>;
  for (const key of TOKEN_VALUE_KEYS) {
    const token = normalizeBearerToken(typeof object[key] === 'string' ? object[key] : '');
    if (token) return token;
  }
  for (const item of Object.values(object)) {
    const token = findTokenInObject(item);
    if (token) return token;
  }
  return '';
}

function parseCookies() {
  try {
    return Object.fromEntries(
      document.cookie
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const separator = part.indexOf('=');
          const key = separator >= 0 ? part.slice(0, separator) : part;
          const value = separator >= 0 ? part.slice(separator + 1) : '';
          return [decodeURIComponent(key), decodeURIComponent(value)];
        }),
    );
  } catch {
    return {} as Record<string, string>;
  }
}

function normalizeBearerToken(value?: string | null) {
  const token = value?.trim();
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
}

function looksLikeToken(value: string) {
  return value.length > 20 && !value.includes('{') && !value.includes(' ');
}

function splitList(value?: string) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

declare global {
  interface Window {
    AIChatbot?: { init: (options: InitOptions) => void };
  }
}

window.AIChatbot = { init: mount };

const currentScript = document.currentScript as HTMLScriptElement | null;
if (currentScript?.dataset.botId && currentScript.dataset.tenantId) {
  mount(optionsFromScript(currentScript));
}
