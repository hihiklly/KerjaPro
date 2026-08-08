"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatMoney } from "./product-config";

type Tab = "home" | "jobs" | "customers" | "more";
type Customer = { id: string; name: string; phone: string; serviceAddress: string; email?: string | null };
type CatalogItem = { id: string; itemType: "service" | "product"; category: string; name: string; description: string | null; unit: string; standardPriceMinor: number; estimatedDurationMinutes: number | null; taxRateBasisPoints: number; costMinor: number | null; commissionBasisPoints: number | null };
type JobItem = { id?: string; catalogItemId: string | null; itemType: "service" | "product" | "custom"; description: string; quantityMilli: number; unit: string; unitPriceMinor: number; taxRateBasisPoints: number; costMinor?: number | null; commissionBasisPoints?: number | null; amountMinor?: number; taxMinor?: number; addedDuringJob?: boolean };
type JobStatus = "draft" | "quote_sent" | "quote_accepted" | "scheduled" | "in_progress" | "completed" | "payment_due" | "paid" | "cancelled";
type JobAttachment = { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string };
type JobRow = { job: { id: string; jobNumber: string; request: string; serviceAddress: string; appointmentAt: string | null; technician: string | null; assignedMemberId: string | null; status: JobStatus; subtotalMinor: number; discountMinor: number; taxMinor: number; totalMinor: number; balanceMinor: number; updatedAt: string }; customer: Customer; items: JobItem[]; documents: { id: string; kind: string; documentNumber: string; status: string }[]; attachments: JobAttachment[]; paidMinor: number };
type Workspace = { business: { name: string; ownerName: string; currency: string }; membership: { role: string } };
type TeamMember = { id: string; name: string; email: string; role: string };
type Overlay = null | { kind: "new-job"; customerId?: string } | { kind: "job"; id: string };
type AuthenticatedUser = { displayName: string; email: string };

const statusCopy: Record<JobStatus, { label: string; action?: string; actionLabel?: string }> = {
  draft: { label: "Draft", action: "send_quote", actionLabel: "Send Quote" },
  quote_sent: { label: "Quote sent", action: "accept_quote", actionLabel: "Mark Quote Accepted" },
  quote_accepted: { label: "Quote accepted", action: "schedule", actionLabel: "Schedule Job" },
  scheduled: { label: "Scheduled", action: "start", actionLabel: "Start Job" },
  in_progress: { label: "In progress", action: "complete", actionLabel: "Complete Job" },
  completed: { label: "Completed", action: "payment", actionLabel: "Collect Payment" },
  payment_due: { label: "Payment due", action: "payment", actionLabel: "Record Payment" },
  paid: { label: "Paid · Closed" },
  cancelled: { label: "Cancelled" },
};

export default function TradeApp({ user }: { user: AuthenticatedUser }) {
  const [tab, setTab] = useState<Tab>("home");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const workspaceResponse = await fetch("/api/workspace", { cache: "no-store" });
    if (workspaceResponse.status === 404) { setNeedsSetup(true); setLoading(false); return; }
    const workspacePayload = await readApi<{ workspace: Workspace | null }>(workspaceResponse);
    if (!workspacePayload.workspace) { setNeedsSetup(true); setLoading(false); return; }
    const [customerPayload, jobPayload, catalogPayload, teamPayload] = await Promise.all([
      fetchAllCustomers(),
      fetch("/api/jobs?limit=100", { cache: "no-store" }).then(response => readApi<{ jobs: JobRow[] }>(response)),
      fetch("/api/catalog", { cache: "no-store" }).then(response => readApi<{ items: CatalogItem[] }>(response)),
      fetch("/api/team", { cache: "no-store" }).then(response => readApi<{ members: TeamMember[] }>(response)),
    ]);
    setWorkspace(workspacePayload.workspace); setCustomers(customerPayload); setJobs(jobPayload.jobs); setCatalog(catalogPayload.items); setTeam(teamPayload.members); setNeedsSetup(false); setLoading(false);
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load().catch(error => { setLoading(false); notify(error instanceof Error ? error.message : "Could not load workspace"); }); }, 0); return () => window.clearTimeout(timer); }, []);
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2800); }
  const open = (next: Tab) => { setTab(next); setOverlay(null); };

  return <main className="kp-shell">
    <aside className="kp-sidebar">
      <Brand />
      <nav aria-label="Main navigation"><Nav tab="home" current={tab} icon="⌂" label="Home" onClick={open} /><Nav tab="jobs" current={tab} icon="▣" label="Jobs" count={jobs.filter(row => !["paid", "cancelled"].includes(row.job.status)).length} onClick={open} /><Nav tab="customers" current={tab} icon="♙" label="Customers" onClick={open} /><Nav tab="more" current={tab} icon="•••" label="More" onClick={open} /></nav>
      <div className="kp-account"><span>{initials(workspace?.business.name ?? user.displayName)}</span><div><b>{workspace?.business.name ?? "KerjaPro"}</b><small>{workspace?.membership.role ?? "Owner"}</small></div></div>
    </aside>
    <section className="kp-main">
      <header className="kp-topbar"><div><p>{workspace?.business.name ?? "Your business"}</p><h1>{tab === "home" ? "Overview" : tab[0].toUpperCase() + tab.slice(1)}</h1></div><button className="primary-action" onClick={() => setOverlay({ kind: "new-job" })}>＋ New Job</button></header>
      <div className="kp-content">
        {loading ? <Loading /> : tab === "home" ? <Home jobs={jobs} onNew={() => setOverlay({ kind: "new-job" })} onJob={id => setOverlay({ kind: "job", id })} /> : tab === "jobs" ? <Jobs jobs={jobs} onNew={() => setOverlay({ kind: "new-job" })} onJob={id => setOverlay({ kind: "job", id })} /> : tab === "customers" ? <Customers customers={customers} jobs={jobs} onNew={customerId => setOverlay({ kind: "new-job", customerId })} notify={notify} reload={load} /> : <More workspace={workspace} catalog={catalog} notify={notify} reload={load} />}
      </div>
    </section>
    <nav className="kp-bottom-nav" aria-label="Mobile navigation"><Nav tab="home" current={tab} icon="⌂" label="Home" onClick={open} /><Nav tab="jobs" current={tab} icon="▣" label="Jobs" onClick={open} /><Nav tab="customers" current={tab} icon="♙" label="Customers" onClick={open} /><Nav tab="more" current={tab} icon="•••" label="More" onClick={open} /></nav>
    {overlay?.kind === "new-job" && <NewJob customers={customers} jobs={jobs} catalog={catalog} initialCustomerId={overlay.customerId} close={() => setOverlay(null)} created={async id => { await load(); setOverlay({ kind: "job", id }); notify("Customer, quote and job saved"); }} notify={notify} />}
    {overlay?.kind === "job" && <JobPanel row={jobs.find(row => row.job.id === overlay.id)} catalog={catalog} team={team} close={() => setOverlay(null)} changed={async message => { await load(); notify(message); }} />}
    {needsSetup && <WorkspaceSetup user={user} complete={async () => { await load(); notify("Your workspace is ready"); }} />}
    {toast && <div className="kp-toast">✓ {toast}</div>}
  </main>;
}

