import { useEffect, useRef, useState } from 'react'
import {
  Activity, ArrowRight, Bell, CalendarDays, Check, ChevronDown, ClipboardList,
  Clock3, FolderKanban, LayoutDashboard, LogOut, Menu, MessageSquare, Moon,
  Plus, Presentation, Search, Send, Settings, Sparkles, Sun, Users, Workflow, X,
  File, Upload, Trash2, Code2, UserPlus, Palette, GitBranch, Video, VideoOff, Mic, MicOff, PhoneOff
} from 'lucide-react'
import { supabase } from './lib/supabase'

const navItems = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Teams', icon: Users },
  { label: 'Chats', icon: MessageSquare },
  { label: 'Private Chats', icon: MessageSquare },
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
  const [preset, setPreset] = useState(() => localStorage.getItem('forma-preset') || 'violet')
  const [customAccent, setCustomAccent] = useState(() => localStorage.getItem('forma-custom-accent') || '#7867e8')
  const [customBackground, setCustomBackground] = useState(() => localStorage.getItem('forma-custom-background') || '#f5f6fb')

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
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.preset = preset
    const accents = { violet: '#7867e8', ocean: '#2787c7', forest: '#29956f', sunset: '#dc7956', rose: '#ce648e', graphite: '#687386' }
    root.style.setProperty('--accent', preset === 'custom' ? customAccent : accents[preset] || accents.violet)
    root.style.setProperty('--page-custom', customBackground)
    localStorage.setItem('forma-theme', theme)
    localStorage.setItem('forma-preset', preset)
    localStorage.setItem('forma-custom-accent', customAccent)
    localStorage.setItem('forma-custom-background', customBackground)
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
          {page === 'Chats' && <ChatsPage userId={session.user.id} username={displayUsername} activeTeamId={activeTeamId} onSelectTeam={setActiveTeamId} onNavigate={setPage} />}
          {page === 'Private Chats' && <PrivateChatsPage userId={session.user.id} />}
          {page === 'Forms' && <FormsPage userId={session.user.id} search={search} />}
          {page === 'Calendar' && <CalendarPage userId={session.user.id} />}
          {page === 'Settings' && <SettingsPage username={displayUsername} theme={theme} onThemeChange={setTheme} preset={preset} onPresetChange={setPreset} customAccent={customAccent} onCustomAccentChange={setCustomAccent} customBackground={customBackground} onCustomBackgroundChange={setCustomBackground} />}
          {page === 'Flows' && <FlowsPage userId={session.user.id} />}
          {page === 'Projects' && <ProjectsPage userId={session.user.id} />}
          {page === 'Presentations' && <LaterPage page={page} />}
        </div>
      </main>
      <CallNotifications userId={session.user.id} username={displayUsername} />
    </div>
  )
}


