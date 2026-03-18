const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CUST-31042-SR";
const CASE_NAME = "Sophia Reyes — Mortgage Fraud & Money Laundering";

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
            "Customer": "Sophia Reyes",
            "Account": "****4417",
            "Employer": "Self-employed \u2014 Property Consultant",
            "Total Exposure": "\u00a3320,000",
            "Alert Type": "Mortgage Fraud \u2014 Layering via Property",
            "LRS Score": "778 / 1000",
            "Pattern": "AML \u2014 Placement & Layering"
},
        sidebarArtifacts: []
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting customer profile and mortgage transaction history...",
            title_s: "Customer profile loaded — CUST-31042-SR, 276-day-old account",
            reasoning: [
                "Account opened 2024-06-15. Self-employed property consultant \u2014 higher baseline risk",
                "Products: Current Account, \u00a3320K Mortgage, Savings Account \u2014 total exposure \u00a3320,000",
                "KYC score 88 \u2014 passed, but self-employment income harder to verify",
                "LRS trajectory: 98 \u2192 778 over 21 months \u2014 sustained escalation pattern"
],
            artifacts: [
                { id: "tbl-sr-001", type: "table", label: "Customer Profile", data: {"Name": "Sophia Reyes", "Account": "****4417", "Onboarded": "2024-06-15", "KYC Score": "88 \u2014 PASS", "Employer": "Self-employed \u2014 Property Consultant", "Total Exposure": "\u00a3320,000", "LRS Score": "778 / 1000"} },
                { id: "pdf-sr-001", type: "pdf", label: "Customer Risk Profile", pdfPath: "/files/CUST-31042-SR_customer_profile.pdf" }
            ],
            delay_ms: 3000
        },
        {
            id: "step-2",
            title_p: "Running AML pattern analysis — placement and layering detection...",
            title_s: "AML layering pattern confirmed — offshore funds routed via mortgage overpayment",
            reasoning: [
                "(R) Cash deposits totalling \u00a330,800 in 30 days \u2014 no source of funds declared",
                "(R) Mortgage overpayments 3\u20134x normal rate \u2014 atypical for stated income",
                "(R) Transfer in from OFFSHORE-LLC-44 (x2) \u2014 unverified offshore entity",
                "(R) Property Purchase Fee \u2014 third property transaction this quarter",
                "(R) Source of funds request declined twice \u2014 cited 'accountant busy'",
                "(G) No velocity spike, channel shift, or device anomaly",
                "Classic AML placement \u2192 layering pattern: cash in \u2192 offshore in \u2192 mortgage overpayment"
],
            artifacts: [
                { id: "tbl-sr-002", type: "table", label: "AML Indicators", data: {"Pattern": "Placement + Layering", "Cash Deposits (30d)": "\u00a330,800 (no source declared)", "Offshore Transfers In": "\u00a323,700 from OFFSHORE-LLC-44", "Mortgage Overpayments": "\u00a340,000 in 30 days (norm: ~\u00a33,000)", "Document Refusals": "2 source-of-funds requests declined"} }
            ],
            delay_ms: 4000
        },
        {
            id: "step-3",
            title_p: "Tracing offshore counterparty OFFSHORE-LLC-44...",
            title_s: "Offshore entity identified — jurisdiction: Cayman Islands, no identifiable operations",
            reasoning: [
                "OFFSHORE-LLC-44 registered in Cayman Islands \u2014 incorporation date unknown",
                "No identifiable business operations or web presence",
                "Same entity sent funds twice: \u00a39,500 (Feb 18) and \u00a314,200 (Mar 1) \u2014 total \u00a323,700",
                "Beneficial ownership structure opaque \u2014 nominee directors",
                "Cross-referenced against OFAC/HMT sanctions lists \u2014 no direct match, but proximity flag"
],
            artifacts: [
                { id: "tbl-sr-003", type: "table", label: "Counterparty Analysis", data: {"Entity": "OFFSHORE-LLC-44", "Jurisdiction": "Cayman Islands", "Incorporation": "Unknown", "Operations": "None identified", "Total Transferred": "\u00a323,700", "Sanctions Match": "No direct match \u2014 proximity flag", "Beneficial Owner": "Undisclosed nominee structure"} }
            ],
            delay_ms: 3000
        },
        {
            id: "step-4",
            title_p: "Preparing SAR recommendation and mortgage freeze options...",
            title_s: "AML review required — suspected mortgage laundering, £320K exposure",
            reasoning: [
                "(R) Classic AML trilogy: unexplained cash in \u2192 offshore layering \u2192 property integration",
                "(R) \u00a3320K mortgage used as integration vehicle \u2014 potential proceeds of crime",
                "(R) Two source-of-funds refusals \u2014 deliberate document avoidance",
                "MLRO escalation recommended given exposure size and mortgage product involvement"
],
            artifacts: [],
            delay_ms: 2000,
            isHitl: true,
            signalName: "APPROVE_SAR_SR",
            hitlQuestion: "Layering pattern confirmed via offshore entity + mortgage overpayment. What action?",
            hitlOptions: [
                {
                                "label": "File SAR & restrict mortgage drawdown",
                                "value": "sar",
                                "signal": "APPROVE_SAR_SR"
                },
                {
                                "label": "Issue enhanced due diligence request",
                                "value": "edd",
                                "signal": "EDD_SR"
                },
                {
                                "label": "Escalate to MLRO for decision",
                                "value": "mlro",
                                "signal": "ESCALATE_SR"
                }
]
        },
        {
            id: "step-5",
            title_p: "Logging enhanced due diligence and filing SAR...",
            title_s: "SAR filed — mortgage drawdown restricted pending investigation",
            reasoning: [
                "SAR submitted to National Crime Agency under POCA 2002 s.330",
                "Mortgage drawdown restricted \u2014 Sophia Reyes cannot access additional funds",
                "Enhanced Due Diligence (EDD) review initiated \u2014 30-day window",
                "Customer contact suspended \u2014 tipping off restriction applied",
                "OFAC/HMT re-screening scheduled for all connected accounts"
],
            artifacts: [
                { id: "tbl-sr-004", type: "table", label: "Action Summary", data: {"SAR Reference": "SAR-2026-03-0778", "Mortgage Status": "Drawdown Restricted", "EDD Review": "Initiated \u2014 30-day window", "Investigating Officer": "FinCrime Team Beta", "Tipping Off Restriction": "Applied"} }
            ],
            delay_ms: 2000
        },
        {
            id: "step-6",
            title_p: "Closing investigation record...",
            title_s: "Investigation complete — SAR filed, mortgage restricted",
            reasoning: [
                "SAR SAR-2026-03-0778 submitted to NCA",
                "Mortgage drawdown restricted \u2014 \u00a3320K exposure protected",
                "EDD review will determine if account should be closed",
                "Case referred to MLRO for ongoing monitoring"
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
