'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=(url&&key)?createClient(url,key):null;

const STAGES={
  lead:{label:'Lead',tone:'neutral'},
  test_drive:{label:'Probefahrt',tone:'blue'},
  offer:{label:'Angebot',tone:'amber'},
  ordered:{label:'Bestellt',tone:'violet'},
  customer:{label:'Bestandskunde',tone:'green'}
};

const fmtDateTime=v=>v?new Date(v).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const fmtDate=v=>v?new Date(v+'T12:00:00').toLocaleDateString('de-DE'):'—';
const fmtTime=v=>v?new Date(v).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'—';

export default function App(){
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return()=>subscription.unsubscribe();
  },[]);

  if(loading) return <Splash text="AVA wird geladen…"/>;
  if(!supabase) return <Splash text="Supabase-Verbindung fehlt" sub="Bitte die Vercel Environment Variables prüfen."/>;
  return session?<Dashboard session={session}/>:<Login/>;
}

function Splash({text,sub}){
  return <div className="splash"><div className="brandMark">A</div><div className="brandName">AVA</div><h2>{text}</h2>{sub&&<p>{sub}</p>}</div>;
}

function Login(){
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [msg,setMsg]=useState('');

  async function submit(e){
    e.preventDefault(); setMsg('Bitte warten…');
    if(mode==='register'){
      const {error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
      setMsg(error?error.message:'Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte den Link in deiner Mail öffnen.');
    }else{
      const {error}=await supabase.auth.signInWithPassword({email,password});
      setMsg(error?error.message:'Angemeldet.');
    }
  }

  return <div className="authPage">
    <div className="authVisual">
      <div className="authBrand"><div className="brandMark">A</div><div><b>AVA</b><span>Autohaus Vertriebs Assistent</span></div></div>
      <div className="authClaim">Mehr Überblick.<br/>Weniger Nachhalten.<br/>Mehr Zeit für Verkauf.</div>
      <div className="versionPill">Alpha 0.5</div>
    </div>
    <div className="authPanel">
      <div className="authCard">
        <h1>{mode==='login'?'Willkommen zurück':'Testkonto erstellen'}</h1>
        <p>{mode==='login'?'Melde dich bei deinem AVA-Arbeitsplatz an.':'Für die Alpha bitte ausschließlich fiktive Kundendaten nutzen.'}</p>
        <form onSubmit={submit}>
          {mode==='register'&&<Field label="Name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Max Mustermann"/></Field>}
          <Field label="E-Mail"><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="verkaeufer@autohaus.de"/></Field>
          <Field label="Passwort"><input required minLength="6" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></Field>
          <button className="btn primary wide">{mode==='login'?'Anmelden':'Registrieren'}</button>
        </form>
        {msg&&<div className="inlineMessage">{msg}</div>}
        <button className="textButton" onClick={()=>{setMode(mode==='login'?'register':'login');setMsg('')}}>
          {mode==='login'?'Noch kein Testkonto? Registrieren':'Zur Anmeldung'}
        </button>
      </div>
    </div>
  </div>;
}

function Dashboard({session}){
  const uid=session.user.id;
  const [tab,setTab]=useState('Heute');
  const [customers,setCustomers]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [events,setEvents]=useState([]);
  const [history,setHistory]=useState([]);
  const [busy,setBusy]=useState(true);
  const [week,setWeek]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [selected,setSelected]=useState(null);
  const [detail,setDetail]=useState(null);
  const [search,setSearch]=useState('');
  const emptyForm={name:'',customer_number:'',phone:'',email:'',vehicle_interest:'',stage:'lead',notes:'',contract_end_date:'',ordered_at:'',delivered_at:'',test_drive_at:'',planned_delivery_at:''};
  const [form,setForm]=useState(emptyForm);

  async function load(){
    setBusy(true);
    const [c,t,e,h]=await Promise.all([
      supabase.from('ava_customers').select('*').eq('owner_id',uid).order('created_at',{ascending:false}),
      supabase.from('ava_tasks').select('*').eq('assigned_to',uid).order('due_at'),
      supabase.from('ava_events').select('*').eq('owner_id',uid).order('starts_at'),
      supabase.from('ava_history').select('*').eq('actor_id',uid).order('created_at',{ascending:false})
    ]);
    setCustomers(c.data||[]); setTasks(t.data||[]); setEvents(e.data||[]); setHistory(h.data||[]);
    setBusy(false);
  }

  useEffect(()=>{load()},[]);

  const customerMap=useMemo(()=>Object.fromEntries(customers.map(c=>[c.id,c])),[customers]);
  const openTasks=useMemo(()=>tasks.filter(t=>t.status==='open'),[tasks]);
  const todayEvents=useMemo(()=>{
    const now=new Date();
    return events.filter(e=>{const d=new Date(e.starts_at);return d.toDateString()===now.toDateString()});
  },[events]);
  const contractAlerts=useMemo(()=>customers.filter(c=>{
    if(!c.contract_end_date)return false;
    const diff=(new Date(c.contract_end_date+'T12:00:00')-new Date())/86400000;
    return diff>=168&&diff<=198;
  }),[customers]);
  const filteredCustomers=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return customers;
    return customers.filter(c=>[c.name,c.customer_number,c.phone,c.email,c.vehicle_interest,STAGES[c.stage]?.label].filter(Boolean).join(' ').toLowerCase().includes(q));
  },[customers,search]);

  function fresh(){setSelected(null);setForm(emptyForm);setShowForm(true)}
  function edit(c){
    setSelected(c);
    setForm({
      name:c.name||'',customer_number:c.customer_number||'',phone:c.phone||'',email:c.email||'',vehicle_interest:c.vehicle_interest||'',
      stage:c.stage||'lead',notes:c.notes||'',contract_end_date:c.contract_end_date||'',ordered_at:c.ordered_at||'',delivered_at:c.delivered_at||'',
      test_drive_at:c.test_drive_at?c.test_drive_at.slice(0,16):'',planned_delivery_at:c.planned_delivery_at?c.planned_delivery_at.slice(0,16):''
    });
    setShowForm(true);
  }
  function closeForm(){setShowForm(false);setSelected(null)}

  async function saveCustomer(e){
    e.preventDefault();
    const cleanDate=v=>v&&String(v).trim()?v:null;
    const cleanDateTime=v=>v&&String(v).trim()?new Date(v).toISOString():null;
    const payload={
      name:form.name,customer_number:form.customer_number,phone:form.phone||null,email:form.email||null,
      vehicle_interest:form.vehicle_interest||null,stage:form.stage,notes:form.notes||null,
      contract_end_date:cleanDate(form.contract_end_date),ordered_at:cleanDate(form.ordered_at),delivered_at:cleanDate(form.delivered_at),
      test_drive_at:cleanDateTime(form.test_drive_at),planned_delivery_at:cleanDateTime(form.planned_delivery_at),owner_id:uid
    };
    const res=selected
      ?await supabase.from('ava_customers').update(payload).eq('id',selected.id).select().single()
      :await supabase.from('ava_customers').insert(payload).select().single();
    if(res.error){alert(res.error.message);return}
    await supabase.from('ava_history').insert({customer_id:res.data.id,actor_id:uid,action:selected?'Kundendaten geändert':'Kunde angelegt',details:`${res.data.name} · ${res.data.vehicle_interest||''}`});

    if(!selected && form.stage==='test_drive' && form.test_drive_at){
      const {error}=await supabase.rpc('ava_schedule_test_drive',{
        p_customer_id:res.data.id,p_starts_at:new Date(form.test_drive_at).toISOString(),p_minutes:60,p_vehicle:form.vehicle_interest||''
      });
      if(error) alert(error.message.includes('TERMIN_CONFLICT')?'Kunde gespeichert, aber Terminüberschneidung erkannt. Bitte Probefahrt ändern.':'Kunde gespeichert, Probefahrt konnte aber nicht geplant werden: '+error.message);
    }
    closeForm(); await load();
  }

  async function quickWorkflow(c,type){
    let due=new Date(),title='',details=[c.name,c.customer_number?`KD ${c.customer_number}`:'',c.vehicle_interest].filter(Boolean).join(' · ');
    if(type==='offer'){due.setDate(due.getDate()+2);title='Nachkontakt Angebot'}
    if(type==='test_drive'){due.setDate(due.getDate()+2);title='Nachkontakt Probefahrt'}
    if(type==='delivery'){due.setDate(due.getDate()+1);title='Nachkontakt Auslieferung'}
    if(type==='delivery_update'){due.setDate(due.getDate()+21);title='Lieferstatus prüfen & Kunden informieren'}
    const {error}=await supabase.rpc('ava_create_followup',{p_customer_id:c.id,p_type:type,p_title:title,p_details:details,p_due_at:due.toISOString()});
    if(error) alert(error.message);
    else{
      await supabase.from('ava_history').insert({customer_id:c.id,actor_id:uid,action:title+' geplant',details:'Fällig: '+due.toLocaleString('de-DE')});
      await load();
    }
  }

  async function taskReached(t){
    if(t.type==='test_drive_prepare'){
      await supabase.from('ava_tasks').update({status:'done',completed_at:new Date().toISOString()}).eq('id',t.id);
      await supabase.from('ava_history').insert({customer_id:t.customer_id,actor_id:uid,action:'Probefahrt-Vorbereitung erledigt',details:t.title});
      await load(); return;
    }
    const {error}=await supabase.rpc('ava_complete_contact_attempt',{p_task_id:t.id,p_success:true});
    if(error) alert(error.message); else {await supabase.from('ava_history').insert({customer_id:t.customer_id,actor_id:uid,action:'Kunde erreicht',details:t.title});await load()}
  }

  async function taskNotReached(t){
    const {error}=await supabase.rpc('ava_complete_contact_attempt',{p_task_id:t.id,p_success:false});
    if(error) alert(error.message); else {await supabase.from('ava_history').insert({customer_id:t.customer_id,actor_id:uid,action:'Kunde nicht erreicht',details:t.title});await load()}
  }

  async function reopenOrDone(t){
    const next=t.status==='done'?'open':'done';
    await supabase.from('ava_tasks').update({status:next,completed_at:next==='done'?new Date().toISOString():null}).eq('id',t.id);
    await supabase.from('ava_history').insert({customer_id:t.customer_id,actor_id:uid,action:next==='done'?'Aufgabe erledigt':'Aufgabe wieder geöffnet',details:t.title});
    await load();
  }

  function openMail(c){
    const subject=encodeURIComponent(`Ihre Anfrage zu ${c.vehicle_interest||'Ihrem Fahrzeug'}`);
    const body=encodeURIComponent(`Guten Tag ${c.name},\n\nvielen Dank für unser Gespräch. Ich wollte mich kurz bei Ihnen melden und fragen, ob ich Sie rund um ${c.vehicle_interest||'Ihr Wunschfahrzeug'} noch unterstützen kann.\n\nFreundliche Grüße`);
    window.location.href=`mailto:${c.email||''}?subject=${subject}&body=${body}`;
  }

  function taskCustomer(t){return customerMap[t.customer_id]||null}

  return <div className="appShell">
    <Sidebar tab={tab} setTab={setTab} email={session.user.email}/>
    <main className="workspace">
      <Topbar tab={tab} onNew={fresh}/>
      {busy?<LoadingState/>:<>
        {tab==='Heute'&&<TodayView openTasks={openTasks} todayEvents={todayEvents} customers={customers} contractAlerts={contractAlerts} customerMap={customerMap} onReached={taskReached} onNotReached={taskNotReached} onDone={reopenOrDone} onOpenCustomer={setDetail} onQuick={quickWorkflow}/>}
        {tab==='Kunden'&&<CustomersView customers={filteredCustomers} search={search} setSearch={setSearch} onOpen={setDetail} onEdit={edit} onMail={openMail} onNew={fresh}/>}
        {tab==='Kalender'&&<CalendarView events={events} customerMap={customerMap} week={week} setWeek={setWeek} onOpenCustomer={setDetail}/>}
        {tab==='Historie'&&<HistoryView history={history} customerMap={customerMap}/>}
        {tab==='Team'&&<TeamView email={session.user.email}/>}
      </>}
    </main>
    <MobileNav tab={tab} setTab={setTab}/>
    {showForm&&<CustomerForm selected={selected} form={form} setForm={setForm} onClose={closeForm} onSubmit={saveCustomer}/>}
    {detail&&<CustomerDetail customer={detail} history={history.filter(h=>h.customer_id===detail.id)} tasks={tasks.filter(t=>t.customer_id===detail.id)} onClose={()=>setDetail(null)} onEdit={()=>{setDetail(null);edit(detail)}} onMail={()=>openMail(detail)} onQuick={type=>quickWorkflow(detail,type)}/>}
  </div>;
}

