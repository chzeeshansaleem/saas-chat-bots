import { Injectable } from '@nestjs/common';

export type RoutedIntent =
  | { type: 'KNOWLEDGE'; reason: string }
  | { type: 'LIVE_DATA'; toolKey?: string; reason: string }
  | { type: 'ACTION'; toolKey?: string; requiresConfirmation: true; reason: string };

@Injectable()
export class ActionRouterService {
  route(message: string): RoutedIntent {
    const normalized = message.toLowerCase();
    const writeVerb = /\b(create|update|assign|send|delete|open|close|comment|notify)\b/.test(normalized);
    const readVerb = /\b(show|get|list|status|how many|read|fetch)\b/.test(normalized);
    const app = this.detectApp(normalized);

    if (app && writeVerb) {
      return {
        type: 'ACTION',
        toolKey: this.suggestTool(app, normalized, true),
        requiresConfirmation: true,
        reason: `Detected a write request for ${app}.`,
      };
    }

    if (app && readVerb) {
      return {
        type: 'LIVE_DATA',
        toolKey: this.suggestTool(app, normalized, false),
        reason: `Detected a live data request for ${app}.`,
      };
    }

    return { type: 'KNOWLEDGE', reason: 'No connected app action was detected; use tenant knowledge retrieval.' };
  }

  private detectApp(value: string) {
    if (value.includes('github') || value.includes('repo') || value.includes('pull request')) return 'github';
    if (value.includes('clickup') || value.includes('task')) return 'clickup';
    if (value.includes('jira') || value.includes('sprint') || value.includes('issue')) return 'jira';
    if (value.includes('slack') || value.includes('channel')) return 'slack';
    return undefined;
  }

  private suggestTool(app: string, value: string, write: boolean) {
    if (app === 'github' && write && value.includes('repo')) return 'github.createRepo';
    if (app === 'github' && write) return 'github.createIssue';
    if (app === 'github') return 'github.getRepoStatus';
    if (app === 'clickup' && write) return 'clickup.createTask';
    if (app === 'clickup') return 'clickup.getTaskDetails';
    if (app === 'jira' && write) return 'jira.createIssue';
    if (app === 'jira') return 'jira.getProjectIssues';
    if (app === 'slack' && write) return 'slack.sendMessage';
    if (app === 'slack') return 'slack.readChannelMessages';
    return undefined;
  }
}
