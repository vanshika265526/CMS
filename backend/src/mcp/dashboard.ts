import { Request, Response } from 'express';

export function serveDashboard(_req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/html');
  res.send(DASHBOARD_HTML);
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMS MCP Server — Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --bg-primary: #0a0e1a;
      --bg-secondary: #111827;
      --bg-card: #1a2035;
      --bg-input: #0f1629;
      --border: #2a3352;
      --border-hover: #4a5a8a;
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --accent-glow: rgba(99,102,241,0.25);
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
      --radius: 12px;
    }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.6;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1a1040 0%, #0f172a 50%, #0a1628 100%);
      border-bottom: 1px solid var(--border);
      padding: 24px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(20px);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, var(--accent), #a855f7);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      color: white;
      box-shadow: 0 4px 15px var(--accent-glow);
    }

    .header h1 {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #e2e8f0, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header h1 span {
      font-weight: 400;
      font-size: 14px;
      background: linear-gradient(135deg, #94a3b8, #64748b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-left: 8px;
    }

    .connection-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
    }

    .connection-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--error);
      transition: background 0.3s;
    }

    .connection-badge.connected .dot {
      background: var(--success);
      box-shadow: 0 0 8px rgba(34,197,94,0.5);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Layout */
    .container {
      display: flex;
      height: calc(100vh - 91px);
    }

    /* Sidebar */
    .sidebar {
      width: 340px;
      min-width: 340px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
    }

    .search-box {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-box:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    .search-wrapper {
      position: relative;
    }

    .search-wrapper::before {
      content: '🔍';
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
    }

    .tool-count {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 10px;
    }

    .tool-count strong {
      color: var(--accent);
    }

    .tool-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .tool-list::-webkit-scrollbar {
      width: 6px;
    }

    .tool-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .tool-list::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;
    }

    .tool-item {
      padding: 12px 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
      margin-bottom: 2px;
    }

    .tool-item:hover {
      background: var(--bg-card);
      border-color: var(--border);
    }

    .tool-item.active {
      background: rgba(99,102,241,0.1);
      border-color: var(--accent);
    }

    .tool-item .tool-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .tool-item .tool-desc {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tool-item .tool-module {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .module-student { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .module-faculty { background: rgba(168,85,247,0.15); color: #c084fc; }
    .module-course { background: rgba(234,179,8,0.15); color: #facc15; }
    .module-attendance { background: rgba(34,197,94,0.15); color: #4ade80; }
    .module-exam { background: rgba(239,68,68,0.15); color: #f87171; }
    .module-fee { background: rgba(249,115,22,0.15); color: #fb923c; }
    .module-library { background: rgba(6,182,212,0.15); color: #22d3ee; }
    .module-timetable { background: rgba(234,179,8,0.15); color: #facc15; }
    .module-admission { background: rgba(59,130,246,0.15); color: #60a5fa; }

    /* Main Content */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .main-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
      color: var(--text-muted);
    }

    .main-empty .icon {
      font-size: 48px;
      opacity: 0.3;
    }

    .main-empty p {
      font-size: 15px;
    }

    .tool-detail {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
    }

    .tool-detail::-webkit-scrollbar {
      width: 6px;
    }

    .tool-detail::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;
    }

    .detail-header {
      margin-bottom: 28px;
    }

    .detail-header h2 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .detail-header p {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.6;
    }

    /* Form */
    .param-section h3 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .param-group {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 16px;
    }

    .param-field {
      margin-bottom: 16px;
    }

    .param-field:last-child {
      margin-bottom: 0;
    }

    .param-field label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text-primary);
    }

    .param-field label .required {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(239,68,68,0.15);
      color: #f87171;
      font-weight: 600;
    }

    .param-field label .optional {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(100,116,139,0.2);
      color: var(--text-muted);
      font-weight: 500;
    }

    .param-field .hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .param-field input,
    .param-field select,
    .param-field textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: 13px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      outline: none;
      transition: border-color 0.2s;
    }

    .param-field input:focus,
    .param-field select:focus,
    .param-field textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    .param-field textarea {
      min-height: 80px;
      resize: vertical;
    }

    /* Buttons */
    .btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent), #7c3aed);
      color: white;
      box-shadow: 0 4px 12px var(--accent-glow);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px var(--accent-glow);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: var(--bg-card);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
    }

    .action-bar {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    /* Result */
    .result-section {
      margin-top: 28px;
    }

    .result-section h3 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .result-box {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      overflow-x: auto;
    }

    .result-box pre {
      font-size: 13px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      color: var(--text-secondary);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.7;
    }

    .result-box.success {
      border-color: rgba(34,197,94,0.3);
    }

    .result-box.error {
      border-color: rgba(239,68,68,0.3);
    }

    .result-time {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 8px;
    }

    /* Loading spinner */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Filter tabs */
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
    }

    .filter-tab {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.15s;
    }

    .filter-tab:hover {
      color: var(--text-secondary);
      background: var(--bg-card);
    }

    .filter-tab.active {
      background: rgba(99,102,241,0.15);
      color: var(--accent);
      border-color: rgba(99,102,241,0.3);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container { flex-direction: column; }
      .sidebar { width: 100%; min-width: auto; max-height: 40vh; }
      .tool-detail { padding: 20px; }
    }
  </style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="logo">⚡</div>
    <h1>CMS MCP Server <span>v1.0.0</span></h1>
  </div>
  <div class="connection-badge" id="connectionBadge">
    <div class="dot"></div>
    <span id="connectionText">Connecting...</span>
  </div>
</div>

<div class="container">
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="search-wrapper">
        <input type="text" class="search-box" id="searchBox" placeholder="Search tools...">
      </div>
      <div class="tool-count" id="toolCount">Loading tools...</div>
    </div>
    <div class="filter-tabs" id="filterTabs">
      <button class="filter-tab active" data-filter="all">All</button>
    </div>
    <div class="tool-list" id="toolList"></div>
  </div>

  <div class="main">
    <div class="main-empty" id="emptyState">
      <div class="icon">🛠️</div>
      <p>Select a tool from the sidebar to get started</p>
    </div>
    <div class="tool-detail" id="toolDetail" style="display:none"></div>
  </div>
</div>

<script>
  const BASE = window.location.origin;
  let tools = [];
  let selectedTool = null;

  // ── Load Tools via REST API ──
  async function connect() {
    const badge = document.getElementById('connectionBadge');
    const text = document.getElementById('connectionText');

    try {
      const res = await fetch(BASE + '/mcp/api/tools');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      tools = data.tools || [];

      badge.classList.add('connected');
      text.textContent = 'Connected (' + tools.length + ' tools)';
      
      renderToolList();
      renderFilterTabs();
      document.getElementById('toolCount').innerHTML = 
        '<strong>' + tools.length + '</strong> tools available';
    } catch(err) {
      badge.classList.remove('connected');
      text.textContent = 'Connection Failed';
      document.getElementById('toolCount').textContent = 'Failed to load tools: ' + err.message;
      setTimeout(connect, 5000);
    }
  }

  // ── Module Detection ──
  function getModule(name) {
    if (name.startsWith('student_') || name.startsWith('admission_')) return name.startsWith('admission_') ? 'admission' : 'student';
    if (name.startsWith('faculty_')) return 'faculty';
    if (name.startsWith('course_') || name.startsWith('subject_') || name.startsWith('timetable_')) return name.startsWith('timetable_') ? 'timetable' : 'course';
    if (name.startsWith('attendance_')) return 'attendance';
    if (name.startsWith('exam_') || name.startsWith('marks_') || name.startsWith('result_')) return 'exam';
    if (name.startsWith('fee_') || name.startsWith('payment_')) return 'fee';
    if (name.startsWith('book_') || name.startsWith('library_')) return 'library';
    return 'other';
  }

  // ── Render Tool List ──
  function renderToolList(filter, search) {
    const list = document.getElementById('toolList');
    let filtered = tools;

    if (filter && filter !== 'all') {
      filtered = filtered.filter(t => getModule(t.name) === filter);
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(s) || 
        (t.description || '').toLowerCase().includes(s)
      );
    }

    list.innerHTML = filtered.map(t => {
      const mod = getModule(t.name);
      return '<div class="tool-item' + (selectedTool?.name === t.name ? ' active' : '') + '" data-name="' + t.name + '">' +
        '<div class="tool-name">' + t.name + '</div>' +
        '<div class="tool-desc">' + (t.description || 'No description') + '</div>' +
        '<span class="tool-module module-' + mod + '">' + mod + '</span>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.tool-item').forEach(el => {
      el.addEventListener('click', () => {
        const tool = tools.find(t => t.name === el.dataset.name);
        if (tool) selectTool(tool);
      });
    });
  }

  function renderFilterTabs() {
    const tabs = document.getElementById('filterTabs');
    const modules = ['all', ...new Set(tools.map(t => getModule(t.name)))];
    
    tabs.innerHTML = modules.map(m => 
      '<button class="filter-tab' + (m === 'all' ? ' active' : '') + '" data-filter="' + m + '">' + m + '</button>'
    ).join('');

    tabs.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderToolList(btn.dataset.filter, document.getElementById('searchBox').value);
      });
    });
  }

  // ── Select Tool ──
  function selectTool(tool) {
    selectedTool = tool;
    document.getElementById('emptyState').style.display = 'none';
    const detail = document.getElementById('toolDetail');
    detail.style.display = 'block';

    const schema = tool.inputSchema || {};
    const props = schema.properties || {};
    const required = schema.required || [];

    let fieldsHtml = '';
    for (const [key, prop] of Object.entries(props)) {
      const isReq = required.includes(key);
      const p = prop;
      const type = p.type || 'string';
      const desc = p.description || '';

      let inputHtml = '';
      if (p.enum) {
        inputHtml = '<select id="param-' + key + '"><option value="">— select —</option>' +
          p.enum.map(v => '<option value="' + v + '">' + v + '</option>').join('') +
        '</select>';
      } else if (type === 'boolean') {
        inputHtml = '<select id="param-' + key + '"><option value="">— select —</option><option value="true">true</option><option value="false">false</option></select>';
      } else if (type === 'number' || type === 'integer') {
        inputHtml = '<input type="number" id="param-' + key + '" placeholder="' + desc.replace(/"/g, '') + '">';
      } else if (type === 'array' || type === 'object') {
        inputHtml = '<textarea id="param-' + key + '" placeholder="JSON: ' + desc.replace(/'/g, '') + '"></textarea>';
      } else {
        inputHtml = '<input type="text" id="param-' + key + '" placeholder="' + desc.replace(/"/g, '') + '">';
      }

      fieldsHtml += '<div class="param-field">' +
        '<label>' + key + ' <span class="' + (isReq ? 'required' : 'optional') + '">' + (isReq ? 'required' : 'optional') + '</span></label>' +
        (desc ? '<div class="hint">' + desc + '</div>' : '') +
        inputHtml +
      '</div>';
    }

    const noParams = Object.keys(props).length === 0;

    detail.innerHTML = 
      '<div class="detail-header">' +
        '<h2>' + tool.name + '</h2>' +
        '<p>' + (tool.description || 'No description available.') + '</p>' +
      '</div>' +
      (noParams 
        ? '<div class="param-section"><h3>Parameters</h3><div class="param-group"><p style="color:var(--text-muted);font-size:13px">This tool requires no parameters.</p></div></div>'
        : '<div class="param-section"><h3>Parameters</h3><div class="param-group">' + fieldsHtml + '</div></div>'
      ) +
      '<div class="action-bar">' +
        '<button class="btn btn-primary" id="runBtn" onclick="runTool()">▶ Run Tool</button>' +
        '<button class="btn btn-secondary" onclick="clearResult()">Clear</button>' +
      '</div>' +
      '<div class="result-section" id="resultSection" style="display:none">' +
        '<h3>📋 Result <span class="result-time" id="resultTime"></span></h3>' +
        '<div class="result-box" id="resultBox"><pre id="resultPre"></pre></div>' +
      '</div>';

    renderToolList(
      document.querySelector('.filter-tab.active')?.dataset.filter, 
      document.getElementById('searchBox').value
    );
  }

  // ── Run Tool via REST API ──
  async function runTool() {
    if (!selectedTool) return;

    const btn = document.getElementById('runBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Running...';

    const schema = selectedTool.inputSchema || {};
    const props = schema.properties || {};
    const args = {};

    for (const [key, prop] of Object.entries(props)) {
      const el = document.getElementById('param-' + key);
      if (!el) continue;
      let val = el.value.trim();
      if (!val) continue;

      const p = prop;
      const type = p.type || 'string';

      if (type === 'number' || type === 'integer') {
        args[key] = Number(val);
      } else if (type === 'boolean') {
        args[key] = val === 'true';
      } else if (type === 'array' || type === 'object') {
        try { args[key] = JSON.parse(val); } catch(e) { args[key] = val; }
      } else {
        args[key] = val;
      }
    }

    const start = Date.now();
    const section = document.getElementById('resultSection');
    const box = document.getElementById('resultBox');
    const pre = document.getElementById('resultPre');
    const time = document.getElementById('resultTime');

    try {
      const res = await fetch(BASE + '/mcp/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: selectedTool.name, args })
      });

      const data = await res.json();
      const elapsed = Date.now() - start;
      section.style.display = 'block';
      time.textContent = '(' + elapsed + 'ms)';

      if (data.error) {
        box.className = 'result-box error';
        pre.textContent = typeof data.error === 'string' ? data.error : JSON.stringify(data.error, null, 2);
      } else {
        box.className = 'result-box success';
        const content = data.result?.content;
        if (content && content[0]?.text) {
          try {
            pre.textContent = JSON.stringify(JSON.parse(content[0].text), null, 2);
          } catch {
            pre.textContent = content[0].text;
          }
        } else {
          pre.textContent = JSON.stringify(data.result, null, 2);
        }
      }
    } catch(err) {
      const elapsed = Date.now() - start;
      section.style.display = 'block';
      time.textContent = '(' + elapsed + 'ms)';
      box.className = 'result-box error';
      pre.textContent = 'Error: ' + err.message;
    }

    btn.disabled = false;
    btn.innerHTML = '▶ Run Tool';
  }

  function clearResult() {
    const section = document.getElementById('resultSection');
    if (section) section.style.display = 'none';
  }

  // ── Search ──
  document.getElementById('searchBox').addEventListener('input', (e) => {
    const filter = document.querySelector('.filter-tab.active')?.dataset.filter;
    renderToolList(filter, e.target.value);
  });

  // ── Boot ──
  connect();
</script>
</body>
</html>`;