function Sidebar({tab,setTab,email}){
  const items=[['Heute','⌂'],['Kalender','▦'],['Kunden','◉'],['Historie','↺'],['Team','◇']];
  return <aside className="sidebar">
    <div className="sideBrand"><div className="brandMark small">A</div><div><b>AVA</b><span>Alpha 0.5</span></div></div>
    <nav className="sideNav">{items.map(([label,icon])=><button key={label} className={tab===label?'active':''} onClick={()=>setTab(label)}><span>{icon}</span>{label}</button>)}</nav>
    <div className="sideFoot"><div className="userDot">V</div><div className="userMeta"><b>Verkäufer</b><span>{email}</span></div><button className="iconButton" title="Abmelden" onClick={()=>supabase.auth.signOut()}>↗</button></div>
  </aside>;
}

function Topbar({tab,onNew}){
  return <header className="topbar">
    <div><span className="eyebrow">AVA Workspace</span><h2>{tab}</h2></div>
    <div className="topActions"><button className="btn soft" onClick={()=>alert('Sprachsteuerung folgt im nächsten Entwicklungsschritt.')}>🎙 AVA</button><button className="btn primary" onClick={onNew}>+ Kunde</button></div>
  </header>;
}

function TodayView({openTasks,todayEvents,customers,contractAlerts,customerMap,onReached,onNotReached,onDone,onOpenCustomer,onQuick}){
  return <div className="page">
    <div className="heroRow">
      <div><span className="eyebrow">Heute im Verkauf</span><h1>Guten Überblick behalten.</h1><p>AVA bündelt Kontakte, Probefahrten, Auslieferungen und Chancen an einem Ort.</p></div>
      <div className="dateCard"><span>{new Date().toLocaleDateString('de-DE',{weekday:'long'})}</span><b>{new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}</b></div>
    </div>
    <div className="metricGrid">
      <Metric n={openTasks.length} label="Offene Aufgaben" sub="heute & nächste Schritte"/>
      <Metric n={todayEvents.length} label="Termine heute" sub="Kalender"/>
      <Metric n={customers.length} label="Meine Kunden" sub="aktive Datensätze"/>
      <Metric n={contractAlerts.length} label="Vertragschancen" sub="ca. 6 Monate vorher"/>
    </div>

    <div className="twoCol">
      <section>
        <SectionTitle title="Jetzt wichtig" hint="Priorisierte Aufgaben"/>
        <div className="stack">
          {openTasks.length?openTasks.slice(0,10).map(t=><TaskCard key={t.id} task={t} customer={customerMap[t.customer_id]} onReached={()=>onReached(t)} onNotReached={()=>onNotReached(t)} onDone={()=>onDone(t)} onOpenCustomer={onOpenCustomer}/>):<EmptyState title="Alles erledigt" text="Aktuell sind keine offenen Aufgaben vorhanden."/>}
        </div>
      </section>
      <aside className="rightRail">
        <SectionTitle title="Termine heute" hint={`${todayEvents.length} Einträge`}/>
        <div className="agenda">
          {todayEvents.length?todayEvents.map(e=><AgendaItem key={e.id} event={e} customer={customerMap[e.customer_id]} onOpenCustomer={onOpenCustomer}/>):<EmptyState title="Keine Termine" text="Für heute sind keine Kalendertermine gespeichert." compact/>}
        </div>
        {contractAlerts.length>0&&<>
          <SectionTitle title="Vertragschancen" hint="ca. 6 Monate"/>
          <div className="stack">{contractAlerts.map(c=><div className="opportunity" key={c.id}><div><span className="statusBadge green">Chance</span><b>{c.name}</b><small>{c.vehicle_interest||'Fahrzeug'} · Ende {fmtDate(c.contract_end_date)}</small></div><button className="btn soft smallBtn" onClick={()=>onQuick(c,'offer')}>Kontakt planen</button></div>)}</div>
        </>}
      </aside>
    </div>
  </div>;
}

