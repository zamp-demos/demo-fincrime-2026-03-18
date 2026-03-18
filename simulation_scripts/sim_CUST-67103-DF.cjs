const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CUST-67103-DF";
const CASE_NAME = "Daniel Frost — Account Takeover";

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
            "Customer": "Daniel Frost",
            "Account": "****5534",
            "Employer": "NHS Digital (IT Contractor)",
            "Total Exposure": "\u00a37,000",
            "Alert Type": "Account Takeover \u2014 ATO Already in Execution",
            "LRS Score": "691 / 1000",
            "Days to Exit": "0 \u2014 ATO in progress"
},
        sidebarArtifacts: []
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting customer profile and account access log...",
            title_s: "Customer profile loaded — CUST-67103-DF, ATO detected in active execution",
            reasoning: [
                "Account opened 2023-11-20. NHS Digital IT contractor \u2014 low exposure, \u00a37,000 total",
                "Products: Current Account, \u00a32K Overdraft, \u00a35K Credit Card",
                "KYC score 95 \u2014 clean profile, low-risk individual historically",
                "ATO trajectory: legitimate account compromised since Feb 2026 \u2014 customer confirmed no knowledge"
],
            artifacts: [
                { id: "tbl-df-001", type: "table", label: "Customer Profile", data: {"Name": "Daniel Frost", "Account": "****5534", "Onboarded": "2023-11-20", "KYC Score": "95 \u2014 PASS", "Employer": "NHS Digital \u2014 IT Contractor", "Total Exposure": "\u00a37,000", "LRS Score": "691 / 1000"} },
                { id: "pdf-df-001", type: "pdf", label: "Customer Risk Profile", pdfPath: "/files/CUST-67103-DF_customer_profile.pdf" }
            ],
            delay_ms: 2000
        },
        {
            id: "step-2",
            title_p: "Reconstructing ATO attack chain from access and transaction logs...",
            title_s: "Full ATO attack chain reconstructed — 3 new device IDs, 1 mule account",
            reasoning: [
                "(R) Feb 16: Login from Bucharest, Romania \u2014 customer unaware",
                "(R) Feb 17: Address change submitted via mobile \u2014 customer confirmed they did NOT initiate this",
                "(R) Feb 18: New payee MULE-ACC-8821 added from new device ID (3rd unregistered device)",
                "(R) Feb 19: Near-full balance transferred to MULE-ACC-8821 (\u00a31,800)",
                "(R) Feb 20: Full \u00a32,000 overdraft drawn and immediately transferred to MULE-ACC-8821 (\u00a31,850)",
                "(R) Feb 22: \u00a34,800 credit card purchase \u2014 delivery address changed mid-transaction",
                "(R) Mar 1: Simultaneous logins \u2014 UK and Romania within 3-minute window (physically impossible)",
                "(R) Mar 10: \u00a3980 cash advance from ATM in Eastern Europe",
                "(G) Customer called to dispute \u2014 confirmed ATO in progress, all transactions fraudulent"
],
            artifacts: [
                { id: "tbl-df-002", type: "table", label: "ATO Attack Chain", data: {"Attack Vector": "Credential compromise + device registration", "New Device IDs": "3 unregistered devices in 30 days", "Mule Account": "MULE-ACC-8821 (received \u00a33,650)", "Credit Card Abuse": "\u00a34,800 purchase, delivery address altered", "Cash Advance Abroad": "\u00a3980 \u2014 Eastern Europe ATM", "Customer Confirmation": "All transactions disputed"} }
            ],
            delay_ms: 4000
        },
        {
            id: "step-3",
            title_p: "Tracing mule account network — MULE-ACC-8821 cross-reference...",
            title_s: "Mule account linked to 6 other ATO victims this month — organised crime ring",
            reasoning: [
                "MULE-ACC-8821 is a known mule account \u2014 already flagged by FinCrime monitoring",
                "6 other ATO victims this month transferred funds to same mule account",
                "Pattern: Credential theft (likely phishing) \u2192 device registration \u2192 full account drain",
                "Attack origin: Eastern European IP cluster \u2014 matches prior ATO ring pattern",
                "Total funds received by MULE-ACC-8821 from all 7 victims: estimated \u00a323,400 this month"
],
            artifacts: [
                { id: "tbl-df-003", type: "table", label: "Mule Network Analysis", data: {"Mule Account": "MULE-ACC-8821", "Linked ATO Victims": "7 (including Daniel Frost)", "Total Received This Month": "~\u00a323,400", "Attack Origin": "Eastern European IP cluster", "Method": "Phishing \u2192 credential theft \u2192 device registration", "Law Enforcement Status": "Referral pending"} }
            ],
            delay_ms: 3000
        },
        {
            id: "step-4",
            title_p: "Preparing emergency account restoration and fraud claim...",
            title_s: "Immediate action required — account locked, customer funds to be restored",
            reasoning: [
                "(R) ATO confirmed \u2014 customer explicitly reported all transactions as fraudulent",
                "(R) Account credentials compromised \u2014 immediate password reset and device deregistration required",
                "(G) Customer is victim, not perpetrator \u2014 priority is account restoration and fraud claim",
                "Fraud claim covers: \u00a31,800 + \u00a31,850 (mule transfers) + \u00a34,800 (card abuse) + \u00a3980 (ATM) = \u00a39,430"
],
            artifacts: [],
            delay_ms: 2000,
            isHitl: true,
            signalName: "APPROVE_RESTORE_DF",
            hitlQuestion: "ATO confirmed. Customer disputed all transactions. Account drain + credit card abuse detected. How to proceed?",
            hitlOptions: [
                {
                                "label": "Lock account, restore funds & file fraud claim",
                                "value": "restore",
                                "signal": "APPROVE_RESTORE_DF"
                },
                {
                                "label": "Lock account only \u2014 pending fraud investigation",
                                "value": "lock",
                                "signal": "LOCK_DF"
                },
                {
                                "label": "Escalate to Serious Fraud Unit",
                                "value": "escalate",
                                "signal": "ESCALATE_DF"
                }
]
        },
        {
            id: "step-5",
            title_p: "Locking account, resetting credentials and initiating fraud claim...",
            title_s: "Account secured — all compromised credentials reset, fraud claim initiated",
            reasoning: [
                "Account locked and all active sessions terminated immediately",
                "All 3 unregistered device IDs removed from account",
                "Password and MFA credentials reset \u2014 new credentials issued via verified channel",
                "Fraud claim initiated: \u00a39,430 total claim across account and credit card",
                "MULE-ACC-8821 flagged for law enforcement \u2014 all 7 linked victims identified"
],
            artifacts: [
                { id: "tbl-df-004", type: "table", label: "Action Summary", data: {"Account Status": "Locked \u2014 credentials reset", "Fraud Claim": "\u00a39,430 initiated", "Devices Removed": "3 unregistered device IDs", "Mule Referral": "MULE-ACC-8821 \u2014 law enforcement notified", "Customer Contact": "Verified channel \u2014 new credentials issued"} }
            ],
            delay_ms: 2000
        },
        {
            id: "step-6",
            title_p: "Closing ATO incident and completing fraud claim registration...",
            title_s: "Account restored — ATO contained, £9,430 fraud claim registered",
            reasoning: [
                "Account CUST-67103-DF secured \u2014 Daniel Frost notified via verified telephone",
                "Fraud claim \u00a39,430 registered \u2014 standard 5-business-day processing timeline",
                "MULE-ACC-8821 referred to Serious Fraud Office alongside 6 other linked victims",
                "ATO ring pattern forwarded to NCA Cybercrime Unit",
                "Customer outcome: Full restitution expected \u2014 bank liability confirmed under Payment Services Regulations 2017"
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