function CallNotifications({ userId, username }) {
  const [incomingCall, setIncomingCall] = useState(null)
  const [joinedCallTeam, setJoinedCallTeam] = useState('')
  const [showCall, setShowCall] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const channel = supabase.channel('forma-global-call-invites-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_call_invites', filter: 'recipient_id=eq.' + userId }, payload => {
        setIncomingCall(payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function respond(accept) {
    if (!incomingCall) return
    const { error: responseError } = await supabase.rpc('respond_forma_team_call', {
      p_invitation_id: incomingCall.id, p_accept: accept,
    })
    if (responseError) setError(responseError.message)
    else {
      if (accept) {
        setJoinedCallTeam(incomingCall.team_id)
        setShowCall(true)
      }
      setIncomingCall(null)
    }
  }

  return <>
    {incomingCall && <div className="incoming-call-layer"><div className="incoming-call-card"><div><strong>Incoming team call</strong><span>{incomingCall.team_name || 'A team member'} is inviting you to join.</span></div><button className="secondary-button" onClick={() => respond(false)}>Decline</button><button className="primary-button" onClick={() => respond(true)}>Join call</button>{error && <p className="inline-error">{error}</p>}</div></div>}
    {showCall && joinedCallTeam && <TeamCall teamId={joinedCallTeam} userId={userId} username={username} onClose={() => { setShowCall(false); setJoinedCallTeam('') }} />}
  </>
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
      <button className="quick-card" onClick={() => onNavigate('Flows')}><div className="quick-icon mint"><Workflow size={20} /></div><div className="quick-text"><strong>Flows</strong><span>Map out a process step by step.</span></div><ArrowRight className="quick-arrow" size={17} /></button>
      <button className="quick-card" onClick={() => onNavigate('Projects')}><div className="quick-icon lavender"><FolderKanban size={20} /></div><div className="quick-text"><strong>Projects</strong><span>Keep files and code together.</span></div><ArrowRight className="quick-arrow" size={17} /></button>
    </section>
    <section className="section-heading lower-heading"><div><h2>Still in the workshop</h2><p>More Forma tools are coming together.</p></div></section>
    <section className="overview-grid"><div className="overview-card"><div className="overview-icon lavender"><Presentation size={18} /></div><div><strong>Presentations</strong><span>Coming in a later update</span></div></div></section>
    <footer className="page-footer"><span>FORMA</span><span>Make room for good work.</span><span>v0.2 / PREVIEW</span></footer>
  </>
}

function TeamsPage({ userId, onOpenChat }) {
  const [teams, setTeams] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [inviteTeam, setInviteTeam] = useState(null)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')

  async function loadTeams() {
    setLoading(true)
    const [{ data, error: loadError }, { data: inviteData, error: inviteError }] = await Promise.all([
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('team_invitations').select('id,team_id,sender_id,team_name,created_at').eq('recipient_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    if (loadError) setError(loadError.message)
    else setTeams(data || [])
    if (inviteError) setError(inviteError.message)
    else setInvitations(inviteData || [])
    setLoading(false)
  }
  useEffect(() => {
    loadTeams()
    const channel = supabase.channel('forma-team-invitations-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invitations', filter: 'recipient_id=eq.' + userId }, loadTeams)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

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

  async function respondToInvite(invitation, accept) {
    setError('')
    const { error: responseError } = await supabase.rpc('respond_forma_team_invite', {
      p_invitation_id: invitation.id, p_accept: accept,
    })
    if (responseError) setError(responseError.message)
    else {
      setInvitations(current => current.filter(item => item.id !== invitation.id))
      if (accept) await loadTeams()
    }
  }

  async function leaveTeam(team) {
    if (!window.confirm('Leave ' + team.name + '?')) return
    setError('')
    const { error: leaveError } = await supabase.rpc('leave_forma_team', { p_team_id: team.id })
    if (leaveError) setError(leaveError.message)
    else setTeams(current => current.filter(item => item.id !== team.id))
  }

  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / TEAMS</p><h1>Teams</h1><p className="subheading">Create a space for each group or project.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> New team</button></div>
    {error && <p className="inline-error">{error}</p>}
    {invitations.length > 0 && <section className="team-invitations"><div className="section-heading"><div><h2>Team invitations</h2><p>Choose which teams you want to join.</p></div></div>{invitations.map(invite => <div className="team-invitation-row" key={invite.id}><div><strong>{invite.team_name || 'Team invitation'}</strong><span>Invited you to join this team</span></div><button className="secondary-button" onClick={() => respondToInvite(invite, false)}>Decline</button><button className="primary-button" onClick={() => respondToInvite(invite, true)}>Accept</button></div>)}</section>}
    {loading ? <div className="loading-card">Loading your teams…</div> : teams.length === 0 ? <EmptyFeature icon={Users} title="No teams yet" detail="Create your first team or accept an invitation." action="Create a team" onAction={() => setShowCreate(true)} /> :
      <div className="data-grid">{teams.map(team => <div className="data-card team-card" key={team.id}><button className="team-card-open" onClick={() => onOpenChat(team.id)}><div className="data-icon lavender"><Users size={20} /></div><div className="data-card-copy"><strong>{team.name}</strong><span>{team.description || 'Team workspace'}</span><small>Created {new Date(team.created_at).toLocaleDateString()}</small></div><ArrowRight size={17} /></button>{team.created_by === userId && <button className="secondary-button invite-button" onClick={() => { setInviteTeam(team); setInviteUsername(''); setInviteMessage('') }}><UserPlus size={14} /> Invite</button>}<button className="secondary-button invite-button" onClick={() => leaveTeam(team)}>Leave</button></div>)}</div>}
    {showCreate && <Modal title="Create a team" onClose={() => setShowCreate(false)}><form className="feature-form" onSubmit={createTeam}><label>Team name<input value={name} onChange={e => setName(e.target.value)} placeholder="Design team" maxLength={80} required /></label><label>Description <span className="optional-label">Optional</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this team for?" rows={3} /></label>{error && <p className="inline-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? 'Creating…' : 'Create team'}</button></form></Modal>}
    {inviteTeam && <Modal title={`Invite to ${inviteTeam.name}`} onClose={() => setInviteTeam(null)}><form className="feature-form" onSubmit={async event => { event.preventDefault(); setInviteMessage(''); const { error: inviteError } = await supabase.rpc('send_forma_team_invite', { p_team_id: inviteTeam.id, p_username: inviteUsername.trim().toLowerCase() }); setInviteMessage(inviteError ? inviteError.message : 'Invitation sent. They must accept before joining.'); if (!inviteError) setInviteUsername('') }}><label>Forma username<input value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="their_username" minLength={3} maxLength={20} required /></label>{inviteMessage && <p className={inviteMessage.startsWith('Invitation') ? 'success-message' : 'inline-error'}>{inviteMessage}</p>}<button className="primary-button full">Send invitation</button><p className="form-hint">They will receive an invitation and must accept it before they become a team member.</p></form></Modal>}
  </div>
}

function ChatsPage({ userId, username, activeTeamId, onSelectTeam, onNavigate }) {
  const [teams, setTeams] = useState([])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCall, setShowCall] = useState(false)
  const [waitingForAnswer, setWaitingForAnswer] = useState(false)
  const [callTeamId, setCallTeamId] = useState('')

  useEffect(() => {
    supabase.from('teams').select('id,name').order('created_at', { ascending: true }).then(({ data, error: e }) => {
      if (e) setError(e.message)
      setTeams(data || [])
      if (!activeTeamId && data?.length) onSelectTeam(data[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const channel = supabase.channel('forma-call-invitations-' + userId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_call_invites', filter: 'caller_id=eq.' + userId }, payload => {
        if (payload.new.status === 'accepted') {
          setWaitingForAnswer(false)
          setShowCall(true)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

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

  async function startCall() {
    if (!activeTeamId) return
    setError('')
    const { data, error: callError } = await supabase.rpc('start_forma_team_call', { p_team_id: activeTeamId })
    if (callError) setError(callError.message)
    else if (!data?.length) setError('There is nobody else in this team to invite yet.')
    else { setCallTeamId(activeTeamId); setWaitingForAnswer(true) }
  }

  const activeTeam = teams.find(team => team.id === activeTeamId)
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / CHAT</p><h1>Chats</h1><p className="subheading">Conversations inside your teams.</p></div></div>
    {waitingForAnswer && <p className="success-message call-waiting">Calling your team… Waiting for someone to accept.</p>}
    {loading ? <div className="loading-card">Loading chats…</div> : teams.length === 0 ? <EmptyFeature icon={MessageSquare} title="No team chats yet" detail="Create a team first, then its chat will appear here." action="Go to Teams" onAction={() => onNavigate('Teams')} /> :
      <div className="chat-layout">
        <aside className="chat-team-list"><div className="chat-list-heading">YOUR TEAMS</div>{teams.map(team => <button key={team.id} className={'chat-team-option ' + (team.id === activeTeamId ? 'selected' : '')} onClick={() => onSelectTeam(team.id)}><span className="chat-team-avatar">{team.name.slice(0,1).toUpperCase()}</span>{team.name}</button>)}</aside>
        <section className="chat-panel"><header className="chat-header"><div className="chat-team-avatar">{activeTeam?.name?.slice(0,1).toUpperCase() || 'T'}</div><div><strong>{activeTeam?.name || 'Team chat'}</strong><span>Team conversation</span></div>{activeTeamId && <button className="primary-button call-start-button" onClick={startCall}><Video size={15}/> Start call</button>}</header>
          <div className="chat-messages">{messages.length === 0 ? <div className="chat-empty"><MessageSquare size={28} /><strong>Start the conversation</strong><span>Send the first message to this team.</span></div> : messages.map(message => <div className={'chat-message ' + (message.user_id === userId ? 'mine' : '')} key={message.id}><div className="message-author">{message.user_id === userId ? 'You' : 'Team member'} <span>{new Date(message.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div><div className="message-bubble">{message.content}</div></div>)}</div>
          {error && <p className="inline-error chat-error">{error}</p>}
          <form className="chat-compose" onSubmit={sendMessage}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…" maxLength={4000} /><button className="primary-button" disabled={!draft.trim()} aria-label="Send message"><Send size={16} /></button></form>
        </section>
      </div>}
    {showCall && (callTeamId || activeTeamId) && <TeamCall teamId={callTeamId || activeTeamId} userId={userId} username={username} onClose={() => { setShowCall(false); setCallTeamId('') }} />}
  </div>
}

function TeamCall({ teamId, userId, username, onClose }) {
  const localVideoRef = useRef(null)
  const channelRef = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const pendingIceRef = useRef(new Map())
  const [remoteStreams, setRemoteStreams] = useState({})
  const [participants, setParticipants] = useState([])
  const [status, setStatus] = useState('Connecting to call…')
  const [error, setError] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)

  useEffect(() => {
    let alive = true
    let channel
    const sendSignal = (to, kind, data) => {
      if (!channelRef.current) return
      channelRef.current.send({ type: 'broadcast', event: 'signal', payload: { from: userId, to, kind, data } })
    }
    const drainIce = async (remoteId, peer) => {
      const queued = pendingIceRef.current.get(remoteId) || []
      pendingIceRef.current.delete(remoteId)
      for (const candidate of queued) await peer.addIceCandidate(new RTCIceCandidate(candidate))
    }
    const makePeer = remoteId => {
      if (peersRef.current.has(remoteId)) return peersRef.current.get(remoteId)
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })
      localStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current))
      peer.onicecandidate = event => {
        if (event.candidate) sendSignal(remoteId, 'ice', event.candidate)
      }
      peer.ontrack = event => {
        const stream = event.streams[0]
        if (stream) setRemoteStreams(current => ({ ...current, [remoteId]: stream }))
      }
      peer.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
          setRemoteStreams(current => {
            const next = { ...current }
            delete next[remoteId]
            return next
          })
        }
      }
      peersRef.current.set(remoteId, peer)
      return peer
    }
    const startOffer = async remoteId => {
      if (userId.localeCompare(remoteId) >= 0 || peersRef.current.has(remoteId)) return
      const peer = makePeer(remoteId)
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      sendSignal(remoteId, 'offer', peer.localDescription)
    }

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone and camera access requires a secure browser connection.')
        }
        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        } catch (videoError) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          setCameraOn(false)
          setError('Camera unavailable, so you joined with microphone audio only.')
        }
        if (!alive) { stream.getTracks().forEach(track => track.stop()); return }
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream

        await supabase.realtime.setAuth()
        channel = supabase.channel('forma-team-call:' + teamId, {
          config: { private: true, presence: { key: userId }, broadcast: { self: false } },
        })
        channelRef.current = channel
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            const rows = Object.entries(state).flatMap(([key, metas]) => (metas || []).map(meta => ({
              id: meta.user_id || key,
              username: meta.username || 'Forma member',
            })))
            setParticipants(rows)
            rows.forEach(person => {
              if (person.id !== userId) startOffer(person.id).catch(e => setError(e.message))
            })
            const presentIds = new Set(rows.map(person => person.id))
            peersRef.current.forEach((peer, id) => {
              if (!presentIds.has(id)) {
                peer.close()
                peersRef.current.delete(id)
                setRemoteStreams(current => {
                  const next = { ...current }
                  delete next[id]
                  return next
                })
              }
            })
          })
          .on('broadcast', { event: 'signal' }, async ({ payload }) => {
            if (!payload || payload.to !== userId || !alive) return
            try {
              if (payload.kind === 'offer') {
                const peer = makePeer(payload.from)
                await peer.setRemoteDescription(new RTCSessionDescription(payload.data))
                await drainIce(payload.from, peer)
                const answer = await peer.createAnswer()
                await peer.setLocalDescription(answer)
                sendSignal(payload.from, 'answer', peer.localDescription)
              } else if (payload.kind === 'answer') {
                const peer = peersRef.current.get(payload.from)
                if (peer) {
                  await peer.setRemoteDescription(new RTCSessionDescription(payload.data))
                  await drainIce(payload.from, peer)
                }
              } else if (payload.kind === 'ice' && payload.data) {
                const peer = peersRef.current.get(payload.from)
                if (peer?.remoteDescription?.type) await peer.addIceCandidate(new RTCIceCandidate(payload.data))
                else pendingIceRef.current.set(payload.from, [...(pendingIceRef.current.get(payload.from) || []), payload.data])
              }
            } catch (e) {
              setError(e.message || 'Could not connect to another participant.')
            }
          })
          .subscribe(async state => {
            if (state === 'SUBSCRIBED') {
              setStatus('You’re in the call')
              await channel.track({ user_id: userId, username, joined_at: new Date().toISOString() })
            } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
              setStatus('Could not connect')
              setError('Call connection failed. Check that Supabase Realtime is enabled and team-call access is configured.')
            }
          })
      } catch (e) {
        if (alive) {
          setStatus('Camera or microphone unavailable')
          setError(e.message || 'Please allow camera and microphone access, then try again.')
        }
      }
    }
    start()
    return () => {
      alive = false
      peersRef.current.forEach(peer => peer.close())
      peersRef.current.clear()
      pendingIceRef.current.clear()
      localStreamRef.current?.getTracks().forEach(track => track.stop())
      if (channel) supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [teamId, userId, username])

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current
  }, [status])

  function toggleMic() {
    const next = !micOn
    localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = next })
    setMicOn(next)
  }
  function toggleCamera() {
    const next = !cameraOn
    localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = next })
    setCameraOn(next)
  }

  return <div className="call-overlay">
    <section className="call-window">
      <header className="call-window-header"><div><span className="call-live-dot" /> <strong>Team call</strong><small>{status} · {participants.length || 1} here</small></div><button className="icon-button" onClick={onClose} aria-label="Close call"><X size={18}/></button></header>
      {error && <p className="inline-error call-error">{error}</p>}
      <div className="call-video-grid">
        <div className="call-video-tile local"><video ref={localVideoRef} autoPlay muted playsInline/><span>You {cameraOn ? '' : '· Camera off'}</span></div>
        {Object.entries(remoteStreams).map(([id, stream]) => <div className="call-video-tile" key={id}><video autoPlay playsInline ref={element => { if (element && element.srcObject !== stream) element.srcObject = stream }}/><span>{participants.find(p => p.id === id)?.username || 'Team member'}</span></div>)}
        {participants.filter(p => p.id !== userId && !remoteStreams[p.id]).map(person => <div className="call-video-placeholder" key={person.id}><div>{person.username.slice(0,1).toUpperCase()}</div><span>{person.username} · Connecting…</span></div>)}
      </div>
      <footer className="call-controls"><button className={micOn ? 'call-control' : 'call-control off'} onClick={toggleMic} title={micOn ? 'Mute microphone' : 'Turn microphone on'}>{micOn ? <Mic size={18}/> : <MicOff size={18}/>}</button><button className={cameraOn ? 'call-control' : 'call-control off'} onClick={toggleCamera} title={cameraOn ? 'Turn camera off' : 'Turn camera on'}>{cameraOn ? <Video size={18}/> : <VideoOff size={18}/>}</button><button className="call-control hangup" onClick={onClose} title="Leave call"><PhoneOff size={18}/></button></footer>
      <p className="call-footnote">Calls connect directly between participants. Connection quality may vary across networks.</p>
    </section>
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

