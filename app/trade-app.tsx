"use client";

import { useMemo, useState } from "react";

type Tab = "home" | "jobs" | "customers" | "documents" | "more";
type Sheet = null | "create" | "quote" | "analyze" | "credits" | "customer" | "job";

const customers = [
  { initials: "JL", name: "Jason Lim", phone: "012-884 2391", address: "Taman Molek, Johor Bahru", jobs: 3, color: "blue" },
  { initials: "NA", name: "Nur Aina", phone: "017-602 1184", address: "Bandar Baru Uda, Johor Bahru", jobs: 1, color: "gold" },
  { initials: "MR", name: "Mr Ravi", phone: "019-331 4780", address: "Permas Jaya, Masai", jobs: 2, color: "green" },
];

const jobs = [
  { id: "JOB-2026-0048", title: "2 units not cold", customer: "Jason Lim", time: "Today, 2:30 PM", status: "Confirmed", tone: "blue", value: "RM350" },
  { id: "JOB-2026-0047", title: "Kitchen socket replacement", customer: "Nur Aina", time: "Tomorrow, 10:00 AM", status: "New", tone: "amber", value: "—" },
  { id: "JOB-2026-0046", title: "Aircon chemical wash", customer: "Mr Ravi", time: "5 Aug 2026", status: "Completed", tone: "green", value: "RM180" },
];

const documents = [
  { type: "Quotation", no: "Q-2026-0041", who: "Jason Lim", date: "Today, 9:42 AM", amount: "RM350.00", status: "Draft", icon: "Q" },
  { type: "Invoice", no: "INV-2026-0028", who: "Mr Ravi", date: "5 Aug 2026", amount: "RM180.00", status: "Paid", icon: "I" },
  { type: "Work Report", no: "WR-2026-0019", who: "Mr Ravi", date: "5 Aug 2026", amount: "", status: "Confirmed", icon: "✓" },
];