function TaskCard({task,customer,onReached,onNotReached,onDone,onOpenCustomer}){
  const prep=task.type==='test_drive_prepare';
  const contact=!prep;
  const overdue=new Date(task.due_at)<new Date();
  return <article className={`taskCard ${overdue?'overdue':''}`}>
    <div className="taskIcon">{prep?'🚗':'☎'}</div>
    <div className="taskMain">
      <div className="taskTop"><div><span className={`statusBadge ${prep?'blue':'neutral'}`}>{prep?'Probefahrt':'Kontakt'}</span><b>{task.title}</b></div><span className="due">{fmtDateTime(task.due_at)}</span></div>
      {customer?<button className="customerLink" onClick={()=>onOpenCustomer(customer)}>{customer.name} · KD {customer.customer_number} · {customer.phone||'keine Tel.'} · {customer.vehicle_interest||'kein Fahrzeug'}</button>:<span className="muted">{task.details||'Kein Kunde zugeordnet'}</span>}
      <div className="taskActions">
        <button className="btn primary" onClick={onReached}>{prep?'✓ Fahrzeug vorbereitet':'✓ Erreicht'}</button>
        {contact&&<button className="btn soft" onClick={onNotReached}>Nicht erreicht</button>}
        <button className="btn ghost" onClick={onDone}>Erledigt</button>
      </div>
    </div>
  </article>;
}

