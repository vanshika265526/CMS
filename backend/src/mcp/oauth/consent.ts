// MCP OAuth 2.1 — login + consent page
//
// A single self-contained HTML page where the user authenticates and chooses
// which requested scopes to grant. Posts back to /oauth/authorize/decision.
// Hidden fields carry the OAuth request parameters unchanged.

import { SCOPES } from '../security/permissions.js';

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'students.read': 'View students',
  'students.write': 'Create / edit students',
  'students.delete': 'Delete students',
  'faculty.read': 'View faculty',
  'faculty.write': 'Create / edit faculty',
  'courses.read': 'View courses',
  'courses.write': 'Create / edit courses',
  'attendance.read': 'View attendance',
  'attendance.write': 'Record / edit attendance',
  'exams.read': 'View exams & results',
  'exams.write': 'Manage exams & results',
  'fees.read': 'View fees',
  'fees.write': 'Manage fees',
  'library.read': 'View library',
  'library.write': 'Manage library',
  'users.read': 'View user accounts',
  'users.write': 'Create / edit users',
  'users.delete': 'Delete users',
  'dashboard.read': 'View dashboard statistics',
  'audit.read': 'View activity logs',
  'search.read': 'Search content',
  'settings.read': 'View settings',
  'profile.read': 'View your profile',
  'profile.write': 'Edit your profile',
  'media.upload': 'Upload media',
};

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

export interface ConsentPageParams {
  clientName: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  responseType: string;
  error?: string;
}

export function renderConsentPage(p: ConsentPageParams): string {
  const requested = (p.scope || '').split(/\s+/).filter(Boolean).filter((s) => (SCOPES as readonly string[]).includes(s));
  const list = requested.length ? requested : ['profile.read'];

  const checkboxes = list
    .map(
      (s) => `
      <label class="scope">
        <input type="checkbox" name="granted_scopes" value="${esc(s)}" checked />
        <span><strong>${esc(s)}</strong><em>${esc(SCOPE_DESCRIPTIONS[s] || s)}</em></span>
      </label>`
    )
    .join('');

  const hidden = (name: string, value: string) =>
    `<input type="hidden" name="${name}" value="${esc(value)}" />`;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Authorize ${esc(p.clientName)}</title>
<style>
  :root{--bg:#0a0e1a;--card:#161c2e;--in:#0f1629;--bd:#2a3352;--tx:#e2e8f0;--mut:#94a3b8;--ac:#6366f1}
  *{box-sizing:border-box;margin:0;padding:0;font-family:Inter,-apple-system,Segoe UI,sans-serif}
  body{background:var(--bg);color:var(--tx);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:var(--card);border:1px solid var(--bd);border-radius:16px;max-width:440px;width:100%;padding:32px}
  h1{font-size:20px;margin-bottom:6px}
  .sub{color:var(--mut);font-size:14px;margin-bottom:22px}
  .sub b{color:var(--tx)}
  label.f{display:block;font-size:13px;color:var(--mut);margin:14px 0 6px}
  input.t{width:100%;background:var(--in);border:1px solid var(--bd);border-radius:9px;padding:11px 13px;color:var(--tx);font-size:14px}
  input.t:focus{outline:none;border-color:var(--ac)}
  .scopes{margin:18px 0;border:1px solid var(--bd);border-radius:11px;padding:10px;max-height:230px;overflow:auto}
  .scope{display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:8px}
  .scope:hover{background:rgba(255,255,255,.03)}
  .scope input{margin-top:3px}
  .scope span{display:flex;flex-direction:column}
  .scope em{color:var(--mut);font-style:normal;font-size:12px}
  .row{display:flex;gap:10px;margin-top:20px}
  button{flex:1;border:none;border-radius:9px;padding:12px;font-size:14px;font-weight:600;cursor:pointer}
  .allow{background:var(--ac);color:#fff}
  .deny{background:transparent;color:var(--mut);border:1px solid var(--bd)}
  .err{background:#7f1d1d33;border:1px solid #ef444466;color:#fca5a5;padding:10px 12px;border-radius:9px;font-size:13px;margin-bottom:16px}
  .lock{font-size:12px;color:var(--mut);margin-top:16px;text-align:center}
</style></head>
<body>
  <div class="card">
    <h1>Authorize access</h1>
    <p class="sub"><b>${esc(p.clientName)}</b> wants to access your CMS account.</p>
    ${p.error ? `<div class="err">${esc(p.error)}</div>` : ''}
    <form method="POST" action="/oauth/authorize/decision">
      <label class="f">Email or registration ID</label>
      <input class="t" type="text" name="identifier" autocomplete="username" required />
      <label class="f">Password</label>
      <input class="t" type="password" name="password" autocomplete="current-password" required />

      <div class="scopes">
        <label class="f" style="margin:4px 0 8px">This client is requesting:</label>
        ${checkboxes}
      </div>

      ${hidden('client_id', p.clientId)}
      ${hidden('redirect_uri', p.redirectUri)}
      ${hidden('state', p.state)}
      ${hidden('scope', p.scope)}
      ${hidden('code_challenge', p.codeChallenge)}
      ${hidden('code_challenge_method', p.codeChallengeMethod)}
      ${hidden('response_type', p.responseType)}

      <div class="row">
        <button class="deny" type="submit" name="decision" value="deny">Deny</button>
        <button class="allow" type="submit" name="decision" value="allow">Allow access</button>
      </div>
    </form>
    <p class="lock">🔒 Your password is sent only to your CMS server and is never shared with ${esc(p.clientName)}.</p>
  </div>
</body></html>`;
}
