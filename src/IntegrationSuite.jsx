import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Check, ExternalLink, Github, Database, FileText, Link2, Plus, Search, Trash2, X } from 'lucide-react'
import { supabase } from './lib/supabase'

const PROVIDERS = [
  { id: 'github', name: 'GitHub', group: 'Development', description: 'Keep repositories, issues, and pull requests one click away.', placeholder: 'https://github.com/owner/repository', hosts: ['github.com'] },
  { id: 'supabase', name: 'Supabase', group: 'Development', description: 'Open your database, Auth, Storage, and project dashboard.', placeholder: 'https://supabase.com/dashboard/project/your-project', hosts: ['supabase.com', 'supabase.co'] },
  { id: 'google_drive', name: 'Google Drive', group: 'Files', description: 'Link a shared Drive folder for your team files.', placeholder: 'https://drive.google.com/drive/folders/...', hosts: ['drive.google.com'] },
  { id: 'google_docs', name: 'Google Docs', group: 'Files', description: 'Keep shared documents and writing projects close by.', placeholder: 'https://docs.google.com/document/d/...', hosts: ['docs.google.com'] },
  { id: 'notion', name: 'Notion', group: 'Productivity', description: 'Open a workspace, wiki, or project page from Forma.', placeholder: 'https://www.notion.so/...', hosts: ['notion.so', 'www.notion.so'] },
  { id: 'slack', name: 'Slack', group: 'Communication', description: 'Jump to a team workspace or channel.', placeholder: 'https://your-workspace.slack.com', hosts: ['slack.com', 'app.slack.com'] },
  { id: 'discord', name: 'Discord', group: 'Communication', description: 'Link a community server or project space.', placeholder: 'https://discord.com/channels/...', hosts: ['discord.com'] },
  { id: 'figma', name: 'Figma', group: 'Design', description: 'Keep design files and prototypes connected to your work.', placeholder: 'https://www.figma.com/design/...', hosts: ['figma.com', 'www.figma.com'] },
  { id: 'trello', name: 'Trello', group: 'Productivity', description: 'Open a board for tasks and project planning.', placeholder: 'https://trello.com/b/...', hosts: ['trello.com'] },
  { id: 'linear', name: 'Linear', group: 'Productivity', description: 'Link a project or issue-tracking workspace.', placeholder: 'https://linear.app/...', hosts: ['linear.app'] },
  { id: 'zapier', name: 'Zapier', group: 'Automation', description: 'Keep an automation workspace or Zap handy.', placeholder: 'https://zapier.com/app/...', hosts: ['zapier.com'] },
  { id: 'webhook', name: 'Webhook', group: 'Automation', description: 'Save an HTTPS endpoint reference. Forma does not send data to it yet.', placeholder: 'https://example.com/webhook', hosts: [] },
]

export function IntegrationsPage({ userId }) {
  const [links, setLinks] = useState([])
  const [selected, setSelected] = useState(null)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data, error: loadError } = await supabase.from('forma_integrations').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setLinks(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [userId])

  const visibleProviders = useMemo(() => PROVIDERS.filter(provider =>
    (provider.name + ' ' + provider.group + ' ' + provider.description).toLowerCase().includes(filter.toLowerCase())
  ), [filter])

  function openAdd(provider) {
    setSelected(provider)
    setLabel(provider.name)
    setUrl('')
    setError('')
  }

  async function addLink(event) {
    event.preventDefault()
    if (!selected) return
    let parsed
    try { parsed = new URL(url.trim()) } catch { setError('Enter a valid HTTPS link.'); return }
    if (parsed.protocol !== 'https:') { setError('Only HTTPS links are allowed.'); return }
    if (selected.hosts.length && !selected.hosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host))) {
      setError('That link does not look like a ' + selected.name + ' link.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: saveError } = await supabase.from('forma_integrations').insert({
      user_id: userId, provider: selected.id, label: label.trim() || selected.name, external_url: parsed.toString(),
    }).select().single()
    setBusy(false)
    if (saveError) setError(saveError.message)
    else { setLinks(current => [data, ...current]); setSelected(null) }
  }

  async function removeLink(item) {
    const { error: removeError } = await supabase.from('forma_integrations').delete().eq('id', item.id).eq('user_id', userId)
    if (removeError) setError(removeError.message)
    else setLinks(current => current.filter(link => link.id !== item.id))
  }

  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / APP DIRECTORY</p><h1>Integrations</h1><p className="subheading">Bring the tools you already use into one place.</p></div></div>
    <div className="integration-notice"><Link2 size={17}/><span><strong>Connected links, not account authorization.</strong> This first version saves secure HTTPS links to your tools. It does not request passwords, API keys, or OAuth tokens, and it does not sync data in the background.</span></div>
    {error && <p className="inline-error">{error}</p>}
    <div className="integration-search"><Search size={16}/><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find an integration…"/></div>
    {links.length > 0 && <section className="integration-connected"><div className="section-heading"><div><h2>Your linked tools</h2><p>{links.length} saved {links.length === 1 ? 'link' : 'links'}</p></div></div><div className="integration-grid">{links.map(item => {const provider=PROVIDERS.find(p=>p.id===item.provider);return <article className="integration-card linked" key={item.id}><div className="integration-card-top"><span className="integration-mark">{provider?.name.slice(0,1)||'↗'}</span><span className="integration-state"><Check size={12}/> Link saved</span></div><h3>{item.label}</h3><p>{provider?.name || item.provider}</p><div className="integration-card-actions"><a href={item.external_url} target="_blank" rel="noreferrer">Open <ArrowUpRight size={14}/></a><button className="icon-button" title="Remove link" onClick={()=>removeLink(item)}><Trash2 size={15}/></button></div></article>})}</div></section>}
    <section><div className="section-heading"><div><h2>Browse integrations</h2><p>Save a link to a repository, workspace, document, or board.</p></div></div>{loading?<div className="loading-card">Loading integrations…</div>:<div className="integration-grid">{visibleProviders.map(provider=><article className="integration-card" key={provider.id}><div className="integration-card-top"><span className="integration-mark">{provider.id==='github'?<Github size={20}/>:provider.id==='supabase'?<Database size={20}/>:provider.id==='google_docs'?<FileText size={20}/>:<ExternalLink size={19}/>}</span><span className="integration-category">{provider.group}</span></div><h3>{provider.name}</h3><p>{provider.description}</p><button className="secondary-button" onClick={()=>openAdd(provider)}><Plus size={14}/> Add link</button></article>)}</div>}</section>
    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="create-modal integration-modal" onClick={event=>event.stopPropagation()}><button className="icon-button modal-close" onClick={()=>setSelected(null)}><X size={18}/></button><p className="eyebrow">ADD INTEGRATION LINK</p><h2 className="feature-modal-title">{selected.name}</h2><form className="feature-form" onSubmit={addLink}><label>Display name<input value={label} onChange={event=>setLabel(event.target.value)} maxLength={120} required/></label><label>HTTPS link<input type="url" value={url} onChange={event=>setUrl(event.target.value)} placeholder={selected.placeholder} required/></label>{error&&<p className="inline-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy?'Saving…':'Save link'}</button></form></div></div>}
  </div>
}
