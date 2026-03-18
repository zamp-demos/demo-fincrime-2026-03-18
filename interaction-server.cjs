'use strict';
try { require('dotenv').config(); } catch(e) {}

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = process.env.VITE_MODEL || 'gemini-2.5-flash';

// ── Paths ───────────────────────────────────────────────────────────────────
const PUBLIC_DIR        = path.join(__dirname, 'public');
const DATA_DIR          = path.join(PUBLIC_DIR, 'data');
const PROCESSES_PATH    = path.join(DATA_DIR, 'processes.json');
const BASE_PROC_PATH    = path.join(DATA_DIR, 'base_processes.json');
const SIGNALS_PATH      = path.join(__dirname, 'interaction-signals.json');
const FEEDBACK_QUEUE_PATH = path.join(DATA_DIR, 'feedbackQueue.json');
const KB_VERSIONS_PATH  = path.join(DATA_DIR, 'kbVersions.json');
const SNAPSHOTS_DIR     = path.join(DATA_DIR, 'snapshots');
const KB_PATH           = path.join(__dirname, 'src', 'data', 'knowledgeBase.md');

// ── State ────────────────────────────────────────────────────────────────────
let state = { sent: false, confirmed: false, signals: {} };
const runningProcesses = new Map();

// ── CORS headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

// ── Startup init ─────────────────────────────────────────────────────────────
if (!fs.existsSync(DATA_DIR))      fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

if (!fs.existsSync(PROCESSES_PATH)) {
    if (fs.existsSync(BASE_PROC_PATH)) {
        fs.copyFileSync(BASE_PROC_PATH, PROCESSES_PATH);
    } else {
        fs.writeFileSync(PROCESSES_PATH, '[]');
    }
}
if (!fs.existsSync(SIGNALS_PATH))
    fs.writeFileSync(SIGNALS_PATH, JSON.stringify({
        APPROVE_BLOCK_JO: false, ESCALATE_JO: false, CONTACT_JO: false,
        APPROVE_SAR_SR: false, EDD_SR: false, ESCALATE_SR: false,
        APPROVE_FCA_MW: false, FREEZE_MW: false, INTERNAL_MW: false,
        APPROVE_BLOCK_LY: false, VERIFY_LY: false, ESCALATE_LY: false,
        APPROVE_RESTORE_DF: false, LOCK_DF: false, ESCALATE_DF: false
    }, null, 4));
if (!fs.existsSync(FEEDBACK_QUEUE_PATH)) fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
if (!fs.existsSync(KB_VERSIONS_PATH))    fs.writeFileSync(KB_VERSIONS_PATH, '[]');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJSON(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch(e) { return fallback; }
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
        '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
        '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        '.pdf': 'application/pdf', '.md': 'text/markdown', '.woff2': 'font/woff2'
    };
    return map[ext] || 'application/octet-stream';
}

function serveStatic(res, reqPath) {
    let filePath = path.join(PUBLIC_DIR, reqPath === '/' ? 'index.html' : reqPath);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
        res.writeHead(404); res.end('Not found'); return;
    }
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { ...corsHeaders, 'Content-Type': getMimeType(filePath) });
    res.end(content);
}