function Home({ jobs, onNew, onJob }: { jobs: JobRow[]; onNew: () => void; onJob: (id: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = jobs.filter(row => row.job.appointmentAt?.slice(0, 10) === today);
  const pending = jobs.filter(row => !["paid", "cancelled"].includes(row.job.status));
  const collect = jobs.reduce((sum, row) => sum + (["completed", "payment_due"].includes(row.job.status) ? row.job.balanceMinor : 0), 0);
  const cards = todayJobs.length ? todayJobs : pending.slice(0, 4);
  return <div className="home-page">
    <section className="home-hero"><div><span className="eyebrow">TODAY</span><h2>Keep work moving.</h2><p>One job from quote to payment. KerjaPro handles the paperwork behind it.</p></div><button onClick={onNew}><span>＋</span><b>New Job</b><small>Select customer, then tap what they need</small></button></section>
    <div className="metric-grid"><article><span className="metric-icon blue">▣</span><div><small>Today’s Jobs</small><b>{todayJobs.length}</b></div></article><article><span className="metric-icon amber">◷</span><div><small>Pending Jobs</small><b>{pending.length}</b></div></article><article><span className="metric-icon green">RM</span><div><small>Amount to Collect</small><b>{formatMoney(collect)}</b></div></article></div>
    <div className="section-heading"><div><span className="eyebrow">TODAY’S WORK</span><h3>{todayJobs.length ? "Your schedule" : "Next jobs to move"}</h3></div><small>{cards.length} job{cards.length === 1 ? "" : "s"}</small></div>
    <div className="today-list">{cards.length ? cards.map(row => <JobCard key={row.job.id} row={row} onClick={() => onJob(row.job.id)} />) : <Empty title="No active jobs" detail="Create a job by choosing a customer and tapping menu items." action="Create first job" onClick={onNew} />}</div>
  </div>;
}

function Jobs({ jobs, onNew, onJob }: { jobs: JobRow[]; onNew: () => void; onJob: (id: string) => void }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState<"active" | "all" | "closed">("active");
  const visible = jobs.filter(row => `${row.job.jobNumber} ${row.job.request} ${row.customer.name}`.toLowerCase().includes(query.toLowerCase())).filter(row => filter === "all" || (filter === "closed" ? ["paid", "cancelled"].includes(row.job.status) : !["paid", "cancelled"].includes(row.job.status)));
  return <div className="list-page"><div className="page-tools"><div className="search-box">⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search job or customer" /></div><button className="primary-action" onClick={onNew}>＋ New Job</button></div><div className="filter-tabs"><button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active</button><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "closed" ? "active" : ""} onClick={() => setFilter("closed")}>Closed</button></div><div className="job-list">{visible.length ? visible.map(row => <JobCard key={row.job.id} row={row} onClick={() => onJob(row.job.id)} />) : <Empty title="No matching jobs" detail="Try another search or create a new job." />}</div></div>;
}

function JobCard({ row, onClick }: { row: JobRow; onClick: () => void }) {
  const status = statusCopy[row.job.status];
  return <button className="job-row" onClick={onClick}><div className={`job-date ${row.job.status}`}><b>{row.job.appointmentAt ? new Date(row.job.appointmentAt).toLocaleDateString("en-MY", { day: "2-digit" }) : "—"}</b><small>{row.job.appointmentAt ? new Date(row.job.appointmentAt).toLocaleDateString("en-MY", { month: "short" }).toUpperCase() : "TBD"}</small></div><div className="job-copy"><small>{row.job.jobNumber}</small><strong>{row.customer.name}</strong><span>{row.items.slice(0, 2).map(item => item.description).join(" · ") || row.job.request}</span></div><div className="job-value"><b>{formatMoney(row.job.totalMinor)}</b><span className={`status-pill ${row.job.status}`}>{status.label}</span></div><em>›</em></button>;
}

function Customers({ customers, jobs, onNew, notify, reload }: { customers: Customer[]; jobs: JobRow[]; onNew: (id: string) => void; notify: (s: string) => void; reload: () => Promise<void> }) {
  const [query, setQuery] = useState(""); const [adding, setAdding] = useState(false);
  const visible = customers.filter(customer => `${customer.name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()));
  async function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await post("/api/customers", { name: form.get("name"), phone: form.get("phone"), serviceAddress: form.get("address") }); setAdding(false); await reload(); notify("Customer added"); }
  return <div className="list-page"><div className="page-tools"><div className="search-box">⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search customers" /></div><button className="secondary-action" onClick={() => setAdding(true)}>＋ Add Customer</button></div>{adding && <form className="inline-form" onSubmit={add}><label>Name<input name="name" required autoFocus /></label><label>Phone<input name="phone" required /></label><label>Service address<input name="address" required /></label><div><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-action">Save customer</button></div></form>}<div className="customer-grid">{visible.map(customer => { const history = jobs.filter(row => row.customer.id === customer.id); return <article className="customer-card" key={customer.id}><span>{initials(customer.name)}</span><div><b>{customer.name}</b><small>{customer.phone}</small><p>{customer.serviceAddress}</p></div><button onClick={() => onNew(customer.id)}>＋ New Job</button><em>{history.length} job{history.length === 1 ? "" : "s"}</em></article>; })}</div></div>;
}

type MessageAnalysis = { transcript: string; customer: { name: string | null; phone: string | null; serviceAddress: string | null }; request: string; summary: string; suggestions: Array<{ catalogItemId: string; quantityMilli: number }> };

function NewJob({ customers, jobs, catalog, initialCustomerId, close, created, notify }: { customers: Customer[]; jobs: JobRow[]; catalog: CatalogItem[]; initialCustomerId?: string; close: () => void; created: (id: string) => void; notify: (s: string) => void }) {
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [draftCustomer, setDraftCustomer] = useState({ name: "", phone: "", serviceAddress: "" });
  const [step, setStep] = useState(initialCustomerId ? 2 : 1);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [enteringNewCustomer, setEnteringNewCustomer] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState("");
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<{ recorder: MediaRecorder; stream: MediaStream } | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<JobItem[]>([]);
  const [custom, setCustom] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => recorderRef.current?.stream.getTracks().forEach(track => track.stop()), []);
  const customer = customers.find(item => item.id === customerId);
  const selectedCustomer = customer ?? (draftCustomer.name ? { id: "new", ...draftCustomer } : undefined);
  const history = customer ? jobs.filter(row => row.customer.id === customer.id) : [];
  const categories = ["All", ...new Set(catalog.map(item => item.category))];
  const menu = catalog.filter(item => category === "All" || item.category === category).filter(item => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(menuQuery.toLowerCase()));
  const visibleCustomers = [...customers]
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
    .filter(item => `${item.name} ${item.phone} ${item.serviceAddress}`.toLowerCase().includes(customerQuery.toLowerCase()));
  const newCustomerReady = Boolean(draftCustomer.name.trim() && draftCustomer.phone.trim() && draftCustomer.serviceAddress.trim());
  const subtotal = cart.reduce((sum, item) => sum + Math.round(item.quantityMilli * item.unitPriceMinor / 1000), 0);
  const tax = cart.reduce((sum, item) => sum + Math.round(Math.round(item.quantityMilli * item.unitPriceMinor / 1000) * item.taxRateBasisPoints / 10_000), 0);
  const total = Math.max(0, subtotal - discount + tax);

  function add(item: CatalogItem, quantityMilli = 1000) {
    setCart(current => {
      const found = current.find(line => line.catalogItemId === item.id);
      return found ? current.map(line => line.catalogItemId === item.id ? { ...line, quantityMilli: line.quantityMilli + quantityMilli } : line) : [...current, { catalogItemId: item.id, itemType: item.itemType, description: item.name, quantityMilli, unit: item.unit, unitPriceMinor: item.standardPriceMinor, taxRateBasisPoints: item.taxRateBasisPoints, costMinor: item.costMinor, commissionBasisPoints: item.commissionBasisPoints }];
    });
  }
  function quantity(index: number, delta: number) { setCart(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantityMilli: item.quantityMilli + delta * 1000 } : item).filter(item => item.quantityMilli > 0)); }
  function selectCustomer(item: Customer) {
    setCustomerId(item.id);
    setDraftCustomer({ name: item.name, phone: item.phone, serviceAddress: item.serviceAddress });
    setEnteringNewCustomer(false);
    setCustomerPickerOpen(false);
    setCustomerQuery("");
  }
  function startNewCustomer() {
    setCustomerId("");
    setDraftCustomer({ name: customerQuery.trim(), phone: "", serviceAddress: "" });
    setEnteringNewCustomer(true);
    setCustomerPickerOpen(false);
  }

  async function analyze(source: string | Blob) {
    setAnalyzing(true);
    try {
      let response: Response;
      if (typeof source === "string") response = await fetch("/api/jobs/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: source }) });
      else {
        const data = new FormData();
        data.set("audio", new File([source], "customer-message.webm", { type: source.type || "audio/webm" }));
        response = await fetch("/api/jobs/analyze", { method: "POST", body: data });
      }
      const result = await readApi<{ analysis: MessageAnalysis }>(response);
      setMessage(result.analysis.transcript);
      setRequest(result.analysis.request);
      setAnalysisSummary(result.analysis.summary);
      const inferred = result.analysis.customer;
      const phone = inferred.phone ?? "";
      const match = phone ? customers.find(item => normalizePhone(item.phone) === normalizePhone(phone)) : undefined;
      if (match) {
        selectCustomer(match);
      } else {
        setCustomerId("");
        setDraftCustomer(current => ({ name: inferred.name ?? current.name, phone: phone || current.phone, serviceAddress: inferred.serviceAddress ?? current.serviceAddress }));
        setEnteringNewCustomer(true);
        setCustomerPickerOpen(false);
      }
      setCart([]);
      result.analysis.suggestions.forEach(suggestion => { const item = catalog.find(entry => entry.id === suggestion.catalogItemId); if (item) add(item, suggestion.quantityMilli); });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not analyze the customer message");
    } finally {
      setAnalyzing(false);
    }
  }

  async function toggleRecording() {
    if (recorderRef.current) { recorderRef.current.recorder.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        recorderRef.current = null;
        if (audio.size) void analyze(audio);
      };
      recorderRef.current = { recorder, stream };
      recorder.start();
      setRecording(true);
    } catch {
      notify("Microphone access is unavailable. Paste the customer message instead.");
    }
  }

  async function submit() {
    if ((!customerId && !newCustomerReady) || !cart.length) return;
    setSaving(true);
    try {
      const result = await post<{ job: { id: string } }>("/api/jobs", { customerId: customerId || undefined, customer: customerId ? undefined : draftCustomer, items: cart, discountMinor: discount, serviceAddress: selectedCustomer?.serviceAddress, request: request || message || cart.map(item => item.description).join(", ") });
      created(result.job.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not create job");
      setSaving(false);
    }
  }

  return <div className="flow-overlay"><section className="job-builder" role="dialog" aria-modal="true">
    <header><button onClick={step === 1 ? close : () => setStep(1)}>←</button><div><span>NEW JOB</span><h2>{step === 1 ? "Customer & request" : "Pick what they need"}</h2></div><button onClick={close}>×</button></header>
    {step === 1 ? <div className="customer-intake">
      <section className="capture-card"><div className="capture-head"><span>✦</span><div><b>Analyze customer message</b><small>Paste WhatsApp, SMS or speak it. Check the result before creating the job.</small></div></div><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Paste the customer’s message here…" /><div className="capture-actions"><button className={recording ? "recording" : ""} onClick={() => void toggleRecording()}>{recording ? "■ Stop & analyze" : "● Voice message"}</button><button className="primary-action" disabled={!message.trim() || analyzing} onClick={() => void analyze(message)}>{analyzing ? "Analyzing…" : "✦ Analyze message"}</button></div>{analysisSummary && <div className="analysis-result"><span>✓</span><div><b>{analysisSummary}</b><small>{cart.length ? `${cart.length} menu item${cart.length === 1 ? "" : "s"} suggested — review next` : "No confident menu match — choose items next"}</small></div></div>}</section>
      <section className="customer-field-card">
        <div className="choice-title"><span className="eyebrow">CUSTOMER</span><h3>Choose an existing customer or add a new one</h3><p>Start here—there is no need to leave this job to create a customer first.</p></div>
        <button className={`customer-picker-trigger ${selectedCustomer ? "selected" : ""}`} onClick={() => setCustomerPickerOpen(value => !value)} aria-expanded={customerPickerOpen}>
          <span>{selectedCustomer ? initials(selectedCustomer.name) : "⌕"}</span><div><small>CUSTOMER</small><b>{selectedCustomer?.name || "Search or enter customer"}</b><em>{selectedCustomer ? `${selectedCustomer.phone} · ${selectedCustomer.serviceAddress}` : "Name, phone or address"}</em></div><strong>{customerPickerOpen ? "⌃" : "⌄"}</strong>
        </button>
        {customerPickerOpen && <div className="customer-picker-popover">
          <div className="search-box">⌕<input autoFocus value={customerQuery} onChange={event => setCustomerQuery(event.target.value)} placeholder="Search name, phone or address" /></div>
          <div className="customer-picker-heading"><b>Saved customers</b><span>A–Z · {visibleCustomers.length}</span></div>
          <div className="existing-customer-list">{visibleCustomers.map(item => { const itemHistory = jobs.filter(row => row.customer.id === item.id); return <button key={item.id} onClick={() => selectCustomer(item)}><span>{initials(item.name)}</span><div><b>{item.name}</b><small>{item.phone} · {item.serviceAddress}</small>{itemHistory.length > 0 && <em>{itemHistory.length} previous job{itemHistory.length === 1 ? "" : "s"} · Last: {statusCopy[itemHistory[0].job.status].label}</em>}</div><strong>›</strong></button>; })}{!visibleCustomers.length && <p>No saved customer matches “{customerQuery}”.</p>}</div>
          <button className="add-customer-inline" onClick={startNewCustomer}><span>＋</span><div><b>{customerQuery.trim() ? `Add “${customerQuery.trim()}” as new customer` : "Add a new customer"}</b><small>Enter their contact details without leaving this job</small></div><strong>›</strong></button>
        </div>}
        {(customer || enteringNewCustomer) && <div className={`customer-details-form ${customer ? "saved" : "new"}`}>
          <div className="customer-details-head"><div><span>{customer ? "SAVED CUSTOMER" : "NEW CUSTOMER"}</span><b>{customer ? "Contact details filled automatically" : "Save once with this job"}</b></div><button onClick={() => { setCustomerId(""); setDraftCustomer({ name: "", phone: "", serviceAddress: "" }); setEnteringNewCustomer(false); setCustomerPickerOpen(true); }}>Change</button></div>
          <div className="customer-contact-grid"><label>Name<input value={customer?.name ?? draftCustomer.name} readOnly={Boolean(customer)} onChange={event => setDraftCustomer(current => ({ ...current, name: event.target.value }))} placeholder="Customer name" /></label><label>Phone / WhatsApp<input value={customer?.phone ?? draftCustomer.phone} readOnly={Boolean(customer)} onChange={event => setDraftCustomer(current => ({ ...current, phone: event.target.value }))} placeholder="Mobile number" /></label><label className="wide">Service address<textarea value={customer?.serviceAddress ?? draftCustomer.serviceAddress} readOnly={Boolean(customer)} onChange={event => setDraftCustomer(current => ({ ...current, serviceAddress: event.target.value }))} placeholder="Where is the job?" /></label></div>
          {customer ? <div className="customer-inline-history"><span>{history.length} previous job{history.length === 1 ? "" : "s"}</span>{history.slice(0, 3).map(row => <em key={row.job.id}>{row.job.jobNumber} · {statusCopy[row.job.status].label} · {formatMoney(row.job.totalMinor)}</em>)}</div> : <p>Nothing is saved yet. This customer will be added automatically to Customers when the quote is created.</p>}
        </div>}
        <button className="primary-action customer-continue" disabled={!customerId && !newCustomerReady} onClick={() => setStep(2)}>Continue to services & products →</button>
      </section>
    </div> : <div className="menu-step">
      <div className="selected-customer"><span>{initials(selectedCustomer?.name ?? "")}</span><div><small>{customer ? "SAVED CUSTOMER" : "NEW CUSTOMER · SAVES WITH JOB"}</small><b>{selectedCustomer?.name}</b>{customer && <em>{history.length} previous job{history.length === 1 ? "" : "s"}</em>}</div><button onClick={() => setStep(1)}>Change</button></div>
      {history.length > 0 && <div className="customer-history-strip"><small>RECENT HISTORY</small>{history.slice(0, 3).map(row => <span key={row.job.id}><b>{row.job.jobNumber}</b><em>{statusCopy[row.job.status].label}</em><strong>{formatMoney(row.job.totalMinor)}</strong></span>)}</div>}
      {request && <div className="request-summary"><span>✦</span><p><b>Customer needs:</b> {request}</p><button onClick={() => setStep(1)}>Edit message</button></div>}
      <div className="menu-search"><div className="search-box">⌕<input value={menuQuery} onChange={event => setMenuQuery(event.target.value)} placeholder="Search services or products" /></div><div className="category-scroll">{categories.map(item => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
      <div className="menu-body"><section className="menu-grid">{menu.map(item => <button key={item.id} onClick={() => add(item)}><div><span className={item.itemType}>{item.itemType === "service" ? "S" : "P"}</span><small>{item.category}</small></div><b>{item.name}</b><p>{item.description || `${item.itemType === "service" ? "Service" : "Product"} priced per ${item.unit}`}</p><footer><strong>{formatMoney(item.standardPriceMinor)}</strong><small>/ {item.unit}</small><em>＋</em></footer></button>)}<button className="custom-tile" onClick={() => setCustom(true)}><span>＋</span><b>Custom item</b><p>Add something not in your preset menu.</p></button>{!catalog.length && <Empty title="Your menu is empty" detail="Add services and products in More, or use a custom item now." />}</section>
        <aside className="order-panel"><div><h3>Job total</h3><small>{cart.length} selected item{cart.length === 1 ? "" : "s"}</small></div><div className="order-lines">{cart.length ? cart.map((item, index) => <article key={`${item.catalogItemId}-${index}`}><div><b>{item.description}</b><small>{formatMoney(item.unitPriceMinor)} / {item.unit}</small></div><div className="qty"><button onClick={() => quantity(index, -1)}>−</button><b>{item.quantityMilli / 1000}</b><button onClick={() => quantity(index, 1)}>＋</button></div><strong>{formatMoney(Math.round(item.quantityMilli * item.unitPriceMinor / 1000))}</strong></article>) : <p className="empty-cart">Tap a service or product to add it.</p>}</div><button className="more-toggle" onClick={() => setMore(value => !value)}>Discount & notes <span>{more ? "⌃" : "⌄"}</span></button>{more && <div className="advanced-fields"><label>Discount (RM)<input type="number" min="0" step="0.01" value={discount / 100 || ""} onChange={event => setDiscount(Math.round(Number(event.target.value) * 100))} /></label><p>Quote changes, deposits and other uncommon options remain attached to the job after creation.</p></div>}<div className="order-total"><span><small>Subtotal</small><b>{formatMoney(subtotal)}</b></span>{tax > 0 && <span><small>Tax</small><b>{formatMoney(tax)}</b></span>}{discount > 0 && <span><small>Discount</small><b>−{formatMoney(discount)}</b></span>}<span className="grand"><small>Total</small><b>{formatMoney(total)}</b></span></div><button className="create-quote" disabled={!cart.length || saving} onClick={submit}>{saving ? "Saving customer & job…" : `Create Quote · ${formatMoney(total)}`}</button></aside>
      </div>
    </div>}
    {custom && <CustomItem close={() => setCustom(false)} add={item => { setCart(current => [...current, item]); setCustom(false); }} />}
  </section></div>;
}

function CustomItem({ close, add }: { close: () => void; add: (item: JobItem) => void }) { function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); add({ catalogItemId: null, itemType: "custom", description: String(form.get("name")), quantityMilli: Math.round(Number(form.get("quantity")) * 1000), unit: String(form.get("unit")), unitPriceMinor: Math.round(Number(form.get("price")) * 100), taxRateBasisPoints: Math.round(Number(form.get("tax")) * 100) }); } return <div className="nested-modal"><form onSubmit={save}><header><h3>Custom item</h3><button type="button" onClick={close}>×</button></header><label>Description<input name="name" required autoFocus placeholder="What are you charging for?" /></label><div><label>Quantity<input name="quantity" type="number" min="0.001" step="0.001" defaultValue="1" required /></label><label>Unit<input name="unit" defaultValue="job" required /></label></div><div><label>Price (RM)<input name="price" type="number" min="0" step="0.01" required /></label><label>Tax (%)<input name="tax" type="number" min="0" max="100" step="0.01" defaultValue="0" /></label></div><button className="primary-action">Add to job</button></form></div>; }

function JobPanel({ row, catalog, team, close, changed }: { row?: JobRow; catalog: CatalogItem[]; team: TeamMember[]; close: () => void; changed: (message: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [schedule, setSchedule] = useState(false); const [complete, setComplete] = useState(false); const [payment, setPayment] = useState(false); const [more, setMore] = useState(false); const [adding, setAdding] = useState(false); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState("");
  if (!row) return null; const currentRow = row; const meta = statusCopy[currentRow.job.status]; const currentIndex = ["draft", "quote_sent", "quote_accepted", "scheduled", "in_progress", "completed", "payment_due", "paid"].indexOf(currentRow.job.status);
  async function action(name: string, payload: Record<string, unknown> = {}) { setBusy(true); try { await patch(`/api/jobs/${currentRow.job.id}`, { action: name, ...payload }); await changed(name === "send_quote" ? "Quote marked as sent" : name === "accept_quote" ? "Quote accepted — job confirmed" : name === "start" ? "Job started" : "Job updated"); close(); } finally { setBusy(false); } }
  function primary() { if (!meta.action) return; if (meta.action === "schedule") return setSchedule(true); if (meta.action === "complete") return setComplete(true); if (meta.action === "payment") return setPayment(true); void action(meta.action); }
  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setUploadError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData(); form.set("file", file);
        await readApi(await fetch(`/api/jobs/${currentRow.job.id}/attachments`, { method: "POST", body: form }));
      }
      await changed(`${files.length} job photo${files.length === 1 ? "" : "s"} saved`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not save job photos");
    } finally {
      setUploading(false);
    }
  }
  return <div className="flow-overlay">
    <section className="job-detail" role="dialog" aria-modal="true">
      <header><button onClick={close}>←</button><div><span>{row.job.jobNumber}</span><h2>{row.customer.name}</h2></div><button onClick={close}>×</button></header>
      <div className="job-detail-body">
        <div className="job-summary-head"><div><span className={`status-pill ${row.job.status}`}>{meta.label}</span><h3>{row.items.map(item => item.description).slice(0, 2).join(" + ")}</h3><p>{row.job.serviceAddress}</p></div><b>{formatMoney(row.job.totalMinor)}</b></div>
        <div className="lifecycle">{["Quote", "Accepted", "Scheduled", "Doing", "Complete", "Paid"].map((label, index) => <div className={currentIndex >= [1, 2, 3, 4, 5, 7][index] ? "done" : currentIndex === [0, 1, 2, 3, 4, 6][index] ? "current" : ""} key={label}><i>{currentIndex >= [1, 2, 3, 4, 5, 7][index] ? "✓" : index + 1}</i><small>{label}</small></div>)}</div>
        {row.job.appointmentAt && <section className="schedule-card"><span>◷</span><div><small>SCHEDULED</small><b>{new Date(row.job.appointmentAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</b><p>{row.job.technician || "Team member not specified"}</p></div></section>}
        <section className="job-items">
          <div><h3>Job items</h3>{row.job.status === "in_progress" && <button onClick={() => setAdding(true)}>＋ Add service/product</button>}</div>
          {row.items.map((item, index) => <article key={item.id ?? index}><span>{item.quantityMilli / 1000} ×</span><div><b>{item.description}</b><small>{formatMoney(item.unitPriceMinor)} / {item.unit}{item.addedDuringJob ? " · Added during job" : ""}</small></div><strong>{formatMoney(Math.round(item.quantityMilli * item.unitPriceMinor / 1000))}</strong></article>)}
          <footer><span>Total</span><b>{formatMoney(row.job.totalMinor)}</b></footer>
        </section>
        {(row.job.status === "in_progress" || row.attachments.length > 0) && <section className="job-photos">
          <div><div><small>JOB UPDATES</small><h3>Photos</h3></div>{!["paid", "cancelled"].includes(row.job.status) && <label className={uploading ? "uploading" : ""}>＋ {uploading ? "Uploading…" : "Add photos"}<input type="file" accept="image/*" capture="environment" multiple disabled={uploading} onChange={event => void uploadPhotos(event.currentTarget.files)} /></label>}</div>
          {row.attachments.length ? <div className="photo-grid">{row.attachments.map(photo => <a key={photo.id} href={`/api/jobs/${row.job.id}/attachments/${photo.id}`} target="_blank" rel="noreferrer"><Image src={`/api/jobs/${row.job.id}/attachments/${photo.id}`} alt={photo.fileName} width={280} height={210} unoptimized /><span>{photo.fileName}</span></a>)}</div> : <p>Capture before, during or after-work photos. They stay attached to this job.</p>}
          {uploadError && <em>{uploadError}</em>}
        </section>}
        {["completed", "payment_due", "paid"].includes(row.job.status) && <section className="final-job-summary"><div><small>FINAL JOB SUMMARY</small><h3>Work finished</h3></div><span><small>Items</small><b>{row.items.length}</b></span><span><small>Photos</small><b>{row.attachments.length}</b></span><span><small>{row.job.balanceMinor ? "Balance due" : "Paid"}</small><b>{formatMoney(row.job.balanceMinor)}</b></span></section>}
        <section className="system-docs"><span>✓</span><div><b>Paperwork handled automatically</b><p>{row.documents.map(document => `${document.kind.replace("_", " ")} ${document.documentNumber}`).join(" · ") || "Quotation will be generated with this job."}</p></div></section>
        <button className="more-toggle wide" onClick={() => setMore(value => !value)}>More job options <span>{more ? "⌃" : "⌄"}</span></button>
        {more && <div className="more-actions">
          {["scheduled", "in_progress"].includes(row.job.status) && <button onClick={() => setSchedule(true)}>Reschedule</button>}
          {["quote_accepted", "scheduled", "in_progress"].includes(row.job.status) && row.job.balanceMinor > 0 && <button onClick={() => setPayment(true)}>Record deposit</button>}
          {!["completed", "payment_due", "paid", "cancelled"].includes(row.job.status) && <button onClick={() => setAdding(true)}>Add service/product</button>}
          <button onClick={() => { const notes = window.prompt("Job note"); if (notes) void action("update_details", { notes }); }}>Add job note</button>
          {!["completed", "payment_due", "paid", "cancelled"].includes(row.job.status) && <button onClick={() => { const value = window.prompt("Discount amount (RM)", String(row.job.discountMinor / 100)); if (value !== null) void action("change_discount", { discountMinor: Math.max(0, Math.round(Number(value) * 100)) }); }}>Change discount</button>}
          <button onClick={() => { const warrantyUntil = window.prompt("Warranty end date (YYYY-MM-DD)"); if (warrantyUntil) void action("update_details", { warrantyUntil }); }}>Warranty</button>
          {!["paid", "cancelled", "completed", "payment_due"].includes(row.job.status) && <button className="danger" onClick={() => { const reason = window.prompt("Reason for cancellation"); if (reason) void action("cancel", { reason }); }}>Cancel job</button>}
        </div>}
      </div>
      {meta.actionLabel && <footer className="sticky-job-action"><div><small>{row.job.status === "payment_due" ? "Balance due" : "Job total"}</small><b>{formatMoney(row.job.status === "payment_due" ? row.job.balanceMinor : row.job.totalMinor)}</b></div><button disabled={busy} onClick={primary}>{busy ? "Updating…" : meta.actionLabel} <span>→</span></button></footer>}
      {schedule && <ActionModal title={row.job.status === "quote_accepted" ? "Schedule job" : "Reschedule job"} close={() => setSchedule(false)} submit={async form => { await action(row.job.status === "quote_accepted" ? "schedule" : "reschedule", { appointmentAt: form.get("appointmentAt"), assignedMemberId: form.get("assignedMemberId") }); }}><label>Date & time<input type="datetime-local" name="appointmentAt" defaultValue={row.job.appointmentAt?.slice(0, 16)} required /></label><label>Worker / team<select name="assignedMemberId" defaultValue={row.job.assignedMemberId ?? ""}><option value="">Unassigned</option>{team.map(member => <option value={member.id} key={member.id}>{member.name} · {member.role}</option>)}</select></label></ActionModal>}
      {complete && <ActionModal title="Complete job" close={() => setComplete(false)} submit={async form => action("complete", { workPerformed: form.get("workPerformed"), testingResults: form.get("testingResults"), warranty: form.get("warranty"), notes: form.get("notes") })}><div className="completion-summary"><span><small>FINAL TOTAL</small><b>{formatMoney(row.job.totalMinor)}</b></span><p>{row.items.length} line item{row.items.length === 1 ? "" : "s"} · {row.attachments.length} photo{row.attachments.length === 1 ? "" : "s"}</p></div><p className="modal-note">Completing this job automatically generates the service report and final invoice.</p><label>Work completed<textarea name="workPerformed" defaultValue={row.items.map(item => item.description).join(", ")} required /></label><label>Result / testing<textarea name="testingResults" placeholder="Optional" /></label><label>Warranty<input name="warranty" placeholder="Optional" /></label></ActionModal>}
      {payment && <PaymentModal row={row} close={() => setPayment(false)} paid={async (amountMinor, method, reference) => { setBusy(true); try { await post(`/api/jobs/${row.job.id}/payment`, { amountMinor, method, reference }); await changed(amountMinor === row.job.balanceMinor && ["completed", "payment_due"].includes(row.job.status) ? "Payment received — receipt generated and job closed" : "Payment recorded — receipt generated"); close(); } finally { setBusy(false); } }} />}
      {adding && <AddDuringJob catalog={catalog} close={() => setAdding(false)} save={async items => { await action("add_items", { items }); }} />}
    </section>
  </div>;
}

function ActionModal({ title, close, submit, children }: { title: string; close: () => void; submit: (form: FormData) => Promise<void>; children: React.ReactNode }) { const [busy, setBusy] = useState(false); return <div className="nested-modal"><form onSubmit={event => { event.preventDefault(); setBusy(true); void submit(new FormData(event.currentTarget)).finally(() => setBusy(false)); }}><header><h3>{title}</h3><button type="button" onClick={close}>×</button></header>{children}<button className="primary-action" disabled={busy}>{busy ? "Saving…" : title}</button></form></div>; }

function PaymentModal({ row, close, paid }: { row: JobRow; close: () => void; paid: (amount: number, method: string, reference: string) => Promise<void> }) { const [amount, setAmount] = useState(row.job.balanceMinor / 100); return <div className="nested-modal"><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void paid(Math.round(amount * 100), String(form.get("method")), String(form.get("reference") ?? "")); }}><header><div><small>COLLECT PAYMENT</small><h3>{formatMoney(row.job.balanceMinor)} due</h3></div><button type="button" onClick={close}>×</button></header><label>Amount received (RM)<input type="number" min="0.01" max={row.job.balanceMinor / 100} step="0.01" value={amount} onChange={event => setAmount(Number(event.target.value))} required /></label><div className="payment-methods">{[["cash", "Cash"], ["bank_transfer", "Bank Transfer"], ["duitnow", "DuitNow"], ["card", "Card"], ["other", "Other"]].map(([value, label], index) => <label key={value}><input type="radio" name="method" value={value} defaultChecked={index === 0} /><span>{label}</span></label>)}</div><label>Reference / note<input name="reference" placeholder="Optional" /></label><div className="payment-result"><span>{Math.round(amount * 100) === row.job.balanceMinor ? "Full payment" : "Partial payment"}</span><b>Balance after: {formatMoney(Math.max(0, row.job.balanceMinor - Math.round(amount * 100)))}</b></div><button className="primary-action">Record Payment · {formatMoney(Math.round(amount * 100))}</button><small className="automation-note">Invoice, receipt, revenue and commission will update automatically.</small></form></div>; }

function AddDuringJob({ catalog, close, save }: { catalog: CatalogItem[]; close: () => void; save: (items: JobItem[]) => Promise<void> }) {
  const [selected, setSelected] = useState<JobItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const categories = ["All", ...new Set(catalog.map(item => item.category))];
  const visible = catalog.filter(item => category === "All" || item.category === category).filter(item => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const total = selected.reduce((sum, item) => sum + Math.round(item.quantityMilli * item.unitPriceMinor / 1000), 0);

  function addPreset(item: CatalogItem) {
    setSelected(current => {
      const found = current.find(line => line.catalogItemId === item.id);
      if (found) return current.map(line => line.catalogItemId === item.id ? { ...line, quantityMilli: line.quantityMilli + 1000 } : line);
      return [...current, { catalogItemId: item.id, itemType: item.itemType, description: item.name, quantityMilli: 1000, unit: item.unit, unitPriceMinor: item.standardPriceMinor, taxRateBasisPoints: item.taxRateBasisPoints, costMinor: item.costMinor, commissionBasisPoints: item.commissionBasisPoints }];
    });
  }

  function changeQuantity(index: number, delta: number) {
    setSelected(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantityMilli: item.quantityMilli + delta * 1000 } : item).filter(item => item.quantityMilli > 0));
  }

  return <div className="nested-modal add-menu">
    <div className="add-menu-shell">
      <header><div><small>UPDATE THIS JOB</small><h3>Add service, product or extra charge</h3></div><button onClick={close}>×</button></header>
      <div className="during-menu-search"><div className="search-box">⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the same preset menu" /></div><div className="category-scroll">{categories.map(item => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
      <div className="during-menu-body">
        <section className="compact-menu">{visible.map(item => {
          const count = selected.find(line => line.catalogItemId === item.id)?.quantityMilli ?? 0;
          return <button key={item.id} onClick={() => addPreset(item)}><span>{count ? count / 1000 : "＋"}</span><div><small>{item.category}</small><b>{item.name}</b><em>{formatMoney(item.standardPriceMinor)} / {item.unit}</em></div></button>;
        })}<button className="custom-extra" onClick={() => setCustom(true)}><span>＋</span><div><small>NOT IN MENU</small><b>Custom item / extra charge</b><em>Set description, quantity and price</em></div></button>{!visible.length && <p>No preset item matches your search.</p>}</section>
        <aside className="during-cart"><div><h4>Added work</h4><small>{selected.length} line item{selected.length === 1 ? "" : "s"}</small></div><div>{selected.length ? selected.map((item, index) => <article key={`${item.catalogItemId ?? "custom"}-${index}`}><div><b>{item.description}</b><small>{formatMoney(item.unitPriceMinor)} / {item.unit}</small></div><div className="qty"><button onClick={() => changeQuantity(index, -1)}>−</button><b>{item.quantityMilli / 1000}</b><button onClick={() => changeQuantity(index, 1)}>＋</button></div></article>) : <p>Tap an item to add it.</p>}</div><footer><span><small>Extra total</small><b>{formatMoney(total)}</b></span><button className="primary-action" disabled={!selected.length || busy} onClick={() => { setBusy(true); void save(selected).finally(() => setBusy(false)); }}>{busy ? "Adding…" : "Add to job"}</button></footer></aside>
      </div>
    </div>
    {custom && <CustomItem close={() => setCustom(false)} add={item => { setSelected(current => [...current, item]); setCustom(false); }} />}
  </div>;
}

function More({ workspace, catalog, notify, reload }: { workspace: Workspace | null; catalog: CatalogItem[]; notify: (s: string) => void; reload: () => Promise<void> }) { const [adding, setAdding] = useState(false); async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await post("/api/catalog", { itemType: form.get("itemType"), category: form.get("category"), name: form.get("name"), description: form.get("description"), unit: form.get("unit"), standardPriceMinor: Math.round(Number(form.get("price")) * 100), estimatedDurationMinutes: Number(form.get("duration")) || null, taxRateBasisPoints: Math.round(Number(form.get("tax")) * 100), costMinor: form.get("cost") ? Math.round(Number(form.get("cost")) * 100) : null, commissionBasisPoints: form.get("commission") ? Math.round(Number(form.get("commission")) * 100) : null }); setAdding(false); await reload(); notify("Menu item saved"); } return <div className="more-page"><section className="menu-settings"><div className="section-heading"><div><span className="eyebrow">SET UP ONCE</span><h3>Services & product menu</h3><p>These are the items your team taps when creating or updating a job.</p></div><button className="primary-action" onClick={() => setAdding(true)}>＋ Add item</button></div>{adding && <form className="catalog-form" onSubmit={save}><label>Type<select name="itemType"><option value="service">Service</option><option value="product">Product</option></select></label><label>Category<input name="category" required placeholder="e.g. Installation" /></label><label className="wide">Name<input name="name" required /></label><label className="wide">Description<input name="description" /></label><label>Unit<input name="unit" required placeholder="job / hour / pc / set" /></label><label>Price (RM)<input name="price" type="number" min="0" step="0.01" required /></label><label>Duration (min)<input name="duration" type="number" min="0" /></label><label>Tax (%)<input name="tax" type="number" min="0" max="100" step="0.01" defaultValue="0" /></label><details><summary>Optional cost & commission</summary><div><label>Cost (RM)<input name="cost" type="number" min="0" step="0.01" /></label><label>Commission (%)<input name="commission" type="number" min="0" max="100" step="0.01" /></label></div></details><footer><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-action">Save item</button></footer></form>}<div className="catalog-list">{catalog.length ? catalog.map(item => <article key={item.id}><span className={item.itemType}>{item.itemType === "service" ? "S" : "P"}</span><div><small>{item.category} · {item.itemType}</small><b>{item.name}</b><p>{item.description || `Per ${item.unit}`}{item.estimatedDurationMinutes ? ` · ${item.estimatedDurationMinutes} min` : ""}</p></div><strong>{formatMoney(item.standardPriceMinor)}<small>/ {item.unit}</small></strong></article>) : <Empty title="No menu items yet" detail="Add the services and products your business sells. Nothing is pre-filled for a specific industry." />}</div></section><section className="settings-list"><h3>Business settings</h3><button><span>▧</span><div><b>Business profile</b><small>{workspace?.business.name}</small></div><em>›</em></button><button><span>♙</span><div><b>Team & permissions</b><small>Workers, managers and commission</small></div><em>›</em></button><button><span>RM</span><div><b>Tax & payment settings</b><small>Defaults used behind each job</small></div><em>›</em></button><a href="/signout-with-chatgpt?return_to=%2F"><span>↪</span><div><b>Sign out</b><small>End this session</small></div><em>›</em></a></section></div>; }

function WorkspaceSetup({ user, complete }: { user: AuthenticatedUser; complete: () => Promise<void> }) { const [busy, setBusy] = useState(false); return <div className="setup-overlay"><form onSubmit={event => { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); void post("/api/workspace", { businessType: "individual", masterRole: "owner_worker", name: form.get("name"), ownerName: user.displayName, phone: form.get("phone"), email: user.email, address: form.get("address") }).then(complete).finally(() => setBusy(false)); }}><Brand /><span className="eyebrow">WELCOME TO KERJAPRO</span><h2>Set up your workspace</h2><p>Enter your business once. You can add your own services and products next.</p><label>Business name<input name="name" required autoFocus /></label><label>Business phone<input name="phone" required /></label><label>Business address<textarea name="address" /></label><button className="primary-action" disabled={busy}>{busy ? "Setting up…" : "Create workspace"}</button></form></div>; }

function Brand() { return <div className="kp-brand"><span>K</span><div><b>Kerja</b>Pro<small>WORK MADE SIMPLE</small></div></div>; }
function Nav({ tab, current, icon, label, count, onClick }: { tab: Tab; current: Tab; icon: string; label: string; count?: number; onClick: (tab: Tab) => void }) { return <button className={current === tab ? "active" : ""} onClick={() => onClick(tab)}><span>{icon}</span><b>{label}</b>{count ? <i>{count}</i> : null}</button>; }
function Empty({ title, detail, action, onClick }: { title: string; detail: string; action?: string; onClick?: () => void }) { return <div className="empty-state"><span>◇</span><b>{title}</b><p>{detail}</p>{action && <button onClick={onClick}>{action}</button>}</div>; }
function Loading() { return <div className="loading-state"><i /><p>Loading your workspace…</p></div>; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "KP"; }
function normalizePhone(value: string) { return value.replace(/\D/g, ""); }
async function fetchAllCustomers() {
  const all: Customer[] = [];
  for (let offset = 0; ; offset += 100) {
    const payload = await fetch(`/api/customers?limit=100&offset=${offset}`, { cache: "no-store" }).then(response => readApi<{ customers: Customer[] }>(response));
    all.push(...payload.customers);
    if (payload.customers.length < 100) return all;
  }
}
async function readApi<T>(response: Response): Promise<T> { const payload = await response.json() as T & { error?: string }; if (!response.ok) throw new Error(payload.error ?? "Something went wrong"); return payload; }
async function post<T = unknown>(url: string, body: Record<string, unknown>) { return readApi<T>(await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })); }
async function patch<T = unknown>(url: string, body: Record<string, unknown>) { return readApi<T>(await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })); }
