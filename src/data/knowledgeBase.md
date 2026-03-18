# Financial Crime Detection — Knowledge Base

## Overview

PACE's Financial Crime Detection capability identifies fraud, money laundering, and market abuse
across customer accounts in real time. It combines the Live Risk Score (LRS), behavioural pattern
analysis, and a 12-point Silent Exit framework to surface high-risk activity before financial loss occurs.

The system monitors five crime typologies simultaneously:
- **Silent Exit Fraud** — customers draining accounts before disappearing
- **Mortgage Fraud / AML** — property used as a money laundering vehicle
- **Insider Trading (MAR Breach)** — pre-announcement equity trades
- **Trade Finance Fraud** — duplicate invoice schemes via offshore shells
- **Account Takeover (ATO)** — credential theft and fraudulent account drain

---

## The Live Risk Score (LRS)

The LRS is a continuous 0–1000 score updated in real time as transactions, behavioural signals,
and external data are ingested. It forms the primary alert trigger.

| Score Range | Risk Level | Action |
|------------|------------|--------|
| 0–199 | Low | Monitor only |
| 200–399 | Medium | Enhanced monitoring |
| 400–599 | High | Analyst review |
| 600–799 | Very High | Compliance escalation |
| 800–1000 | Critical | Immediate action required |

Alerts fire when LRS exceeds 600 AND at least one pattern (Silent Exit, AML, MAR, etc.) confirms.

---

## Silent Exit Framework — 12 Markers

A "Silent Exit" is when a customer systematically drains their account before vanishing.
PACE monitors 12 behavioural markers. Four or more active markers triggers an alert.

| # | Marker | Description |
|---|--------|-------------|
| 1 | Velocity Spike | Transaction frequency >200% above 90-day average |
| 2 | Channel Shift | Sudden move from digital to ATM/cash-only |
| 3 | New Counterparty Surge | Multiple unrecognised payees added in short window |
| 4 | Progressive Drawdown | Systematic balance reduction over days/weeks |
| 5 | Device Anomaly | New or overseas device registered to account |
| 6 | Loan Acceleration | Loan drawdown rate far above typical profile |
| 7 | Communication Silence | Customer not responding to bank communications |
| 8 | Geographic Inconsistency | Transactions across multiple cities/countries in short period |
| 9 | Document Avoidance | Refusal to provide identity or source-of-funds documentation |
| 10 | Peer Network Activity | Connected accounts show identical behavioural patterns |
| 11 | Dormancy Flip | Long-dormant account suddenly becomes highly active |
| 12 | Support Escalation | Customer contacts support in ways consistent with ATO or exit |

---

## AML — Placement, Layering, Integration

Money laundering follows a three-stage cycle that PACE detects at each stage:

**Placement** — Introducing illicit funds into the financial system.
Signals: large cash deposits, no source of funds declared, third-party deposits.

**Layering** — Obscuring the trail through complex transactions.
Signals: offshore transfers, rapid FX conversion, multiple property transactions, shell company counterparties.

**Integration** — Re-entering funds as apparently legitimate.
Signals: mortgage overpayments from unverified sources, property purchases via complex structures.

PACE detects Sophia Reyes's pattern as classic AML: cash deposits (placement) → offshore entity OFFSHORE-LLC-44 (layering) → mortgage overpayment (integration).

---

## Market Abuse Regulation (MAR) — Insider Trading

UK MAR prohibits trading on material non-public information (MNPI).
PACE identifies insider dealing by correlating trade timing against corporate announcement calendars.

**Key threshold:** A trade executed within 7 days before a material announcement, where the customer
has proximity to non-public information, triggers a MAR proximity alert.

**Evidence threshold for STR (Suspicious Transaction Report):** Two or more correlated pre-announcement
trades across different securities. Six trades (as in Marcus Webb's case) represents confirmed systematic insider dealing.

**Regulatory obligation:** Under UK MAR Article 16, the bank must file an STR with the FCA
within 24 hours of detecting a suspicious transaction.

---

## Trade Finance Fraud — Duplicate Invoice Detection

Trade finance fraud exploits the gap between invoice submission and physical goods verification.
PACE detects:

- **Duplicate invoice submission** — same goods financed multiple times under slightly varied invoice numbers
- **Rapid FX conversion** — drawdowns immediately converted and transferred offshore
- **Shell company beneficiaries** — BVI, Cayman, or other opaque jurisdictions with no identifiable operations
- **OFAC/HMT proximity** — beneficiaries with sanctions list proximity

**The Liu Yanmei pattern:** Invoice TF-4412 was submitted three times with minor variations.
Each drawdown was immediately converted to FX and transferred to SINO-PAC-HK, SINO-PAC-SG,
and PACIFIC-SHELL-BVI — all linked to the same beneficial owner.

---

## Account Takeover (ATO) Detection

ATO occurs when a fraudster gains access to a legitimate customer's account and drains it.
PACE detects ATO via:

- **Impossible geography** — simultaneous logins from two countries
- **Device proliferation** — multiple new device IDs in short window
- **Mule account patterns** — new payee added, near-full balance transferred immediately
- **Credential reset abuse** — address or contact changes not initiated by the verified customer
- **Customer dispute confirmation** — customer reports transactions they didn't make

**Daniel Frost's case:** Account accessed from Romania while customer was in the UK.
Three unregistered devices added. Balance, overdraft, and credit card all drained systematically
to mule account MULE-ACC-8821 — which was linked to six other ATO victims in the same month.

---

## Regulatory Framework

| Regulation | Scope | Bank Obligation |
|-----------|-------|----------------|
| POCA 2002 (s.330) | Money laundering | File SAR with NCA if suspicion arises |
| UK MAR Art. 16 | Market abuse / insider trading | File STR with FCA within 24 hours |
| Payment Services Regulations 2017 | ATO / unauthorised transactions | Reimburse customer unless gross negligence |
| MLR 2017 | AML / KYC / EDD | Enhanced due diligence for high-risk customers |
| OFAC / HMT Sanctions | Sanctions compliance | No dealings with sanctioned entities; notify regulators |

---

## Case Outcomes Summary

| Customer | Crime Type | LRS | Exposure | Action |
|---------|-----------|-----|----------|--------|
| James Okafor | Silent Exit Fraud | 847 | £53,000 | Account frozen, SAR filed |
| Sophia Reyes | Mortgage Fraud / AML | 778 | £320,000 | Mortgage restricted, SAR filed |
| Marcus Webb | Insider Trading | 743 | £890,000 | FCA STR filed, position frozen |
| Liu Yanmei | Trade Finance Fraud | 830 | £500,000 | Facility suspended, SAR + OFAC filed |
| Daniel Frost | Account Takeover | 691 | £7,000 | Account secured, £9,430 fraud claim |

