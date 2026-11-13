import { useEffect, useState } from 'react'
import {
  Activity, ArrowRight, Bell, CalendarDays, Check, ChevronDown, ClipboardList,
  Clock3, FolderKanban, LayoutDashboard, LogOut, Menu, MessageSquare, Moon,
  Plus, Presentation, Search, Send, Settings, Sparkles, Sun, Users, Workflow, X
} from 'lucide-react'
import { supabase } from './lib/supabase'

const navItems = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Teams', icon: Users },
  { label: 'Chats', icon: MessageSquare },
  { label: 'Forms', icon: ClipboardList },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Presentations', icon: Presentation },
  { label: 'Flows', icon: Workflow },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Settings', icon: Settings },
]

function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const accountEmail = value => value.trim().toLowerCase() + '@accounts.forma.invalid'

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
      : await supabase.auth.signInWithPassword({ email: accountEmail(normalizedUsername), password })
    setBusy(false)
    if (result.error) {
      setMessage(result.error.message.toLowerCase().includes('already registered')
        ? 'That username is already taken.'
        : result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
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
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState('Home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTeamId, setActiveTeamId] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('forma-theme') || 'light')

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session)
        setAuthLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('forma-theme', theme)
  }, [theme])

  if (authLoading) return <div className="app-loading"><div className="brand-mark">f</div><span>Opening Forma…</span></div>
  if (!session) return <AuthScreen />

  const displayUsername = session.user.user_metadata?.username || 'Your account'
  const initials = displayUsername.slice(0, 1).toUpperCase()

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (sidebarOpen ? 'sidebar-open' : '')}>
        <div className="brand-row"><div className="brand-mark">f</div><span>forma</span><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <button className="workspace-switch"><span className="workspace-avatar">F</span><span className="workspace-name"><strong>My workspace</strong><small>Free workspace</small></span><ChevronDown size={15} /></button>
        <div className="side-label">WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(item => <button key={item.label} className={'nav-item ' + (page === item.label ? 'active' : '')} onClick={() => { setPage(item.label); setSidebarOpen(false) }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span></button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row"><div className="profile-avatar">{initials}</div><div className="profile-info"><strong>{displayUsername}</strong><small>Forma account</small></div><button className="icon-button" title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={16} /></button></div>
        </div>
      </aside>

      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span className="breadcrumb">Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
          <div className="topbar-right"><label className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anything…" /><kbd>⌘ K</kbd></label><button className="icon-button" title="Toggle dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><div className="top-avatar">{initials}</div></div>
        </header>
        <div className="page-content">
          {page === 'Home' && <HomePage onNavigate={setPage} />}
          {page === 'Teams' && <TeamsPage userId={session.user.id} activeTeamId={activeTeamId} onOpenChat={id => { setActiveTeamId(id); setPage('Chats') }} />}
          {page === 'Chats' && <ChatsPage userId={session.user.id} activeTeamId={activeTeamId} onSelectTeam={setActiveTeamId} />}
          {page === 'Forms' && <FormsPage userId={session.user.id} search={search} />}
          {page === 'Calendar' && <CalendarPage userId={session.user.id} />}
          {page === 'Settings' && <SettingsPage username={displayUsername} theme={theme} onThemeChange={setTheme} />}
          {['Presentations', 'Flows', 'Projects'].includes(page) && <LaterPage page={page} />}
        </div>
      </main>
    </div>
  )
}