function SettingsPage({ username, theme, onThemeChange, preset, onPresetChange, customAccent, onCustomAccentChange, customBackground, onCustomBackgroundChange }) {
  const presets = [{id:'violet',name:'Violet',color:'#7867e8'},{id:'ocean',name:'Ocean',color:'#2787c7'},{id:'forest',name:'Forest',color:'#29956f'},{id:'sunset',name:'Sunset',color:'#dc7956'},{id:'rose',name:'Rose',color:'#ce648e'},{id:'graphite',name:'Graphite',color:'#687386'}]
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / SETTINGS</p><h1>Settings</h1><p className="subheading">Make Forma feel the way you want.</p></div></div>
    <section className="settings-section"><div className="settings-section-title"><strong>Appearance</strong><span>Choose a mode and a color style. Your choices stay on this device.</span></div>
      <div className="setting-row"><div className="setting-icon">{theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}</div><div className="setting-copy"><strong>Dark mode</strong><span>Use a darker color scheme across Forma.</span></div><button className={'toggle-switch ' + (theme === 'dark' ? 'on' : '')} onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} role="switch" aria-checked={theme === 'dark'}><span /></button></div>
      <div className="preset-heading"><strong>Color presets</strong><span>Pick an accent color for buttons and highlights.</span></div>
      <div className="preset-grid">{presets.map(item=><button key={item.id} className={'preset-card '+(preset===item.id?'selected':'')} onClick={()=>onPresetChange(item.id)}><span className="preset-swatch" style={{background:item.color}}/><strong>{item.name}</strong>{preset===item.id&&<Check size={15}/>}</button>)}</div>
      <button className={'custom-preset-row '+(preset==='custom'?'selected':'')} onClick={()=>onPresetChange('custom')}><Palette size={17}/> Custom theme <span>Choose your own colors</span></button>
      {preset==='custom' && <div className="custom-colors"><label>Accent color<input type="color" value={customAccent} onChange={e=>onCustomAccentChange(e.target.value)}/></label><label>Light background<input type="color" value={customBackground} onChange={e=>onCustomBackgroundChange(e.target.value)}/></label></div>}
    </section>
    <section className="settings-section"><div className="settings-section-title"><strong>Account</strong><span>Your current Forma profile.</span></div><div className="setting-row"><div className="setting-icon"><Users size={19}/></div><div className="setting-copy"><strong>Username</strong><span>{username}</span></div></div></section>
  </div>
}
function LaterPage({ page }) {
  const icons = { Presentations: Presentation, Flows: Workflow, Projects: FolderKanban }
  const Icon = icons[page]
  return <div className="feature-page"><div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>{page}</h1><p className="subheading">This part of Forma is planned for a later update.</p></div></div><EmptyFeature icon={Icon} title="Coming in a later update" detail="The first build is focused on teams, chats, forms, and your calendar." /></div>
}


