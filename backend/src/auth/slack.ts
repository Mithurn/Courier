import { env } from '../env';

const AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

export function slackAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: 'incoming-webhook',
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

type SlackInstall = {
  teamId: string;
  teamName: string;
  incomingWebhookUrl: string;
  incomingWebhookChannel: string;
};

type SlackOAuthResponse =
  | { ok: true; team: { id: string; name: string }; incoming_webhook: { url: string; channel: string } }
  | { ok: false; error: string };

export async function exchangeCodeForSlackInstall(code: string): Promise<SlackInstall> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      redirect_uri: env.SLACK_REDIRECT_URI,
    }),
  });
  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok) {
    throw new Error(`Slack OAuth exchange failed: ${data.error}`);
  }

  return {
    teamId: data.team.id,
    teamName: data.team.name,
    incomingWebhookUrl: data.incoming_webhook.url,
    incomingWebhookChannel: data.incoming_webhook.channel,
  };
}
