import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronLeft, ChevronRight,
  FileText, Plus, Presentation, Save, Trash2, X, Maximize2, Minimize2,
  Image as ImageIcon, File as FileIcon, Download, Users, Clock3
} from 'lucide-react'
import { supabase } from './lib/supabase'

function useTeams() {
  const [teams, setTeams] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    supabase.from('teams').select('id,name').order('name').then(({ data, error: e }) => {
      if (!alive) return
      if (e) setError(e.message)
      else setTeams(data || [])
    })
    return () => { alive = false }
  }, [])
  return { teams, error }
}

export function DocumentsPage({ userId }) {
  const { teams, error: teamError } = useTeams()
  const [teamId, setTeamId] = useState('')
  const [docs, setDocs] = useState([])
  const [active, setActive] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)
  const activeRef = useRef(null)
  const dirtyRef = useRef(false)
  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { dirtyRef.current = dirty }, [dirty])

  async function loadDocs() {
    if (!teamId) { setDocs([]); return }
    setLoading(true)
    const { data, error: e } = await supabase.from('team_documents').select('*').eq('team_id', teamId).order('updated_at', { ascending: false })
    if (e) setError(e.message)
    else setDocs(data || [])
    setLoading(false)
  }
  useEffect(() => { setActive(null); loadDocs() }, [teamId])
  useEffect(() => {
    if (!teamId) return
    const channel = supabase.channel('forma-documents-' + teamId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_documents', filter: 'team_id=eq.' + teamId }, payload => {
        if (payload.eventType === 'DELETE') {
          setDocs(current => current.filter(d => d.id !== payload.old.id))
          if (activeRef.current?.id === payload.old.id) setActive(null)
          return
        }
        const row = payload.new
        setDocs(current => [row, ...current.filter(d => d.id !== row.id)].sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at)))
        if (activeRef.current?.id === row.id && !dirtyRef.current) {
          setTitle(row.title)
          setBody(row.content)
          setActive(row)
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [teamId])

  async function createDoc() {
    if (!teamId) { setError('Choose a team first.'); return }
    const { data, error: e } = await supabase.from('team_documents').insert({ team_id: teamId, created_by: userId, title: 'Untitled document', content: '' }).select().single()
    if (e) setError(e.message)
    else { setDocs(current => [data, ...current]); openDoc(data) }
  }
  function openDoc(doc) {
    if (timer.current) clearTimeout(timer.current)
    setActive(doc); setTitle(doc.title); setBody(doc.content); setDirty(false); setError('')
  }
  async function saveDoc(nextTitle = title, nextBody = body) {
    if (!active) return
    setSaving(true)
    const { data, error: e } = await supabase.from('team_documents').update({ title: nextTitle.trim() || 'Untitled document', content: nextBody, updated_at: new Date().toISOString() }).eq('id', active.id).select().single()
    setSaving(false)
    if (e) setError(e.message)
    else {
      setDocs(current => [data, ...current.filter(d => d.id !== data.id)])
      setActive(data); setDirty(false)
    }
  }
  function edit(field, value) {
    if (field === 'title') setTitle(value); else setBody(value)
    setDirty(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const current = activeRef.current
      if (!current) return
      const nextTitle = field === 'title' ? value : title
      const nextBody = field === 'body' ? value : body
      saveDoc(nextTitle, nextBody)
    }, 900)
  }
  async function deleteDoc(doc) {
    if (!window.confirm('Delete this document for everyone on the team?')) return
    const { error: e } = await supabase.from('team_documents').delete().eq('id', doc.id)
    if (e) setError(e.message)
    else { setDocs(current => current.filter(d => d.id !== doc.id)); setActive(null) }
  }

  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / DOCUMENTS</p><h1>Documents</h1><p className="subheading">Write together in real time with your team.</p></div><button className="primary-button" onClick={createDoc}><Plus size={17}/> New document</button></div>
    {(error || teamError) && <p className="inline-error">{error || teamError}</p>}
    {!teams.length ? <div className="loading-card">Create or join a team first to use shared documents.</div> : <>
      <div className="feature-toolbar"><label>Team <select value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">Choose a team…</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div>
      {active ? <section className="document-editor">
        <div className="document-toolbar"><button className="text-button" onClick={()=>setActive(null)}><ArrowLeft size={15}/> All documents</button><span className="save-state">{saving?'Saving…':dirty?'Changes pending': 'Saved'}</span><button className="icon-button" title="Delete document" onClick={()=>deleteDoc(active)}><Trash2 size={16}/></button></div>
        <input className="document-title" value={title} onChange={e=>edit('title',e.target.value)} placeholder="Untitled document" maxLength={160}/>
        <textarea className="document-body" value={body} onChange={e=>edit('body',e.target.value)} placeholder="Start writing…"/>
        <p className="form-hint">Changes save automatically. Team members viewing this document receive live updates.</p>
      </section> : loading ? <div className="loading-card">Loading documents…</div> : !teamId ? <div className="loading-card">Choose a team to see its documents.</div> : docs.length ? <div className="data-grid">{docs.map(d=><button className="data-card" key={d.id} onClick={()=>openDoc(d)}><div className="data-icon lavender"><FileText size={20}/></div><div className="data-card-copy"><strong>{d.title}</strong><span>{d.content.slice(0,100)||'Empty document'}</span><small>Updated {new Date(d.updated_at).toLocaleString()}</small></div><ArrowRight size={17}/></button>)}</div> : <div className="feature-empty"><div className="empty-circle"><FileText size={30}/></div><h2>No shared documents yet</h2><p>Create a document for everyone in this team.</p><button className="primary-button" onClick={createDoc}><Plus size={16}/> Create document</button></div>}
    </>}
  </div>
}

