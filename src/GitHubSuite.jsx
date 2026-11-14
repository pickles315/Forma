import { useEffect, useMemo, useState } from 'react'
import { Github, GitBranch, File, Folder, RefreshCw, Plus, ArrowLeft, ExternalLink, Save, Search, Lock, Globe, CheckCircle2 } from 'lucide-react'
import { supabase } from './lib/supabase'

const APP_SLUG = import.meta.env.VITE_GITHUB_APP_SLUG || ''

function messageOf(error) {
  return error?.message || error?.context?.message || String(error || 'Something went wrong.')
}

export function GitHubWorkspacePage({ userId }) {
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [connection, setConnection] = useState(null)
  const [repositories, setRepositories] = useState([])
  const [availableRepos, setAvailableRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [tree, setTree] = useState([])
  const [currentFile, setCurrentFile] = useState(null)
  const [fileText, setFileText] = useState('')
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const activeTeam = teams.find(team => team.id === teamId)
  const canManage = activeTeam?.created_by === userId || ['owner', 'admin'].includes(activeTeam?.my_role)

  useEffect(() => {
    let alive = true
    supabase.from('teams').select('id,name,created_by').order('name').then(async ({ data, error: loadError }) => {
      if (!alive) return
      if (loadError) setError(loadError.message)
      const rows = data || []
      const { data: memberships } = await supabase.from('team_members').select('team_id,role').eq('user_id', userId)
      const roleByTeam = Object.fromEntries((memberships || []).map(item => [item.team_id, item.role]))
      const withRoles = rows.map(team => ({ ...team, my_role: roleByTeam[team.id] || (team.created_by === userId ? 'owner' : '') }))
      setTeams(withRoles)
      const saved = sessionStorage.getItem('forma-github-team')
      const next = withRoles.some(team => team.id === saved) ? saved : withRoles[0]?.id || ''
      setTeamId(next)
      setLoading(false)
    })
    return () => { alive = false }
  }, [userId])

  useEffect(() => {
    if (!teamId) { setConnection(null); setRepositories([]); return }
    sessionStorage.setItem('forma-github-team', teamId)
    loadTeamRepositories()
  }, [teamId])

  useEffect(() => {
    if (!teamId) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('github_setup') !== '1') return
    const installId = params.get('installation_id')
    const returnedState = params.get('state')
    const oauthCode = params.get('code')
    const pending = sessionStorage.getItem('forma-github-install-state')
    const pendingTeam = sessionStorage.getItem('forma-github-install-team')
    window.history.replaceState({}, document.title, window.location.pathname)
    if (!installId || !oauthCode || !returnedState || returnedState !== pending || pendingTeam !== teamId) {
      setError('GitHub setup could not be verified. Start the connection again from the team workspace.')
      return
    }
    sessionStorage.removeItem('forma-github-install-state')
    sessionStorage.removeItem('forma-github-install-team')
    completeInstallation(installId, pendingTeam, oauthCode)
  }, [teamId])

  async function invoke(action, values = {}) {
    const { data, error: functionError } = await supabase.functions.invoke('github-workspace', { body: { action, teamId, ...values } })
    if (functionError) throw new Error(messageOf(functionError))
    if (data?.error) throw new Error(data.error)
    return data
  }

  async function loadTeamRepositories() {
    setError('')
    const [{ data: install, error: installError }, { data: repos, error: repoError }] = await Promise.all([
      supabase.from('team_github_installations').select('*').eq('team_id', teamId).maybeSingle(),
      supabase.from('team_github_repositories').select('*').eq('team_id', teamId).order('full_name'),
    ])
    if (installError || repoError) setError((installError || repoError).message)
    setConnection(install || null)
    setRepositories(repos || [])
    setSelectedRepo(null)
    setTree([])
    setCurrentFile(null)
    setAvailableRepos([])
  }

  async function completeInstallation(installationId, targetTeamId, code) {
    setBusy(true)
    setError('')
    try {
      const { data, error: functionError } = await supabase.functions.invoke('github-workspace', {
        body: { action: 'complete_installation', teamId: targetTeamId, installationId: Number(installationId), code },
      })
      if (functionError) throw new Error(messageOf(functionError))
      if (data?.error) throw new Error(data.error)
      setNotice('GitHub is connected to ' + (activeTeam?.name || 'your team') + '.')
      await loadTeamRepositories()
      const listed = await invoke('list_repositories')
      setAvailableRepos(listed.repositories || [])
    } catch (e) { setError(messageOf(e)) }
    finally { setBusy(false) }
  }

  function connectGitHub() {
    if (!APP_SLUG) {
      setError('Forma still needs its GitHub App slug configured. See the setup instructions below.')
      return
    }
    if (!teamId) return
    const state = crypto.randomUUID()
    sessionStorage.setItem('forma-github-install-state', state)
    sessionStorage.setItem('forma-github-install-team', teamId)
    const url = 'https://github.com/apps/' + encodeURIComponent(APP_SLUG) + '/installations/new?state=' + encodeURIComponent(state)
    window.location.href = url
  }

  async function loadAvailableRepos() {
    setBusy(true); setError('')
    try {
      const data = await invoke('list_repositories')
      setAvailableRepos(data.repositories || [])
    } catch (e) { setError(messageOf(e)) }
    finally { setBusy(false) }
  }

  async function addRepository(repo) {
    setBusy(true); setError('')
    try {
      await invoke('add_repository', { repositoryId: repo.id })
      await loadTeamRepositories()
      setNotice(repo.full_name + ' is now shared with this team.')
    } catch (e) { setError(messageOf(e)) }
    finally { setBusy(false) }
  }

  async function removeRepository(repo) {
    if (!window.confirm('Remove ' + repo.full_name + ' from this Forma team?')) return
    setBusy(true); setError('')
    try {
      await invoke('remove_repository', { repositoryId: repo.repository_id })
      await loadTeamRepositories()
    } catch (e) { setError(messageOf(e)) }
    finally { setBusy(false) }
  }

  async function openRepository(repo) {
    setBusy(true); setError(''); setSelectedRepo(repo); setCurrentFile(null)
    try {
      const data = await invoke('list_tree', { repositoryId: repo.repository_id })
      setTree(data.tree || [])
    } catch (e) { setError(messageOf(e)) }
    finally { setBusy(false) }
  }

  async function openFile(item) {
    if (item.type !== 'blob') return
    setBusy(true); setError('')
    try {
      const data = await invoke('read_file', { repositoryId: selectedRepo.repository_id, path: item.path })
      setCurrentFile({ path: item.path, sha: data.sha })
      setFileText(data.content || '')
    } catch (e) { setError(messageOf(e)) }
    finally { setBusy(false) }
  }

  async function saveFile() {
    if (!currentFile || !selectedRepo) return
    setBusy(true); setError('')
    try {
      const data = await invoke('write_file', { repositoryId: selectedRepo.repository_id, path: currentFile.path, content: fileText, message: 'Update ' + currentFile.path })
      setCurrentFile(current => ({ ...current, sha: data.sha }))
      setNotice('Commit created: ' + currentFile.path)
    } catch (e) { setError(messageOf(e)) }
    finally { setBusy(false) }
  }

  const filteredRepos = useMemo(() => repositories.filter(repo => repo.full_name.toLowerCase().includes(filter.toLowerCase())), [repositories, filter])
  const linkedIds = new Set(repositories.map(repo => String(repo.repository_id)))

  if (loading) return <div className="feature-page"><div className="loading-card">Loading GitHub workspace…</div></div>

  return <div className="feature-page github-workspace">
    <div className="module-heading"><div><p className="eyebrow">FORMA / DEVELOPMENT</p><h1><Github size={27}/> GitHub</h1><p className="subheading">Share repositories with your team and work on code together.</p></div></div>
    {error && <p className="inline-error">{error}</p>}
    {notice && <p className="success-message">{notice}</p>}
    <div className="github-team-bar"><label>Team<select value={teamId} onChange={e => setTeamId(e.target.value)}><option value="">Choose a team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>{connection && <span className="github-connected"><CheckCircle2 size={15}/> Connected to {connection.account_login}</span>}</div>
    {!activeTeam ? <div className="loading-card">Create or join a Forma team to connect repositories.</div> :
      !connection ? <section className="github-connect-panel"><div className="github-connect-icon"><Github size={30}/></div><div><h2>Connect GitHub to {activeTeam.name}</h2><p>Install the Forma GitHub App on your GitHub account or organization, then choose which repositories this team can use. Team members will only see repositories shared here.</p><button className="primary-button" onClick={connectGitHub} disabled={!canManage || busy}><Github size={16}/> Install GitHub App</button>{!canManage && <p className="form-hint">Only the team owner or an admin can connect GitHub.</p>}</div></section> :
      selectedRepo ? <section className="github-browser">
        <div className="github-browser-toolbar"><button className="secondary-button" onClick={() => { setSelectedRepo(null); setCurrentFile(null) }}><ArrowLeft size={15}/> Repositories</button><div><strong>{selectedRepo.full_name}</strong><a href={selectedRepo.html_url} target="_blank" rel="noreferrer"><ExternalLink size={14}/></a></div><button className="secondary-button" onClick={() => openRepository(selectedRepo)} disabled={busy}><RefreshCw size={14}/> Refresh</button></div>
        <div className="github-file-layout"><div className="github-file-tree"><h3><Folder size={15}/> Files</h3>{tree.map(item => <button className={'github-file-row ' + (currentFile?.path === item.path ? 'active' : '')} key={item.path} onClick={() => openFile(item)} disabled={item.type !== 'blob'}><File size={14}/><span>{item.path}</span></button>)}</div><div className="github-file-editor">{currentFile ? <><div className="github-editor-toolbar"><strong>{currentFile.path}</strong><button className="primary-button" onClick={saveFile} disabled={busy}><Save size={14}/> Commit changes</button></div><textarea value={fileText} onChange={e => setFileText(e.target.value)} spellCheck="false" /></> : <div className="github-editor-empty"><File size={28}/><strong>Select a file</strong><span>Choose a file from the repository to view or edit it.</span></div>}</div></div>
      </section> :
      <><section className="github-repo-section"><div className="section-heading"><div><h2>Team repositories</h2><p>{repositories.length} shared {repositories.length === 1 ? 'repository' : 'repositories'}</p></div><div className="github-section-actions"><label className="github-filter"><Search size={14}/><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find a repository"/></label>{canManage && <button className="secondary-button" onClick={loadAvailableRepos} disabled={busy}><Plus size={14}/> Add repository</button>}</div></div>
        {filteredRepos.length ? <div className="github-repo-grid">{filteredRepos.map(repo => <article className="github-repo-card" key={repo.id}><div className="github-repo-card-top"><Github size={18}/>{repo.private ? <span><Lock size={12}/> Private</span> : <span><Globe size={12}/> Public</span>}</div><h3>{repo.full_name}</h3><p>{repo.description || 'No repository description.'}</p><div className="github-repo-card-bottom"><span><GitBranch size={13}/>{repo.default_branch}</span><button className="secondary-button" onClick={() => openRepository(repo)} disabled={busy}>Browse</button>{canManage && <button className="text-button danger-text" onClick={() => removeRepository(repo)} disabled={busy}>Remove</button>}</div></article>)}</div> : <div className="loading-card">No repositories have been shared with this team yet. Use Add repository to choose one.</div>}
      </section>
      {availableRepos.length > 0 && <section className="github-repo-section"><div className="section-heading"><div><h2>Available from GitHub</h2><p>Choose repositories to share with {activeTeam.name}.</p></div></div><div className="github-available-list">{availableRepos.filter(repo => !linkedIds.has(String(repo.id))).map(repo => <div className="github-available-row" key={repo.id}><div><strong>{repo.full_name}</strong><span>{repo.private ? 'Private' : 'Public'} · {repo.default_branch}</span></div><button className="primary-button" onClick={() => addRepository(repo)} disabled={busy}>Share with team</button></div>)}</div></section>}</>}
    }
    <div className="github-setup-note"><strong>GitHub App setup required once.</strong><p>Forma needs a GitHub App with repository metadata and contents permissions. Set <code>VITE_GITHUB_APP_SLUG</code> in Cloudflare Pages/Workers build variables, then add <code>GITHUB_APP_ID</code> and <code>GITHUB_APP_PRIVATE_KEY</code> as Supabase Edge Function secrets. The private key stays server-side; it is never sent to team members' browsers.</p></div>
  </div>
}
