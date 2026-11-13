import { useEffect, useState } from 'react'
import {
  Activity, ArrowRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp,
  ClipboardList, Clock3, Command, FileChartColumn, FilePlus2, FolderKanban,
  Grid2X2, LayoutDashboard, LogOut, Menu, MessageSquare, MoreHorizontal,
  Plus, Presentation, Search, Settings, Sparkles, Users, Workflow, X
} from 'lucide-react'
import { supabase } from './lib/supabase'

const navItems = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Teams', icon: Users },
  { label: 'Forms', icon: ClipboardList },
  { label: 'Presentations', icon: Presentation },
  { label: 'Flows', icon: Workflow },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Calendar', icon: CalendarDays },
]

const quickActions = [
  { title: 'Create a form', detail: 'Collect answers and feedback', icon: ClipboardList, page: 'Forms', tint: 'lavender' },
  { title: 'New presentation', detail: 'Build a deck together', icon: Presentation, page: 'Presentations', tint: 'peach' },
  { title: 'Start a flow', detail: 'Connect steps and automate work', icon: Workflow, page: 'Flows', tint: 'mint' },
  { title: 'Add a project', detail: 'Organize tasks and deadlines', icon: FolderKanban, page: 'Projects', tint: 'blue' },
]

const descriptions = {
  Teams: 'Bring people, conversations, and shared work together.',
  Forms: 'Make forms, quizzes, polls, and surveys.',
  Presentations: 'Turn ideas into slides and present them together.',
  Flows: 'Map out processes with a visual workflow builder.',
  Projects: 'Keep tasks, milestones, and plans in one place.',
  Calendar: 'See what is coming up across your workspace.',
}

