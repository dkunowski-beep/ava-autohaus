'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=(url&&key)?createClient(url,key):null;

export default function App(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!supabase){setLoading(false);return}
   supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
   return()=>subscription.unsubscribe();
 },[]);
 if(loading)return <div className="center"><div className="logo">AVA</div><p>Lädt…</p></div>;
 if(!supabase)return <div className="center"><div className="logo">AVA</div><h2>Supabase-Verbindung fehlt</h2><p>Bitte die beiden NEXT_PUBLIC_SUPABASE Variablen in Vercel prüfen.</p></div>;
 return session?<Dashboard session={session}/>:<Login/>;
}

function Login(){
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState('');
 async function submit(e){e.preventDefault();setMsg('Bitte warten…');
  if(mode==='register'){
   const {error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
   setMsg(error?error.message:'Registrierung erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte den Link in der Mail öffnen.');
  }else{
   const {error}=await supabase.auth.signInWithPassword({email,password});
   setMsg(error?error.message:'Angemeldet.');
  }
 }
 return <div className="auth"><div className="authbox"><div className="logo">AVA <span>Alpha 0.4.2</span></div><h1>{mode==='login'?'Anmelden':'Verkäuferkonto erstellen'}</h1><p>Autohaus Vertriebs Assistent</p>
 <form onSubmit={submit}>{mode==='register'&&<input required placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>}<input required type="email" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)}/><input required minLength="6" type="password" placeholder="Passwort" value={password} onChange={e=>setPassword(e.target.value)}/><button>{mode==='login'?'Anmelden':'Registrieren'}</button></form>
 {msg&&<div className="msg">{msg}</div>}<button className="link" onClick={()=>{setMode(mode==='login'?'register':'login');setMsg('')}}>{mode==='login'?'Noch kein Testkonto? Registrieren':'Zur Anmeldung'}</button></div></div>
}