// ── Request handler ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders); res.end(); return;
    }

    const url  = new URL(req.url, `http://localhost:${PORT}`);
    const cleanPath = url.pathname;

    // ── /reset ───────────────────────────────────────────────────────────────
    if (cleanPath === '/reset') {
        state = { sent: false, confirmed: false, signals: {} };
        console.log('Demo Reset Triggered');

        fs.writeFileSync(SIGNALS_PATH, JSON.stringify({
            APPROVE_BLOCK_JO: false, ESCALATE_JO: false, CONTACT_JO: false,
            APPROVE_SAR_SR: false, EDD_SR: false, ESCALATE_SR: false,
            APPROVE_FCA_MW: false, FREEZE_MW: false, INTERNAL_MW: false,
            APPROVE_BLOCK_LY: false, VERIFY_LY: false, ESCALATE_LY: false,
            APPROVE_RESTORE_DF: false, LOCK_DF: false, ESCALATE_DF: false
        }, null, 4));

        runningProcesses.forEach((proc) => {
            try { process.kill(-proc.pid, 'SIGKILL'); } catch(e) {}
        });
        runningProcesses.clear();

        exec('pkill -9 -f "node(.*)simulation_scripts" || true', () => {
            setTimeout(() => {
                // Reset cases from base
                if (fs.existsSync(BASE_PROC_PATH)) {
                    fs.copyFileSync(BASE_PROC_PATH, PROCESSES_PATH);
                }
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
                fs.writeFileSync(KB_VERSIONS_PATH, '[]');

                const scripts = [
                    { file: 'sim_CUST-20847-JO.cjs', id: 'CUST-20847-JO' },
                    { file: 'sim_CUST-31042-SR.cjs',  id: 'CUST-31042-SR' },
                    { file: 'sim_CUST-44891-MW.cjs',  id: 'CUST-44891-MW' },
                    { file: 'sim_CUST-58234-LY.cjs',  id: 'CUST-58234-LY' },
                    { file: 'sim_CUST-67103-DF.cjs',  id: 'CUST-67103-DF' }
                ];

                let totalDelay = 0;
                scripts.forEach((script) => {
                    setTimeout(() => {
                        const scriptPath = path.join(__dirname, 'simulation_scripts', script.file);
                        const child = exec(
                            `node "${scriptPath}" > "${scriptPath}.log" 2>&1`,
                            (error) => {
                                if (error && error.code !== 0) {
                                    console.error(`${script.file} error:`, error.message);
                                }
                                runningProcesses.delete(script.id);
                            }
                        );
                        runningProcesses.set(script.id, child);
                    }, totalDelay * 1000);
                    totalDelay += 2;
                });
            }, 1000);
        });

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // ── /email-status ────────────────────────────────────────────────────────
    if (cleanPath === '/email-status') {
        if (req.method === 'GET') {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sent: state.sent }));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', d => body += d);
            req.on('end', () => {
                try { const p = JSON.parse(body); state.sent = p.sent ?? state.sent; } catch(e) {}
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            });
        }
        return;
    }

    // ── /signal-status ───────────────────────────────────────────────────────
    if (cleanPath === '/signal-status') {
        if (req.method === 'GET') {
            const signals = readJSON(SIGNALS_PATH, {});
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ signals }));
        }
        return;
    }

    // ── /signal (POST) ────────────────────────────────────────────────────────
    if (cleanPath === '/signal' && req.method === 'POST') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', () => {
            try {
                const { signal, value } = JSON.parse(body);
                const signals = readJSON(SIGNALS_PATH, {});
                signals[signal] = value ?? true;
                fs.writeFileSync(SIGNALS_PATH, JSON.stringify(signals, null, 4));
                state.signals[signal] = signals[signal];
            } catch(e) {}
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    // ── /api/update-status (POST) ────────────────────────────────────────────
    if (cleanPath === '/api/update-status' && req.method === 'POST') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', () => {
            try {
                const update = JSON.parse(body);
                const processes = readJSON(PROCESSES_PATH, []);
                const idx = processes.findIndex(p => p.id === update.id);
                if (idx !== -1) {
                    processes[idx] = { ...processes[idx], ...update };
                    fs.writeFileSync(PROCESSES_PATH, JSON.stringify(processes, null, 4));
                }
            } catch(e) { console.error('update-status error:', e.message); }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    // ── /debug-paths ─────────────────────────────────────────────────────────
    if (cleanPath === '/debug-paths') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ __dirname, DATA_DIR, PROCESSES_PATH, exists: fs.existsSync(PROCESSES_PATH) }));
        return;
    }

    // ── /api/chat (POST) ─────────────────────────────────────────────────────
    if (cleanPath === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', async () => {
            if (!GEMINI_API_KEY) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: 'GEMINI_API_KEY not configured on this server.' }));
                return;
            }
            try {
                const parsed = JSON.parse(body);
                const genAI  = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model  = genAI.getGenerativeModel({ model: MODEL_NAME });

                let result;
                // Caller 2: Work-with-Pace chat
                if (parsed.messages && parsed.systemPrompt) {
                    const contents = parsed.messages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }));
                    const chat = model.startChat({ history: contents.slice(0, -1), systemInstruction: parsed.systemPrompt });
                    result = await chat.sendMessage(contents[contents.length - 1].parts[0].text);
                } else {
                    // Caller 1: KB chat
                    const { message, knowledgeBase, history = [] } = parsed;
                    const systemPrompt = `You are a helpful assistant for the Financial Crime Detection process at a major UK bank. Answer questions based on this knowledge base:\n\n${knowledgeBase}`;
                    const histContents = history.map(h => ({
                        role: h.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: h.content }]
                    }));
                    const chat = model.startChat({ history: histContents, systemInstruction: systemPrompt });
                    result = await chat.sendMessage(message);
                }
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: result.response.text() }));
            } catch(e) {
                console.error('chat error:', e.message);
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // ── /api/feedback/questions (POST) ───────────────────────────────────────
    if (cleanPath === '/api/feedback/questions' && req.method === 'POST') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', async () => {
            if (!GEMINI_API_KEY) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ questions: ['What is the context?', 'What outcome do you want?', 'Any constraints?'] }));
                return;
            }
            try {
                const { feedback, knowledgeBase } = JSON.parse(body);
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: MODEL_NAME });
                const prompt = `You are reviewing feedback about a financial crime detection knowledge base. Generate exactly 3 clarifying questions to help refine this feedback:\n\nFeedback: "${feedback}"\n\nCurrent KB excerpt:\n${(knowledgeBase || '').slice(0, 2000)}\n\nReturn ONLY a JSON array of 3 question strings. No other text.`;
                const result = await model.generateContent(prompt);
                let text = result.response.text().trim();
                if (text.startsWith('```')) text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                const questions = JSON.parse(text);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ questions }));
            } catch(e) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ questions: ['Can you clarify the issue?', 'What specific change is needed?', 'Is this urgent?'] }));
            }
        });
        return;
    }

    // ── /api/feedback/summarize (POST) ───────────────────────────────────────
    if (cleanPath === '/api/feedback/summarize' && req.method === 'POST') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', async () => {
            if (!GEMINI_API_KEY) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ summary: `Proposed update: ${JSON.parse(body).feedback}` }));
                return;
            }
            try {
                const { feedback, questions, answers, knowledgeBase } = JSON.parse(body);
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: MODEL_NAME });
                const qaText = (questions || []).map((q, i) => `Q: ${q}\nA: ${answers?.[i] || 'N/A'}`).join('\n\n');
                const prompt = `Summarize this knowledge base feedback into a clear, actionable proposal.\n\nFeedback: "${feedback}"\n\nQ&A:\n${qaText}\n\nReturn a concise 2-3 sentence summary of what should be updated in the knowledge base.`;
                const result = await model.generateContent(prompt);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ summary: result.response.text().trim() }));
            } catch(e) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ summary: 'Unable to summarize — please review manually.' }));
            }
        });
        return;
    }

    // ── /api/feedback/queue ───────────────────────────────────────────────────
    if (cleanPath === '/api/feedback/queue') {
        if (req.method === 'GET') {
            const queue = readJSON(FEEDBACK_QUEUE_PATH, []);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ queue }));
            return;
        }
        if (req.method === 'POST') {
            let body = '';
            req.on('data', d => body += d);
            req.on('end', () => {
                try {
                    const item = JSON.parse(body);
                    const queue = readJSON(FEEDBACK_QUEUE_PATH, []);
                    queue.push({ ...item, status: 'pending', timestamp: new Date().toISOString() });
                    fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
                } catch(e) {}
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            });
            return;
        }
    }

    // ── DELETE /api/feedback/queue/:id ───────────────────────────────────────
    if (cleanPath.startsWith('/api/feedback/queue/') && req.method === 'DELETE') {
        const id = cleanPath.split('/api/feedback/queue/')[1];
        const queue = readJSON(FEEDBACK_QUEUE_PATH, []);
        const filtered = queue.filter(item => item.id !== id);
        fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(filtered, null, 4));
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // ── /api/feedback/apply (POST) ────────────────────────────────────────────
    if (cleanPath === '/api/feedback/apply' && req.method === 'POST') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', async () => {
            try {
                const { feedbackId } = JSON.parse(body);
                const queue = readJSON(FEEDBACK_QUEUE_PATH, []);
                const item  = queue.find(q => q.id === feedbackId);
                if (!item) {
                    res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Not found' })); return;
                }
                const currentKB = fs.existsSync(KB_PATH) ? fs.readFileSync(KB_PATH, 'utf8') : '';

                let updatedKB = currentKB;
                if (GEMINI_API_KEY) {
                    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
                    const prompt = `Update this knowledge base based on the feedback. Return ONLY the complete updated knowledge base as markdown, no other text.\n\nFeedback to apply: "${item.summary}"\n\nCurrent knowledge base:\n${currentKB}`;
                    const result = await model.generateContent(prompt);
                    updatedKB = result.response.text().trim();
                }

                // Save before/after snapshots
                if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
                const ts = Date.now();
                const prevFile = `kb_before_${ts}.md`;
                const snapFile = `kb_after_${ts}.md`;
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, prevFile), currentKB);
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapFile), updatedKB);
                fs.writeFileSync(KB_PATH, updatedKB);

                // Update versions
                const versions = readJSON(KB_VERSIONS_PATH, []);
                versions.push({ id: String(ts), timestamp: new Date().toISOString(), snapshotFile: snapFile, previousFile: prevFile, changes: [item.summary] });
                fs.writeFileSync(KB_VERSIONS_PATH, JSON.stringify(versions, null, 4));

                // Mark item as applied
                const updatedQueue = queue.map(q => q.id === feedbackId ? { ...q, status: 'applied' } : q);
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(updatedQueue, null, 4));

                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, content: updatedKB }));
            } catch(e) {
                console.error('feedback/apply error:', e.message);
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // ── /api/kb/content ───────────────────────────────────────────────────────
    if (cleanPath === '/api/kb/content' && req.method === 'GET') {
        const versionId = url.searchParams.get('versionId');
        let content;
        if (versionId) {
            const versions = readJSON(KB_VERSIONS_PATH, []);
            const ver = versions.find(v => v.id === versionId);
            if (ver) {
                const snapPath = path.join(SNAPSHOTS_DIR, ver.snapshotFile);
                content = fs.existsSync(snapPath) ? fs.readFileSync(snapPath, 'utf8') : '';
            }
        }
        if (!content) {
            content = fs.existsSync(KB_PATH) ? fs.readFileSync(KB_PATH, 'utf8') : '# Knowledge Base\n\nNo content yet.';
        }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content }));
        return;
    }

    // ── /api/kb/versions ─────────────────────────────────────────────────────
    if (cleanPath === '/api/kb/versions' && req.method === 'GET') {
        const versions = readJSON(KB_VERSIONS_PATH, []);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ versions }));
        return;
    }

    // ── /api/kb/snapshot/:filename ────────────────────────────────────────────
    if (cleanPath.startsWith('/api/kb/snapshot/') && req.method === 'GET') {
        const filename = cleanPath.split('/api/kb/snapshot/')[1];
        const snapPath = path.join(SNAPSHOTS_DIR, filename);
        if (fs.existsSync(snapPath)) {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown' });
            res.end(fs.readFileSync(snapPath));
        } else {
            res.writeHead(404, corsHeaders); res.end('Not found');
        }
        return;
    }

    // ── /api/kb/update (POST) ─────────────────────────────────────────────────
    if (cleanPath === '/api/kb/update' && req.method === 'POST') {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', () => {
            try {
                const { content } = JSON.parse(body);
                fs.writeFileSync(KB_PATH, content);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch(e) {
                res.writeHead(500, corsHeaders); res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // ── Static file fallback ──────────────────────────────────────────────────
    serveStatic(res, cleanPath);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial Crime Detection demo server running on port ${PORT}`);
});