function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // Supabase password auth requires an email or phone identifier.
  // Forma creates a private, non-deliverable email alias from each username.
  const accountEmail = value => `${value.trim().toLowerCase()}@accounts.forma.invalid`

  async function submit(event) {
    event.preventDefault()
    const normalizedUsername = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      setMessage('Use 3–20 characters: letters, numbers, and underscores only.')
      return
    }

    setBusy(true)
    setMessage('')
    const result = mode === 'signup'
      ? await supabase.auth.signUp({
          email: accountEmail(normalizedUsername),
          password,
          options: { data: { username: normalizedUsername } },
        })
      : await supabase.auth.signInWithPassword({
          email: accountEmail(normalizedUsername),
          password,
        })
    setBusy(false)

    if (result.error) setMessage(
      result.error.message.toLowerCase().includes('already registered')
        ? 'That username is already taken.'
        : result.error.message
    )
    else if (mode === 'signup' && !result.data.session) {
      setMessage('Account created, but instant sign-in is not enabled. Check the Supabase email confirmation setting.')
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand-mark large">f</div>
        <p className="eyebrow">YOUR WORKSPACE, CONNECTED</p>
        <h1>{mode === 'signin' ? 'Welcome back.' : 'Make room for ideas.'}</h1>
        <p className="auth-copy">One place for your team, projects, forms, and ideas.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Username<input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" autoComplete="username" autoCapitalize="none" spellCheck="false" minLength={3} maxLength={20} required /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required /></label>
          <button className="primary-button full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <p className="switch-auth">{mode === 'signin' ? 'New to Forma?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
      </div>
      <div className="auth-side"><div className="orb orb-one" /><div className="orb orb-two" /><span>FORMA / 01</span><h2>Good work<br />happens together.</h2><p>Less switching. More making.</p><div className="floating-note"><Sparkles size={16} /> A little space for big ideas.</div></div>
    </main>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('Home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!session) return <AuthScreen />

  const displayUsername = session.user.user_metadata?.username || 'Your account'
  const initials = displayUsername.slice(0, 1).toUpperCase()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row"><div className="brand-mark">f</div><span>forma</span><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <button className="workspace-switch"><span className="workspace-avatar">F</span><span className="workspace-name"><strong>My workspace</strong><small>Free workspace</small></span><ChevronDown size={15} /></button>
        <div className="side-label">WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(item => <button key={item.label} className={`nav-item ${page === item.label ? 'active' : ''}`} onClick={() => { setPage(item.label); setSidebarOpen(false) }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.label === 'Teams' && <span className="nav-plus"><Plus size={15} /></span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={18} /><span>Settings</span></button>
          <button className="nav-item"><CircleHelp size={18} /><span>Help & feedback</span></button>
          <div className="profile-row"><div className="profile-avatar">{initials}</div><div className="profile-info"><strong>{displayUsername}</strong><small>Forma account</small></div><button className="icon-button" title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={16} /></button></div>
        </div>
      </aside>

      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span className="breadcrumb">Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
          <div className="topbar-right"><label className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anything…" /><kbd>⌘ K</kbd></label><button className="icon-button notification-button"><Bell size={18} /><i /></button><div className="top-avatar">{initials}</div></div>
        </header>

        <div className="page-content">
          {page === 'Home' ? <HomePage onNavigate={setPage} /> : <ModulePage page={page} search={search} onNavigate={setPage} />}
        </div>
      </main>
    </div>
  )
}

function HomePage({ onNavigate }) {
  return <>
    <section className="welcome-row"><div><p className="eyebrow">THURSDAY, NOVEMBER 13</p><h1>Your space to get things done.</h1><p className="subheading">Everything your team needs, all in one place.</p></div><button className="primary-button" onClick={() => onNavigate('Teams')}><Plus size={17} /> Invite your team</button></section>
    <section className="hero-card"><div className="hero-copy"><span className="hero-tag"><Sparkles size={13} /> THE WORKSPACE</span><h2>One place.<br />A lot more possible.</h2><p>Bring your people, plans, and ideas together. Start with a team or make something new.</p><button className="hero-button" onClick={() => onNavigate('Projects')}>Explore your workspace <ArrowRight size={16} /></button></div><div className="hero-art"><div className="art-window window-back"><div /><div /><div /></div><div className="art-window window-front"><div className="art-topline" /><div className="art-lines"><i /><i /><i /></div><div className="art-chart"><b /><b /><b /><b /><b /></div></div><div className="art-sticker"><Grid2X2 size={22} /></div><div className="art-spark">✳</div></div></section>
    <section className="section-heading"><div><h2>Jump right in</h2><p>Pick up where you want to start.</p></div><button className="text-button" onClick={() => onNavigate('Projects')}>View all <ArrowRight size={15} /></button></section>
    <section className="quick-grid">{quickActions.map(action => <button className="quick-card" key={action.title} onClick={() => onNavigate(action.page)}><div className={`quick-icon ${action.tint}`}><action.icon size={20} /></div><div className="quick-text"><strong>{action.title}</strong><span>{action.detail}</span></div><ArrowRight className="quick-arrow" size={17} /></button>)}</section>
    <section className="section-heading lower-heading"><div><h2>Your overview</h2><p>Your workspace will fill up as you go.</p></div><button className="icon-button"><MoreHorizontal size={20} /></button></section>
    <section className="overview-grid"><div className="overview-card"><div className="overview-icon lavender"><Users size={18} /></div><div><strong>Teams</strong><span>No teams yet</span></div><button onClick={() => onNavigate('Teams')}>Create <ArrowRight size={14} /></button></div><div className="overview-card"><div className="overview-icon mint"><Activity size={18} /></div><div><strong>Recent activity</strong><span>Nothing happening just yet</span></div><Clock3 size={17} className="muted-icon" /></div><div className="overview-card"><div className="overview-icon peach"><CalendarDays size={18} /></div><div><strong>Upcoming</strong><span>Your calendar is clear</span></div><button onClick={() => onNavigate('Calendar')}>Open <ArrowRight size={14} /></button></div></section>
    <footer className="page-footer"><span>FORMA</span><span>Make room for good work.</span><span>v0.1 / PREVIEW</span></footer>
  </>
}

function ModulePage({ page, search, onNavigate }) {
  const [showCreate, setShowCreate] = useState(false)
  const Icon = navItems.find(item => item.label === page)?.icon || Grid2X2
  const filtered = quickActions.filter(item => item.title.toLowerCase().includes(search.toLowerCase()) || item.detail.toLowerCase().includes(search.toLowerCase()))
  return <div className="module-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / {page.toUpperCase()}</p><h1>{page}</h1><p className="subheading">{descriptions[page]}</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> Create new</button></div>
    <div className="module-banner"><div className="module-banner-icon"><Icon size={24} /></div><div><strong>Your {page.toLowerCase()} start here.</strong><span>This space is ready for you. Create your first item to get things moving.</span></div></div>
    <div className="empty-state"><div className="empty-illustration"><div className="empty-circle"><Icon size={34} /></div><span className="empty-spark">✳</span></div><h2>Nothing here. Yet.</h2><p>Once you create something, it will show up here.</p><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> Create your first {page.toLowerCase().replace(/s$/, '')}</button></div>
    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="create-modal" onClick={e => e.stopPropagation()}><button className="icon-button modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button><div className="modal-icon"><Icon size={22} /></div><p className="eyebrow">NEW {page.toUpperCase().replace(/S$/, '')}</p><h2>Coming together.</h2><p>The {page.toLowerCase()} editor is part of the next build. The workspace is ready for it.</p><button className="primary-button full" onClick={() => setShowCreate(false)}>Got it</button></div></div>}
  </div>
}

export default App