function PrivateChatsPage({ userId }) {
  const [items,setItems]=useState([])
  const [activeId,setActiveId]=useState('')
  const [messages,setMessages]=useState([])
  const [username,setUsername]=useState('')
  const [draft,setDraft]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  async function loadChats(){
    setLoading(true)
    const {data: memberships,error:e}=await supabase.from('conversation_members').select('conversation_id').eq('user_id',userId)
    if(e){setError(e.message);setLoading(false);return}
    const ids=(memberships||[]).map(x=>x.conversation_id)
    if(!ids.length){setItems([]);setLoading(false);return}
    const {data: allMembers}=await supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id',ids).neq('user_id',userId)
    const userIds=[...new Set((allMembers||[]).map(x=>x.user_id))]
    const {data: profiles}=userIds.length?await supabase.from('profiles').select('user_id,username').in('user_id',userIds):{data:[]}
    const rows=ids.map(id=>({id,partner:(profiles||[]).find(p=>(allMembers||[]).some(m=>m.conversation_id===id&&m.user_id===p.user_id))?.username||'Forma user'}))
    setItems(rows)
    if(!activeId&&rows.length)setActiveId(rows[0].id)
    setLoading(false)
  }
  useEffect(()=>{loadChats()},[])
  useEffect(()=>{
    if(!activeId){setMessages([]);return}
    let alive=true
    supabase.from('direct_messages').select('*').eq('conversation_id',activeId).order('created_at',{ascending:true}).then(({data,error:e})=>{if(!alive)return;if(e)setError(e.message);else setMessages(data||[])})
    const channel=supabase.channel('forma-dm-'+activeId).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:'conversation_id=eq.'+activeId},payload=>setMessages(current=>current.some(m=>m.id===payload.new.id)?current:[...current,payload.new])).subscribe()
    return()=>{alive=false;supabase.removeChannel(channel)}
  },[activeId])
  async function startChat(event){
    event.preventDefault();setError('')
    const {data,error:e}=await supabase.rpc('start_forma_direct_chat',{p_username:username.trim().toLowerCase()})
    if(e){setError(e.message);return}
    setUsername('')
    await loadChats()
    setActiveId(data)
  }
  async function send(event){
    event.preventDefault();const content=draft.trim();if(!content||!activeId)return
    setDraft('')
    const {data,error:e}=await supabase.from('direct_messages').insert({conversation_id:activeId,sender_id:userId,content}).select().single()
    if(e){setDraft(content);setError(e.message)}else setMessages(current=>current.some(m=>m.id===data.id)?current:[...current,data])
  }
  const active=items.find(x=>x.id===activeId)
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / MESSAGES</p><h1>Private chats</h1><p className="subheading">One-to-one conversations with people on Forma.</p></div></div>
    <form className="start-chat-form" onSubmit={startChat}><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Start a chat by username…" minLength={3} maxLength={20} required/><button className="primary-button"><Plus size={16}/> New chat</button></form>
    {error&&<p className="inline-error">{error}</p>}
    {loading?<div className="loading-card">Loading private chats…</div>:<div className="chat-layout">
      <aside className="chat-team-list"><div className="chat-list-heading">PRIVATE CHATS</div>{items.map(item=><button key={item.id} className={'chat-team-option '+(item.id===activeId?'selected':'')} onClick={()=>setActiveId(item.id)}><span className="chat-team-avatar">{item.partner.slice(0,1).toUpperCase()}</span>{item.partner}</button>)}</aside>
      <section className="chat-panel">{active?<><header className="chat-header"><div className="chat-team-avatar">{active.partner.slice(0,1).toUpperCase()}</div><div><strong>{active.partner}</strong><span>Private conversation</span></div></header><div className="chat-messages">{messages.length===0?<div className="chat-empty"><MessageSquare size={28}/><strong>Say hello</strong><span>This conversation is just between you two.</span></div>:messages.map(m=><div className={'chat-message '+(m.sender_id===userId?'mine':'')} key={m.id}><div className="message-author">{m.sender_id===userId?'You':active.partner}<span>{new Date(m.created_at).toLocaleString([], {dateStyle:'short',timeStyle:'short'})}</span></div><div className="message-bubble">{m.content}</div></div>)}</div><form className="chat-compose" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a private message…" maxLength={4000}/><button className="primary-button" disabled={!draft.trim()}><Send size={16}/></button></form></>:<div className="chat-empty"><MessageSquare size={28}/><strong>No private chats yet</strong><span>Enter a Forma username above to start one.</span></div>}</section>
    </div>}
  </div>
}

