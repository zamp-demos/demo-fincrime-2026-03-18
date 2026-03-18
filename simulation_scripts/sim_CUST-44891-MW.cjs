const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CUST-44891-MW";
const CASE_NAME = "Marcus Webb — Insider Trading Detection";

// --- Helpers ---
const readJson  = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay     = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);

    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) {
            data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry };
        } else {
            data.logs.push(logEntry);
        }
    }

    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) {
                processes[idx].status = status;
                processes[idx].currentStatus = currentStatus;
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4));
            }
        } catch (err) { }
    }
};

const waitForSignal = async (signalId) => {
    console.log(`Waiting for human signal: ${signalId}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');

    // clear stale signal on start
    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tmp = signalFile + '.' + Math.random().toString(36).slice(2) + '.tmp';
                    fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                    fs.renameSync(tmp, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }

    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    if (signals[signalId]) {
                        console.log(`Signal ${signalId} received!`);
                        delete signals[signalId];
                        const tmp = signalFile + '.' + Math.random().toString(36).slice(2) + '.tmp';
                        fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                        fs.renameSync(tmp, signalFile);
                        return true;
                    }
                }
            }
        } catch (e) { }
        await delay(1000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [],
        keyDetails: {
            "Customer": "Marcus Webb",
            "Account": "****9903",
            "Employer": "Meridian Capital Partners (VP, Equities)",
            "Total Exposure": "\u00a3890,000",
            "Alert Type": "Insider Trading \u2014 6 Correlated Pre-announcement Trades",
            "LRS Score": "743 / 1000",
            "Pattern": "MAR \u2014 Market Abuse, Insider Dealing"
},
        sidebarArtifacts: []
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting customer profile and investment portfolio history...",
            title_s: "Customer profile loaded — CUST-44891-MW, 1,469-day-old premium account",
            reasoning: [
                "Account opened 2022-03-10. VP at Meridian Capital Partners \u2014 equities desk",
                "Products: Premium Current Account, \u00a3890K Investment Portfolio, ISA",
                "KYC score 91 \u2014 passed. PEP/sanctions clear",
                "LRS trajectory: 104 \u2192 743 over 4 years \u2014 gradual escalation, 6 trade clusters identified"
],
            artifacts: [
                { id: "tbl-mw-001", type: "table", label: "Customer Profile", data: {"Name": "Marcus Webb", "Account": "****9903", "Onboarded": "2022-03-10", "KYC Score": "91 \u2014 PASS", "Employer": "Meridian Capital Partners \u2014 VP Equities", "Total Exposure": "\u00a3890,000", "LRS Score": "743 / 1000"} },
                { id: "pdf-mw-001", type: "pdf", label: "Customer Risk Profile", pdfPath: "/files/CUST-44891-MW_customer_profile.pdf" }
            ],
            delay_ms: 3000
        },
        {
            id: "step-2",
            title_p: "Correlating equity trades against corporate announcement timeline...",
            title_s: "6 pre-announcement trade clusters confirmed — pattern spans 26 months",
            reasoning: [
                "(R) TechCorp PLC: \u00a347K buy 3 days before M&A announcement \u2192 \u00a361.2K sale post-announcement \u2192 \u00a314,200 gain",
                "(R) PharmaCo Ltd: \u00a338K buy 2 days before FDA approval leak \u2192 \u00a352.4K sale \u2192 \u00a314,400 gain",
                "(R) EnergyGrid UK: \u00a355K buy placed day before earnings call \u2014 position open",
                "(R) 3 prior clusters in 2024\u20132025 follow same pre/post-announcement pattern",
                "(R) Webb Family Trust receives post-trade transfers: \u00a314K (Feb 19), \u00a313.5K (Mar 3)",
                "(R) Transfer counterparty (Webb Family Trust) linked to Meridian Capital compliance officer",
                "Total confirmed gains from 5 completed trades: ~\u00a389,400"
],
            artifacts: [
                { id: "tbl-mw-002", type: "table", label: "Trade Correlation Analysis", data: {"Pre-announcement Trade Clusters": "6", "Confirmed Gains": "~\u00a389,400", "Average Days Before Announcement": "2.7 days", "Open Position": "EnergyGrid UK \u2014 \u00a355,000", "Trust Transfers Post-trade": "\u00a327,500 total", "Insider Network Link": "Webb Family Trust \u2192 Meridian Compliance Officer"} }
            ],
            delay_ms: 5000
        },
        {
            id: "step-3",
            title_p: "Cross-referencing against MAR/FCA insider list and market announcements...",
            title_s: "MAR breach indicators confirmed — pattern consistent with systematic insider dealing",
            reasoning: [
                "All 6 trade clusters fall within MAR 2-7 day pre-announcement window",
                "Probability of 6 coincidental trades in this window: less than 0.01% by random chance",
                "FCA watchlist proximity flag raised in Nov 2024 \u2014 sector-level flag",
                "Trust beneficiary connected to Meridian compliance officer \u2014 potential information conduit",
                "Current open EnergyGrid position (\u00a355K) suggests insider information may be live"
],
            artifacts: [
                { id: "tbl-mw-003", type: "table", label: "MAR Assessment", data: {"Regulation": "UK MAR \u2014 Market Abuse Regulation", "Breach Type": "Insider Dealing \u2014 Section 52 CJA 1993", "Probability of Coincidence": "< 0.01%", "FCA Watchlist": "Proximity flag \u2014 Nov 2024", "Open Position Risk": "\u00a355,000 EnergyGrid \u2014 earnings call imminent", "Reporting Body": "Financial Conduct Authority"} }
            ],
            delay_ms: 3000
        },
        {
            id: "step-4",
            title_p: "Preparing FCA suspicious transaction report (STR) recommendation...",
            title_s: "FCA referral required — systematic insider dealing pattern confirmed",
            reasoning: [
                "(R) 6-trade pattern over 26 months \u2014 systematic, not opportunistic",
                "(R) Open EnergyGrid position (\u00a355K) \u2014 earnings call imminent, potential further gain",
                "(R) Trust connection to Meridian compliance officer \u2014 possible broader internal breach",
                "FCA STR required under UK MAR Article 16 \u2014 24-hour window from detection"
],
            artifacts: [],
            delay_ms: 2000,
            isHitl: true,
            signalName: "APPROVE_FCA_MW",
            hitlQuestion: "6-trade insider dealing pattern confirmed. £55K live position. What action?",
            hitlOptions: [
                {
                                "label": "File STR with FCA & freeze open position",
                                "value": "str",
                                "signal": "APPROVE_FCA_MW"
                },
                {
                                "label": "Freeze account & escalate to Senior Compliance",
                                "value": "freeze",
                                "signal": "FREEZE_MW"
                },
                {
                                "label": "Issue internal investigation notice",
                                "value": "internal",
                                "signal": "INTERNAL_MW"
                }
]
        },
        {
            id: "step-5",
            title_p: "Filing FCA Suspicious Transaction Report and freezing open position...",
            title_s: "STR filed with FCA — EnergyGrid position frozen pending investigation",
            reasoning: [
                "STR submitted to FCA under UK MAR Article 16 within 24-hour mandatory window",
                "EnergyGrid UK position (\u00a355K) frozen \u2014 no further trades permitted",
                "Internal investigation notice issued to Meridian Capital Partners compliance team",
                "Webb Family Trust flagged for beneficial ownership review",
                "FCA acknowledgement reference issued"
],
            artifacts: [
                { id: "tbl-mw-004", type: "table", label: "Action Summary", data: {"STR Reference": "STR-FCA-2026-0743", "Open Position": "EnergyGrid \u00a355K \u2014 Frozen", "FCA Acknowledgement": "Pending (24h)", "Internal Investigation": "Meridian Capital Compliance", "Trust Review": "Webb Family Trust \u2014 beneficial ownership"} }
            ],
            delay_ms: 2000
        },
        {
            id: "step-6",
            title_p: "Closing investigation record...",
            title_s: "Investigation complete — STR filed, position frozen, FCA engaged",
            reasoning: [
                "STR STR-FCA-2026-0743 filed with Financial Conduct Authority",
                "EnergyGrid position frozen \u2014 estimated \u00a355K protected from further abuse",
                "Meridian Capital Partners notified via internal compliance channel",
                "FCA will determine if formal investigation warranted \u2014 outcome in 10-20 working days"
],
            artifacts: [],
            delay_ms: 2000,
            isFinal: true
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = step.isFinal || i === steps.length - 1;

        // --- processing write ---
        updateProcessLog(PROCESS_ID, {
            id: step.id,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: step.title_p,
            status: "processing"
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(step.delay_ms || 2200);

        // --- decision HITL ---
        if (step.isHitl) {
            const decisionArtifact = {
                id: `decision-${step.id}`,
                type: "decision",
                label: "Manual Review",
                data: {
                    question: step.hitlQuestion || step.title_s,
                    options: step.hitlOptions || []
                }
            };
            const allArtifacts = [...(step.artifacts || []), decisionArtifact];
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: step.title_s,
                status: "warning",
                reasoning: step.reasoning || [],
                artifacts: allArtifacts
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", step.title_s);
            await waitForSignal(step.signalName);
            await updateProcessListStatus(PROCESS_ID, "In Progress", `Approved: ${step.title_s}`);
            await delay(1500);

        // --- email HITL ---
        } else if (step.isEmailHitl) {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: step.title_s,
                status: "warning",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Draft Review: Email Pending");
            await waitForEmail();
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: "Email sent successfully",
                status: "success",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Email sent");
            await delay(1500);

        // --- normal step ---
        } else {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: step.title_s,
                status: isFinal ? "completed" : "success",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }

    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