function HomePage({ onNavigate }) {
  return <>
    <section className="welcome-row"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Your space to get things done.</h1><p className="subheading">Everything your team needs, all in one place.</p></div><button className="primary-button" onClick={() => onNavigate('Teams')}><Plus size={17} /> Create a team</button></section>
    <section className="hero-card"><div className="hero-copy"><span className="hero-tag"><Sparkles size={13} /> THE WORKSPACE</span><h2>One place.<br />A lot more possible.</h2><p>Bring your people, plans, and ideas together. Start with a team or make something new.</p><button className="hero-button" onClick={() => onNavigate('Teams')}>Set up your workspace <ArrowRight size={16} /></button></div><div className="hero-art"><div className="art-window window-back"><div /><div /><div /></div><div className="art-window window-front"><div className="art-topline" /><div className="art-lines"><i /><i /><i /></div><div className="art-chart"><b /><b /><b /><b /><b /></div></div><div className="art-sticker"><Activity size={22} /></div><div className="art-spark">✳</div></div></section>
    <section className="section-heading"><div><h2>Jump right in</h2><p>Start with the tools that are ready.</p></div></section>
    <section className="quick-grid">
      <button className="quick-card" onClick={() => onNavigate('Teams')}><div className="quick-icon lavender"><Users size={20} /></div><div className="quick-text"><strong>Teams</strong><span>Create spaces for your work.</span></div><ArrowRight className="quick-arrow" size={17} /></button>
      <button className="quick-card" onClick={() => onNavigate('Chats')}><div className="quick-icon blue"><MessageSquare size={20} /></div><div className="quick-text"><strong>Chats</strong><span>Talk inside your teams.</span></div><ArrowRight className="quick-arrow" size={17} /></button>
      <button className="quick-card" onClick={() => onNavigate('Forms')}><div className="quick-icon peach"><ClipboardList size={20} /></div><div className="quick-text"><strong>Forms</strong><span>Draft questions and surveys.</span></div><ArrowRight className="quick-arrow" size={17} /></button>
      <button className="quick-card" onClick={() => onNavigate('Calendar')}><div className="quick-icon mint"><CalendarDays size={20} /></div><div className="quick-text"><strong>Calendar</strong><span>Keep track of what is next.</span></div><ArrowRight className="quick-arrow" size={17} /></button>
    </section>
    <section className="section-heading lower-heading"><div><h2>More is on the way</h2><p>These spaces are being built next.</p></div></section>
    <section className="overview-grid"><div className="overview-card"><div className="overview-icon lavender"><Presentation size={18} /></div><div><strong>Presentations</strong><span>Coming in a later update</span></div></div><div className="overview-card"><div className="overview-icon mint"><Workflow size={18} /></div><div><strong>Flows</strong><span>Coming in a later update</span></div></div><div className="overview-card"><div className="overview-icon peach"><FolderKanban size={18} /></div><div><strong>Projects</strong><span>Coming in a later update</span></div></div></section>
    <footer className="page-footer"><span>FORMA</span><span>Make room for good work.</span><span>v0.2 / PREVIEW</span></footer>
  </>
}

function TeamsPage({ userId, onOpenChat }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadTeams() {
    setLoading(true)
    const { data, error: loadError } = await supabase.from('teams').select('*').order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setTeams(data || [])
    setLoading(false)
  }
  useEffect(() => { loadTeams() }, [])

  async function createTeam(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { data, error: createError } = await supabase.from('teams').insert({
      name: name.trim(), description: description.trim(), created_by: userId,
    }).select().single()
    setBusy(false)
    if (createError) setError(createError.message)
    else {
      setTeams(current => [data, ...current])
      setName('')
      setDescription('')
      setShowCreate(false)
      onOpenChat(data.id)
    }
  }

  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / TEAMS</p><h1>Teams</h1><p className="subheading">Create a space for each group or project.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> New team</button></div>
    {error && <p className="inline-error">{error}</p>}
    {loading ? <div className="loading-card">Loading your teams…</div> : teams.length === 0 ? <EmptyFeature icon={Users} title="No teams yet" detail="Create your first team to give your work a home." action="Create a team" onAction={() => setShowCreate(true)} /> :
      <div className="data-grid">{teams.map(team => <button className="data-card team-card" key={team.id} onClick={() => onOpenChat(team.id)}><div className="data-icon lavender"><Users size={20} /></div><div className="data-card-copy"><strong>{team.name}</strong><span>{team.description || 'Team workspace'}</span><small>Created {new Date(team.created_at).toLocaleDateString()}</small></div><ArrowRight size={17} /></button>)}</div>}
    {showCreate && <Modal title="Create a team" onClose={() => setShowCreate(false)}><form className="feature-form" onSubmit={createTeam}><label>Team name<input value={name} onChange={e => setName(e.target.value)} placeholder="Design team" maxLength={80} required /></label><label>Description <span className="optional-label">Optional</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this team for?" rows={3} /></label>{error && <p className="inline-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? 'Creating…' : 'Create team'}</button></form></Modal>}
  </div>
}