export function CalendarWorkspacePage({ userId }) {
  const { teams } = useTeams()
  const [teamId, setTeamId] = useState('')
  const [events, setEvents] = useState([])
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(() => new Date().toISOString().slice(0,10))
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() {
    let query = supabase.from('calendar_events').select('*').order('starts_at')
    if (teamId) query = query.eq('team_id', teamId)
    else query = query.is('team_id', null)
    const { data, error: e } = await query
    if (e) setError(e.message); else setEvents(data || [])
  }
  useEffect(() => { load() }, [teamId])
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = new Date(first); start.setDate(1 - first.getDay())
    return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})
  }, [month])
  const dayEvents = events.filter(e => new Date(e.starts_at).toLocaleDateString('en-CA') === selected)
  async function createEvent(event) {
    event.preventDefault(); setBusy(true); setError('')
    const { data, error: e } = await supabase.from('calendar_events').insert({
      title:title.trim(), description:description.trim(), starts_at:new Date(startsAt).toISOString(),
      ends_at:endsAt?new Date(endsAt).toISOString():null, created_by:userId, team_id:teamId||null
    }).select().single()
    setBusy(false)
    if(e) setError(e.message)
    else { setEvents(current=>[...current,data].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)));setTitle('');setDescription('');setStartsAt('');setEndsAt('');setShowCreate(false) }
  }
  async function deleteEvent(id) {
    const { error:e } = await supabase.from('calendar_events').delete().eq('id',id)
    if(e) setError(e.message); else setEvents(current=>current.filter(x=>x.id!==id))
  }
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / CALENDAR</p><h1>Calendar</h1><p className="subheading">Plan personal events and shared team schedules.</p></div><button className="primary-button" onClick={()=>setShowCreate(true)}><Plus size={17}/> New event</button></div>
    {error&&<p className="inline-error">{error}</p>}
    <div className="feature-toolbar"><label>Calendar <select value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">Personal calendar</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div>
    <section className="calendar-shell">
      <div className="calendar-heading"><button className="icon-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={18}/></button><strong>{month.toLocaleDateString([], {month:'long',year:'numeric'})}</strong><button className="icon-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={18}/></button><button className="text-button" onClick={()=>{const now=new Date();setMonth(new Date(now.getFullYear(),now.getMonth(),1));setSelected(now.toLocaleDateString('en-CA'))}}>Today</button></div>
      <div className="calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div className="calendar-weekday" key={d}>{d}</div>)}{days.map(d=>{const key=d.toLocaleDateString('en-CA');const count=events.filter(e=>new Date(e.starts_at).toLocaleDateString('en-CA')===key).length;return <button key={key} className={'calendar-day '+(d.getMonth()!==month.getMonth()?'outside ':'')+(selected===key?'selected':'')} onClick={()=>setSelected(key)}><span>{d.getDate()}</span>{count>0&&<i>{count}</i>}</button>})}</div>
    </section>
    <div className="section-heading"><div><h2>{new Date(selected+'T12:00:00').toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'})}</h2><p>{teamId?'Shared team events':'Your personal events'}</p></div></div>
    <div className="event-list">{dayEvents.length?dayEvents.map(e=><div className="event-card" key={e.id}><div className="event-date"><Clock3 size={18}/></div><div className="event-copy"><strong>{e.title}</strong><span>{new Date(e.starts_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}{e.ends_at?' – '+new Date(e.ends_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):''}</span>{e.description&&<small>{e.description}</small>}</div>{e.created_by===userId&&<button className="icon-button" onClick={()=>deleteEvent(e.id)} title="Delete event"><Trash2 size={15}/></button>}</div>):<div className="loading-card">Nothing scheduled for this day.</div>}</div>
    {showCreate&&<div className="modal-backdrop" onClick={()=>setShowCreate(false)}><div className="create-modal" onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" onClick={()=>setShowCreate(false)}><X size={18}/></button><h2 className="feature-modal-title">New calendar event</h2><form className="feature-form" onSubmit={createEvent}><label>Event name<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={120}/></label><label>Starts<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></label><label>Ends (optional)<input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} min={startsAt||undefined}/></label><label>Description<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></label>{teamId&&<p className="form-hint">This event will be shared with members of {teams.find(t=>t.id===teamId)?.name}.</p>}<button className="primary-button full" disabled={busy}>{busy?'Saving…':'Save event'}</button></form></div></div>}
  </div>
}

export function NotificationCenter({ userId, onNavigate, onClose }) {
  const [items,setItems]=useState([])
  const [error,setError]=useState('')
  async function load(){const {data,error:e}=await supabase.from('forma_notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(75);if(e)setError(e.message);else setItems(data||[])}
  useEffect(()=>{load();const channel=supabase.channel('forma-notifications-'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'forma_notifications',filter:'user_id=eq.'+userId},p=>setItems(current=>[p.new,...current].slice(0,75))).subscribe();return()=>{supabase.removeChannel(channel)}},[userId])
  async function markOne(item){await supabase.from('forma_notifications').update({read_at:new Date().toISOString()}).eq('id',item.id);setItems(current=>current.map(x=>x.id===item.id?{...x,read_at:new Date().toISOString()}:x));onNavigate(item.target||'Home');onClose()}
  async function markAll(){const ids=items.filter(x=>!x.read_at).map(x=>x.id);if(!ids.length)return;const now=new Date().toISOString();const {error:e}=await supabase.from('forma_notifications').update({read_at:now}).in('id',ids);if(e)setError(e.message);else setItems(current=>current.map(x=>({...x,read_at:x.read_at||now})))}
  return <div className="notification-popover"><div className="notification-head"><strong>Notifications</strong><button className="text-button" onClick={markAll}>Mark all read</button><button className="icon-button" onClick={onClose}><X size={16}/></button></div>{error&&<p className="inline-error">{error}</p>}{!items.length?<div className="notification-empty">You're all caught up.</div>:items.map(item=><button key={item.id} className={'notification-item '+(!item.read_at?'unread':'')} onClick={()=>markOne(item)}><span className="notification-dot"/><span><strong>{item.title}</strong><small>{item.body}</small><time>{new Date(item.created_at).toLocaleString()}</time></span></button>)}</div>
}

export function PresentationsPage({ userId }) {
  const { teams, error: teamError } = useTeams()
  const [teamId,setTeamId]=useState('')
  const [items,setItems]=useState([])
  const [active,setActive]=useState(null)
  const [title,setTitle]=useState('')
  const [slides,setSlides]=useState([])
  const [slideIndex,setSlideIndex]=useState(0)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [presenting,setPresenting]=useState(false)
  const [remoteUpdate,setRemoteUpdate]=useState(false)
  const current=slides[slideIndex]
  async function load(){if(!teamId){setItems([]);return}const {data,error:e}=await supabase.from('team_presentations').select('*').eq('team_id',teamId).order('updated_at',{ascending:false});if(e)setError(e.message);else setItems(data||[])}
  useEffect(()=>{setActive(null);load()},[teamId])
  useEffect(()=>{if(!teamId)return;const channel=supabase.channel('forma-presentations-'+teamId).on('postgres_changes',{event:'UPDATE',schema:'public',table:'team_presentations',filter:'team_id=eq.'+teamId},p=>{setItems(c=>c.map(x=>x.id===p.new.id?p.new:x));if(active?.id===p.new.id){setActive(p.new);setTitle(p.new.title);setSlides(p.new.slides||[]);setRemoteUpdate(true);setTimeout(()=>setRemoteUpdate(false),1800)}}).subscribe();return()=>{supabase.removeChannel(channel)}},[teamId,active?.id])
  async function create(){if(!teamId){setError('Choose a team first.');return}const {data,error:e}=await supabase.from('team_presentations').insert({team_id:teamId,created_by:userId,title:'Untitled presentation'}).select().single();if(e)setError(e.message);else{setItems(c=>[data,...c]);open(data)}}
  function open(item){setActive(item);setTitle(item.title);setSlides(item.slides||[]);setSlideIndex(0);setError('')}
  async function save(nextSlides=slides,nextTitle=title){if(!active)return;setBusy(true);const {data,error:e}=await supabase.from('team_presentations').update({title:nextTitle.trim()||'Untitled presentation',slides:nextSlides,updated_at:new Date().toISOString()}).eq('id',active.id).select().single();setBusy(false);if(e)setError(e.message);else{setActive(data);setItems(c=>[data,...c.filter(x=>x.id!==data.id)])}}
  function updateSlide(field,value){const next=slides.map((s,i)=>i===slideIndex?{...s,[field]:value}:s);setSlides(next)}
  async function addSlide(){const next=[...slides,{id:crypto.randomUUID(),title:'New slide',body:'Add your content here.',background:'#25243a'}];setSlides(next);setSlideIndex(next.length-1);await save(next)}
  async function removeSlide(){if(slides.length<=1)return;const next=slides.filter((_,i)=>i!==slideIndex);setSlides(next);setSlideIndex(Math.max(0,slideIndex-1));await save(next)}
  const slide=current
  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / PRESENTATIONS</p><h1>Presentations</h1><p className="subheading">Create slide decks and present them to your team.</p></div><button className="primary-button" onClick={create}><Plus size={17}/> New presentation</button></div>
    {(error||teamError)&&<p className="inline-error">{error||teamError}</p>}
    {!teams.length?<div className="loading-card">Create or join a team first to use shared presentations.</div>:<>
      <div className="feature-toolbar"><label>Team <select value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">Choose a team…</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div>
      {active&&slide?<><div className="document-toolbar"><button className="text-button" onClick={()=>setActive(null)}><ArrowLeft size={15}/> All presentations</button><span className="save-state">{busy?'Saving…':remoteUpdate?'Updated by teammate':'Slide '+(slideIndex+1)+' of '+slides.length}</span><button className="secondary-button" onClick={()=>save()}><Save size={15}/> Save</button><button className="secondary-button" onClick={()=>setPresenting(true)}><Maximize2 size={15}/> Present</button></div>
        <input className="document-title" value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>save(slides,title)} maxLength={160}/>
        <div className="presentation-layout"><aside className="slide-list">{slides.map((s,i)=><button key={s.id} className={'slide-thumb '+(i===slideIndex?'selected':'')} onClick={()=>setSlideIndex(i)}><span>{i+1}</span><strong>{s.title||'Untitled slide'}</strong></button>)}<button className="secondary-button" onClick={addSlide}><Plus size={15}/> Add slide</button></aside>
          <div className="slide-workarea"><div className="slide-canvas" style={{background:slide.background||'#25243a'}}><input value={slide.title||''} onChange={e=>updateSlide('title',e.target.value)} placeholder="Slide title"/><textarea value={slide.body||''} onChange={e=>updateSlide('body',e.target.value)} placeholder="Write something…"/></div><div className="slide-tools"><label>Background <input type="color" value={slide.background||'#25243a'} onChange={e=>updateSlide('background',e.target.value)}/></label><button className="text-button" onClick={()=>save()}><Save size={14}/> Save changes</button><button className="text-button danger-text" onClick={removeSlide}><Trash2 size={14}/> Delete slide</button></div></div></div>
      </>:!teamId?<div className="loading-card">Choose a team to see its presentations.</div>:items.length?<div className="data-grid">{items.map(item=><button className="data-card" key={item.id} onClick={()=>open(item)}><div className="data-icon lavender"><Presentation size={20}/></div><div className="data-card-copy"><strong>{item.title}</strong><span>{item.slides?.length||0} slides</span><small>Updated {new Date(item.updated_at).toLocaleString()}</small></div><ArrowRight size={17}/></button>)}</div>:<div className="feature-empty"><div className="empty-circle"><Presentation size={30}/></div><h2>No presentations yet</h2><p>Create a slide deck and work on it with your team.</p><button className="primary-button" onClick={create}><Plus size={16}/> Create presentation</button></div>}
    </>}
    {presenting&&slide&&<div className="presentation-fullscreen" onClick={e=>e.stopPropagation()}><button className="icon-button" onClick={()=>setPresenting(false)}><Minimize2 size={19}/></button><div className="presentation-stage" style={{background:slide.background||'#25243a'}}><h1>{slide.title}</h1><p>{slide.body}</p></div><div className="presentation-controls"><button className="secondary-button" disabled={slideIndex===0} onClick={()=>setSlideIndex(i=>i-1)}><ChevronLeft size={17}/> Previous</button><span>{slideIndex+1} / {slides.length}</span><button className="secondary-button" disabled={slideIndex===slides.length-1} onClick={()=>setSlideIndex(i=>i+1)}>Next <ChevronRight size={17}/></button></div></div>}
  </div>
}

export function FilePreview({ file, onClose }) {
  const [url,setUrl]=useState('')
  const [text,setText]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{
    let objectUrl=''
    let alive=true
    supabase.storage.from('forma-project-files').download(file.storage_path).then(async({data,error:e})=>{
      if(!alive)return
      if(e){setError(e.message);return}
      if(file.content_type?.startsWith('text/')||/\.(txt|md|json|csv|log)$/i.test(file.file_name)){
        setText(await data.text())
      }else{
        objectUrl=URL.createObjectURL(data);setUrl(objectUrl)
      }
    })
    return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}
  },[file.id])
  const image=file.content_type?.startsWith('image/')
  const pdf=file.content_type==='application/pdf'||file.file_name.toLowerCase().endsWith('.pdf')
  return <div className="modal-backdrop preview-backdrop" onClick={onClose}><div className="file-preview-modal" onClick={e=>e.stopPropagation()}><div className="document-toolbar"><strong>{file.file_name}</strong><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{error?<p className="inline-error">{error}</p>:!url&&!text?<div className="loading-card">Loading preview…</div>:image?<img className="file-image-preview" src={url} alt={file.file_name}/>:pdf?<iframe className="file-pdf-preview" src={url} title={file.file_name}/>:text?<pre className="file-text-preview">{text}</pre>:<div className="loading-card">Preview isn't available for this file type. Download it from the project file list.</div>}</div></div>
}