function Dashboard({session}){
 const [tab,setTab]=useState('Heute'),[customers,setCustomers]=useState([]),[tasks,setTasks]=useState([]),[events,setEvents]=useState([]),[history,setHistory]=useState([]);
 const [busy,setBusy]=useState(true),[selected,setSelected]=useState(null),[form,setForm]=useState({name:'',customer_number:'',phone:'',email:'',vehicle_interest:'',stage:'lead',notes:'',contract_end_date:'',ordered_at:'',delivered_at:'',test_drive_at:'',planned_delivery_at:''});
 const [showForm,setShowForm]=useState(false),[week,setWeek]=useState(false);
 const uid=session.user.id;
 async function load(){
  setBusy(true);
  const [c,t,e,h]=await Promise.all([
   supabase.from('ava_customers').select('*').eq('owner_id',uid).order('created_at',{ascending:false}),
   supabase.from('ava_tasks').select('*').eq('assigned_to',uid).order('due_at'),
   supabase.from('ava_events').select('*').eq('owner_id',uid).order('starts_at'),
   supabase.from('ava_history').select('*').eq('actor_id',uid).order('created_at',{ascending:false})
  ]);
  setCustomers(c.data||[]);setTasks(t.data||[]);setEvents(e.data||[]);setHistory(h.data||[]);setBusy(false);
 }
 useEffect(()=>{load()},[]);
 async function saveCustomer(e){e.preventDefault();
  const cleanDate=v=>v&&String(v).trim()?v:null;
  const cleanDateTime=v=>v&&String(v).trim()?new Date(v).toISOString():null;
  const payload={
    name:form.name,
    customer_number:form.customer_number,
    phone:form.phone||null,
    email:form.email||null,
    vehicle_interest:form.vehicle_interest||null,
    stage:form.stage,
    notes:form.notes||null,
    contract_end_date:cleanDate(form.contract_end_date),
    ordered_at:cleanDate(form.ordered_at),
    delivered_at:cleanDate(form.delivered_at),
    test_drive_at:cleanDateTime(form.test_drive_at),
    planned_delivery_at:cleanDateTime(form.planned_delivery_at),
    owner_id:uid
  };
  let res=selected
    ?await supabase.from('ava_customers').update(payload).eq('id',selected.id).select().single()
    :await supabase.from('ava_customers').insert(payload).select().single();
  if(res.error){alert(res.error.message);return}
  await supabase.from('ava_history').insert({customer_id:res.data.id,actor_id:uid,action:selected?'Kundendaten geändert':'Kunde angelegt',details:`${res.data.name} · ${res.data.vehicle_interest||''}`});
  if(form.stage==='test_drive'&&form.test_drive_at){
    const {error}=await supabase.rpc('ava_schedule_test_drive',{
      p_customer_id:res.data.id,
      p_starts_at:new Date(form.test_drive_at).toISOString(),
      p_minutes:60,
      p_vehicle:form.vehicle_interest||''
    });
    if(error){
      alert(error.message.includes('TERMIN_CONFLICT')
        ?'Kunde wurde gespeichert, aber die Probefahrt überschneidet sich mit einem bestehenden Termin. Bitte den Termin beim Kunden ändern.'
        :'Kunde wurde gespeichert, aber die Probefahrt konnte nicht geplant werden: '+error.message);
    }else{
      await supabase.from('ava_history').insert({customer_id:res.data.id,actor_id:uid,action:'Probefahrt automatisch geplant',details:new Date(form.test_drive_at).toLocaleString('de-DE')+' · Erinnerungen 1 Tag / 1 Stunde vorher + Nachkontakt +2 Tage'});
    }
  }
  closeForm();load();
 }
 function edit(c){setSelected(c);setForm({name:c.name||'',customer_number:c.customer_number||'',phone:c.phone||'',email:c.email||'',vehicle_interest:c.vehicle_interest||'',stage:c.stage||'lead',notes:c.notes||'',contract_end_date:c.contract_end_date||'',ordered_at:c.ordered_at||'',delivered_at:c.delivered_at||'',test_drive_at:c.test_drive_at?c.test_drive_at.slice(0,16):'',planned_delivery_at:c.planned_delivery_at?c.planned_delivery_at.slice(0,16):''});setShowForm(true)}
 function fresh(){setSelected(null);setForm({name:'',customer_number:'',phone:'',email:'',vehicle_interest:'',stage:'lead',notes:'',contract_end_date:'',ordered_at:'',delivered_at:'',test_drive_at:'',planned_delivery_at:''});setShowForm(true)}
 function closeForm(){setShowForm(false);setSelected(null)}
 async function toggleTask(t){const next=t.status==='done'?'open':'done';await supabase.from('ava_tasks').update({status:next,completed_at:next==='done'?new Date().toISOString():null}).eq('id',t.id);await supabase.from('ava_history').insert({customer_id:t.customer_id,actor_id:uid,action:next==='done'?'Aufgabe erledigt':'Aufgabe wieder geöffnet',details:t.title});load()}


 async function scheduleTestDrive(c,dt){
   if(!dt){alert('Bitte zuerst einen Probefahrt-Termin eintragen.');return}
   const {error}=await supabase.rpc('ava_schedule_test_drive',{p_customer_id:c.id,p_starts_at:new Date(dt).toISOString(),p_minutes:60,p_vehicle:c.vehicle_interest||''});
   if(error){alert(error.message.includes('TERMIN_CONFLICT')?'Terminüberschneidung erkannt. Bitte einen anderen Zeitpunkt wählen.':error.message)}
   else {await supabase.from('ava_history').insert({customer_id:c.id,actor_id:uid,action:'Probefahrt geplant',details:new Date(dt).toLocaleString('de-DE')+' · Erinnerungen 1 Tag / 1 Stunde vorher + Nachkontakt +2 Tage'});load()}
 }
 async function quickWorkflow(c,type){
   let due=new Date(), title='', details=c.vehicle_interest||'';
   if(type==='offer'){due.setDate(due.getDate()+2);title='Nachkontakt Angebot'}
   if(type==='test_drive'){due.setDate(due.getDate()+2);title='Nachkontakt Probefahrt'}
   if(type==='delivery'){due.setDate(due.getDate()+1);title='Nachkontakt Auslieferung'}
   if(type==='delivery_update'){due.setDate(due.getDate()+21);title='Lieferstatus prüfen & Kunden informieren'}
   const {error}=await supabase.rpc('ava_create_followup',{p_customer_id:c.id,p_type:type,p_title:title,p_details:details,p_due_at:due.toISOString()});
   if(error) alert(error.message); else {await supabase.from('ava_history').insert({customer_id:c.id,actor_id:uid,action:title+' geplant',details:'Fällig: '+due.toLocaleString('de-DE')});load()}
 }
 async function contactAttempt(t,success){
   const {error}=await supabase.rpc('ava_complete_contact_attempt',{p_task_id:t.id,p_success:success});
   if(error)alert(error.message);else{await supabase.from('ava_history').insert({customer_id:t.customer_id,actor_id:uid,action:success?'Kunde erreicht':'Kunde nicht erreicht',details:t.title});load()}
 }
 const contractAlerts=customers.filter(c=>c.contract_end_date&&Math.abs((new Date(c.contract_end_date+'T12:00:00')-new Date())/(86400000)-183)<=14);
 const openTasks=tasks.filter(t=>t.status==='open');

 return <main className="shell">
  <aside><div className="logo">AVA <span>0.4.2</span></div>{['Heute','Kalender','Kunden','Historie','Team'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}<div className="asideBottom"><small>{session.user.email}</small><button onClick={()=>supabase.auth.signOut()}>Abmelden</button></div></aside>
  <section className="content"><header><div><b>{tab}</b><p>Autohaus Vertriebs Assistent · Supabase verbunden</p></div><div className="headActions"><button onClick={fresh}>+ Kunde</button><button className="dark" onClick={()=>alert('Sprachsteuerung kommt als nächster Schritt.')}>🎙️ AVA</button></div></header>
  {busy?<p>Lade AVA-Daten…</p>:<>
   {tab==='Heute'&&<><h1>Dein Verkaufstag</h1><div className="stats"><Stat n={openTasks.length} t="Offene Aufgaben"/><Stat n={events.length} t="Termine"/><Stat n={customers.length} t="Kunden"/><Stat n={contractAlerts.length} t="6-Monats-Chancen"/></div>{contractAlerts.length>0&&<><h2>Vertragsende in ca. 6 Monaten</h2>{contractAlerts.map(c=><div className="panel" key={'alert'+c.id}><div><b>{c.name} · KD {c.customer_number}</b><p>{c.vehicle_interest} · Vertragsende {new Date(c.contract_end_date+'T12:00:00').toLocaleDateString('de-DE')}</p></div><button onClick={()=>quickWorkflow(c,'offer')}>Kontakt planen</button></div>)}</>}<h2>Offene Aufgaben</h2>{openTasks.length?openTasks.slice(0,8).map(t=><Task key={t.id} t={t} toggle={()=>toggleTask(t)} contact={(ok)=>contactAttempt(t,ok)}/>):<Empty text="Noch keine Aufgaben. Sobald wir die Automatik aktivieren, erscheinen hier Follow-ups."/ >}</>}
   {tab==='Kunden'&&<><div className="title"><h1>Kunden</h1><button className="dark" onClick={fresh}>+ Testkunde anlegen</button></div>{customers.length?customers.map(c=><div className="panel" key={c.id}><div><b>{c.name} · KD {c.customer_number}</b><p>{c.vehicle_interest||'Kein Fahrzeug'} · {c.stage}<br/>{c.phone||'Keine Telefonnummer'} · {c.email||'Keine E-Mail'}<br/>{c.notes||''}{c.contract_end_date&&<><br/><b>Vertragsende:</b> {new Date(c.contract_end_date+'T12:00:00').toLocaleDateString('de-DE')}</>}</p></div><div className="actions"><button onClick={()=>edit(c)}>Bearbeiten</button><button onClick={()=>{setTab('Historie');}}>Historie</button><button onClick={()=>openMail(c)}>E-Mail</button>{c.test_drive_at&&<button onClick={()=>scheduleTestDrive(c,c.test_drive_at)}>Probefahrt planen</button>}<button onClick={()=>quickWorkflow(c,'offer')}>+2T Angebot</button><button onClick={()=>quickWorkflow(c,'test_drive')}>+2T Probefahrt</button><button onClick={()=>quickWorkflow(c,'delivery')}>+1T Auslieferung</button><button onClick={()=>quickWorkflow(c,'delivery_update')}>+3W Lieferstatus</button></div></div>):<Empty text="Noch keine Kunden gespeichert. Lege deinen ersten fiktiven Testkunden an."/ >}</>}
   {tab==='Historie'&&<><h1>Historie</h1>{history.length?history.map(h=><div className="history" key={h.id}><b>{h.action}</b><p>{new Date(h.created_at).toLocaleString('de-DE')}<br/>{h.details}</p></div>):<Empty text="Noch keine Historieneinträge."/ >}</>}
   {tab==='Kalender'&&<><div className="title"><h1>Kalender</h1><div><button className={!week?'dark':''} onClick={()=>setWeek(false)}>Tag</button><button className={week?'dark':''} onClick={()=>setWeek(true)}>Woche</button></div></div>{events.length?<Calendar events={events} week={week}/>:<Empty text="Noch keine Termine gespeichert. Termin-Erstellung und Konfliktprüfung bauen wir als nächsten Datenbank-Schritt."/ >}</>}
   {tab==='Team'&&<><h1>Team</h1><div className="panel"><div><b>Dein AVA-Testkonto</b><p>{session.user.email}<br/>Rolle: Verkäufer</p></div></div><Empty text="Mehrere Verkäufer, @Aufgaben und Vertretungen werden auf dieser Datenbasis ergänzt."/></>}
  </>}</section>
  <nav>{['Heute','Kalender','Kunden','Historie','Team'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</nav>
  {showForm&&<div className="overlay"><form className="modal" onSubmit={saveCustomer}><h2>{selected?'Kunde bearbeiten':'Testkunde anlegen'}</h2><p>Bitte vorerst ausschließlich fiktive Daten verwenden.</p><div className="grid"><input required placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input required placeholder="Kundennummer" value={form.customer_number} onChange={e=>setForm({...form,customer_number:e.target.value})}/><input placeholder="Telefon" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input type="email" placeholder="E-Mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input className="full" placeholder="Fahrzeug / Interesse" value={form.vehicle_interest} onChange={e=>setForm({...form,vehicle_interest:e.target.value})}/><label className="field full"><span>Kundenstatus</span><small>Der Status bestimmt, welche Termine AVA benötigt.</small><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}><option value="lead">Lead</option><option value="test_drive">Probefahrt</option><option value="offer">Angebot</option><option value="ordered">Bestellt</option><option value="customer">Bestandskunde / ausgeliefert</option></select></label><div className="full dateHelp"><b>Termine & Automatik</b><p>AVA zeigt nur die Datumsfelder, die zum aktuellen Kundenstatus passen.</p></div>
{selected&&<details className="full allData" open><summary>Alle Kundendaten bearbeiten</summary><div className="allDataGrid">
<label className="field"><span>Probefahrt-Termin</span><input type="datetime-local" value={form.test_drive_at||''} onChange={e=>setForm({...form,test_drive_at:e.target.value})}/></label>
<label className="field"><span>Bestelldatum</span><input type="date" value={form.ordered_at||''} onChange={e=>setForm({...form,ordered_at:e.target.value})}/></label>
<label className="field"><span>Geplante Auslieferung</span><input type="datetime-local" value={form.planned_delivery_at||''} onChange={e=>setForm({...form,planned_delivery_at:e.target.value})}/></label>
<label className="field"><span>Tatsächliche Auslieferung</span><input type="date" value={form.delivered_at||''} onChange={e=>setForm({...form,delivered_at:e.target.value})}/></label>
<label className="field"><span>Vertragsende Leasing / Finanzierung</span><input type="date" value={form.contract_end_date||''} onChange={e=>setForm({...form,contract_end_date:e.target.value})}/></label>
</div></details>}
{form.stage==='test_drive'&&<label className="field full"><span>Probefahrt-Termin</span><small>AVA erinnert 1 Tag und 1 Stunde vorher und plant den Nachkontakt 2 Tage später.</small><input type="datetime-local" value={form.test_drive_at} onChange={e=>setForm({...form,test_drive_at:e.target.value})}/></label>}
{form.stage==='ordered'&&<><label className="field"><span>Bestelldatum</span><small>Startpunkt für den Fahrzeugauftrag.</small><input type="date" value={form.ordered_at} onChange={e=>setForm({...form,ordered_at:e.target.value})}/></label><label className="field"><span>Geplante Auslieferung</span><small>Optional, falls bereits bekannt.</small><input type="datetime-local" value={form.planned_delivery_at} onChange={e=>setForm({...form,planned_delivery_at:e.target.value})}/></label></>}
{form.stage==='customer'&&<><label className="field"><span>Auslieferungsdatum</span><small>AVA nutzt es für den Nachkontakt nach der Übergabe.</small><input type="date" value={form.delivered_at} onChange={e=>setForm({...form,delivered_at:e.target.value})}/></label><label className="field"><span>Vertragsende Leasing / Finanzierung</span><small>AVA erkennt daraus die Verkaufschance ca. 6 Monate vorher.</small><input type="date" value={form.contract_end_date} onChange={e=>setForm({...form,contract_end_date:e.target.value})}/></label></>}<textarea className="full" placeholder="Notizen" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div><div className="actions"><button type="button" onClick={closeForm}>Abbrechen</button><button className="dark">Speichern</button></div></form></div>}
 </main>
}
function openMail(c){const subject=encodeURIComponent(`Ihre Anfrage zu ${c.vehicle_interest||'Ihrem Fahrzeug'}`);const body=encodeURIComponent(`Guten Tag ${c.name},\n\nvielen Dank für unser Gespräch. Ich wollte mich kurz bei Ihnen melden und fragen, ob ich Sie rund um ${c.vehicle_interest||'Ihr Wunschfahrzeug'} noch unterstützen kann.\n\nFreundliche Grüße`);window.location.href=`mailto:${c.email||''}?subject=${subject}&body=${body}`}
function Stat({n,t}){return <div className="stat"><b>{n}</b><span>{t}</span></div>}
function Empty({text}){return <div className="empty">{text}</div>}
function Task({t,toggle,contact}){return <div className="panel"><div><b>{t.title}</b><p>{new Date(t.due_at).toLocaleString('de-DE')}<br/>{t.details}</p></div><div className="actions"><button onClick={()=>contact(true)}>☎ Erreicht</button><button onClick={()=>contact(false)}>✕ Nicht erreicht</button><button onClick={toggle}>✓ Erledigt</button></div></div>}
function Calendar({events,week}){if(!week)return <div>{events.map(e=><div className="event" key={e.id}><b>{new Date(e.starts_at).toLocaleString('de-DE')} · {e.title}</b><p>{e.vehicle||''} {e.notes||''}</p></div>)}</div>;let groups={};events.forEach(e=>{let k=new Date(e.starts_at).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});(groups[k]??=[]).push(e)});return <div className="week">{Object.entries(groups).map(([d,es])=><div className="day" key={d}><b>{d}</b>{es.map(e=><p key={e.id}>{new Date(e.starts_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} · {e.title}</p>)}</div>)}</div>}