function AgendaItem({event,customer,onOpenCustomer}){
  return <div className="agendaItem">
    <div className="agendaTime">{fmtTime(event.starts_at)}</div>
    <div className="agendaLine"/>
    <div className="agendaBody"><b>{event.title}</b>{customer?<button onClick={()=>onOpenCustomer(customer)}>{customer.name} · KD {customer.customer_number}</button>:<span>Kein Kunde</span>}<small>{event.vehicle||customer?.vehicle_interest||''}</small></div>
  </div>;
}

function CustomersView({customers,search,setSearch,onOpen,onEdit,onMail,onNew}){
  return <div className="page">
    <div className="pageTitleRow"><div><span className="eyebrow">Kundenmanagement</span><h1>Kunden</h1><p>Klare Übersicht statt überladener Aktionsleiste.</p></div><button className="btn primary" onClick={onNew}>+ Neuer Kunde</button></div>
    <div className="toolbar"><div className="searchBox"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, Kundennummer, Telefon, E-Mail oder Fahrzeug suchen…"/></div><span className="countPill">{customers.length} Kunden</span></div>
    <div className="customerGrid">
      {customers.length?customers.map(c=><CustomerCard key={c.id} c={c} onOpen={()=>onOpen(c)} onEdit={()=>onEdit(c)} onMail={()=>onMail(c)}/>):<EmptyState title="Keine Kunden gefunden" text="Ändere die Suche oder lege einen neuen Testkunden an."/>}
    </div>
  </div>;
}