function ChatsPage({ userId, activeTeamId, onSelectTeam }) {
  const [teams, setTeams] = useState([])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('teams').select('id,name').order('created_at', { ascending: true }).then(({ data, error: e }) => {
      if (e) setError(e.message)
      setTeams(data || [])
      if (!activeTeamId && data?.length) onSelectTeam(data[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!activeTeamId) { setMessages([]); return }
    let alive = true
    supabase.from('messages').select('*').eq('team_id', activeTeamId).order('created_at', { ascending: true }).then(({ data, error: e }) => {
      if (!alive) return
      if (e) setError(e.message)
      else setMessages(data || [])
    })
    const channel = supabase.channel('forma-chat-' + activeTeamId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'team_id=eq.' + activeTeamId }, payload => {
        setMessages(current => current.some(item => item.id === payload.new.id) ? current : [...current, payload.new])
      }).subscribe()
    return () => { alive = false; supabase.removeChannel(channel) }
  }, [activeTeamId])

  async function sendMessage(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !activeTeamId) return
    setDraft('')
    const { data, error: sendError } = await supabase.from('messages').insert({
      team_id: activeTeamId, user_id: userId, content,
    }).select().single()
    if (sendError) { setDraft(content); setError(sendError.message) }
    else setMessages(current => current.some(item => item.id === data.id) ? current : [...current, data])
  }

  const activeTeam = teams.find(team => team.id === activeTeamId)
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / CHAT</p><h1>Chats</h1><p className="subheading">Conversations inside your teams.</p></div></div>
    {loading ? <div className="loading-card">Loading chats…</div> : teams.length === 0 ? <EmptyFeature icon={MessageSquare} title="No team chats yet" detail="Create a team first, then its chat will appear here." action="Go to Teams" onAction={() => window.dispatchEvent(new CustomEvent('forma:navigate', { detail: 'Teams' }))} /> :
      <div className="chat-layout">
        <aside className="chat-team-list"><div className="chat-list-heading">YOUR TEAMS</div>{teams.map(team => <button key={team.id} className={'chat-team-option ' + (team.id === activeTeamId ? 'selected' : '')} onClick={() => onSelectTeam(team.id)}><span className="chat-team-avatar">{team.name.slice(0,1).toUpperCase()}</span>{team.name}</button>)}</aside>
        <section className="chat-panel"><header className="chat-header"><div className="chat-team-avatar">{activeTeam?.name?.slice(0,1).toUpperCase() || 'T'}</div><div><strong>{activeTeam?.name || 'Team chat'}</strong><span>Team conversation</span></div></header>
          <div className="chat-messages">{messages.length === 0 ? <div className="chat-empty"><MessageSquare size={28} /><strong>Start the conversation</strong><span>Send the first message to this team.</span></div> : messages.map(message => <div className={'chat-message ' + (message.user_id === userId ? 'mine' : '')} key={message.id}><div className="message-author">{message.user_id === userId ? 'You' : 'Team member'} <span>{new Date(message.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div><div className="message-bubble">{message.content}</div></div>)}</div>
          {error && <p className="inline-error chat-error">{error}</p>}
          <form className="chat-compose" onSubmit={sendMessage}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…" maxLength={4000} /><button className="primary-button" disabled={!draft.trim()} aria-label="Send message"><Send size={16} /></button></form>
        </section>
      </div>}
  </div>
}

function FormsPage({ userId, search }) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState([''])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('forms').select('*').order('created_at', { ascending: false }).then(({ data, error: e }) => {
      if (e) setError(e.message)
      else setForms(data || [])
      setLoading(false)
    })
  }, [])

  async function createForm(event) {
    event.preventDefault()
    const cleanQuestions = questions.map(q => q.trim()).filter(Boolean).map((prompt, index) => ({ id: index + 1, prompt, type: 'short_text' }))
    setBusy(true)
    setError('')
    const { data, error: e } = await supabase.from('forms').insert({
      title: title.trim(), description: description.trim(), questions: cleanQuestions, created_by: userId,
    }).select().single()
    setBusy(false)
    if (e) setError(e.message)
    else {
      setForms(current => [data, ...current])
      setTitle('')
      setDescription('')
      setQuestions([''])
      setShowCreate(false)
    }
  }

  const visibleForms = forms.filter(form => (form.title + ' ' + form.description).toLowerCase().includes(search.toLowerCase()))
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / FORMS</p><h1>Forms</h1><p className="subheading">Draft forms, surveys, and questionnaires.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> New form</button></div>
    {error && <p className="inline-error">{error}</p>}
    {loading ? <div className="loading-card">Loading your forms…</div> : visibleForms.length === 0 ? <EmptyFeature icon={ClipboardList} title={search ? 'No matching forms' : 'No forms yet'} detail="Create a form and start adding questions." action="Create a form" onAction={() => setShowCreate(true)} /> :
      <div className="data-grid">{visibleForms.map(form => <div className="data-card" key={form.id}><div className="data-icon peach"><ClipboardList size={20} /></div><div className="data-card-copy"><strong>{form.title}</strong><span>{form.description || 'No description'}</span><small>{form.questions?.length || 0} question(s) · Draft</small></div><span className="draft-pill">DRAFT</span></div>)}</div>}
    {showCreate && <Modal title="Create a form" onClose={() => setShowCreate(false)}><form className="feature-form" onSubmit={createForm}><label>Form title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Weekly check-in" maxLength={120} required /></label><label>Description <span className="optional-label">Optional</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people what this form is for." rows={2} /></label><div className="question-editor"><div className="question-editor-heading">QUESTIONS</div>{questions.map((question, index) => <label key={index}>Question {index + 1}<input value={question} onChange={e => setQuestions(current => current.map((item, i) => i === index ? e.target.value : item))} placeholder="What would you like to ask?" /></label>)}<button type="button" className="text-button" onClick={() => setQuestions(current => [...current, ''])}><Plus size={15} /> Add question</button></div>{error && <p className="inline-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</button></form></Modal>}
  </div>
}

function CalendarPage({ userId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadEvents() {
    const { data, error: e } = await supabase.from('calendar_events').select('*').order('starts_at', { ascending: true })
    if (e) setError(e.message)
    else setEvents(data || [])
    setLoading(false)
  }
  useEffect(() => { loadEvents() }, [])

  async function createEvent(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { data, error: e } = await supabase.from('calendar_events').insert({
      title: title.trim(), description: description.trim(), starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null, created_by: userId,
    }).select().single()
    setBusy(false)
    if (e) setError(e.message)
    else {
      setEvents(current => [...current, data].sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at)))
      setTitle('')
      setDescription('')
      setStartsAt('')
      setEndsAt('')
      setShowCreate(false)
    }
  }

  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / CALENDAR</p><h1>Calendar</h1><p className="subheading">Keep track of meetings, reminders, and important dates.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> New event</button></div>
    {error && <p className="inline-error">{error}</p>}
    {loading ? <div className="loading-card">Loading your calendar…</div> : events.length === 0 ? <EmptyFeature icon={CalendarDays} title="Your calendar is clear" detail="Add an event to start planning your time." action="Add an event" onAction={() => setShowCreate(true)} /> :
      <div className="event-list">{events.map(event => <div className="event-card" key={event.id}><div className="event-date"><strong>{new Date(event.starts_at).toLocaleDateString([], { day: '2-digit' })}</strong><span>{new Date(event.starts_at).toLocaleDateString([], { month: 'short' })}</span></div><div className="event-copy"><strong>{event.title}</strong><span>{new Date(event.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}{event.ends_at ? ' – ' + new Date(event.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</span>{event.description && <small>{event.description}</small>}</div></div>)}</div>}
    {showCreate && <Modal title="Add a calendar event" onClose={() => setShowCreate(false)}><form className="feature-form" onSubmit={createEvent}><label>Event name<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Team meeting" maxLength={120} required /></label><label>Starts<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></label><label>Ends <span className="optional-label">Optional</span><input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} min={startsAt || undefined} /></label><label>Description <span className="optional-label">Optional</span><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Add a few details…" /></label>{error && <p className="inline-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? 'Saving…' : 'Save event'}</button></form></Modal>}
  </div>
}

function SettingsPage({ username, theme, onThemeChange }) {
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / SETTINGS</p><h1>Settings</h1><p className="subheading">Make Forma feel the way you want.</p></div></div>
    <section className="settings-section"><div className="settings-section-title"><strong>Appearance</strong><span>Choose how Forma looks on this device.</span></div><div className="setting-row"><div className="setting-icon">{theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}</div><div className="setting-copy"><strong>Dark mode</strong><span>Use a darker color scheme across Forma.</span></div><button className={'toggle-switch ' + (theme === 'dark' ? 'on' : '')} onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} role="switch" aria-checked={theme === 'dark'}><span /></button></div></section>
    <section className="settings-section"><div className="settings-section-title"><strong>Account</strong><span>Your current Forma profile.</span></div><div className="setting-row"><div className="setting-icon"><Users size={19} /></div><div className="setting-copy"><strong>Username</strong><span>{username}</span></div></div></section>
  </div>
}

function LaterPage({ page }) {
  const icons = { Presentations: Presentation, Flows: Workflow, Projects: FolderKanban }
  const Icon = icons[page]
  return <div className="feature-page"><div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>{page}</h1><p className="subheading">This part of Forma is planned for a later update.</p></div></div><EmptyFeature icon={Icon} title="Coming in a later update" detail="The first build is focused on teams, chats, forms, and your calendar." /></div>
}

function EmptyFeature({ icon: Icon, title, detail, action, onAction }) {
  return <div className="feature-empty"><div className="empty-circle"><Icon size={30} /></div><h2>{title}</h2><p>{detail}</p>{action && <button className="primary-button" onClick={onAction}><Plus size={16} /> {action}</button>}</div>
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="create-modal" onClick={e => e.stopPropagation()}><button className="icon-button modal-close" onClick={onClose}><X size={18} /></button><h2 className="feature-modal-title">{title}</h2>{children}</div></div>
}

export default App