export default function TradeApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [credits, setCredits] = useState(27);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [quoteStep, setQuoteStep] = useState<"input" | "generating" | "review" | "confirmed">("input");
  const [input, setInput] = useState("Customer at Taman Molek. Two aircons not cold. Inspection RM50, chemical wash RM150 each if approved. 30 days workmanship warranty.");
  const [paymentReminder, setPaymentReminder] = useState<{ due: string; terms: string } | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const title = ({ home: "Home", jobs: "Jobs", customers: "Customers", documents: "Documents", more: "More" } as const)[tab];
  const filteredCustomers = useMemo(() => customers.filter(c => `${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(query.toLowerCase())), [query]);

  function generateQuote() {
    if (credits < 1) return setSheet("credits");
    setQuoteStep("generating");
    window.setTimeout(() => {
      setCredits(c => c - 1);
      setQuoteStep("review");
    }, 900);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          <NavButton active={tab === "home"} icon="⌂" label="Home" onClick={() => setTab("home")} />
          <NavButton active={tab === "jobs"} icon="▣" label="Jobs" badge="3" onClick={() => setTab("jobs")} />
          <NavButton active={tab === "customers"} icon="♙" label="Customers" onClick={() => setTab("customers")} />
          <NavButton active={tab === "documents"} icon="▤" label="Documents" onClick={() => setTab("documents")} />
          <NavButton active={tab === "more"} icon="•••" label="More" onClick={() => setTab("more")} />
        </nav>
        <div className="sidebar-help">
          <span className="help-icon">?</span>
          <strong>Need help?</strong>
          <small>We speak simple English & BM.</small>
          <button onClick={() => notify("Help request opened")}>Get help</button>
        </div>
        <div className="profile-row">
          <span className="avatar">AT</span><span><strong>Ahmad Teknik</strong><small>Standard plan</small></span><button aria-label="Account menu">⌄</button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div><h1>{title}</h1><p>{tab === "home" ? "Friday, 7 August" : subtitle(tab)}</p></div>
          <div className="top-actions">
            <button className="credit-pill" onClick={() => setSheet("credits")}><span>✦</span><strong>{credits}</strong> AI Credits</button>
            <button className="bell" aria-label="Notifications">♢<i /></button>
            <button className="primary small" onClick={() => setSheet("create")}><b>＋</b> Create</button>
          </div>
        </header>

        <div className="content">
          {tab === "home" && <HomeView setSheet={setSheet} credits={credits} notify={notify} paymentReminder={paymentReminder} />}
          {tab === "jobs" && <JobsView setSheet={setSheet} />}
          {tab === "customers" && <CustomersView query={query} setQuery={setQuery} items={filteredCustomers} setSheet={setSheet} />}
          {tab === "documents" && <DocumentsView notify={notify} setSheet={setSheet} />}
          {tab === "more" && <MoreView credits={credits} setSheet={setSheet} />}
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavButton active={tab === "home"} icon="⌂" label="Home" onClick={() => setTab("home")} />
        <NavButton active={tab === "jobs"} icon="▣" label="Jobs" onClick={() => setTab("jobs")} />
        <button className="mobile-create" onClick={() => setSheet("create")}>＋</button>
        <NavButton active={tab === "customers"} icon="♙" label="Customers" onClick={() => setTab("customers")} />
        <NavButton active={tab === "documents"} icon="▤" label="Docs" onClick={() => setTab("documents")} />
      </nav>

      {sheet && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setSheet(null)}>
        <section className={`sheet ${sheet === "quote" ? "wide" : ""}`} role="dialog" aria-modal="true">
          <button className="close" onClick={() => { setSheet(null); setQuoteStep("input"); }}>×</button>
          {sheet === "create" && <CreateSheet choose={v => setSheet(v)} />}
          {sheet === "quote" && <QuoteSheet step={quoteStep} input={input} setInput={setInput} generate={generateQuote} confirm={() => { setQuoteStep("confirmed"); notify("Quotation confirmed and saved"); }} notify={notify} />}
          {sheet === "analyze" && <AnalyzeSheet onQuote={() => setSheet("quote")} />}
          {sheet === "credits" && <CreditsSheet buy={(n) => { setCredits(c => c + n); notify(`Sandbox purchase: ${n} credits added`); setSheet(null); }} />}
          {sheet === "customer" && <CustomerDetail />}
          {sheet === "job" && <JobDetail setSheet={setSheet} onFinish={(reminder) => { setPaymentReminder(reminder); notify(`Job completed — collect payment reminder set for ${reminder.due}`); }} />}
        </section>
      </div>}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function Brand() { return <div className="brand"><span className="brand-mark">K</span><span><b>Kerja</b>Pro<small>WORK MADE SIMPLE</small></span></div>; }
function NavButton({ active, icon, label, badge, onClick }: { active: boolean; icon: string; label: string; badge?: string; onClick: () => void }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span><b>{label}</b>{badge && <i>{badge}</i>}</button>; }
function subtitle(tab: Tab) { return ({ jobs: "Your work, all in one place", customers: "People you work for", documents: "Quotes, reports and invoices", more: "Business and account settings", home: "" } as const)[tab]; }

function HomeView({ setSheet, credits, notify, paymentReminder }: { setSheet: (s: Sheet) => void; credits: number; notify: (s: string) => void; paymentReminder: { due: string; terms: string } | null }) {
  return <>
    <section className="welcome"><div><p>Good morning, Ahmad <span>👋</span></p><h2>What do you want to do?</h2></div><div className="plan-mini"><span>STANDARD</span><strong>{credits} <small>credits left</small></strong></div></section>
    <section className="quick-grid">
      <button className="quick-card voice" onClick={() => setSheet("quote")}><span className="quick-icon">●</span><span><strong>Speak a job</strong><small>Talk and let AI organise it</small></span><i>→</i></button>
      <button className="quick-card" onClick={() => setSheet("quote")}><span className="quick-icon blue">▤</span><span><strong>Make quotation</strong><small>Professional quote in minutes</small></span><i>→</i></button>
      <button className="quick-card" onClick={() => notify("Choose a completed job first")}><span className="quick-icon green">✓</span><span><strong>Finish a job</strong><small>Create a work report</small></span><i>→</i></button>
      <button className="quick-card" onClick={() => setSheet("analyze")}><span className="quick-icon amber">▰</span><span><strong>Read customer message</strong><small>Paste WhatsApp chat</small></span><i>→</i></button>
    </section>
    <div className="dashboard-grid">
      <section className="panel followups"><PanelTitle title="Follow-ups" action="See all" />
        <div className="follow-row overdue"><span className="date-box"><b>07</b><small>AUG</small></span><div><span className="status-dot">OVERDUE</span><strong>Follow up quotation</strong><small>Jason Lim · Q-2026-0041</small></div><button>›</button></div>
        {paymentReminder ? <div className="follow-row"><span className="date-box"><b>{paymentReminder.due.split(" ")[0]}</b><small>{paymentReminder.due.split(" ")[1]?.toUpperCase()}</small></span><div><span className="status-dot today">PAYMENT</span><strong>Collect payment from Jason Lim</strong><small>{paymentReminder.terms} · JOB-2026-0048</small></div><button>›</button></div> : <div className="follow-row"><span className="date-box"><b>07</b><small>AUG</small></span><div><span className="status-dot today">TODAY</span><strong>Collect payment</strong><small>Mr Ravi · INV-2026-0028</small></div><button>›</button></div>}
      </section>
      <section className="panel usage"><PanelTitle title="AI Credit usage" action="View details" /><div className="usage-head"><span><b>18</b> used this month</span><strong>40 included</strong></div><div className="progress"><i style={{ width: "45%" }} /></div><p><span>✦</span> Your credits refresh on <b>1 September</b></p><button className="secondary" onClick={() => setSheet("credits")}>Buy more credits</button></section>
    </div>
    <section className="panel recent"><PanelTitle title="Recent work" action="View all" />{jobs.map(j => <div className="work-row" key={j.id}><span className={`work-icon ${j.tone}`}>⌁</span><div><strong>{j.title}</strong><small>{j.customer} · {j.id}</small></div><span><b>{j.value}</b><small>{j.time}</small></span><em className={j.tone}>{j.status}</em><button>›</button></div>)}</section>
    <div className="trust-note"><span>▣</span><div><strong>Your customer data stays private</strong><p>AI only creates drafts. You always review and confirm before making a document.</p></div><a href="#">How we protect your data →</a></div>
  </>;
}

function PanelTitle({ title, action }: { title: string; action: string }) { return <div className="panel-title"><h3>{title}</h3><button>{action} →</button></div>; }

function JobsView({ setSheet }: { setSheet: (s: Sheet) => void }) { return <section className="page-stack"><div className="filter-row"><div className="search">⌕ <input placeholder="Search job, customer or address" /></div><button className="primary" onClick={() => setSheet("quote")}>＋ New job</button></div><div className="chips"><button className="active">All <b>8</b></button><button>New <b>2</b></button><button>Confirmed <b>3</b></button><button>In progress <b>1</b></button><button>Completed</button></div><section className="panel list-panel">{jobs.concat([{ id: "JOB-2026-0045", title: "Ceiling fan inspection", customer: "Siti Mariam", time: "3 Aug 2026", status: "New", tone: "amber", value: "—" }]).map(j => <button className="job-card" key={j.id} onClick={() => setSheet("job")}><span className={`work-icon ${j.tone}`}>⌁</span><span><small>{j.id}</small><strong>{j.title}</strong><em>{j.customer} · {j.time}</em></span><span><b>{j.value}</b><i className={j.tone}>{j.status}</i></span><b>›</b></button>)}</section></section>; }

function CustomersView({ query, setQuery, items, setSheet }: { query: string; setQuery: (s: string) => void; items: typeof customers; setSheet: (s: Sheet) => void }) { return <section className="page-stack"><div className="filter-row"><div className="search">⌕ <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, phone or address" /></div><button className="primary" onClick={() => setSheet("customer")}>＋ New customer</button></div><div className="customer-grid">{items.map(c => <button className="customer-card" key={c.phone} onClick={() => setSheet("customer")}><span className={`customer-avatar ${c.color}`}>{c.initials}</span><span><strong>{c.name}</strong><small>{c.phone}</small><small>⌖ {c.address}</small></span><em>{c.jobs} {c.jobs === 1 ? "job" : "jobs"}</em><b>›</b></button>)}</div></section>; }

function DocumentsView({ notify, setSheet }: { notify: (s: string) => void; setSheet: (s: Sheet) => void }) { return <section className="page-stack"><div className="filter-row"><div className="search">⌕ <input placeholder="Search document or customer" /></div><button className="primary" onClick={() => setSheet("create")}>＋ New document</button></div><div className="summary-cards"><div><span className="blue">Q</span><small>QUOTATIONS</small><strong>12</strong><em>RM4,280 total</em></div><div><span className="green">I</span><small>INVOICES</small><strong>8</strong><em>RM2,940 paid</em></div><div><span className="amber">✓</span><small>WORK REPORTS</small><strong>6</strong><em>This month</em></div></div><section className="panel list-panel">{documents.map(d => <div className="document-row" key={d.no}><span className="doc-icon">{d.icon}</span><div><strong>{d.type}</strong><small>{d.no} · {d.who}</small></div><span><b>{d.amount}</b><small>{d.date}</small></span><em>{d.status}</em><button onClick={() => { downloadDocumentPdf(d.no, d.type, d.who, d.amount); notify(`${d.no} PDF downloaded`); }}>↓ PDF</button></div>)}</section></section>; }

function MoreView({ credits, setSheet }: { credits: number; setSheet: (s: Sheet) => void }) { return <section className="settings-grid"><section className="panel account-card"><span className="avatar large">AT</span><div><h2>Ahmad Teknik Services</h2><p>Ahmad bin Ismail · Johor Bahru</p><span className="plan-tag">STANDARD PLAN</span></div><button className="secondary">Edit profile</button></section><section className="panel settings-list"><h3>Business</h3>{["Business profile & logo", "Document defaults", "Payment details", "Language: English"].map(x => <button key={x}><span>▧</span>{x}<b>›</b></button>)}<h3>Account</h3><button onClick={() => setSheet("credits")}><span>✦</span>Plan & AI Credits <em>{credits} left</em><b>›</b></button><button><span>♢</span>Reminders<b>›</b></button><button><span>?</span>Help & support<b>›</b></button></section><p className="legal-note">Privacy Policy · Terms of Service<br/><small>Drafts for legal review · KerjaPro v0.1</small></p></section>; }

function CreateSheet({ choose }: { choose: (s: Sheet) => void }) { return <><div className="sheet-head"><span className="eyebrow">CREATE NEW</span><h2>What do you want to make?</h2><p>You can type it yourself for free, or let AI help.</p></div><div className="create-options"><button onClick={() => choose("quote")}><span className="quick-icon blue">▤</span><div><strong>Quotation</strong><small>Price and scope for a customer</small></div><b>›</b></button><button><span className="quick-icon green">✓</span><div><strong>Completion Report</strong><small>Record work completed</small></div><b>›</b></button><button><span className="quick-icon amber">I</span><div><strong>Invoice</strong><small>Request payment for work</small></div><b>›</b></button><button onClick={() => choose("analyze")}><span className="quick-icon purple">▰</span><div><strong>Analyze Customer Message</strong><small>Understand WhatsApp text or voice</small></div><b>›</b></button></div><p className="sheet-foot">Manual documents are always free. AI assistance uses 1 AI Credit.</p></>; }

function QuoteSheet({ step, input, setInput, generate, confirm, notify }: { step: string; input: string; setInput: (s: string) => void; generate: () => void; confirm: () => void; notify: (s: string) => void }) {
  if (step === "generating") return <div className="generating"><div className="spinner">✦</div><h2>Making your quotation draft…</h2><p>Organising the job details. Your credit is only charged when this succeeds.</p></div>;
  if (step === "confirmed") return <div className="success-screen"><span>✓</span><h2>Quotation ready</h2><p>Q-2026-0042 is saved to Jason Lim’s history.</p><button className="primary" onClick={() => { downloadQuotationPdf(); notify("Quotation PDF downloaded"); }}>↓ Download PDF</button><button className="secondary" onClick={() => notify("Share options opened")}>Share manually</button><small>KerjaPro will never send a document without you.</small></div>;
  if (step === "review") return <><div className="sheet-head"><span className="eyebrow ai">✦ AI DRAFT</span><h2>Check every detail</h2><p>AI can make mistakes. Edit anything before you confirm.</p></div><div className="review-alert"><b>Needs confirmation</b><span>Confirm prices, work scope and warranty against what you agreed with the customer.</span></div><div className="form-grid"><label>Customer<input defaultValue="Jason Lim" /></label><label>Site<input defaultValue="Taman Molek, Johor Bahru" /></label><label className="full">Job title<input defaultValue="Air-conditioning inspection and chemical wash" /></label><label className="full">Customer request<textarea defaultValue="Customer reported two air-conditioning units are not cooling properly." /></label></div><div className="items-table"><div><b>Description</b><b>Qty</b><b>Rate</b><b>Amount</b></div><div><input defaultValue="Inspection / call-out fee"/><input defaultValue="1"/><input defaultValue="50.00"/><strong>RM50.00</strong></div><div><input defaultValue="Chemical wash (if approved)"/><input defaultValue="2"/><input defaultValue="150.00"/><strong>RM300.00</strong></div><div className="total"><span>Total</span><strong>RM350.00</strong></div></div><label className="check"><input type="checkbox" defaultChecked /> I checked the customer, prices, scope and warranty.</label><div className="sheet-actions"><button className="secondary" onClick={() => notify("Draft saved")}>Save draft</button><button className="primary" onClick={confirm}>Confirm & create PDF</button></div></>;
  return <><div className="sheet-head"><span className="eyebrow">NEW QUOTATION</span><h2>Tell us about the job</h2><p>Speak, paste a message, or type rough notes. You’ll review the draft.</p></div><div className="input-tabs"><button className="active">✎ Type / Paste</button><button>● Voice</button><button>▧ Manual (Free)</button></div><label className="big-input">Job details<textarea value={input} onChange={e => setInput(e.target.value)} /><span>Tip: include prices only if you know them. AI will not invent prices.</span></label><div className="source-row"><button>＋ Add screenshot</button><small>PNG or JPG · private upload</small></div><div className="credit-charge"><span>✦</span><div><b>AI will create an editable draft</b><small>This complete quotation uses 1 AI Credit</small></div><strong>1 CREDIT</strong></div><button className="primary full-button" disabled={!input.trim()} onClick={generate}>✦ Generate quotation draft</button><p className="human-note">Nothing is sent to your customer automatically.</p></>;
}

function AnalyzeSheet({ onQuote }: { onQuote: () => void }) { const [done, setDone] = useState(false); return <>{!done ? <><div className="sheet-head"><span className="eyebrow ai">✦ AI ASSISTANT</span><h2>Read a customer message</h2><p>Paste WhatsApp text below. We never connect to your WhatsApp.</p></div><textarea className="analyze-box" defaultValue="Hi boss, my aircon upstairs leaking water since yesterday. Can come tomorrow after 3pm? Address 22 Jalan Molek 2/3. How much ah?"/><div className="credit-charge"><span>✦</span><div><b>Analyze and organise</b><small>1 AI Credit · charged only on success</small></div></div><button className="primary full-button" onClick={() => setDone(true)}>Analyze message</button></> : <><div className="sheet-head"><span className="eyebrow ai">✦ AI DRAFT — PLEASE VERIFY</span><h2>Here’s what we found</h2></div><dl className="analysis-results"><div><dt>Problem</dt><dd>Upstairs aircon leaking water</dd></div><div><dt>Preferred time</dt><dd>Tomorrow, after 3:00 PM</dd></div><div><dt>Address</dt><dd>22 Jalan Molek 2/3 <em>Needs confirmation</em></dd></div><div><dt>Pending question</dt><dd>Customer asked for price</dd></div><div><dt>Diagnosis</dt><dd>Not provided — technician inspection required</dd></div></dl><div className="sheet-actions triple"><button className="secondary">Save summary</button><button className="secondary">Create job</button><button className="primary" onClick={onQuote}>Create quotation</button></div><p className="human-note">Creating a quotation from this analysis remains one AI intent: total 1 credit.</p></>}</>; }

function CreditsSheet({ buy }: { buy: (n: number) => void }) { return <><div className="sheet-head"><span className="eyebrow">AI CREDITS</span><h2>Save time when you need it</h2><p>Purchased credits never expire. Manual tools stay free.</p></div><div className="bundle-grid"><button onClick={() => buy(10)}><span>SMALL</span><strong>10</strong><small>AI Credits</small><b>RM12</b></button><button className="popular" onClick={() => buy(30)}><em>POPULAR</em><span>MEDIUM</span><strong>30</strong><small>AI Credits</small><b>RM30</b></button><button onClick={() => buy(80)}><span>VALUE</span><strong>80</strong><small>AI Credits</small><b>RM68</b></button></div><div className="sandbox-note"><b>Development sandbox</b><p>No real payment is taken. Live credits must only be granted by a verified server webhook.</p></div><h3 className="plan-heading">Or choose a monthly plan</h3><div className="plan-row"><div><span>STANDARD · MOST POPULAR</span><b>RM29<small>/month</small></b><em>40 AI Credits each billing cycle</em></div><div><span>PRO</span><b>RM59<small>/month</small></b><em>120 AI Credits each billing cycle</em></div></div></>; }

function CustomerDetail() { return <><div className="sheet-head"><span className="eyebrow">CUSTOMER</span><h2>Jason Lim</h2><p>012-884 2391 · Taman Molek, Johor Bahru</p></div><div className="customer-actions"><button>▣ New job</button><button>▤ Quotation</button><button>♢ Reminder</button></div><h3 className="section-label">History</h3><div className="timeline"><div><i /><span><b>Quotation Q-2026-0041</b><small>Draft · RM350.00 · Today</small></span></div><div><i /><span><b>Job JOB-2026-0048</b><small>Confirmed · 6 Aug 2026</small></span></div><div><i /><span><b>Invoice INV-2026-0012</b><small>Paid · RM220.00 · 18 Jun 2026</small></span></div></div></>; }
function JobDetail({ setSheet, onFinish }: { setSheet: (s: Sheet) => void; onFinish: (r: { due: string; terms: string }) => void }) {
  const [starting, setStarting] = useState(false);
  const [term, setTerm] = useState("immediate");
  const [customDays, setCustomDays] = useState(7);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const days = term === "immediate" ? 0 : term === "3days" ? 3 : term === "30days" ? 30 : customDays;
  const dueDate = new Date(); dueDate.setHours(12, 0, 0, 0); dueDate.setDate(dueDate.getDate() + days);
  const due = dueDate.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
  const terms = days === 0 ? "Payment due immediately after job completion" : `Payment due within ${days} day${days === 1 ? "" : "s"} after job completion`;
  return <><div className="sheet-head"><span className="eyebrow">JOB-2026-0048</span><h2>2 units not cold</h2><p>Jason Lim · Today, 2:30 PM</p></div><span className={`status-large ${started ? "started" : ""}`}>{finished ? "COMPLETED" : started ? "IN PROGRESS" : "CONFIRMED"}</span><dl className="job-details"><div><dt>Service address</dt><dd>Taman Molek, Johor Bahru</dd></div><div><dt>Customer request</dt><dd>Inspect two air-conditioning units that are not cooling.</dd></div><div><dt>Payment terms</dt><dd>{started ? `${terms}${finished ? ` · remind ${due}` : ""}` : "Set when starting work"}</dd></div></dl><div className="customer-actions"><button onClick={() => setSheet("quote")}>▤ Quotation</button><button>✓ Work report</button><button>I Invoice</button></div>{!started && !starting && <button className="primary full-button" onClick={() => setStarting(true)}>Start job</button>}{started && !finished && <button className="primary full-button finish-button" onClick={() => { setFinished(true); onFinish({ due, terms }); }}>✓ Finish job & set payment reminder</button>}{finished && <div className="reminder-confirmed"><b>♢ Payment collection reminder created</b><span>{due} · {terms}</span></div>}{starting && <section className="payment-setup"><span className="eyebrow">PAYMENT COLLECTION</span><h3>When should payment be collected?</h3><p>Set this before work starts. We will add a reminder automatically when the job is finished.</p><div className="term-options"><button className={term === "immediate" ? "active" : ""} onClick={() => setTerm("immediate")}><b>Immediately</b><small>Normal house job</small></button><button className={term === "3days" ? "active" : ""} onClick={() => setTerm("3days")}><b>Within 3 days</b><small>Short credit</small></button><button className={term === "30days" ? "active" : ""} onClick={() => setTerm("30days")}><b>Within 30 days</b><small>Monthly account</small></button><button className={term === "custom" ? "active" : ""} onClick={() => setTerm("custom")}><b>Custom</b><small>Choose days</small></button></div>{term === "custom" && <label className="custom-days">Collect within <input type="number" min="1" max="365" value={customDays} onChange={e => setCustomDays(Math.max(1, Number(e.target.value) || 1))} /> days</label>}<div className="reminder-preview"><span>♢</span><div><b>Payment reminder after job completion</b><small>{terms}<br/>If completed today: {due}</small></div></div><div className="sheet-actions"><button className="secondary" onClick={() => setStarting(false)}>Cancel</button><button className="primary" onClick={() => { setStarted(true); setStarting(false); }}>Save terms & start job</button></div></section>}<p className="human-note">Only you can start or complete a job. Reminders do not send messages automatically.</p></>;
}

function downloadQuotationPdf() {
  downloadPdf("Quotation-Q-2026-0042.pdf", [
    "QUOTATION", "Ahmad Teknik Services", "Johor Bahru, Malaysia", "Phone: 012-345 6789", "", "Quotation No: Q-2026-0042", `Issue Date: ${new Date().toLocaleDateString("en-MY")}`, "Valid for: 14 days", "", "CUSTOMER", "Jason Lim", "Taman Molek, Johor Bahru", "", "DESCRIPTION                                      QTY       RATE       AMOUNT", "Inspection / call-out fee                        1       RM50.00      RM50.00", "Chemical wash (if approved)                      2      RM150.00     RM300.00", "--------------------------------------------------------------------------", "TOTAL                                                              RM350.00", "", "Payment terms: Payment due on completion", "Warranty: 30 days workmanship warranty", "", "Please review and approve this quotation before work begins."
  ]);
}

function downloadDocumentPdf(no: string, type: string, customer: string, amount: string) {
  if (type === "Quotation") return downloadQuotationPdf();
  downloadPdf(`${type.replaceAll(" ", "-")}-${no}.pdf`, [type.toUpperCase(), "Ahmad Teknik Services", "Johor Bahru, Malaysia", "", `Document No: ${no}`, `Customer: ${customer}`, `Date: ${new Date().toLocaleDateString("en-MY")}`, "", amount ? `TOTAL: ${amount}` : "Work completed and confirmed.", "", "This document was created and confirmed by the tradesman."]);
}

function downloadPdf(fileName: string, lines: string[]) {
  const escapePdf = (s: string) => s.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replace(/[^\x20-\x7E]/g, "-");
  const commands = lines.map((line, i) => `BT /F1 ${i === 0 ? 22 : 10} Tf 52 ${790 - i * 24} Td (${escapePdf(line)}) Tj ET`).join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("") + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const link = document.createElement("a"); link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
