import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, FileText, Plus, Save, Video } from 'lucide-react'
import { supabase } from './lib/supabase'

export function MeetingsPage({ userId }) {
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [meetings, setMeetings] = useState([])
  const [active, setActive] = useState(null)
  const [notes, setNotes] = useState('')
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    supabase.from('teams').select('id,name').order('name').then(({data,error:e}) => {
      if(e) setError(e.message)
      else { setTeams(data||[]); if(data?.length) setTeamId(data[0].id) }
    })
  }, [])

  async function loadMeetings() {
    if(!teamId){setMeetings([]);setActive(null);return}
    const {data,error:e}=await supabase.from('team_meetings').select('*').eq('team_id',teamId).order('starts_at')
    if(e) setError(e.message); else setMeetings(data||[])
  }
  useEffect(()=>{setActive(null);loadMeetings()},[teamId])

  async function createMeeting(event) {
    event.preventDefault()
    setBusy(true);setError('')
    const {data,error:e}=await supabase.from('team_meetings').insert({
      team_id:teamId,created_by:userId,title:title.trim(),description:description.trim(),
      starts_at:new Date(startsAt).toISOString(),ends_at:endsAt?new Date(endsAt).toISOString():null,
    }).select().single()
    setBusy(false)
    if(e)setError(e.message)
    else {setMeetings(current=>[...current,data].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)));setTitle('');setDescription('');setStartsAt('');setEndsAt('');setShowCreate(false)}
  }

  async function openMeeting(meeting) {
    setActive(meeting);setError('');setNotice('')
    const {data,error:e}=await supabase.from('meeting_notes').select('*').eq('meeting_id',meeting.id).maybeSingle()
    if(e){setError(e.message);setNotes('');setTranscript('')}
    else {setNotes(data?.notes||'');setTranscript(data?.transcript||'');setSummary(data?.summary||'')}
  }

  async function saveNotes() {
    if(!active)return
    setSaving(true);setError('');setNotice('')
    const {error:e}=await supabase.from('meeting_notes').upsert({
      meeting_id:active.id,team_id:active.team_id,notes,transcript,summary,updated_by:userId,updated_at:new Date().toISOString(),
    },{onConflict:'meeting_id'})
    setSaving(false)
    if(e)setError(e.message);else setNotice('Meeting notes saved.')
  }

  function draftRecap() {
    const lines = notes.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
    const sentences = notes.split(/[.!?]\s+/).map(line=>line.trim()).filter(line=>line.length>18)
    const actions = lines.filter(line=>/\b(action|todo|to-do|follow.?up|next step)\b/i.test(line))
    const recap = [
      'Summary',
      ...(sentences.length ? sentences.slice(0,4).map(line=>'• '+line) : ['• Add a few more notes to create a recap.']),
      '',
      'Action items',
      ...(actions.length ? actions.map(line=>'• '+line.replace(/^[-•]\s*/,'')) : ['• No action items were clearly marked.']),
    ].join('\n')
    setSummary(recap)
  }

  async function startCall() {
    if(!active)return
    const {data,error:e}=await supabase.rpc('start_forma_team_call',{p_team_id:active.team_id})
    if(e)setError(e.message)
    else if(!data?.length)setError('There is nobody else in this team to invite yet.')
    else setNotice('Call invitations sent. The call will start when someone accepts.')
  }

  async function deleteMeeting(meeting) {
    if(!window.confirm('Delete this scheduled meeting and its notes?'))return
    const {error:e}=await supabase.from('team_meetings').delete().eq('id',meeting.id)
    if(e)setError(e.message)
    else {setMeetings(current=>current.filter(item=>item.id!==meeting.id));if(active?.id===meeting.id)setActive(null)}
  }

  return <div className="feature-page">
    <div className="module-heading"><div><p className="eyebrow">YOUR WORKSPACE / MEETINGS</p><h1>Meetings</h1><p className="subheading">Schedule team calls and keep shared notes in one place.</p></div><button className="primary-button" onClick={()=>setShowCreate(true)} disabled={!teamId}><Plus size={17}/> Schedule meeting</button></div>
    {error&&<p className="inline-error">{error}</p>}{notice&&<p className="success-message">{notice}</p>}
    {!teams.length?<div className="loading-card">Create or join a team before scheduling meetings.</div>:<>
      <div className="feature-toolbar"><label>Team <select value={teamId} onChange={e=>setTeamId(e.target.value)}>{teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>
      <div className="meetings-layout">
        <section className="meetings-list"><div className="section-heading"><div><h2>Scheduled meetings</h2><p>{meetings.length} in this team</p></div></div>
          {meetings.length?meetings.map(meeting=><button key={meeting.id} className={'meeting-list-item '+(active?.id===meeting.id?'selected':'')} onClick={()=>openMeeting(meeting)}><span className="meeting-list-icon"><CalendarDays size={18}/></span><span><strong>{meeting.title}</strong><small>{new Date(meeting.starts_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</small></span></button>):<div className="loading-card">No meetings scheduled yet.</div>}
        </section>
        {active?<section className="meeting-detail">
          <div className="meeting-detail-head"><div><p className="eyebrow">MEETING DETAILS</p><h2>{active.title}</h2><p>{new Date(active.starts_at).toLocaleString([], {dateStyle:'full',timeStyle:'short'})}</p>{active.description&&<p>{active.description}</p>}</div><div className="meeting-detail-actions"><button className="primary-button" onClick={startCall}><Video size={15}/> Start call</button>{active.created_by===userId&&<button className="secondary-button" onClick={()=>deleteMeeting(active)}>Delete</button>}</div></div>
          <label className="meeting-editor-label"><FileText size={16}/> Shared meeting notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={8} placeholder="Agenda, decisions, action items…"/></label>
          <label className="meeting-editor-label"><Clock3 size={16}/> Transcript / captions<textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={7} placeholder="Paste or type a transcript here. Forma does not record calls automatically."/></label>
          <div className="meeting-recap-tools"><button className="secondary-button" onClick={draftRecap}><FileText size={14}/> Draft recap from notes</button><span>This uses the notes you entered; it is not an AI-generated transcript.</span></div>
          <label className="meeting-editor-label">Meeting recap<textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={6} placeholder="Draft a summary and action items from your notes…"/></label>
          <div className="meeting-save-row"><span>Anyone in the team can view and update these notes.</span><button className="primary-button" onClick={saveNotes} disabled={saving}><Save size={15}/>{saving?'Saving…':'Save notes'}</button></div>
        </section>:<section className="meeting-detail meeting-detail-empty"><CalendarDays size={34}/><h2>Select a meeting</h2><p>Choose a scheduled meeting to view its details and shared notes.</p></section>}
      </div>
    </>}
    {showCreate&&<div className="modal-backdrop" onClick={()=>setShowCreate(false)}><div className="create-modal" onClick={e=>e.stopPropagation()}><h2 className="feature-modal-title">Schedule a meeting</h2><form className="feature-form" onSubmit={createMeeting}><label>Meeting name<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160}/></label><label>Starts<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></label><label>Ends (optional)<input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} min={startsAt||undefined}/></label><label>Description<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><button className="primary-button full" disabled={busy||!teamId}>{busy?'Scheduling…':'Schedule meeting'}</button></form></div></div>}
  </div>
}