function CustomerCard({c,onOpen,onEdit,onMail}){
  const stage=STAGES[c.stage]||STAGES.lead;
  return <article className="customerCard">
    <div className="customerHead"><div className="avatar">{initials(c.name)}</div><div className="customerIdentity"><b>{c.name}</b><span>KD {c.customer_number}</span></div><span className={`statusBadge ${stage.tone}`}>{stage.label}</span></div>
    <div className="vehicleLine"><span>Fahrzeug</span><b>{c.vehicle_interest||'Noch nicht hinterlegt'}</b></div>
    <div className="customerFacts">
      <div><span>Telefon</span><b>{c.phone||'—'}</b></div>
      <div><span>E-Mail</span><b>{c.email||'—'}</b></div>
      {c.test_drive_at&&<div><span>Probefahrt</span><b>{fmtDateTime(c.test_drive_at)}</b></div>}
      {c.contract_end_date&&<div><span>Vertragsende</span><b>{fmtDate(c.contract_end_date)}</b></div>}
    </div>
    <div className="customerActions"><button className="btn primary" onClick={onOpen}>Kundenakte öffnen</button><button className="btn soft" onClick={onEdit}>Bearbeiten</button><button className="iconButton larger" onClick={onMail} title="E-Mail">✉</button></div>
  </article>;
}

