"use client";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Printer,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationDraft, BoardProvider, CvProfile, EducationItem, ExperienceItem, Job, TailoredCv } from "@/lib/types";
import { EMPTY_PROFILE } from "@/lib/types";

type Board = { id: string; provider: BoardProvider; companyName: string; slug: string };
type ApiResult<T> = T & { error?: string };
type View = "overview" | "resume" | "jobs" | "applications";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let result: ApiResult<T>;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function applicationRecord(value: Record<string, unknown>): ApplicationDraft {
  return {
    ...(value as unknown as ApplicationDraft),
    createdAt: String(value.createdAt ?? ""),
    updatedAt: String(value.updatedAt ?? ""),
    tailoredCv: (value.tailoredCv as TailoredCv | null) ?? null,
  };
}

function formatDate(value: string) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "resume", label: "My CV", icon: FileText },
  { id: "jobs", label: "Find jobs", icon: Search },
  { id: "applications", label: "Applications", icon: Send },
];

export default function Workspace() {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [profile, setProfile] = useState<CvProfile>(EMPTY_PROFILE);
  const [boards, setBoards] = useState<Board[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationDraft[]>([]);
  const [selected, setSelected] = useState<ApplicationDraft | null>(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sourceErrors, setSourceErrors] = useState<Array<{ companyName: string; message: string }>>([]);
  const [booting, setBooting] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [boardFormOpen, setBoardFormOpen] = useState(false);
  const [boardProvider, setBoardProvider] = useState<BoardProvider>("GREENHOUSE");
  const [boardCompany, setBoardCompany] = useState("");
  const [boardSlug, setBoardSlug] = useState("");

  const refreshApplications = useCallback(async () => {
    const data = await request<{ applications: Record<string, unknown>[] }>("/api/applications");
    const rows = data.applications.map(applicationRecord);
    setApplications(rows);
    setSelected((current) => current ? rows.find((row) => row.id === current.id) ?? null : null);
  }, []);

  const refreshBoards = useCallback(async () => {
    const data = await request<{ boards: Board[] }>("/api/boards");
    setBoards(data.boards);
  }, []);

  const loadJobs = useCallback(async (search: string, place: string) => {
    setLoadingJobs(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: search, location: place });
      const data = await request<{ jobs: Job[]; errors: Array<{ companyName: string; message: string }> }>(`/api/jobs?${params}`);
      setJobs(data.jobs);
      setSourceErrors(data.errors);
    } catch (reason) {
      setJobs([]);
      setError(reason instanceof Error ? reason.message : "Could not load real job listings.");
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      request<CvProfile>("/api/profile"),
      request<{ boards: Board[] }>("/api/boards"),
      request<{ applications: Record<string, unknown>[] }>("/api/applications"),
    ])
      .then(([savedProfile, savedBoards, savedApplications]) => {
        if (!active) return;
        setProfile({ ...EMPTY_PROFILE, ...savedProfile });
        setBoards(savedBoards.boards);
        setApplications(savedApplications.applications.map(applicationRecord));
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not open your workspace. Check the database setup.");
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => { active = false; };
  }, []);

  const latestApplications = useMemo(() => applications.slice(0, 4), [applications]);
  const completedCvFields = [profile.name, profile.email, profile.headline, profile.summary, profile.experience.length > 0, profile.education.length > 0].filter(Boolean).length;
  const cvProgress = Math.round((completedCvFields / 6) * 100);

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    setError("");
    setNotice("");
    if (next === "jobs") void loadJobs(query, location);
  }

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3800);
  }

  async function saveProfile() {
    setBusy("profile");
    setError("");
    try {
      const saved = await request<CvProfile>("/api/profile", { method: "PUT", body: JSON.stringify(profile) });
      setProfile({ ...EMPTY_PROFILE, ...saved });
      notify("Your CV is saved securely in this workspace.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your CV.");
    } finally {
      setBusy("");
    }
  }

  async function addBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("board");
    setError("");
    try {
      await request("/api/boards", {
        method: "POST",
        body: JSON.stringify({ provider: boardProvider, companyName: boardCompany, slug: boardSlug }),
      });
      setBoardCompany("");
      setBoardSlug("");
      setBoardFormOpen(false);
      await refreshBoards();
      await loadJobs(query, location);
      notify(`${boardCompany} board verified and added.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add that employer board.");
    } finally {
      setBusy("");
    }
  }

  async function removeBoard(board: Board) {
    setBusy(`board-${board.id}`);
    setError("");
    try {
      await request(`/api/boards/${board.id}`, { method: "DELETE" });
      await refreshBoards();
      await loadJobs(query, location);
      notify(`${board.companyName} removed from your sources.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the employer board.");
    } finally {
      setBusy("");
    }
  }

  async function createDraft(job: Job) {
    setBusy(`job-${job.id}`);
    setError("");
    try {
      const data = await request<{ application: Record<string, unknown> }>("/api/applications", {
        method: "POST",
        body: JSON.stringify(job),
      });
      const draft = applicationRecord(data.application);
      await refreshApplications();
      setSelected(draft);
      setView("applications");
      notify("Draft created. Review and edit every detail before approval.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create an application draft.");
    } finally {
      setBusy("");
    }
  }

  function updateSelected(updater: (draft: ApplicationDraft) => ApplicationDraft) {
    if (!selected) return;
    const next = updater(selected);
    setSelected(next);
    setApplications((rows) => rows.map((row) => row.id === next.id ? next : row));
  }

  async function saveDraft(): Promise<boolean> {
    if (!selected) return false;
    setBusy("save-draft");
    setError("");
    try {
      const data = await request<{ application: Record<string, unknown> }>(`/api/applications/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ tailoredCv: selected.tailoredCv, coverLetter: selected.coverLetter }),
      });
      const saved = applicationRecord(data.application);
      setSelected(saved);
      setApplications((rows) => rows.map((row) => row.id === saved.id ? saved : row));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the application draft.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function tailorDraft() {
    if (!selected) return;
    const saved = await saveDraft();
    if (!saved) return;
    setBusy("tailor");
    setError("");
    try {
      const data = await request<{ application: Record<string, unknown> }>(`/api/applications/${selected.id}/tailor`, { method: "POST" });
      const tailored = applicationRecord(data.application);
      setSelected(tailored);
      setApplications((rows) => rows.map((row) => row.id === tailored.id ? tailored : row));
      notify("AI suggestions are ready. Verify every detail before using them.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not tailor this application.");
    } finally {
      setBusy("");
    }
  }

  async function approveDraft() {
    if (!selected || !(await saveDraft())) return;
    setBusy("approve");
    setError("");
    try {
      const data = await request<{ application: Record<string, unknown> }>(`/api/applications/${selected.id}/approve`, { method: "POST" });
      const approved = applicationRecord(data.application);
      setSelected(approved);
      setApplications((rows) => rows.map((row) => row.id === approved.id ? approved : row));
      notify("Approved by you. The application has not been submitted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not approve this draft.");
    } finally {
      setBusy("");
    }
  }

  async function openEmployerPage() {
    if (!selected) return;
    setBusy("handoff");
    setError("");
    try {
      const data = await request<{ url: string }>(`/api/applications/${selected.id}/handoff`, { method: "POST" });
      window.location.assign(data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open the employer application.");
      setBusy("");
    }
  }

  async function deleteDraft() {
    if (!selected || !window.confirm("Delete this draft? This cannot be undone.")) return;
    setBusy("delete");
    setError("");
    try {
      await request(`/api/applications/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      await refreshApplications();
      notify("Draft deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the draft.");
    } finally {
      setBusy("");
    }
  }

  async function signOut() {
    await request("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const title = navItems.find((item) => item.id === view)?.label ?? "Overview";

  if (booting) {
    return <main className="loading-screen"><LoaderCircle className="spin" size={25} /><span>Opening your workspace…</span></main>;
  }

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand-row"><span className="brand-icon"><BriefcaseBusiness size={19} /></span><span className="brand-name">CareerDesk</span><span className="brand-version">PERSONAL</span></div>
        <button className="create-button" onClick={() => navigate("jobs")}><Plus size={16} /> Explore opportunities</button>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${view === id ? "nav-active" : ""}`} onClick={() => navigate(id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === "applications" && applications.length > 0 && <span className="nav-count">{applications.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-panel">
            <div className="privacy-icon"><ShieldCheck size={17} /></div>
            <div><strong>Your approval matters</strong><p>Nothing goes to an employer without your review.</p></div>
          </div>
          <div className="user-card"><div className="user-avatar">{profile.name ? profile.name.trim().charAt(0).toUpperCase() : <UserRound size={17} />}</div><div className="user-info"><strong>{profile.name || "Your workspace"}</strong><span>Personal account</span></div><button className="logout-button" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={15} /></button></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="header-left"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={19} /></button><div><div className="breadcrumb">CAREER WORKSPACE <ChevronRight size={12} /> <span>{title.toUpperCase()}</span></div><h1>{title}</h1></div></div>
          <div className="header-actions"><span className="live-indicator"><i /> Live job sources</span><button className="icon-action" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={17} /></button></div>
        </header>

        {(error || notice) && <div className={`feedback-banner ${error ? "feedback-error" : "feedback-success"}`} role={error ? "alert" : "status"}>{error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}<span>{error || notice}</span>{error && <button onClick={() => setError("")} aria-label="Dismiss message"><X size={15} /></button>}</div>}

        <div className="view-content">
          {view === "overview" && (
            <section className="overview-view">
              <div className="welcome-row"><div><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h2>{profile.name ? `Welcome back, ${profile.name.split(" ")[0]}.` : "Make your next move count."}</h2><p>A calm, clear place to prepare for the right opportunity.</p></div><button className="button-primary" onClick={() => navigate("jobs")}><Search size={16} /> Find a role <ArrowRight size={15} /></button></div>
              <div className="stats-grid">
                <article className="stat-card"><div className="stat-top"><span className="stat-icon mint"><FileText size={17} /></span><span className="stat-trend">YOUR PROFILE</span></div><strong>{cvProgress}%</strong><span className="stat-label">CV readiness</span><div className="progress-track"><span style={{ width: `${cvProgress}%` }} /></div><button className="text-link" onClick={() => navigate("resume")}>Complete your CV <ArrowRight size={13} /></button></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon lavender"><Search size={17} /></span><span className="stat-trend">LIVE SOURCES</span></div><strong>{boards.length}</strong><span className="stat-label">Employer boards connected</span><button className="text-link" onClick={() => navigate("jobs")}>Manage job sources <ArrowRight size={13} /></button></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon apricot"><Send size={17} /></span><span className="stat-trend">YOUR PIPELINE</span></div><strong>{applications.length}</strong><span className="stat-label">Applications in progress</span><button className="text-link" onClick={() => navigate("applications")}>View applications <ArrowRight size={13} /></button></article>
              </div>
              <div className="overview-columns">
                <section className="panel recent-panel"><div className="section-heading"><div><span className="eyebrow">KEEP MOVING</span><h3>Recent applications</h3></div><button className="quiet-link" onClick={() => navigate("applications")}>View all <ArrowRight size={14} /></button></div>
                  {latestApplications.length ? <div className="recent-list">{latestApplications.map((application) => <button className="recent-item" key={application.id} onClick={() => { setSelected(application); navigate("applications"); }}><span className="company-avatar">{application.companyName.slice(0, 1).toUpperCase()}</span><span className="recent-main"><strong>{application.title}</strong><small>{application.companyName} <span>·</span> {application.location || "Location not listed"}</small></span><StatusPill status={application.status} /><ChevronRight className="recent-chevron" size={16} /></button>)}</div> : <EmptyState icon={<Send size={19} />} title="Your application list is clear" body="Create a draft from a real employer listing when a role feels right." action="Explore jobs" onClick={() => navigate("jobs")} />}
                </section>
                <section className="panel checklist-panel"><div className="section-heading"><div><span className="eyebrow">A STRONG FOUNDATION</span><h3>Your profile</h3></div><button className="icon-action" aria-label="Edit CV" onClick={() => navigate("resume")}><ArrowUpRight size={16} /></button></div><div className="profile-progress"><div className="progress-ring"><span>{cvProgress}%</span></div><div><strong>{cvProgress >= 100 ? "Ready for review" : "A few details go a long way"}</strong><p>{cvProgress >= 100 ? "Your core CV sections are in place." : "Complete your CV once, then tailor it for each role."}</p></div></div><div className="check-list"><CheckRow complete={Boolean(profile.name && profile.email)} label="Contact details" onClick={() => navigate("resume")} /><CheckRow complete={Boolean(profile.summary)} label="Professional summary" onClick={() => navigate("resume")} /><CheckRow complete={profile.experience.length > 0} label="Experience" onClick={() => navigate("resume")} /><CheckRow complete={profile.education.length > 0} label="Education" onClick={() => navigate("resume")} /></div><button className="button-secondary full-width" onClick={() => navigate("resume")}>Edit your CV <ArrowRight size={14} /></button></section>
              </div>
              <div className="trust-strip"><ShieldCheck size={18} /><span><strong>Nothing is sent on your behalf.</strong> You review each draft and choose when to continue on the employer’s own site.</span><button onClick={() => navigate("applications")}>How it works <ArrowRight size={13} /></button></div>
            </section>
          )}

          {view === "resume" && <ResumeView profile={profile} setProfile={setProfile} saveProfile={saveProfile} busy={busy === "profile"} />}

          {view === "jobs" && (
            <section className="jobs-view">
              <div className="page-intro"><div><div className="eyebrow">REAL ROLES, DIRECT FROM EMPLOYERS</div><h2>Find work that fits.</h2><p>Search published listings from the Greenhouse and Lever boards you choose.</p></div><span className="source-count"><span /> {boards.length} verified {boards.length === 1 ? "source" : "sources"}</span></div>
              <div className="search-panel"><form className="job-search-form" onSubmit={(event) => { event.preventDefault(); void loadJobs(query, location); }}><label className="search-field"><Search size={18} /><input placeholder="Role, skill, or company" value={query} onChange={(event) => setQuery(event.target.value)} /><span>Search jobs</span></label><label className="location-field"><MapPin size={17} /><input placeholder="Location" value={location} onChange={(event) => setLocation(event.target.value)} /></label><button className="button-primary" disabled={loadingJobs}>{loadingJobs ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />} Search</button></form>
                <div className="source-manager"><div><span className="eyebrow">YOUR EMPLOYER SOURCES</span><p>Live listings come from board IDs you add here—never from mock data.</p></div><button className="button-secondary" onClick={() => setBoardFormOpen(!boardFormOpen)}>{boardFormOpen ? <X size={15} /> : <Plus size={15} />}{boardFormOpen ? "Close" : "Add employer board"}</button></div>
                {boardFormOpen && <form className="board-form" onSubmit={addBoard}><label><span>Job board</span><select value={boardProvider} onChange={(event) => setBoardProvider(event.target.value as BoardProvider)}><option value="GREENHOUSE">Greenhouse</option><option value="LEVER">Lever</option></select></label><label><span>Company name</span><input value={boardCompany} onChange={(event) => setBoardCompany(event.target.value)} placeholder="e.g. Stripe" required maxLength={120} /></label><label><span>Board slug</span><input value={boardSlug} onChange={(event) => setBoardSlug(event.target.value)} placeholder="e.g. stripe" pattern="[A-Za-z0-9][A-Za-z0-9-]*" required maxLength={100} /></label><button className="button-primary" disabled={busy === "board"}>{busy === "board" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Verify & add</button><small>Use the board slug in the employer careers URL, not a full URL. CareerDesk checks the public API before saving.</small></form>}
                {boards.length > 0 && <div className="board-chips">{boards.map((board) => <span className="board-chip" key={board.id}><span className={board.provider === "GREENHOUSE" ? "provider-mark gh-mark" : "provider-mark lever-mark"} />{board.companyName}<small>{board.provider === "GREENHOUSE" ? "GH" : "LV"}</small><button aria-label={`Remove ${board.companyName}`} onClick={() => void removeBoard(board)} disabled={busy === `board-${board.id}`}><X size={13} /></button></span>)}</div>}
              </div>
              {sourceErrors.length > 0 && <div className="source-warning"><AlertCircle size={16} /><div><strong>Some sources could not be refreshed.</strong>{sourceErrors.map((item) => <span key={item.companyName}>{item.companyName}: {item.message}</span>)}</div></div>}
              <div className="results-heading"><div><span className="eyebrow">PUBLISHED OPPORTUNITIES</span><h3>{query || location ? "Search results" : "Latest from your sources"} <span>{jobs.length}</span></h3></div><button className="quiet-link" onClick={() => void loadJobs(query, location)} disabled={loadingJobs}>{loadingJobs ? <LoaderCircle className="spin" size={14} /> : <Settings2 size={14} />} Refresh listings</button></div>
              {loadingJobs ? <div className="jobs-loading"><LoaderCircle className="spin" size={22} /> Checking employer boards for current roles…</div> : jobs.length ? <div className="jobs-grid">{jobs.map((job) => <JobCard key={`${job.provider}-${job.boardId}-${job.id}`} job={job} busy={busy === `job-${job.id}`} onDraft={() => void createDraft(job)} />)}</div> : <div className="empty-jobs"><div className="empty-jobs-icon"><Search size={22} /></div><h3>{boards.length ? "No matching published roles" : "Connect an employer board to get started"}</h3><p>{boards.length ? "Try a broader keyword or location. Listings refresh directly from the public employer APIs." : "Add the board slug from a company’s Greenhouse or Lever careers page. We’ll verify it and fetch the company’s real open listings."}</p>{!boards.length && <button className="button-primary" onClick={() => setBoardFormOpen(true)}><Plus size={16} /> Add your first board</button>}</div>}
              <p className="jobs-disclaimer"><ShieldCheck size={14} /> Listings are queried from configured employer boards. Availability can change; confirm details on the employer site.</p>
            </section>
          )}

          {view === "applications" && (
            <section className="applications-view">
              <div className="page-intro"><div><div className="eyebrow">YOUR APPLICATIONS, YOUR CALL</div><h2>Thoughtful, not rushed.</h2><p>Every application stays a draft until you review and approve it.</p></div><button className="button-secondary" onClick={() => navigate("jobs")}><Search size={15} /> Find another role</button></div>
              {selected ? <ApplicationEditor application={selected} profile={profile} busy={busy} onChange={updateSelected} onSave={saveDraft} onTailor={tailorDraft} onApprove={approveDraft} onHandoff={openEmployerPage} onDelete={deleteDraft} onBack={() => setSelected(null)} /> :
                applications.length ? <div className="application-list">{applications.map((application) => <button className="application-row" key={application.id} onClick={() => setSelected(application)}><span className="company-avatar">{application.companyName.slice(0, 1).toUpperCase()}</span><span className="application-row-main"><strong>{application.title}</strong><small>{application.companyName} <span>·</span> {application.location || "Location not listed"}</small></span><StatusPill status={application.status} /><span className="application-date">{formatDate(application.updatedAt)}</span><ChevronRight size={16} /></button>)}</div> :
                  <EmptyState icon={<Send size={19} />} title="No applications yet" body="Start with a real role from one of your verified employer boards." action="Find jobs" onClick={() => navigate("jobs")} />}
              <p className="applications-disclaimer"><ShieldCheck size={14} /> “Handed off” means the employer page was opened—not that an application was submitted.</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function CheckRow({ complete, label, onClick }: { complete: boolean; label: string; onClick: () => void }) {
  return <button className="check-row" onClick={onClick}><span className={`check-mark ${complete ? "check-complete" : ""}`}>{complete && <Check size={12} />}</span><span>{label}</span><ChevronRight size={14} /></button>;
}

function StatusPill({ status }: { status: ApplicationDraft["status"] }) {
  const labels = { DRAFT: "Draft", APPROVED: "Approved", HANDED_OFF: "Employer page opened" };
  return <span className={`status-pill status-${status.toLowerCase()}`}>{status === "APPROVED" ? <CheckCircle2 size={12} /> : status === "HANDED_OFF" ? <ArrowUpRight size={12} /> : <FileText size={12} />}{labels[status]}</span>;
}

function EmptyState({ icon, title, body, action, onClick }: { icon: React.ReactNode; title: string; body: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{body}</p><button className="button-secondary" onClick={onClick}>{action} <ArrowRight size={14} /></button></div>;
}

function JobCard({ job, busy, onDraft }: { job: Job; busy: boolean; onDraft: () => void }) {
  return <article className="job-card"><div className="job-card-top"><span className={`company-avatar company-avatar-${job.provider.toLowerCase()}`}>{job.companyName.slice(0, 1).toUpperCase()}</span><span className="board-label"><span className={`provider-mark ${job.provider === "GREENHOUSE" ? "gh-mark" : "lever-mark"}`} />{job.provider === "GREENHOUSE" ? "Greenhouse" : "Lever"}</span><span className="job-source-link" title="Application link unlocks after approval"><ShieldCheck size={15} /></span></div><div className="job-company">{job.companyName}</div><h3>{job.title}</h3><div className="job-meta"><span><MapPin size={14} />{job.location || "Location not specified"}</span>{job.updatedAt && <span><Clock3 size={13} />Updated {formatDate(job.updatedAt)}</span>}</div><p className="job-description">{job.description}</p><div className="job-card-footer"><span className="real-listing"><i /> Live employer listing</span><button className="button-primary" onClick={onDraft} disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <FileText size={15} />} Create application draft</button></div></article>;
}

function ResumeView({ profile, setProfile, saveProfile, busy }: { profile: CvProfile; setProfile: (value: CvProfile) => void; saveProfile: () => void; busy: boolean }) {
  function addExperience() {
    setProfile({ ...profile, experience: [...profile.experience, { company: "", role: "", location: "", period: "", bullets: [""] }] });
  }
  function updateExperience(index: number, patch: Partial<ExperienceItem>) {
    setProfile({ ...profile, experience: profile.experience.map((item, row) => row === index ? { ...item, ...patch } : item) });
  }
  function addEducation() {
    setProfile({ ...profile, education: [...profile.education, { institution: "", qualification: "", location: "", period: "" }] });
  }
  function updateEducation(index: number, patch: Partial<EducationItem>) {
    setProfile({ ...profile, education: profile.education.map((item, row) => row === index ? { ...item, ...patch } : item) });
  }
  return <section className="resume-view">
    <div className="page-intro resume-intro"><div><div className="eyebrow">YOUR PROFESSIONAL STORY</div><h2>A CV that sounds like you.</h2><p>Start with your name and a short introduction. Add the rest only if you need it.</p></div><button className="button-secondary" onClick={() => window.print()}><Printer size={15} /> Print / save PDF</button></div>
    <div className="resume-layout">
      <div className="resume-editor">
        <section className="editor-section"><div className="editor-title"><div><h3>Start with the basics</h3><p>Your name and a short introduction are enough to begin.</p></div></div><Field label="Full name" value={profile.name} onChange={(value) => setProfile({ ...profile, name: value })} placeholder="Jordan Taylor" /><Field label="Email address" value={profile.email} onChange={(value) => setProfile({ ...profile, email: value })} placeholder="jordan@email.com" type="email" /><Field label="What kind of work do you do?" value={profile.headline} onChange={(value) => setProfile({ ...profile, headline: value })} placeholder="Product designer" /><label className="form-field"><span>About you <small>Optional</small></span><textarea rows={4} value={profile.summary} onChange={(event) => setProfile({ ...profile, summary: event.target.value })} placeholder="Write a few sentences about your experience and strengths." maxLength={3000} /></label></section>
        <details className="editor-section optional-section" open={Boolean(profile.phone || profile.location || profile.skills.length)}>
          <summary><span>Contact details and skills</span><small>{profile.phone || profile.location || profile.skills.length ? "Edit your extra details" : "Optional · add phone, location, or skills"}</small></summary>
          <div className="optional-section-content"><div className="field-grid"><Field label="Phone" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} placeholder="+1 555 010 2040" /><Field label="Location" value={profile.location} onChange={(value) => setProfile({ ...profile, location: value })} placeholder="City, Country" /></div><label className="form-field"><span>Skills <small>Separate with commas</small></span><input value={profile.skills.join(", ")} onChange={(event) => setProfile({ ...profile, skills: event.target.value.split(",").map((skill) => skill.trim()).filter(Boolean) })} placeholder="Communication, project planning" /></label></div>
        </details>
        <details className="editor-section optional-section" open={profile.experience.length > 0}>
          <summary><span>Work experience</span><small>{profile.experience.length ? `${profile.experience.length} role${profile.experience.length === 1 ? "" : "s"} added` : "Optional · add a job or project"}</small></summary>
          <div className="optional-section-content">{profile.experience.map((item, index) => <div className="repeat-card" key={`experience-${index}`}><div className="repeat-heading"><strong>Role {index + 1}</strong><button className="small-icon-button" aria-label={`Remove role ${index + 1}`} onClick={() => setProfile({ ...profile, experience: profile.experience.filter((_, row) => row !== index) })}><Trash2 size={14} /></button></div><div className="field-grid"><Field label="Job title" value={item.role} onChange={(value) => updateExperience(index, { role: value })} placeholder="Sales assistant" /><Field label="Company" value={item.company} onChange={(value) => updateExperience(index, { company: value })} placeholder="Company name" /><Field label="Location" value={item.location} onChange={(value) => updateExperience(index, { location: value })} placeholder="City or remote" /><Field label="Dates" value={item.period} onChange={(value) => updateExperience(index, { period: value })} placeholder="2022 – Present" /></div><label className="form-field"><span>What did you do? <small>One thing per line</small></span><textarea rows={3} value={item.bullets.join("\n")} onChange={(event) => updateExperience(index, { bullets: event.target.value.split("\n") })} placeholder={"Helped customers find the right products\nTrained new team members"} /></label></div>)}<button className="add-empty-row" onClick={addExperience}><Plus size={15} /> Add a job or project</button></div>
        </details>
        <details className="editor-section optional-section" open={profile.education.length > 0}>
          <summary><span>Education</span><small>{profile.education.length ? `${profile.education.length} item${profile.education.length === 1 ? "" : "s"} added` : "Optional"}</small></summary>
          <div className="optional-section-content">{profile.education.map((item, index) => <div className="repeat-card" key={`education-${index}`}><div className="repeat-heading"><strong>Education {index + 1}</strong><button className="small-icon-button" aria-label={`Remove education ${index + 1}`} onClick={() => setProfile({ ...profile, education: profile.education.filter((_, row) => row !== index) })}><Trash2 size={14} /></button></div><div className="field-grid"><Field label="School or institution" value={item.institution} onChange={(value) => updateEducation(index, { institution: value })} placeholder="School name" /><Field label="Qualification" value={item.qualification} onChange={(value) => updateEducation(index, { qualification: value })} placeholder="Degree or certificate" /><Field label="Location" value={item.location} onChange={(value) => updateEducation(index, { location: value })} placeholder="City, Country" /><Field label="Dates" value={item.period} onChange={(value) => updateEducation(index, { period: value })} placeholder="2018 – 2022" /></div></div>)}<button className="add-empty-row" onClick={addEducation}><Plus size={15} /> Add education</button></div>
        </details>
        <div className="save-bar"><span><ShieldCheck size={15} /> Stored in your private database</span><button className="button-primary" onClick={saveProfile} disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Save CV</button></div>
      </div>
      <CvPreview profile={profile} />
    </div>
  </section>;
}

function Field({ label, value, onChange, placeholder, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return <label className="form-field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} /></label>;
}

function CvPreview({ profile, tailored }: { profile: CvProfile; tailored?: boolean }) {
  return <aside className="cv-preview-wrap"><div className="preview-toolbar"><div><span className="eyebrow">LIVE PREVIEW</span><strong>{tailored ? "Tailored draft" : "Your CV"}</strong></div><span className="preview-status"><i /> {tailored ? "For this role" : "Updates as you edit"}</span></div><article className="cv-paper"><div className="cv-paper-head"><div className="cv-name">{profile.name || "Your name"}</div><div className="cv-headline">{profile.headline || "Professional headline"}</div><div className="cv-contact">{[profile.email, profile.phone, profile.location].filter(Boolean).join("  ·  ") || "Email · Phone · Location"}</div></div><CvSection title="Profile"><p>{profile.summary || "A concise summary of your professional experience and strengths will appear here."}</p></CvSection>{profile.skills.length > 0 && <CvSection title="Core skills"><div className="preview-skills">{profile.skills.slice(0, 16).map((skill) => <span key={skill}>{skill}</span>)}</div></CvSection>}<CvSection title="Experience">{profile.experience.length ? profile.experience.map((item, index) => <div className="preview-role" key={`preview-role-${index}`}><div className="preview-role-head"><strong>{item.role || "Role title"}</strong><span>{item.period}</span></div><div className="preview-company">{item.company || "Company"}{item.location ? ` · ${item.location}` : ""}</div><ul>{item.bullets.filter(Boolean).slice(0, 4).map((bullet, i) => <li key={`bullet-${i}`}>{bullet}</li>)}</ul></div>) : <p className="preview-placeholder">Add your work history to build your experience section.</p>}</CvSection>{profile.education.length > 0 && <CvSection title="Education">{profile.education.map((item, index) => <div className="preview-role" key={`preview-education-${index}`}><div className="preview-role-head"><strong>{item.qualification || "Qualification"}</strong><span>{item.period}</span></div><div className="preview-company">{item.institution}{item.location ? ` · ${item.location}` : ""}</div></div>)}</CvSection>}<div className="cv-paper-footer">CAREERDESK · PROFESSIONAL PROFILE</div></article></aside>;
}

function CvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="cv-section"><h4>{title}</h4>{children}</section>;
}

function ApplicationEditor({ application, profile, busy, onChange, onSave, onTailor, onApprove, onHandoff, onDelete, onBack }: { application: ApplicationDraft; profile: CvProfile; busy: string; onChange: (updater: (draft: ApplicationDraft) => ApplicationDraft) => void; onSave: () => Promise<boolean>; onTailor: () => void; onApprove: () => void; onHandoff: () => void; onDelete: () => void; onBack: () => void }) {
  const safeTailored = application.tailoredCv ?? {
    headline: profile.headline,
    summary: profile.summary,
    skills: profile.skills,
    experience: profile.experience,
  };
  const previewProfile: CvProfile = { ...profile, ...safeTailored };
  const readOnly = application.status === "HANDED_OFF";
  const [savedLabel, setSavedLabel] = useState("");

  async function saveAndConfirm() {
    if (await onSave()) {
      setSavedLabel("Saved just now");
      window.setTimeout(() => setSavedLabel(""), 2500);
    }
  }

  return (
    <div className="application-editor">
      <button className="back-link" onClick={onBack}><ArrowDownRight className="back-arrow" size={15} /> Back to applications</button>
      <div className="application-title-row">
        <div>
          <div className="eyebrow">APPLICATION REVIEW</div>
          <h3>{application.title}</h3>
          <p>{application.companyName} <span>·</span> {application.location || "Location not specified"} <span>·</span> {application.provider === "GREENHOUSE" ? "Greenhouse" : "Lever"} listing</p>
        </div>
        <StatusPill status={application.status} />
      </div>
      {readOnly && <div className="handoff-note"><CheckCircle2 size={17} /><div><strong>Employer application page opened</strong><span>CareerDesk did not submit anything. Complete the application directly with {application.companyName}.</span></div></div>}
      <div className="review-grid">
        <div className="review-main">
          <section className="review-card">
            <div className="review-card-heading">
              <div><span className="eyebrow">YOUR STORY, FOR THIS ROLE</span><h4>CV draft</h4></div>
              <button className="button-secondary" onClick={onTailor} disabled={busy === "tailor" || application.status !== "DRAFT"}>
                {busy === "tailor" ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />}
                {busy === "tailor" ? "Tailoring…" : "Tailor with AI"}
              </button>
            </div>
            <p className="ai-disclosure"><Sparkles size={14} /> AI suggestions use your CV and this job description. Review for accuracy; new claims are not added intentionally.</p>
            <fieldset className="draft-fieldset" disabled={readOnly}>
              <Field label="Headline" value={safeTailored.headline} onChange={(value) => onChange((draft) => ({ ...draft, tailoredCv: { ...safeTailored, headline: value } }))} placeholder="Your professional headline" />
              <label className="form-field"><span>Profile summary</span><textarea rows={5} value={safeTailored.summary} onChange={(event) => onChange((draft) => ({ ...draft, tailoredCv: { ...safeTailored, summary: event.target.value } }))} placeholder="Your profile summary" /></label>
              <label className="form-field"><span>Relevant skills <small>Only include skills you can stand behind</small></span><input value={safeTailored.skills.join(", ")} onChange={(event) => onChange((draft) => ({ ...draft, tailoredCv: { ...safeTailored, skills: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } }))} placeholder="Separate skills with commas" /></label>
              {safeTailored.experience.map((item, index) => <label className="form-field" key={`draft-experience-${index}`}><span>{item.role || "Experience"} · {item.company}</span><textarea rows={Math.max(3, item.bullets.length)} value={item.bullets.join("\n")} onChange={(event) => onChange((draft) => ({ ...draft, tailoredCv: { ...safeTailored, experience: safeTailored.experience.map((row, i) => i === index ? { ...row, bullets: event.target.value.split("\n") } : row) } }))} placeholder="One experience point per line" /></label>)}
              <label className="form-field"><span>Cover letter <small>Editable before approval</small></span><textarea className="cover-letter-field" rows={10} value={application.coverLetter} onChange={(event) => onChange((draft) => ({ ...draft, coverLetter: event.target.value }))} placeholder="Write your own, or ask AI to prepare a first draft. It will remain here until you approve it." /></label>
            </fieldset>
            {!readOnly && <div className="draft-actions">
              <button className="button-secondary" onClick={saveAndConfirm} disabled={busy === "save-draft"}>{busy === "save-draft" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}{savedLabel || "Save draft"}</button>
              <button className="small-icon-button delete-draft" aria-label="Delete draft" title="Delete draft" onClick={onDelete}><Trash2 size={15} /></button>
            </div>}
          </section>
          <section className="review-card job-description-card">
            <div className="review-card-heading"><div><span className="eyebrow">SOURCE: EMPLOYER JOB BOARD</span><h4>Role description</h4></div><span className="board-label"><ShieldCheck size={13} /> Apply link held until approval</span></div>
            <p>{application.description}</p>
          </section>
        </div>
        <aside className="review-side">
          <CvPreview profile={previewProfile} tailored />
          <div className="approval-card">
            <div className="approval-icon"><ShieldCheck size={19} /></div>
            <h4>{application.status === "DRAFT" ? "Your review comes first." : application.status === "APPROVED" ? "Approved by you." : "Handed off to employer."}</h4>
            <p>{application.status === "DRAFT" ? "Check every detail in the CV and cover letter. Approval is required before opening the employer's application page." : application.status === "APPROVED" ? "Your approval is recorded. Nothing has been submitted; continue to the employer's application page when ready." : "Continue and finish the form on the employer's own site."}</p>
            {application.status === "DRAFT" && <button className="button-primary full-width approve-button" onClick={onApprove} disabled={Boolean(busy)}>{busy === "approve" ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />} I reviewed & approve</button>}
            {application.status === "APPROVED" && <button className="button-primary full-width" onClick={onHandoff} disabled={busy === "handoff"}>{busy === "handoff" ? <LoaderCircle className="spin" size={16} /> : <ArrowUpRight size={16} />} Open employer application</button>}
            {readOnly && <a className="button-secondary full-width employer-link" href={application.applyUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /> Return to employer site</a>}
            <div className="approval-guard"><ShieldCheck size={14} /><span>CareerDesk never submits applications.</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
