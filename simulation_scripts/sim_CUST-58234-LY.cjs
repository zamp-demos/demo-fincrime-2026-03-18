const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CUST-58234-LY";
const CASE_NAME = "Liu Yanmei — Trade Finance Fraud";

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
            "Customer": "Liu Yanmei",
            "Account": "****2281",
            "Employer": "Sino-Pacific Trade Solutions Ltd",
            "Total Exposure": "\u00a3500,000",
            "Alert Type": "Trade Finance Fraud \u2014 Duplicate Invoices + BVI Shell",
            "LRS Score": "830 / 1000",
            "Facility Drawn": "\u00a3350,000 of \u00a3500,000 (70%)"
},
        sidebarArtifacts: []
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting business customer profile and trade finance history...",
            title_s: "Customer profile loaded — CUST-58234-LY, 229-day-old business account",
            reasoning: [
                "Account opened 2025-08-01. Business account \u2014 trade finance facility \u00a3500,000",
                "Products: Business Current Account, Trade Finance Facility \u00a3500K, FX Account",
                "KYC score 82 \u2014 passed, but trade finance is inherently higher risk",
                "LRS trajectory: 143 \u2192 830 over 7 months \u2014 rapid escalation, invoice anomalies detected"
],
            artifacts: [
                { id: "tbl-ly-001", type: "table", label: "Customer Profile", data: {"Name": "Liu Yanmei", "Account": "****2281", "Onboarded": "2025-08-01", "KYC Score": "82 \u2014 PASS", "Employer": "Sino-Pacific Trade Solutions Ltd", "Total Exposure": "\u00a3500,000 facility", "LRS Score": "830 / 1000"} },
                { id: "pdf-ly-001", type: "pdf", label: "Customer Risk Profile", pdfPath: "/files/CUST-58234-LY_customer_profile.pdf" }
            ],
            delay_ms: 3000
        },
        {
            id: "step-2",
            title_p: "Running invoice deduplication and trade finance anomaly detection...",
            title_s: "3 duplicate invoice variants confirmed — £255,000 in fraudulent drawdowns identified",
            reasoning: [
                "(R) Invoice #TF-4412 submitted twice: Feb 10 (\u00a385K) and Feb 15 (\u00a392K) \u2014 same goods, different amounts",
                "(R) Invoice #TF-4489: same HS code as TF-4412 \u2014 goods description duplicated",
                "(R) Invoice #TF-4501: third variant of TF-4412 \u2014 submitted Mar 8",
                "(R) Every drawdown immediately converted to FX and transferred offshore within 48 hours",
                "(R) Beneficiaries: SINO-PAC-HK, SINO-PAC-SG, PACIFIC-SHELL-BVI \u2014 all linked to same ownership chain",
                "(R) PACIFIC-SHELL-BVI: BVI company, no identifiable operations, OFAC proximity flag"
],
            artifacts: [
                { id: "tbl-ly-002", type: "table", label: "Invoice Analysis", data: {"Duplicate Invoices": "3 variants of TF-4412", "Total Fraudulent Drawdowns": "\u00a3255,000 est.", "Facility Remaining": "\u00a3150,000 at risk", "Invoice Verification Request": "14 days outstanding \u2014 no response", "FX Conversion Time": "Average 34 hours post-drawdown"} }
            ],
            delay_ms: 5000
        },
        {
            id: "step-3",
            title_p: "Tracing offshore beneficiary chain — BVI shell company analysis...",
            title_s: "Beneficial ownership confirmed — HK, SG, BVI entities share same owner",
            reasoning: [
                "SINO-PAC-HK: Hong Kong entity \u2014 nominee director structure, no identified operations",
                "SINO-PAC-SG: Singapore entity \u2014 registered same day as SINO-PAC-HK, same nominee directors",
                "PACIFIC-SHELL-BVI: British Virgin Islands \u2014 no operations, OFAC proximity (not direct match)",
                "All three entities: same beneficial owner profile via offshore nominee structure",
                "Total transferred offshore: \u00a3346,800 (drawdowns \u00a3350K less conversion fees)",
                "Pattern: Trade finance draw \u2192 immediate FX \u2192 offshore shell \u2192 ultimate beneficiary unknown"
],
            artifacts: [
                { id: "tbl-ly-003", type: "table", label: "Shell Company Network", data: {"SINO-PAC-HK": "Hong Kong \u2014 nominee structure", "SINO-PAC-SG": "Singapore \u2014 same nominees as HK entity", "PACIFIC-SHELL-BVI": "BVI \u2014 OFAC proximity flag", "Common Beneficial Owner": "Yes \u2014 identity unconfirmed", "Total Offshore Transfer": "\u00a3346,800", "OFAC Status": "Proximity flag \u2014 not direct match"} }
            ],
            delay_ms: 4000
        },
        {
            id: "step-4",
            title_p: "Preparing fraud recommendation — facility suspension and SAR filing...",
            title_s: "Fraud review required — £500K facility at risk, BVI shell confirmed",
            reasoning: [
                "(R) Three confirmed duplicate invoice variants \u2014 fraud beyond reasonable doubt",
                "(R) \u00a3150K remaining facility still available \u2014 immediate suspension recommended",
                "(R) OFAC proximity flag on PACIFIC-SHELL-BVI \u2014 potential sanctions exposure",
                "SAR + OFAC notification required \u2014 potential sanctions violation via BVI entity"
],
            artifacts: [],
            delay_ms: 2000,
            isHitl: true,
            signalName: "APPROVE_BLOCK_LY",
            hitlQuestion: "Duplicate invoices + BVI shell network confirmed. £150K facility still available. What action?",
            hitlOptions: [
                {
                                "label": "Suspend facility & file SAR immediately",
                                "value": "suspend",
                                "signal": "APPROVE_BLOCK_LY"
                },
                {
                                "label": "Freeze pending invoice verification (14d)",
                                "value": "verify",
                                "signal": "VERIFY_LY"
                },
                {
                                "label": "Escalate to Trade Finance Fraud Unit",
                                "value": "escalate",
                                "signal": "ESCALATE_LY"
                }
]
        },
        {
            id: "step-5",
            title_p: "Suspending trade finance facility and filing SAR...",
            title_s: "Facility suspended — SAR and OFAC notification filed",
            reasoning: [
                "Trade finance facility SUSPENDED immediately \u2014 \u00a3150K remaining drawdown blocked",
                "SAR submitted to NCA under POCA 2002 s.330",
                "OFAC notification filed \u2014 BVI proximity flag escalated for sanctions review",
                "Sino-Pacific Trade Solutions Ltd account restricted \u2014 no new transactions",
                "Invoice #TF-4412 fraud evidence package prepared for law enforcement"
],
            artifacts: [
                { id: "tbl-ly-004", type: "table", label: "Action Summary", data: {"SAR Reference": "SAR-2026-03-0830", "Facility Status": "SUSPENDED", "Amount Protected": "\u00a3150,000 remaining drawdown", "OFAC Notification": "Filed \u2014 BVI proximity", "Investigation Unit": "Trade Finance Fraud Team"} }
            ],
            delay_ms: 2000
        },
        {
            id: "step-6",
            title_p: "Closing investigation record...",
            title_s: "Investigation complete — facility suspended, SAR and OFAC notification filed",
            reasoning: [
                "Trade finance facility suspended \u2014 \u00a3150K protected from further fraudulent drawdown",
                "SAR SAR-2026-03-0830 submitted to NCA",
                "OFAC notified of BVI proximity \u2014 sanctions review in progress",
                "Total fraudulent drawdowns identified: ~\u00a3255,000",
                "Law enforcement referral package prepared"
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