function CalendarView({events,customerMap,week,setWeek,onOpenCustomer}){
  const today=new Date();
  const dayEvents=events.filter(e=>new Date(e.starts_at).toDateString()===today.toDateString());
  return <div className="page">
    <div className="pageTitleRow"><div><span className="eyebrow">Terminplanung</span><h1>Kalender</h1><p>Probefahrten, Auslieferungen und Verkaufsaufgaben mit Kundenkontext.</p></div><div className="segmented"><button className={!week?'active':''} onClick={()=>setWeek(false)}>Tag</button><button className={week?'active':''} onClick={()=>setWeek(true)}>Woche</button></div></div>
    {!week?<DayCalendar events={dayEvents} customerMap={customerMap} onOpenCustomer={onOpenCustomer}/>:<WeekCalendar events={events} customerMap={customerMap} onOpenCustomer={onOpenCustomer}/>}
  </div>;
}

function DayCalendar({events,customerMap,onOpenCustomer}){
  return <div className="calendarSurface">
    <div className="calendarHeader"><div><span>Heute</span><b>{new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</b></div><span className="countPill">{events.length} Termine</span></div>
    <div className="dayTimeline">{events.length?events.map(e=><CalendarEvent key={e.id} e={e} customer={customerMap[e.customer_id]} onOpenCustomer={onOpenCustomer}/>):<EmptyState title="Keine Termine heute" text="Für heute ist aktuell nichts im Kalender eingetragen."/>}</div>
  </div>;
}

function CalendarEvent({e,customer,onOpenCustomer}){
  return <div className="calendarEvent">
    <div className="timeBlock"><b>{fmtTime(e.starts_at)}</b><span>bis {fmtTime(e.ends_at)}</span></div>
    <div className="eventAccent"/>
    <div className="eventInfo"><span className="statusBadge blue">{e.event_type==='test_drive'?'Probefahrt':'Termin'}</span><h3>{e.title}</h3>{customer?<button className="customerLink" onClick={()=>onOpenCustomer(customer)}>{customer.name} · KD {customer.customer_number}</button>:<span className="muted">Kein Kunde zugeordnet</span>}<small>{customer?.phone||''}{customer?.phone&&' · '}{e.vehicle||customer?.vehicle_interest||''}</small></div>
  </div>;
}

function WeekCalendar({events,customerMap,onOpenCustomer}){
  const days=[0,1,2,3,4,5].map(offset=>{const d=new Date();const dow=d.getDay();const monday=new Date(d);monday.setDate(d.getDate()-((dow+6)%7)+offset);monday.setHours(0,0,0,0);return monday});
  return <div className="weekBoard">{days.map(d=>{
    const es=events.filter(e=>new Date(e.starts_at).toDateString()===d.toDateString());
    return <div className="weekColumn" key={d.toISOString()}><div className="weekHead"><span>{d.toLocaleDateString('de-DE',{weekday:'short'})}</span><b>{d.getDate()}</b></div><div className="weekEvents">{es.map(e=>{const c=customerMap[e.customer_id];return <button key={e.id} className="weekEvent" onClick={()=>c&&onOpenCustomer(c)}><b>{fmtTime(e.starts_at)}</b><span>{e.title}</span><small>{c?.name||e.vehicle||''}</small></button>})}{!es.length&&<div className="weekEmpty">frei</div>}</div></div>
  })}</div>;
}

function HistoryView({history,customerMap}){
  return <div className="page">
    <div className="pageTitleRow"><div><span className="eyebrow">Nachvollziehbarkeit</span><h1>Historie</h1><p>Alle wichtigen Änderungen und Kundenaktionen chronologisch.</p></div></div>
    <div className="historyTimeline">{history.length?history.map(h=>{const c=customerMap[h.customer_id];return <div className="historyRow" key={h.id}><div className="historyDot"/><div className="historyCard"><div className="historyTop"><b>{h.action}</b><span>{fmtDateTime(h.created_at)}</span></div><p>{c?`${c.name} · KD ${c.customer_number}`:''}</p><small>{h.details}</small></div></div>}):<EmptyState title="Noch keine Historie" text="Sobald AVA Aktionen speichert, erscheinen sie hier."/>}</div>
  </div>;
}

function TeamView({email}){
  return <div className="page">
    <div className="pageTitleRow"><div><span className="eyebrow">Zusammenarbeit</span><h1>Team</h1><p>Vertretungen und interne Aufgaben werden als nächstes erweitert.</p></div></div>
    <div className="teamGrid"><div className="teamCard"><div className="avatar large">V</div><div><b>Dein Verkäuferkonto</b><span>{email}</span><small>Aktiv · Verkäufer</small></div></div><div className="teamCard mutedCard"><div className="teamIcon">↔</div><div><b>Vertretung</b><span>Urlaub, Ausgleichstag oder freier Samstag</span><small>Kommt in einer der nächsten Versionen.</small></div></div></div>
  </div>;
}

function CustomerDetail({customer,history,tasks,onClose,onEdit,onMail,onQuick}){
  const stage=STAGES[customer.stage]||STAGES.lead;
  return <div className="drawerBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <aside className="drawer">
      <div className="drawerHead"><div><span className={`statusBadge ${stage.tone}`}>{stage.label}</span><h2>{customer.name}</h2><p>Kundennummer {customer.customer_number}</p></div><button className="closeButton" onClick={onClose}>×</button></div>
      <div className="drawerActions"><button className="btn primary" onClick={onEdit}>Bearbeiten</button><button className="btn soft" onClick={onMail}>E-Mail erstellen</button></div>
      <DetailSection title="Kontakt"><DetailRow label="Telefon" value={customer.phone}/><DetailRow label="E-Mail" value={customer.email}/></DetailSection>
      <DetailSection title="Fahrzeug"><DetailRow label="Interesse / Fahrzeug" value={customer.vehicle_interest}/><DetailRow label="Notizen" value={customer.notes}/></DetailSection>
      <DetailSection title="Termine & Vertrag">
        <DetailRow label="Probefahrt" value={customer.test_drive_at?fmtDateTime(customer.test_drive_at):null}/>
        <DetailRow label="Bestelldatum" value={customer.ordered_at?fmtDate(customer.ordered_at):null}/>
        <DetailRow label="Geplante Auslieferung" value={customer.planned_delivery_at?fmtDateTime(customer.planned_delivery_at):null}/>
        <DetailRow label="Auslieferungsdatum" value={customer.delivered_at?fmtDate(customer.delivered_at):null}/>
        <DetailRow label="Vertragsende Leasing / Finanzierung" value={customer.contract_end_date?fmtDate(customer.contract_end_date):null}/>
      </DetailSection>
      <DetailSection title="Nächste Aktionen">
        <div className="quickGrid"><button onClick={()=>onQuick('offer')}>Angebot nachfassen</button><button onClick={()=>onQuick('test_drive')}>Probefahrt nachfassen</button><button onClick={()=>onQuick('delivery')}>Auslieferung nachfassen</button><button onClick={()=>onQuick('delivery_update')}>Lieferstatus</button></div>
      </DetailSection>
      <DetailSection title="Offene Aufgaben">
        {tasks.filter(t=>t.status==='open').length?tasks.filter(t=>t.status==='open').map(t=><div className="miniTask" key={t.id}><b>{t.title}</b><span>{fmtDateTime(t.due_at)}</span></div>):<span className="muted">Keine offenen Aufgaben</span>}
      </DetailSection>
      <DetailSection title="Letzte Historie">
        {history.slice(0,5).map(h=><div className="miniHistory" key={h.id}><b>{h.action}</b><span>{fmtDateTime(h.created_at)}</span></div>)}
      </DetailSection>
    </aside>
  </div>;
}

function CustomerForm({selected,form,setForm,onClose,onSubmit}){
  const set=(k,v)=>setForm({...form,[k]:v});
  return <div className="modalBackdrop">
    <form className="customerModal" onSubmit={onSubmit}>
      <div className="modalHead"><div><span className="eyebrow">{selected?'Kundenakte':'Neuer Datensatz'}</span><h2>{selected?'Kunde bearbeiten':'Testkunde anlegen'}</h2><p>Alle gespeicherten Daten bleiben jederzeit bearbeitbar.</p></div><button type="button" className="closeButton" onClick={onClose}>×</button></div>
      <div className="formSection"><h3>Stammdaten</h3><div className="formGrid">
        <Field label="Name"><input required value={form.name} onChange={e=>set('name',e.target.value)}/></Field>
        <Field label="Kundennummer"><input required value={form.customer_number} onChange={e=>set('customer_number',e.target.value)}/></Field>
        <Field label="Telefon"><input value={form.phone} onChange={e=>set('phone',e.target.value)}/></Field>
        <Field label="E-Mail"><input type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></Field>
        <Field label="Fahrzeug / Interesse" full><input value={form.vehicle_interest} onChange={e=>set('vehicle_interest',e.target.value)}/></Field>
        <Field label="Kundenstatus" hint="Der Status steuert AVAs Automatik." full><select value={form.stage} onChange={e=>set('stage',e.target.value)}>{Object.entries(STAGES).map(([k,v])=><option value={k} key={k}>{v.label}</option>)}</select></Field>
      </div></div>

      <div className="formSection"><h3>Termine & Vertragsdaten</h3><p className="sectionHint">Beim Bearbeiten sind bewusst alle Felder sichtbar, damit jedes Datum korrigiert werden kann.</p><div className="formGrid">
        <Field label="Probefahrt-Termin" hint="Erinnerung 1 Tag + 1 Stunde vorher"><input type="datetime-local" value={form.test_drive_at||''} onChange={e=>set('test_drive_at',e.target.value)}/></Field>
        <Field label="Bestelldatum" hint="Startpunkt Fahrzeugauftrag"><input type="date" value={form.ordered_at||''} onChange={e=>set('ordered_at',e.target.value)}/></Field>
        <Field label="Geplante Auslieferung"><input type="datetime-local" value={form.planned_delivery_at||''} onChange={e=>set('planned_delivery_at',e.target.value)}/></Field>
        <Field label="Tatsächliche Auslieferung" hint="Nachkontakt nach 1 Tag"><input type="date" value={form.delivered_at||''} onChange={e=>set('delivered_at',e.target.value)}/></Field>
        <Field label="Vertragsende Leasing / Finanzierung" hint="AVA erkennt die Chance ca. 6 Monate vorher" full><input type="date" value={form.contract_end_date||''} onChange={e=>set('contract_end_date',e.target.value)}/></Field>
      </div></div>

      <div className="formSection"><h3>Notizen</h3><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Gespräch, Wünsche, Besonderheiten…"/></div>
      <div className="modalFoot"><span>Alpha-Test: bitte nur fiktive Kundendaten.</span><div><button type="button" className="btn ghost" onClick={onClose}>Abbrechen</button><button className="btn primary">Speichern</button></div></div>
    </form>
  </div>;
}

function MobileNav({tab,setTab}){
  const items=[['Heute','⌂'],['Kalender','▦'],['Kunden','◉'],['Historie','↺'],['Team','◇']];
  return <nav className="mobileNav">{items.map(([l,i])=><button key={l} className={tab===l?'active':''} onClick={()=>setTab(l)}><span>{i}</span>{l}</button>)}</nav>;
}

function Metric({n,label,sub}){return <div className="metric"><div className="metricNumber">{n}</div><b>{label}</b><span>{sub}</span></div>}
function SectionTitle({title,hint}){return <div className="sectionTitle"><h2>{title}</h2><span>{hint}</span></div>}
function Field({label,hint,full,children}){return <label className={`field ${full?'full':''}`}><span>{label}</span>{hint&&<small>{hint}</small>}{children}</label>}
function DetailSection({title,children}){return <section className="detailSection"><h3>{title}</h3>{children}</section>}
function DetailRow({label,value}){return <div className="detailRow"><span>{label}</span><b>{value||'—'}</b></div>}
function EmptyState({title,text,compact}){return <div className={`emptyState ${compact?'compact':''}`}><div>✓</div><b>{title}</b><span>{text}</span></div>}
function LoadingState(){return <div className="loadingState"><div className="loader"/><span>AVA lädt deine Daten…</span></div>}
function initials(name=''){return name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'K'}
