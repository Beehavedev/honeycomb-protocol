import { Octokit } from '@octokit/rest';
import fs from 'fs';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });

  const owner = 'Beehavedev';
  const repo = 'honeycomb-protocol';
  const path = 'README.md';

  const content = fs.readFileSync('GITHUB_README.md', 'utf-8');
  const contentBase64 = Buffer.from(content).toString('base64');

  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data) && 'sha' in data) {
      sha = data.sha;
    }
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  let oldSha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'README' });
    if (!Array.isArray(data) && 'sha' in data) {
      oldSha = data.sha;
    }
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  if (oldSha) {
    try {
      await octokit.repos.deleteFile({
        owner, repo, path: 'README',
        message: 'Remove old README (replaced with README.md)',
        sha: oldSha,
      });
      console.log('Deleted old README file');
    } catch (e: any) {
      console.log('Could not delete old README:', e.message);
    }
  }

  const result = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: 'Update README.md - Add Trading Arena, Games, Web4 Economy, Conway Automaton, $HONEY Presale, and more',
    content: contentBase64,
    ...(sha ? { sha } : {}),
  });

  console.log('README.md pushed successfully!');
  console.log('Commit:', result.data.commit.html_url);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
