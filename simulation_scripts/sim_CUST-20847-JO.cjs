const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CUST-20847-JO";
const CASE_NAME = "James Okafor — Silent Exit Detection";

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
            "Customer": "James Okafor",
            "Account": "****8821",
            "Employer": "Apex Logistics Ltd",
            "Total Exposure": "\u00a353,000",
            "Alert Type": "Silent Exit \u2014 9 Markers Active",
            "LRS Score": "847 / 1000",
            "Days to Exit": "~14 days (High confidence)"
},
        sidebarArtifacts: []
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting customer profile and transaction history...",
            title_s: "Customer profile loaded — CUST-20847-JO, 107-day-old account",
            reasoning: [
                "Account opened 2025-12-01, onboarded clean \u2014 KYC score 94, no PEP/sanctions match",
                "Products: Current Account, \u00a345K Personal Loan, \u00a38K Credit Card \u2014 total exposure \u00a353,000",
                "Employer: Apex Logistics Ltd \u2014 income consistent with onboarding declaration",
                "LRS score at onboarding: 112. Current LRS score: 847 \u2014 escalating trajectory flagged"
],
            artifacts: [
                { id: "tbl-jo-001", type: "table", label: "Customer Profile", data: {"Name": "James Okafor", "Account": "****8821", "Onboarded": "2025-12-01", "KYC Score": "94 \u2014 PASS", "Employer": "Apex Logistics Ltd", "Total Exposure": "\u00a353,000", "LRS Score": "847 / 1000"} },
                { id: "pdf-jo-001", type: "pdf", label: "Customer Risk Profile", pdfPath: "/files/CUST-20847-JO_customer_profile.pdf" }
            ],
            delay_ms: 3000
        },
        {
            id: "step-2",
            title_p: "Running Silent Exit marker analysis across 12-point framework...",
            title_s: "9 of 12 Silent Exit markers active — ALERT THRESHOLD EXCEEDED",
            reasoning: [
                "(R) Velocity Spike: Transaction frequency up 340% vs 90-day average",
                "(R) Channel Shift: 80% digital \u2192 100% ATM/cash in 18 days",
                "(R) New Counterparty Surge: 4 unrecognised payees added in 7-day window",
                "(R) Progressive Drawdown: Account balance down 62% in 28 days",
                "(R) Device Anomaly: New device registered Feb 14 \u2014 location: Eastern Europe",
                "(R) Loan Acceleration: Full \u00a345K drawdown in 60 days vs bank average of 180 days",
                "(R) Communication Silence: No response to 3 bank communications since Mar 1",
                "(R) Geographic Inconsistency: Transactions across London, Manchester, Birmingham, Leeds, Glasgow",
                "(R) Peer Network Activity: 2 connected accounts showing identical patterns \u2014 CUST-00912, CUST-01034",
                "(G) Document Avoidance: No evidence",
                "(G) Dormancy Flip: Not applicable",
                "(G) Support Escalation: Not applicable"
],
            artifacts: [
                { id: "tbl-jo-002", type: "table", label: "Silent Exit Markers", data: {"Active Markers": "9 / 12", "Threshold": "4 markers triggers alert", "Exceeds Threshold By": "5 markers", "Highest Risk": "Loan Acceleration + Geographic Inconsistency", "Network Exposure": "CUST-00912, CUST-01034 (same pattern)"} }
            ],
            delay_ms: 4000
        },
        {
            id: "step-3",
            title_p: "Analysing transaction velocity and loan drawdown timeline...",
            title_s: "Anomalous drawdown confirmed — 60-day vs 180-day norm",
            reasoning: [
                "\u00a345,000 personal loan drawn in 60 days vs bank average of 180 days",
                "12 transactions in last 30 days \u2014 3.4x above historical average of 3.5/month",
                "ATM withdrawals across 5 cities in 14 days: London, Manchester, Birmingham, Leeds, Glasgow",
                "\u00a38,400 transfer to ACC-NEW-004 (new, unrecognised payee) on Mar 8",
                "Remaining balance: \u00a34,200 \u2014 down from \u00a319,800 30 days ago"
],
            artifacts: [
                { id: "tbl-jo-003", type: "table", label: "Transaction Summary", data: {"Transactions (30d)": "12 (vs avg 3.5/month)", "ATM Withdrawals": "\u00a38,800 across 5 cities", "Transfers to New Payees": "\u00a320,700 to 4 unrecognised accounts", "Loan Drawdown Rate": "60 days (norm: 180 days)", "Balance Change": "\u00a319,800 \u2192 \u00a34,200 (-79%)"} }
            ],
            delay_ms: 3000
        },
        {
            id: "step-4",
            title_p: "Preparing recommendation for compliance review...",
            title_s: "Compliance review required — suspected Silent Exit in progress",
            reasoning: [
                "(R) Silent Exit pattern confirmed \u2014 9/12 markers active, exceeds 4-marker threshold by 125%",
                "(R) Estimated 14 days until full account drain \u2014 HIGH confidence rating",
                "(R) Peer network activity suggests coordinated fraud ring \u2014 CUST-00912, CUST-01034 also flagged",
                "Recommended action: Account freeze + SAR submission within 24 hours"
],
            artifacts: [],
            delay_ms: 2000,
            isHitl: true,
            signalName: "APPROVE_BLOCK_JO",
            hitlQuestion: "Risk score 847, 9 active markers, ~14 days to estimated exit. What action should be taken?",
            hitlOptions: [
                {
                                "label": "Freeze account & initiate SAR",
                                "value": "freeze",
                                "signal": "APPROVE_BLOCK_JO"
                },
                {
                                "label": "Escalate to Senior FinCrime Manager",
                                "value": "escalate",
                                "signal": "ESCALATE_JO"
                },
                {
                                "label": "Issue formal customer contact notice",
                                "value": "contact",
                                "signal": "CONTACT_JO"
                }
]
        },
        {
            id: "step-5",
            title_p: "Logging decision and generating SAR pre-fill document...",
            title_s: "Decision recorded — account flagged for immediate action",
            reasoning: [
                "Compliance decision logged to audit trail with timestamp",
                "SAR pre-fill generated \u2014 ready for submission to National Crime Agency",
                "Peer accounts CUST-00912 and CUST-01034 flagged for parallel review",
                "Customer contact suspended pending investigation (POCA 2002 \u2014 tipping off prevention)"
],
            artifacts: [
                { id: "tbl-jo-004", type: "table", label: "Action Summary", data: {"Decision": "Account Freeze + SAR Submission", "SAR Reference": "SAR-2026-03-0847", "NCA Submission Window": "7 days", "Peer Accounts Flagged": "CUST-00912, CUST-01034", "Investigating Officer": "FinCrime Team Alpha"} }
            ],
            delay_ms: 2000
        },
        {
            id: "step-6",
            title_p: "Closing investigation record...",
            title_s: "Investigation complete — account frozen, SAR submitted",
            reasoning: [
                "Account CUST-20847-JO frozen at 14:22 GMT 2026-03-18",
                "SAR SAR-2026-03-0847 submitted to National Crime Agency",
                "Estimated loss prevented: \u00a348,800 (remaining exposure at time of freeze)",
                "Case closed \u2014 awaiting NCA response within 7 working days"
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