function ProjectsPage({ userId }) {
  const [projects,setProjects]=useState([])
  const [active,setActive]=useState(null)
  const [files,setFiles]=useState([])
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [creating,setCreating]=useState(false)
  const [html,setHtml]=useState('<h1>Hello from Forma</h1><p>Your project starts here.</p>')
  const [css,setCss]=useState('body { font-family: sans-serif; padding: 2rem; }')
  const [js,setJs]=useState('console.log("Hello from Forma");')
  const [preview,setPreview]=useState(false)
  const [error,setError]=useState('')
  async function load(){const {data,error:e}=await supabase.from('projects').select('*').order('created_at',{ascending:false});if(e)setError(e.message);else setProjects(data||[])}
  useEffect(()=>{load()},[])
  async function create(event){event.preventDefault();const {data,error:e}=await supabase.from('projects').insert({name:name.trim(),description:description.trim(),owner_id:userId}).select().single();if(e)setError(e.message);else{setProjects(p=>[data,...p]);setActive(data);setHtml(data.html_code);setCss(data.css_code);setJs(data.js_code);setCreating(false);setName('');setDescription('')}}
  async function openProject(project){setActive(project);setHtml(project.html_code||'');setCss(project.css_code||'');setJs(project.js_code||'');setPreview(false);const {data,error:e}=await supabase.from('project_files').select('*').eq('project_id',project.id).order('created_at',{ascending:false});if(e)setError(e.message);else setFiles(data||[])}
  async function saveCode(){const {error:e}=await supabase.from('projects').update({html_code:html,css_code:css,js_code:js}).eq('id',active.id);if(e)setError(e.message);else setError('')}
  async function uploadFile(event){const file=event.target.files?.[0];if(!file||!active)return;if(file.size>50*1024*1024){setError('Files must be 50 MB or smaller.');return}const path=userId+'/'+active.id+'/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const {error:e}=await supabase.storage.from('forma-project-files').upload(path,file);if(e){setError(e.message);return}const {data,error:metaError}=await supabase.from('project_files').insert({project_id:active.id,owner_id:userId,file_name:file.name,storage_path:path,file_size:file.size,content_type:file.type||'application/octet-stream'}).select().single();if(metaError)setError(metaError.message);else setFiles(current=>[metaError?null:data,...current].filter(Boolean))}
  async function downloadFile(item){const {data,error:e}=await supabase.storage.from('forma-project-files').download(item.storage_path);if(e){setError(e.message);return}const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;link.download=item.file_name;link.click();URL.revokeObjectURL(url)}
  async function removeFile(item){const {error:e}=await supabase.storage.from('forma-project-files').remove([item.storage_path]);if(e){setError(e.message);return}await supabase.from('project_files').delete().eq('id',item.id);setFiles(current=>current.filter(f=>f.id!==item.id))}
  const safeJs = js.replace(/<\/script/gi, '<\\/script')
  const previewDoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>${css}</style></head><body>${html}<script>${safeJs}</script></body></html>`

  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / PROJECTS</p><h1>Projects</h1><p className="subheading">Organize project files and experiment with web code.</p></div><button className="primary-button" onClick={()=>setCreating(true)}><Plus size={17}/> New project</button></div>
    {error&&<p className="inline-error">{error}</p>}
    {!active?<div className="data-grid">{projects.map(p=><button className="data-card" key={p.id} onClick={()=>openProject(p)}><div className="data-icon lavender"><FolderKanban size={20}/></div><div className="data-card-copy"><strong>{p.name}</strong><span>{p.description||'Project workspace'}</span><small>Created {new Date(p.created_at).toLocaleDateString()}</small></div><ArrowRight size={17}/></button>)}{!projects.length&&<EmptyFeature icon={FolderKanban} title="No projects yet" detail="Create a project to store files and code."/>}</div>:<>
      <div className="project-toolbar"><button className="text-button" onClick={()=>setActive(null)}>← All projects</button><strong>{active.name}</strong><button className="secondary-button" onClick={saveCode}>Save code</button></div>
      <section className="project-section"><div className="section-heading"><div><h2>Project files</h2><p>Private files stored in your Forma project.</p></div><label className="secondary-button upload-control"><Upload size={15}/> Upload file<input type="file" onChange={uploadFile}/></label></div>{files.map(f=><div className="project-file" key={f.id}><File size={16}/><span>{f.file_name}</span><small>{(f.file_size/1024).toFixed(1)} KB</small><button className="icon-button" onClick={()=>downloadFile(f)} title="Download file"><ArrowRight size={15}/></button><button className="icon-button" onClick={()=>removeFile(f)} title="Delete file"><Trash2 size={15}/></button></div>)}{!files.length&&<p className="form-hint">No files uploaded yet.</p>}</section>
      <section className="project-section"><div className="section-heading"><div><h2>Web code playground</h2><p>HTML, CSS, and JavaScript. Runs in a locked-down browser preview.</p></div><div className="project-actions"><button className="secondary-button" onClick={()=>setPreview(!preview)}>{preview?'Hide preview':'Run preview'}</button></div></div><div className="code-editors"><label>HTML<textarea spellCheck="false" value={html} onChange={e=>setHtml(e.target.value)}/></label><label>CSS<textarea spellCheck="false" value={css} onChange={e=>setCss(e.target.value)}/></label><label>JavaScript<textarea spellCheck="false" value={js} onChange={e=>setJs(e.target.value)}/></label></div>{preview&&<iframe className="code-preview" title="Isolated project preview" sandbox="allow-scripts" srcDoc={previewDoc}/>}</section>
    </>}
    {creating&&<Modal title="Create a project" onClose={()=>setCreating(false)}><form className="feature-form" onSubmit={create}><label>Project name<input value={name} onChange={e=>setName(e.target.value)} maxLength={100} required placeholder="Website redesign"/></label><label>Description<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What are you building?"/></label><button className="primary-button full">Create project</button></form></Modal>}
  </div>
}

function FlowsPage({ userId }) {
  const [flows,setFlows]=useState([])
  const [active,setActive]=useState(null)
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [step,setStep]=useState('')
  const [error,setError]=useState('')
  async function load(){const {data,error:e}=await supabase.from('flows').select('*').order('created_at',{ascending:false});if(e)setError(e.message);else setFlows(data||[])}
  useEffect(()=>{load()},[])
  async function create(event){event.preventDefault();const {data,error:e}=await supabase.from('flows').insert({name:name.trim(),description:description.trim(),owner_id:userId}).select().single();if(e)setError(e.message);else{setFlows(f=>[data,...f]);setActive(data);setName('');setDescription('')}}
  async function addStep(event){event.preventDefault();const steps=[...(active.steps||[]),{id:crypto.randomUUID(),label:step.trim()}];const {data,error:e}=await supabase.from('flows').update({steps}).eq('id',active.id).select().single();if(e)setError(e.message);else{setActive(data);setFlows(f=>f.map(x=>x.id===data.id?data:x));setStep('')}}
  async function deleteStep(id){const steps=(active.steps||[]).filter(x=>x.id!==id);const {data,error:e}=await supabase.from('flows').update({steps}).eq('id',active.id).select().single();if(e)setError(e.message);else{setActive(data);setFlows(f=>f.map(x=>x.id===data.id?data:x))}}
  return <div className="feature-page"><div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / FLOWS</p><h1>Flows</h1><p className="subheading">Map out a process one step at a time.</p></div><button className="primary-button" onClick={()=>{setName('');setDescription('');setActive(null);document.getElementById('flow-create')?.showModal?.()}}> <Plus size={17}/> New flow</button></div>
    {error&&<p className="inline-error">{error}</p>}
    {active?<><div className="project-toolbar"><button className="text-button" onClick={()=>setActive(null)}>← All flows</button><strong>{active.name}</strong></div><form className="start-chat-form" onSubmit={addStep}><input value={step} onChange={e=>setStep(e.target.value)} placeholder="Add a step to this flow…" required/><button className="primary-button"><Plus size={16}/> Add step</button></form><div className="flow-steps">{(active.steps||[]).map((item,index)=><div className="flow-step" key={item.id}><span className="flow-step-number">{index+1}</span><strong>{item.label}</strong><button className="icon-button" onClick={()=>deleteStep(item.id)}><Trash2 size={15}/></button></div>)}</div>{!(active.steps||[]).length&&<EmptyFeature icon={GitBranch} title="Your flow is empty" detail="Add a first step to start mapping the process."/>}</>:<div className="data-grid">{flows.map(f=><button className="data-card" key={f.id} onClick={()=>setActive(f)}><div className="data-icon mint"><Workflow size={20}/></div><div className="data-card-copy"><strong>{f.name}</strong><span>{f.description||'Process flow'}</span><small>{f.steps?.length||0} steps</small></div><ArrowRight size={17}/></button>)}</div>}
    <dialog id="flow-create" className="flow-dialog"><form className="feature-form" onSubmit={async e=>{e.preventDefault();const {data,error:e2}=await supabase.from('flows').insert({name:name.trim(),description:description.trim(),owner_id:userId}).select().single();if(e2)setError(e2.message);else{setFlows(f=>[data,...f]);setActive(data)}document.getElementById('flow-create')?.close()}}><h2>New flow</h2><label>Flow name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Description<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></label><button className="primary-button full">Create flow</button><button type="button" className="text-button" onClick={()=>document.getElementById('flow-create')?.close()}>Cancel</button></form></dialog>
  </div>
}

function EmptyFeature({ icon: Icon, title, detail, action, onAction }) {
  return <div className="feature-empty"><div className="empty-circle"><Icon size={30} /></div><h2>{title}</h2><p>{detail}</p>{action && <button className="primary-button" onClick={onAction}><Plus size={16} /> {action}</button>}</div>
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="create-modal" onClick={e => e.stopPropagation()}><button className="icon-button modal-close" onClick={onClose}><X size={18} /></button><h2 className="feature-modal-title">{title}</h2>{children}</div></div>
}

export default App
