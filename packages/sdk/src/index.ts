import type { WidgetInitOptions } from '@multi-chatbot/types';

export function initAIChatbot(options: WidgetInitOptions) {
  if (typeof window === 'undefined' || !window.AIChatbot) return;
  window.AIChatbot.init(options);
}

declare global {
  interface Window {
    AIChatbot?: { init: (options: WidgetInitOptions) => void };
  }
}
