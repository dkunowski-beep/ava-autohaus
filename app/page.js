'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=(url&&key)?createClient(url,key):null;
const AVA_VAPID_PUBLIC_KEY='BODDnkmpaNlH7Z7MGQJK7Vh4NJUVHOtPrZ0gv6-NTEzz2tCfzmh9tWBtNk_dh6lnzq8-fwiagm5vOq438QMxtsk';

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
  return <div className="splash"><div className="avaLogoMark splashLogo"><span className="logoSlash one"></span><span className="logoSlash two"></span><span className="logoCut"></span></div><div className="brandName">AVA</div><h2>{text}</h2>{sub&&<p>{sub}</p>}</div>;
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
      <div className="authBrand"><div className="avaLogoMark authLogo"><span className="logoSlash one"></span><span className="logoSlash two"></span><span className="logoCut"></span></div><div><b>AVA</b><span>Autohaus Vertriebs Assistent</span></div></div>
      <div className="authClaim">Mehr Überblick.<br/>Weniger Nachhalten.<br/>Mehr Zeit für Verkauf.</div>
      <div className="versionPill">Alpha 1.4.1.5.4.3.2</div>
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

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=window.atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

function Dashboard({session}){
  const uid=session.user.id;
  const [tab,setTab]=useState('Heute');
  const [customers,setCustomers]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [events,setEvents]=useState([]);
  const [history,setHistory]=useState([]);
  const [documents,setDocuments]=useState([]);
  const [todos,setTodos]=useState([]);
  const [busy,setBusy]=useState(true);
  const [week,setWeek]=useState(false);
  const [calendarDate,setCalendarDate]=useState(new Date());
  const [calendarMode,setCalendarMode]=useState('month');
  const [editingEvent,setEditingEvent]=useState(null);
  const [notifications,setNotifications]=useState([]);
  const [notificationPrefs,setNotificationPrefs]=useState(null);
  const [notificationOpen,setNotificationOpen]=useState(false);
  const [teamMembers,setTeamMembers]=useState([]);
  const [teamMessages,setTeamMessages]=useState([]);
  const [teamOpen,setTeamOpen]=useState(false);
  const [teamRecipient,setTeamRecipient]=useState('');
  const [teamText,setTeamText]=useState('');
  const [teamAsTask,setTeamAsTask]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [selected,setSelected]=useState(null);
  const [detail,setDetail]=useState(null);
  const [calendarFormOpen,setCalendarFormOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [voiceOpen,setVoiceOpen]=useState(false);
  const [voiceText,setVoiceText]=useState('');
  const [voiceResult,setVoiceResult]=useState('');
  const [voiceListening,setVoiceListening]=useState(false);
  const [voiceRunning,setVoiceRunning]=useState(false);
  const recognitionRef=useRef(null);
  const emptyForm={name:'',customer_number:'',phone:'',email:'',vehicle_interest:'',purchased_vehicle:'',stage:'lead',notes:'',contract_end_date:'',ordered_at:'',delivered_at:'',test_drive_at:'',planned_delivery_at:''};
  const [form,setForm]=useState(emptyForm);

  async function load(){
    setBusy(true);
    const [c,t,e,h,d,td,n,np,tm,msg]=await Promise.all([
      supabase.from('ava_customers').select('*').eq('owner_id',uid).order('created_at',{ascending:false}),
      supabase.from('ava_tasks').select('*').eq('assigned_to',uid).order('due_at'),
      supabase.from('ava_events').select('*').eq('owner_id',uid).order('starts_at'),
      supabase.from('ava_history').select('*').eq('actor_id',uid).order('created_at',{ascending:false}),
      supabase.from('ava_documents').select('*').eq('owner_id',uid).order('created_at',{ascending:false}),
      supabase.from('ava_todos').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
      supabase.from('ava_notifications').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(40),
      supabase.from('ava_notification_preferences').select('*').eq('user_id',uid).maybeSingle(),
      supabase.from('ava_team_members').select('*').eq('active',true).order('display_name'),
      supabase.from('ava_team_messages').select('*').or(`sender_id.eq.${uid},recipient_id.eq.${uid}`).order('created_at',{ascending:false}).limit(100)
    ]);
    setCustomers(c.data||[]); setTasks(t.data||[]); setEvents(e.data||[]); setHistory(h.data||[]); setDocuments(d.data||[]); setTodos(td.data||[]); setNotifications(n.data||[]); setTeamMembers(tm.data||[]); setTeamMessages(msg.data||[]);
    if(np.data)setNotificationPrefs(np.data);
    else{
      const defaults={user_id:uid,enabled:true,morning_brief:true,due_followups:true,test_drive_reminders:true,delivery_reminders:true,todo_reminders:true,opportunity_alerts:true,day_close:true};
      await supabase.from('ava_notification_preferences').upsert(defaults);
      setNotificationPrefs(defaults);
    }
    setBusy(false);
  }

  useEffect(()=>{load()},[]);
  useEffect(()=>{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }
  },[]);
  useEffect(()=>{
    const open=()=>{setVoiceOpen(true);setVoiceResult('')};
    window.addEventListener('ava-open-voice',open);
    return()=>window.removeEventListener('ava-open-voice',open);
  },[]);

  const customerMap=useMemo(()=>Object.fromEntries(customers.map(c=>[c.id,c])),[customers]);
  const openTasks=useMemo(()=>tasks.filter(t=>t.status==='open'),[tasks]);
  const importantTasks=useMemo(()=>{
    const end=new Date();end.setHours(23,59,59,999);
    return tasks.filter(t=>t.status==='open'&&new Date(t.due_at)<=end);
  },[tasks]);
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

  const smartRecommendations=useMemo(()=>{
    const recs=[];
    const now=new Date();
    const open=tasks.filter(t=>t.status==='open');
    const customerFor=id=>customerMap[id];
    open.forEach(t=>{
      const c=customerFor(t.customer_id);
      const due=new Date(t.due_at);
      if(due<now){
        recs.push({key:'task-'+t.id,score:100,title:t.title,body:c?`${c.name} · ${c.vehicle_interest||'Fahrzeug'}`:(t.details||''),tag:'Überfällig',tone:'danger',customer:c});
      }
    });
    contractAlerts.forEach(c=>recs.push({key:'contract-'+c.id,score:75,title:'Vertragschance nutzen',body:`${c.name} · Vertragsende ${fmtDate(c.contract_end_date)}`,tag:'Chance',tone:'blue',customer:c}));
    customers.forEach(c=>{
      if(['lead','test_drive','offer'].includes(c.stage)&&!c.waiting_on_customer){
        const hasTask=open.some(t=>t.customer_id===c.id);
        const hasFutureEvent=events.some(e=>e.customer_id===c.id&&e.status!=='cancelled'&&new Date(e.starts_at)>now);
        if(!hasTask&&!hasFutureEvent){
          recs.push({key:'nostep-'+c.id,score:88,title:'Kein nächster Schritt geplant',body:`${c.name} · ${c.vehicle_interest||'Interessent'}`,tag:'AVA entdeckt',tone:'amber',customer:c});
        }
      }
    });
    return recs.sort((a,b)=>b.score-a.score).slice(0,5);
  },[tasks,customers,events,contractAlerts,customerMap]);

  const dayCloseSummary=useMemo(()=>{
    const end=new Date();end.setHours(23,59,59,999);
    const tomorrowStart=new Date(end);tomorrowStart.setMilliseconds(1);
    const tomorrowEnd=new Date(tomorrowStart);tomorrowEnd.setHours(23,59,59,999);
    return {
      openToday:tasks.filter(t=>t.status==='open'&&new Date(t.due_at)<=end).length,
      tomorrowEvents:events.filter(e=>e.status!=='cancelled'&&new Date(e.starts_at)>=tomorrowStart&&new Date(e.starts_at)<=tomorrowEnd).length,
      tomorrowTestDrives:events.filter(e=>e.event_type==='test_drive'&&e.status!=='cancelled'&&new Date(e.starts_at)>=tomorrowStart&&new Date(e.starts_at)<=tomorrowEnd).length,
      tomorrowDeliveries:events.filter(e=>e.event_type==='delivery'&&e.status!=='cancelled'&&new Date(e.starts_at)>=tomorrowStart&&new Date(e.starts_at)<=tomorrowEnd).length
    };
  },[tasks,events]);


  function fresh(){setSelected(null);setForm(emptyForm);setShowForm(true)}
  function edit(c){
    setSelected(c);
    setForm({
      name:c.name||'',customer_number:c.customer_number||'',phone:c.phone||'',email:c.email||'',vehicle_interest:c.vehicle_interest||'',purchased_vehicle:c.purchased_vehicle||'',
      stage:c.stage||'lead',notes:c.notes||'',contract_end_date:c.contract_end_date||'',ordered_at:c.ordered_at||'',delivered_at:c.delivered_at||'',
      test_drive_at:c.test_drive_at?c.test_drive_at.slice(0,16):'',planned_delivery_at:c.planned_delivery_at?c.planned_delivery_at.slice(0,16):''
    });
    setShowForm(true);
  }
  function closeForm(){setShowForm(false);setSelected(null)}

  async function saveCustomer(e){
    e.preventDefault();
    if(['ordered','customer'].includes(form.stage)&&!form.customer_number.trim()){
      alert('Der Kunde hat gekauft. Bitte jetzt eine Kundennummer eintragen.');
      return;
    }
    const cleanDate=v=>v&&String(v).trim()?v:null;
    const cleanDateTime=v=>v&&String(v).trim()?new Date(v).toISOString():null;
    const payload={
      name:form.name,customer_number:form.customer_number||null,phone:form.phone||null,email:form.email||null,
      vehicle_interest:form.vehicle_interest||null,purchased_vehicle:form.purchased_vehicle||null,stage:form.stage,customer_kind:['ordered','customer'].includes(form.stage)?'buyer':'prospect',notes:form.notes||null,
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

  async function markPurchase(customer){
    const number=window.prompt('Bitte Kundennummer eintragen:');
    if(!number)return;
    const vehicle=window.prompt('Gekauftes Fahrzeug:',customer.purchased_vehicle||customer.vehicle_interest||'');
    if(!vehicle)return;
    const {error}=await supabase.rpc('ava_mark_purchase',{p_customer_id:customer.id,p_customer_number:number,p_vehicle:vehicle,p_ordered_at:new Date().toISOString().slice(0,10)});
    if(error){alert(error.message.includes('KUNDENNUMMER_REQUIRED')?'Bitte Kundennummer eintragen.':error.message);return}
    await load();setDetail(null);
  }

  async function startDeliveryAssistant(customer){
    const dt=window.prompt('Geplante Auslieferung (YYYY-MM-DD HH:MM):');
    if(!dt)return;
    const parsed=new Date(dt.replace(' ','T'));
    if(Number.isNaN(parsed.getTime())){alert('Datum konnte nicht erkannt werden.');return}
    const {error}=await supabase.rpc('ava_start_delivery_assistant',{p_customer_id:customer.id,p_delivery_at:parsed.toISOString()});
    if(error)alert(error.message);else await load();
  }

  async function completeDelivery(customer){
    if(!window.confirm('Auslieferung als erfolgt markieren? AVA beendet Lieferaufgaben und plant den Nachkontakt für morgen.'))return;
    const {error}=await supabase.rpc('ava_complete_delivery',{p_customer_id:customer.id});
    if(error)alert(error.message);else await load();
  }

  async function toggleWaiting(customer){
    const next=!customer.waiting_on_customer;
    const {error}=await supabase.from('ava_customers').update({waiting_on_customer:next}).eq('id',customer.id);
    if(error)alert(error.message);else{
      await supabase.from('ava_history').insert({customer_id:customer.id,actor_id:uid,action:next?'Wartet auf Kunde':'Warten beendet',details:''});
      await load();
    }
  }

  async function rescheduleTestDrive(event){
    const dt=window.prompt('Neuer Probefahrt-Termin (YYYY-MM-DD HH:MM):');
    if(!dt)return;
    const parsed=new Date(dt.replace(' ','T'));
    if(Number.isNaN(parsed.getTime())){alert('Datum konnte nicht erkannt werden.');return}
    const {error}=await supabase.rpc('ava_reschedule_test_drive',{p_event_id:event.id,p_new_start:parsed.toISOString(),p_minutes:60});
    if(error)alert(error.message.includes('TERMIN_CONFLICT')?'Terminüberschneidung erkannt.':error.message);else await load();
  }

  async function completeTestDrive(event){
    const choice=window.prompt('Probefahrt durchgeführt. Interesse? Bitte eingeben: heiß / unentschlossen / kein interesse');
    if(!choice)return;
    const q=choice.toLowerCase();
    const interest=q.includes('heiß')||q.includes('heiss')?'hot':q.includes('unentsch')?'undecided':'cold';
    const {error}=await supabase.rpc('ava_complete_test_drive',{p_event_id:event.id,p_interest:interest});
    if(error)alert(error.message);else await load();
  }

  async function addTodo(){
    const title=window.prompt('Was möchtest du erledigen?');
    if(!title)return;
    const when=window.prompt('Für wann? Leer = heute, oder YYYY-MM-DD');
    let due=new Date(); due.setHours(12,0,0,0);
    if(when&&when.trim()){
      const parsed=new Date(when+'T12:00:00');
      if(Number.isNaN(parsed.getTime())){alert('Datum konnte nicht erkannt werden.');return}
      due=parsed;
    }
    const {error}=await supabase.from('ava_todos').insert({user_id:uid,title,due_date:due.toISOString().slice(0,10)});
    if(error)alert(error.message);else await load();
  }

  async function toggleTodo(todo){
    const next=todo.status==='done'?'open':'done';
    const {error}=await supabase.from('ava_todos').update({status:next,completed_at:next==='done'?new Date().toISOString():null}).eq('id',todo.id);
    if(error)alert(error.message);else await load();
  }

  async function deleteTodo(todo){
    if(!window.confirm('To-do löschen?'))return;
    const {error}=await supabase.from('ava_todos').delete().eq('id',todo.id);
    if(error)alert(error.message);else await load();
  }

  async function deleteCustomer(customer){
    const typed=window.prompt(`${customer.name} wirklich endgültig löschen?\n\nAlle Termine, Probefahrten, Nachkontakte, Aufgaben, Historieneinträge und Dokumente werden ebenfalls entfernt.\n\nZum Bestätigen LÖSCHEN eingeben:`);
    if(typed!=='LÖSCHEN')return;
    const customerDocs=documents.filter(d=>d.customer_id===customer.id);
    if(customerDocs.length){
      const {error:storageError}=await supabase.storage.from('ava-documents').remove(customerDocs.map(d=>d.storage_path));
      if(storageError){alert('Dokumente konnten nicht vollständig gelöscht werden: '+storageError.message);return}
    }
    const {error}=await supabase.rpc('ava_delete_customer',{p_customer_id:customer.id});
    if(error){alert(error.message);return}
    setDetail(null);await load();
  }

  async function createManualEvent(payload){
    const starts=new Date(payload.starts_at);
    if(Number.isNaN(starts.getTime())){alert('Bitte Datum und Uhrzeit prüfen.');return false}
    const minutes=Number(payload.minutes||60);
    const ends=new Date(starts.getTime()+minutes*60000);

    // client-side overlap check for a faster message
    const clash=events.find(e=>e.id!==editingEvent?.id && new Date(e.starts_at)<ends && new Date(e.ends_at)>starts);
    if(clash){
      alert(`Terminüberschneidung mit „${clash.title}“ um ${fmtTime(clash.starts_at)}.`);
      return false;
    }

    if(editingEvent){
      const {error}=await supabase.from('ava_events').update({
        title:payload.title,
        starts_at:starts.toISOString(),
        ends_at:ends.toISOString(),
        customer_id:payload.customer_id||null,
        event_type:payload.event_type||'appointment',
        notes:payload.notes||null
      }).eq('id',editingEvent.id);
      if(error){alert(error.message);return false}
      await supabase.from('ava_history').insert({
        customer_id:payload.customer_id||editingEvent.customer_id||null,
        actor_id:uid,action:'Termin geändert',details:`${payload.title} · ${starts.toLocaleString('de-DE')}`
      });
      setEditingEvent(null);setCalendarFormOpen(false);await load();return true;
    }

    const {error}=await supabase.rpc('ava_create_calendar_event',{
      p_title:payload.title,
      p_starts_at:starts.toISOString(),
      p_minutes:minutes,
      p_customer_id:payload.customer_id||null,
      p_event_type:payload.event_type||'appointment',
      p_notes:payload.notes||null
    });
    if(error){
      alert(error.message.includes('TERMIN_CONFLICT')?'Terminüberschneidung erkannt. Bitte einen anderen Zeitpunkt wählen.':error.message);
      return false;
    }
    setCalendarFormOpen(false);await load();return true;
  }

  async function deleteCalendarEvent(event){
    if(!event?.id){alert('Termin konnte nicht eindeutig erkannt werden.');return false}
    if(!window.confirm(`Termin „${event.title}“ wirklich endgültig löschen?`))return false;
    const {error}=await supabase.rpc('ava_delete_calendar_event',{p_event_id:event.id});
    if(error){
      alert(error.message.includes('EVENT_NOT_FOUND')?'Termin wurde nicht gefunden oder gehört nicht zu deinem Kalender.':'Termin konnte nicht gelöscht werden: '+error.message);
      return false;
    }
    await load();
    alert('Termin wurde gelöscht.');
    return true;
  }

  async function requestNotificationPermission(){
    if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
      alert('Dieses Gerät unterstützt Web Push hier nicht.');
      return;
    }
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){
      alert('Push-Mitteilungen wurden nicht erlaubt.');
      return;
    }
    try{
      const reg=await navigator.serviceWorker.ready;

      // Wichtig bei geändertem VAPID-Key:
      // vorhandenes Abo immer vollständig entfernen und frisch registrieren.
      const oldSub=await reg.pushManager.getSubscription();
      if(oldSub){
        try{await oldSub.unsubscribe()}catch(_e){}
      }

      // Alte Server-Abos dieses Users entfernen, damit nur aktuelle Keys verwendet werden.
      await supabase.from('ava_push_subscriptions').delete().eq('user_id',uid);

      const sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(AVA_VAPID_PUBLIC_KEY)
      });

      const j=sub.toJSON();
      if(!j.endpoint||!j.keys?.p256dh||!j.keys?.auth){
        throw new Error('Push-Abo wurde vom Gerät nicht vollständig erzeugt.');
      }

      const {error}=await supabase.from('ava_push_subscriptions').insert({
        user_id:uid,
        endpoint:j.endpoint,
        p256dh:j.keys.p256dh,
        auth:j.keys.auth,
        user_agent:navigator.userAgent,
        updated_at:new Date().toISOString()
      });
      if(error)throw error;

      await showSystemNotification('AVA Push ist aktiv','Dieses Gerät wurde mit dem aktuellen Push-Schlüssel neu registriert.');
      alert('Push wurde vollständig neu eingerichtet.');
    }catch(e){
      alert('Push konnte nicht neu eingerichtet werden: '+(e?.message||e));
    }
  }

  async function showSystemNotification(title,body){
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    try{
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification(title,{body,icon:'/icon-192.svg',badge:'/icon-192.svg',tag:'ava-'+title});
    }catch(_e){}
  }

  async function saveNotification(kind,title,body,sourceKey){
    const {data,error}=await supabase.from('ava_notifications').upsert({
      user_id:uid,kind,title,body,source_key:sourceKey,scheduled_for:new Date().toISOString()
    },{onConflict:'user_id,kind,source_key',ignoreDuplicates:true}).select().maybeSingle();
    if(!error&&data){
      setNotifications(prev=>[data,...prev.filter(x=>x.id!==data.id)]);
      if(notificationPrefs?.enabled!==false)await showSystemNotification(title,body);
    }
  }

  async function markNotificationsRead(){
    await supabase.from('ava_notifications').update({read_at:new Date().toISOString()}).eq('user_id',uid).is('read_at',null);
    setNotifications(prev=>prev.map(n=>({...n,read_at:n.read_at||new Date().toISOString()})));
  }

  async function updateNotificationPref(key,value){
    const next={...(notificationPrefs||{}),user_id:uid,[key]:value,updated_at:new Date().toISOString()};
    setNotificationPrefs(next);
    await supabase.from('ava_notification_preferences').upsert(next);
  }

  async function runSmartNotifications(){
    if(!notificationPrefs||notificationPrefs.enabled===false)return;
    const now=new Date();
    const in60=new Date(now.getTime()+60*60000);
    if(notificationPrefs.due_followups){
      for(const t of tasks.filter(t=>t.status==='open')){
        const due=new Date(t.due_at);
        if(due<=now){
          const c=customerMap[t.customer_id];
          await saveNotification('followup',t.title,c?`${c.name} · ${c.vehicle_interest||''}`:(t.details||''),'task-'+t.id);
        }
      }
    }
    if(notificationPrefs.test_drive_reminders){
      for(const e of events.filter(e=>e.event_type==='test_drive'&&e.status==='planned')){
        const start=new Date(e.starts_at);
        if(start>now&&start<=in60){
          const c=customerMap[e.customer_id];
          await saveNotification('test_drive','Probefahrt in weniger als 1 Stunde',c?`${c.name} · ${e.vehicle||c.vehicle_interest||''}`:e.title,'event-'+e.id+'-60');
        }
      }
    }
    if(notificationPrefs.delivery_reminders){
      for(const e of events.filter(e=>e.event_type==='delivery'&&e.status==='planned')){
        const start=new Date(e.starts_at);
        if(start>now&&start<=in60){
          const c=customerMap[e.customer_id];
          await saveNotification('delivery','Auslieferung in weniger als 1 Stunde',c?`${c.name} · ${c.purchased_vehicle||c.vehicle_interest||''}`:e.title,'delivery-'+e.id+'-60');
        }
      }
    }
    if(notificationPrefs.opportunity_alerts){
      for(const r of smartRecommendations.filter(r=>r.tag==='AVA entdeckt')){
        await saveNotification('smart','AVA hat etwas entdeckt',r.body,r.key);
      }
    }
  }

  async function sendTeamMessage(){
    const recipient=teamMembers.find(m=>m.user_id===teamRecipient);
    const text=teamText.trim();
    if(!recipient||!text){alert('Bitte Empfänger und Nachricht auswählen.');return}
    const due=teamAsTask?window.prompt('Wann ist die Aufgabe fällig? Leer = heute, oder YYYY-MM-DD HH:MM'):'';
    let dueAt=null;
    if(teamAsTask){
      if(due&&due.trim()){
        const normalized=due.trim().replace(' ','T');
        const parsed=new Date(normalized);
        if(Number.isNaN(parsed.getTime())){alert('Fälligkeit konnte nicht erkannt werden.');return}
        dueAt=parsed.toISOString();
      }else{
        const d=new Date();d.setHours(17,0,0,0);dueAt=d.toISOString();
      }
    }
    const {data,error}=await supabase.rpc('ava_send_team_message',{
      p_recipient_id:recipient.user_id,p_body:text,p_as_task:teamAsTask,p_due_at:dueAt
    });
    if(error){alert(error.message);return}
    const senderName=teamMembers.find(m=>m.user_id===uid)?.display_name||'Kollege';
    await supabase.functions.invoke('ava-push',{body:{
      recipient_id:recipient.user_id,
      title:teamAsTask?`Neue Aufgabe von ${senderName}`:`Neue Nachricht von ${senderName}`,
      body:text,
      url:'/'
    }}).catch(()=>{});
    setTeamText('');setTeamAsTask(false);
    await load();
  }

  async function completeAssignedTodo(todo){
    const assigner=todo.assigned_by;
    const {error}=await supabase.rpc('ava_complete_assigned_todo',{p_todo_id:todo.id});
    if(error){alert(error.message);return}
    if(assigner){
      const myName=teamMembers.find(m=>m.user_id===uid)?.display_name||'Kollege';
      await supabase.functions.invoke('ava-push',{body:{
        recipient_id:assigner,
        title:`${myName} hat deine Aufgabe erledigt`,
        body:todo.title,
        url:'/'
      }}).catch(()=>{});
    }
    await load();
  }

  async function markTeamMessageRead(message){
    if(message.recipient_id!==uid||message.read_at)return;
    await supabase.from('ava_team_messages').update({read_at:new Date().toISOString()}).eq('id',message.id);
    setTeamMessages(prev=>prev.map(m=>m.id===message.id?{...m,read_at:new Date().toISOString()}:m));
  }

  function taskCustomer(t){return customerMap[t.customer_id]||null}
  async function uploadOffer(customer,file){
    if(!file)return;
    if(file.size>10*1024*1024){alert('Die Datei ist größer als 10 MB.');return}
    const safe=file.name.replace(/[^\w.\-]+/g,'_');
    const path=`${uid}/${customer.id}/${Date.now()}-${safe}`;
    const {error:uploadError}=await supabase.storage.from('ava-documents').upload(path,file,{contentType:file.type||undefined,upsert:false});
    if(uploadError){alert(uploadError.message);return}
    const {error:dbError}=await supabase.from('ava_documents').insert({customer_id:customer.id,owner_id:uid,document_type:'offer',file_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size});
    if(dbError){await supabase.storage.from('ava-documents').remove([path]);alert(dbError.message);return}
    await supabase.from('ava_history').insert({customer_id:customer.id,actor_id:uid,action:'Angebot hinzugefügt',details:file.name});
    await quickWorkflow(customer,'offer');
    await load();
  }

  async function openDocument(doc){
    const {data,error}=await supabase.storage.from('ava-documents').createSignedUrl(doc.storage_path,60);
    if(error){alert(error.message);return}
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }

  async function setEventStatus(event,status){
    let reason=null;
    if(status==='cancelled'){
      reason=window.prompt('Optional: Warum hat der Kunde abgesagt?')||'Kunde hat abgesagt';
    }
    const {error}=status==='cancelled'
      ?await supabase.rpc('ava_cancel_test_drive',{p_event_id:event.id,p_reason:reason})
      :await supabase.rpc('ava_set_event_status',{p_event_id:event.id,p_status:status,p_reason:reason});
    if(error) alert(error.message); else await load();
  }


  function findCustomerInSpeech(text){
    const q=text.toLowerCase();
    const byNumber=customers.find(c=>c.customer_number&&q.includes(String(c.customer_number).toLowerCase()));
    if(byNumber)return byNumber;
    return [...customers].sort((a,b)=>(b.name||'').length-(a.name||'').length).find(c=>{
      const n=(c.name||'').toLowerCase();
      const simple=n.replace(/\b(herr|frau)\b/g,'').trim();
      return n&&q.includes(n) || (simple.length>2&&q.includes(simple));
    })||null;
  }

  function parseSpeechDate(text){
    const q=text.toLowerCase();
    const now=new Date();
    let d=new Date(now); d.setSeconds(0,0);
    if(q.includes('morgen')) d.setDate(d.getDate()+1);
    else if(q.includes('übermorgen')||q.includes('uebermorgen')) d.setDate(d.getDate()+2);
    else {
      const dm=q.match(/\b(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?\b/);
      if(dm){
        const y=dm[3]?(dm[3].length===2?2000+Number(dm[3]):Number(dm[3])):now.getFullYear();
        d=new Date(y,Number(dm[2])-1,Number(dm[1]),now.getHours(),now.getMinutes(),0,0);
        if(!dm[3] && d<now) d.setFullYear(d.getFullYear()+1);
      }else{
        const weekdays={montag:1,dienstag:2,mittwoch:3,donnerstag:4,freitag:5,samstag:6,sonntag:0};
        const found=Object.keys(weekdays).find(w=>q.includes(w));
        if(found){
          const target=weekdays[found], current=now.getDay();
          let delta=(target-current+7)%7; if(delta===0)delta=7;
          d.setDate(d.getDate()+delta);
        }else if(!q.includes('heute')) return null;
      }
    }
    const tm=q.match(/\b(?:um\s*)?(\d{1,2})(?::|\.)(\d{2})\s*(?:uhr)?\b/) || q.match(/\bum\s+(\d{1,2})\s*uhr\b/);
    if(tm) d.setHours(Number(tm[1]),Number(tm[2]||0),0,0);
    else return null;
    return d;
  }

  function stopVoice(){
    try{
      if(recognitionRef.current){
        recognitionRef.current.onend=null;
        recognitionRef.current.onerror=null;
        recognitionRef.current.onresult=null;
        recognitionRef.current.stop();
      }
    }catch(_e){}
    recognitionRef.current=null;
    setVoiceListening(false);
  }

  function startVoice(){
    stopVoice();
    setVoiceResult('');
    const SR=typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition);
    if(!SR){setVoiceResult('Dein Browser unterstützt die direkte Spracherkennung hier nicht. Du kannst den Befehl unten eintippen.');return}
    const rec=new SR();
    recognitionRef.current=rec;
    rec.lang='de-DE';rec.interimResults=false;rec.maxAlternatives=1;rec.continuous=false;
    rec.onstart=()=>setVoiceListening(true);
    rec.onresult=e=>{setVoiceText(e.results[0][0].transcript);setTimeout(stopVoice,50)};
    rec.onerror=()=>{setVoiceResult('Mikrofon konnte nicht verwendet werden. Du kannst den Befehl auch eintippen.');stopVoice()};
    rec.onend=()=>{recognitionRef.current=null;setVoiceListening(false)};
    rec.start();
  }

  function parseNewProspect(text){
    const raw=text.trim();
    const phone=(raw.match(/(?:\+49|0)[\d\s\/-]{7,}/)||[])[0]?.trim()||'';
    const email=(raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';

    let name='';
    const patterns=[
      /(?:neuen?|neue)\s+(?:interessenten?|interessentin|kunden?|kundin)\s+(?:anlegen\s+)?(?:mit\s+dem\s+namen\s+|namens\s+)?([^,]+?)(?=\s+(?:telefon|handy|tel\.?|mit\s+der\s+nummer|möchte|moechte|will|interessiert|für|fuer|probefahrt)|,|$)/i,
      /(?:interessenten?|kunden?)\s+anlegen\s+(?:mit\s+dem\s+namen\s+|namens\s+)?([^,]+?)(?=\s+(?:telefon|handy|tel\.?|möchte|moechte|will|interessiert|für|fuer|probefahrt)|,|$)/i,
      /(?:name(?:n)?|namens)\s+([A-ZÄÖÜ][\p{L}\-]+(?:\s+[A-ZÄÖÜ][\p{L}\-]+){1,3})/iu
    ];
    for(const r of patterns){
      const m=raw.match(r);
      if(m){name=m[1].trim();break}
    }

    // Cleanup common filler endings accidentally captured
    name=name.replace(/\s+(?:anlegen|erstellen)$/i,'').trim();

    let vehicle='';
    const vehiclePatterns=[
      /(?:möchte|moechte|will)\s+(?:einen?|eine)?\s*([^,.]+?)\s+(?:probe\s*fahren|probefahren|zur probefahrt)/i,
      /(?:interesse(?: an)?|interessiert sich für|interessiert sich fuer)\s+(?:einen?|eine)?\s*([^,.]+)/i,
      /(?:fahrzeug|auto)\s+(?:ist|wäre|waere)?\s*([^,.]+)/i
    ];
    for(const r of vehiclePatterns){
      const m=raw.match(r);
      if(m){vehicle=m[1].trim();break}
    }

    return {name,phone,email,vehicle};
  }

  async function runVoiceCommand(){
    const text=voiceText.trim();
    if(!text){setVoiceResult('Bitte sprich oder tippe zuerst einen Befehl ein.');return}
    const normalized=text.replace(/[„“”"]/g,'').replace(/[.!?]+$/g,'').replace(/\s+/g,' ').trim();
    const q=normalized.toLowerCase();
    const c=findCustomerInSpeech(normalized);

    if(q.startsWith('termin ')||q.includes('termin morgen')||q.includes('termin mit ')||q.includes('teammeeting')){
      const when=parseSpeechDate(text);
      if(!when){setVoiceResult('Datum/Uhrzeit konnte ich nicht eindeutig erkennen. Beispiel: „Termin morgen um 10 Uhr: Teammeeting.“');return}
      const vc=findCustomerInSpeech(text);
      let title=text
        .replace(/^ava[,:\s-]*/i,'')
        .replace(/^termin\s*/i,'')
        .replace(/\b(?:heute|morgen|übermorgen|uebermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/ig,'')
        .replace(/\bum\s+\d{1,2}(?:(?::|\.)\d{2})?\s*uhr\b/ig,'')
        .replace(/\bmit\s+.+$/i, vc?'':'$&')
        .replace(/^[:\s,-]+|[:\s,-]+$/g,'')
        .trim();
      if(vc) title=title.replace(new RegExp(`\\bmit\\s+${vc.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i'),'').trim();
      if(!title||title.toLowerCase()==='termin')title=vc?`Termin mit ${vc.name}`:'Persönlicher Termin';
      const ends=new Date(when.getTime()+60*60000);
      const {data:clashes,error:clashError}=await supabase.from('ava_events')
        .select('id,title,starts_at,ends_at')
        .eq('owner_id',uid)
        .neq('status','cancelled')
        .lt('starts_at',ends.toISOString())
        .gt('ends_at',when.toISOString());
      if(clashError){setVoiceResult('Kalender konnte nicht geprüft werden: '+clashError.message);return}
      if(clashes?.length){setVoiceResult(`Terminüberschneidung mit „${clashes[0].title}“. Bitte nenne einen anderen Zeitpunkt.`);return}
      const {data:created,error}=await supabase.from('ava_events').insert({
        owner_id:uid,
        customer_id:vc?.id||null,
        event_type:'appointment',
        title,
        starts_at:when.toISOString(),
        ends_at:ends.toISOString(),
        status:'planned',
        notes:`Per AVA Voice: ${text}`
      }).select('id').single();
      if(error)setVoiceResult('Termin konnte nicht gespeichert werden: '+error.message);
      else{
        setVoiceResult(`✓ Termin „${title}“ am ${when.toLocaleString('de-DE')} in deinem Kalender angelegt.`);
        setVoiceText('');
        await load();
      }
      return;
    }

    if(
      q.includes('neuer interessent')||
      q.includes('neue interessentin')||
      q.includes('neuen interessenten')||
      q.includes('neue interessentin anlegen')||
      q.includes('interessenten anlegen')||
      q.includes('interessent anlegen')||
      q.includes('neuer kunde')||
      q.includes('neue kundin')||
      q.includes('neuen kunden')||
      q.includes('kundin anlegen')||
      q.includes('kunden anlegen')||
      (q.includes('interessent')&&q.includes('anleg'))||
      (q.includes('kunde')&&q.includes('anleg'))
    ){
      const parsed=parseNewProspect(normalized);
      if(!parsed.name){setVoiceResult('Den Namen konnte ich nicht eindeutig erkennen. Beispiel: „Neuer Interessent Thomas Berger, möchte einen CX-5 probefahren, Freitag um 14 Uhr.“');return}
      const duplicate=customers.find(x=>(parsed.phone&&x.phone===parsed.phone)||(parsed.email&&x.email?.toLowerCase()===parsed.email.toLowerCase())||(x.name||'').toLowerCase()===parsed.name.toLowerCase());
      if(duplicate){setVoiceResult(`Möglicher vorhandener Kunde gefunden: ${duplicate.name}. Bitte öffne zuerst die Kundenakte, damit kein doppelter Datensatz entsteht.`);return}
      const when=q.includes('probefahrt')||q.includes('probefahren')?parseSpeechDate(text):null;
      if((q.includes('probefahrt')||q.includes('probefahren'))&&!when){setVoiceResult(`Interessent erkannt: ${parsed.name}. Den Probefahrt-Termin konnte ich noch nicht eindeutig erkennen.`);return}
      const {data,error}=await supabase.rpc('ava_create_prospect_with_test_drive',{
        p_name:parsed.name,p_phone:parsed.phone||null,p_email:parsed.email||null,p_vehicle:parsed.vehicle||null,p_starts_at:when?when.toISOString():null
      });
      if(error){setVoiceResult(error.message.includes('TERMIN_CONFLICT')?'Terminüberschneidung erkannt. Der Interessent wurde nicht angelegt. Bitte nenne einen anderen Zeitpunkt.':error.message)}
      else{
        setVoiceResult(when
          ?`✓ ${parsed.name} wurde als Interessent angelegt. Probefahrt: ${when.toLocaleString('de-DE')}. Erinnerungen und Nachkontakt sind geplant.`
          :`✓ ${parsed.name} wurde als Interessent angelegt. Eine Kundennummer ist noch nicht nötig.`);
        await load();
        setVoiceText('');
      }
      return;
    }

    if(c&&(q.includes('hat gekauft')||q.includes('gekauft'))){
      const numberMatch=text.match(/kundennummer\s+([A-Za-z0-9\-]+)/i);
      if(!numberMatch){setVoiceResult(`${c.name} hat gekauft. Bitte nenne noch die Kundennummer, z. B. „${c.name} hat gekauft, Kundennummer 47182, gekauftes Fahrzeug CX-5.“`);return}
      const vehicleMatch=text.match(/gekauftes fahrzeug\s+([^,.]+)/i)||text.match(/hat\s+(?:den|die|das|einen|eine)\s+([^,.]+?)\s+gekauft/i);
      const vehicle=vehicleMatch?.[1]?.trim()||c.vehicle_interest||'';
      const {error}=await supabase.rpc('ava_mark_purchase',{p_customer_id:c.id,p_customer_number:numberMatch[1],p_vehicle:vehicle,p_ordered_at:new Date().toISOString().slice(0,10)});
      if(error)setVoiceResult(error.message);else{setVoiceResult(`✓ Kaufabschluss bei ${c.name} gespeichert. Lieferstatus-Workflow wurde gestartet.`);await load()}
      return;
    }

    if(c&&q.includes('wartet auf kunde')){
      await supabase.from('ava_customers').update({waiting_on_customer:true}).eq('id',c.id);
      await supabase.from('ava_history').insert({customer_id:c.id,actor_id:uid,action:'Wartet auf Kunde',details:'Per AVA Voice'});
      setVoiceResult(`${c.name} steht jetzt auf „Wartet auf Kunde“.`);await load();return;
    }

    if(q.includes('to-do')||q.includes('todo')||q.includes('erinnere mich')){
      let title=text.replace(/^.*?(?:to-do|todo|erinnere mich(?: daran)?)/i,'').replace(/^[:\s,-]+/,'').trim();
      let due=new Date();due.setHours(12,0,0,0);
      if(q.includes('morgen'))due.setDate(due.getDate()+1);
      if(!title){setVoiceResult('Was soll ich als To-do speichern?');return}
      const {error}=await supabase.from('ava_todos').insert({user_id:uid,title,due_date:due.toISOString().slice(0,10)});
      if(error)setVoiceResult(error.message);else{setVoiceResult(`✓ To-do gespeichert: ${title}`);await load()}
      return;
    }

    if((q.includes('öffne')||q.includes('oeffne')||q.includes('zeige'))&&c){
      setDetail(c);setVoiceOpen(false);setVoiceResult('');return;
    }

    if(q.includes('notiz')&&c){
      const note=text.replace(/^.*?notiz(?:\s+bei|\s+für|\s+fuer)?\s*/i,'').replace(new RegExp(c.name,'i'),'').replace(/^[:\s,-]+/,'').trim();
      const {error}=await supabase.from('ava_history').insert({customer_id:c.id,actor_id:uid,action:'Sprachnotiz',details:note||text});
      if(error)setVoiceResult(error.message);else{setVoiceResult(`Notiz bei ${c.name} gespeichert.`);await load()}
      return;
    }

    if(q.includes('nicht erreicht')&&c){
      const {error}=await supabase.rpc('ava_voice_not_reached',{p_customer_id:c.id,p_details:`Sprachbefehl: ${text}`});
      if(error)setVoiceResult(error.message);else{
        await supabase.from('ava_history').insert({customer_id:c.id,actor_id:uid,action:'Kunde nicht erreicht',details:'Per AVA Spracheingabe · Wiedervorlage in 2 Stunden bzw. nächster sinnvoller Arbeitszeit'});
        setVoiceResult(`${c.name}: nicht erreicht gespeichert. AVA hat den nächsten Kontaktversuch geplant.`);await load();
      }
      return;
    }

    if(q.includes('probefahrt')&&c){
      const when=parseSpeechDate(text);
      if(!when){setVoiceResult(`Kunde erkannt: ${c.name}. Datum/Uhrzeit konnte ich noch nicht eindeutig erkennen. Beispiel: „Probefahrt mit ${c.name} morgen um 15 Uhr.“`);return}
      const {error}=await supabase.rpc('ava_schedule_test_drive',{p_customer_id:c.id,p_starts_at:when.toISOString(),p_minutes:60,p_vehicle:c.vehicle_interest||''});
      if(error){
        setVoiceResult(error.message.includes('TERMIN_CONFLICT')?'Terminüberschneidung erkannt. Bitte nenne einen anderen Zeitpunkt.':error.message);
      }else{
        await supabase.from('ava_history').insert({customer_id:c.id,actor_id:uid,action:'Probefahrt per Sprache geplant',details:when.toLocaleString('de-DE')});
        setVoiceResult(`Probefahrt für ${c.name} am ${when.toLocaleString('de-DE')} geplant. Erinnerungen wurden automatisch angelegt.`);await load();
      }
      return;
    }

    if(!c && (q.includes('probefahrt')||q.includes('nicht erreicht')||q.includes('notiz')||q.includes('öffne')||q.includes('zeige'))){
      setVoiceResult('Ich konnte den Kunden nicht eindeutig finden. Nenne bitte den Namen oder die Kundennummer.');
      return;
    }

    setVoiceResult('Diesen Befehl versteht AVA 0.8 noch nicht. Unterstützt werden aktuell: Probefahrt planen, Kunde nicht erreicht, Sprachnotiz und Kundenakte öffnen.');
  }

  useEffect(()=>{
    if(!busy&&notificationPrefs){
      runSmartNotifications();
      const id=setInterval(runSmartNotifications,60000);
      return()=>clearInterval(id);
    }
  },[busy,notificationPrefs,tasks,events,customers]);

  return <div className="appShell">
    <Sidebar tab={tab} setTab={setTab} email={session.user.email}/>
    <main className="workspace">
      <Topbar tab={tab} onNew={fresh} onRefresh={load} onVoice={()=>{setVoiceOpen(true);setVoiceResult('')}} unread={notifications.filter(n=>!n.read_at).length} onNotifications={()=>setNotificationOpen(true)}/>
      {busy?<LoadingState/>:<>
        {tab==='Heute'&&<TodayView openTasks={importantTasks} todayEvents={todayEvents} customers={customers} contractAlerts={contractAlerts} customerMap={customerMap} todos={todos} teamMembers={teamMembers} uid={uid} onCompleteAssigned={completeAssignedTodo} smartRecommendations={smartRecommendations} dayCloseSummary={dayCloseSummary} onAddTodo={addTodo} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} onReached={taskReached} onNotReached={taskNotReached} onDone={reopenOrDone} onOpenCustomer={setDetail} onQuick={quickWorkflow}/>}
        {tab==='Kunden'&&<CustomersView customers={filteredCustomers} search={search} setSearch={setSearch} onOpen={setDetail} onEdit={edit} onMail={openMail} onNew={fresh}/>}
        {tab==='Kalender'&&<CalendarView events={events} customerMap={customerMap} calendarMode={calendarMode} setCalendarMode={setCalendarMode} calendarDate={calendarDate} setCalendarDate={setCalendarDate} onOpenCustomer={setDetail} onSetStatus={setEventStatus} onReschedule={rescheduleTestDrive} onCompleteTestDrive={completeTestDrive} onNewEvent={(date)=>{setEditingEvent(null);if(date)setCalendarDate(date);setCalendarFormOpen(true)}} onEditEvent={(e)=>{setEditingEvent(e);setCalendarFormOpen(true)}} onDeleteEvent={deleteCalendarEvent}/>}        {tab==='Team'&&<TeamView uid={uid} members={teamMembers} messages={teamMessages} todos={todos} recipient={teamRecipient} setRecipient={setTeamRecipient} text={teamText} setText={setTeamText} asTask={teamAsTask} setAsTask={setTeamAsTask} onSend={sendTeamMessage} onRead={markTeamMessageRead} onCompleteTodo={completeAssignedTodo}/>}
      </>}
    </main>
    <MobileNav tab={tab} setTab={setTab}/>
    {showForm&&<CustomerForm selected={selected} form={form} setForm={setForm} onClose={closeForm} onSubmit={saveCustomer}/>}
    {detail&&<CustomerDetail customer={detail} history={history.filter(h=>h.customer_id===detail.id)} tasks={tasks.filter(t=>t.customer_id===detail.id)} documents={documents.filter(d=>d.customer_id===detail.id)} events={events.filter(e=>e.customer_id===detail.id)} onClose={()=>setDetail(null)} onEdit={()=>{setDetail(null);edit(detail)}} onMail={()=>openMail(detail)} onQuick={type=>quickWorkflow(detail,type)} onUpload={uploadOffer} onOpenDocument={openDocument} onPurchase={markPurchase} onDeliveryStart={startDeliveryAssistant} onDeliveryComplete={completeDelivery} onWait={toggleWaiting} onDelete={deleteCustomer}/>}
    {notificationOpen&&<NotificationCenter notifications={notifications} prefs={notificationPrefs} onClose={()=>{setNotificationOpen(false);markNotificationsRead()}} onPermission={requestNotificationPermission} onPref={updateNotificationPref}/>} 
    {calendarFormOpen&&<CalendarEventForm customers={customers} event={editingEvent} defaultDate={calendarDate} onClose={()=>{setCalendarFormOpen(false);setEditingEvent(null)}} onSave={createManualEvent}/>}
    {voiceOpen&&<VoiceAssistant text={voiceText} setText={setVoiceText} result={voiceResult} listening={voiceListening} running={voiceRunning} onListen={startVoice} onRun={async()=>{if(voiceRunning)return;setVoiceRunning(true);setVoiceResult('AVA übernimmt den Befehl…');try{await runVoiceCommand()}catch(e){setVoiceResult('Fehler beim Übernehmen: '+(e?.message||e))}finally{setVoiceRunning(false)}}} onClose={()=>{stopVoice();setVoiceOpen(false)}}/>}
  </div>;
}

function Sidebar({tab,setTab,email}){
  const items=[['Heute','⌂'],['Kalender','▦'],['Kunden','◉'],['Team','◇']];
  return <aside className="sidebar">
    <div className="sideBrand"><div className="avaLogoMark"><span className="logoSlash one"></span><span className="logoSlash two"></span><span className="logoCut"></span></div><div><b>AVA</b><span>Autohaus Vertriebs Assistent</span></div></div>
    <nav className="sideNav">{items.map(([label,icon])=><button key={label} className={tab===label?'active':''} onClick={()=>setTab(label)}><span>{icon}</span>{label}</button>)}</nav>
    <div className="sideFoot"><div className="userDot">V</div><div className="userMeta"><b>Verkäufer</b><span>{email}</span></div><button className="iconButton" title="Abmelden" onClick={()=>supabase.auth.signOut()}>↗</button></div>
  </aside>;
}

function Topbar({tab,onNew,onRefresh,onVoice,unread,onNotifications}){
  return <header className="topbar">
    <div><span className="eyebrow">AVA · Markenautohaus</span><h2>{tab}</h2></div>
    <div className="topActions"><button className="btn refreshBtn" onClick={onRefresh}>↻ <span>Alles aktualisieren</span></button><button className="notificationBell" onClick={onNotifications}>🔔{unread>0&&<span>{unread}</span>}</button><button className="btn soft voiceBtn" onClick={onVoice}>🎙 AVA</button><button className="btn primary" onClick={onNew}>+ Kunde</button></div>
  </header>;
}

function TodayView({openTasks,todayEvents,customers,contractAlerts,customerMap,todos,teamMembers,uid,onCompleteAssigned,smartRecommendations,dayCloseSummary,onAddTodo,onToggleTodo,onDeleteTodo,onReached,onNotReached,onDone,onOpenCustomer,onQuick}){
  return <div className="page">
    <div className="heroRow">
      <div><span className="eyebrow">Heute im Verkauf</span><h1>Mehr Zeit für den Verkauf.</h1><p>AVA erinnert, organisiert und hält dir den Rücken frei – damit du dich auf deine Kunden konzentrieren kannst.</p></div>
      <div className="dateCard"><span>{new Date().toLocaleDateString('de-DE',{weekday:'long'})}</span><b>{new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}</b></div>
    </div>
    <div className="metricGrid">
      <Metric n={openTasks.length} label="Offene Aufgaben" sub="heute & nächste Schritte"/>
      <Metric n={todayEvents.length} label="Termine heute" sub="Kalender"/>
      <Metric n={customers.length} label="Meine Kunden" sub="aktive Datensätze"/>
      <Metric n={contractAlerts.length} label="Vertragschancen" sub="ca. 6 Monate vorher"/>
    </div>

    <section className="smartSection">
      <div className="sectionTitle"><h2>AVA empfiehlt</h2><span>Deine wichtigsten nächsten Schritte</span></div>
      <div className="smartGrid">
        {smartRecommendations.length?smartRecommendations.map(r=><button key={r.key} className={`smartCard ${r.tone||''}`} onClick={()=>r.customer&&onOpenCustomer(r.customer)}><span className="smartTag">{r.tag}</span><b>{r.title}</b><small>{r.body}</small><span className="smartArrow">›</span></button>):<EmptyState title="Alles sauber" text="AVA findet aktuell keinen Vorgang ohne nächsten Schritt." compact/>}
      </div>
    </section>

    <section className="todoSection">
      <div className="sectionTitle"><h2>Meine To-dos</h2><button className="btn soft smallBtn" onClick={onAddTodo}>+ Hinzufügen</button></div>
      <TodoList todos={todos} members={teamMembers||[]} uid={uid} onToggle={onToggleTodo} onDelete={onDeleteTodo} onCompleteAssigned={onCompleteAssigned}/>
    </section>
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
    <section className="dayClose">
      <div><span className="eyebrow">Tagesabschluss</span><h2>Alles für Feierabend im Blick.</h2><p>{dayCloseSummary.openToday} offene Aufgabe(n) heute · Morgen {dayCloseSummary.tomorrowEvents} Termin(e), davon {dayCloseSummary.tomorrowTestDrives} Probefahrt(en) und {dayCloseSummary.tomorrowDeliveries} Auslieferung(en).</p></div>
      <div className="dayCloseBadge">{dayCloseSummary.openToday===0?'✓ Alles erledigt':`${dayCloseSummary.openToday} offen`}</div>
    </section>
  </div>;
}

function TodoList({todos=[],members=[],uid,onToggle,onDelete,onCompleteAssigned}){
  const today=new Date();today.setHours(0,0,0,0);
  const visible=todos.filter(t=>{
    if(t.status==='done') return false;
    if(!t.due_date)return true;
    const d=new Date(t.due_date+'T12:00:00');d.setHours(0,0,0,0);
    return d<=today;
  });
  return <div className="todoList">
    {visible.length?visible.map(t=><div className="todoItem" key={t.id}>
      <button className="todoCheck" onClick={()=>t.assigned_by&&t.user_id===uid&&onCompleteAssigned?onCompleteAssigned(t):onToggle(t)}>○</button>
      <div className="todoMain"><b>{t.title}</b><span>{t.assigned_by?`Von ${members.find(m=>m.user_id===t.assigned_by)?.display_name||'Kollege'} · `:''}{t.due_date?fmtDate(t.due_date):'Heute'}</span></div>
      <button className="todoDelete" onClick={()=>onDelete(t)}>×</button>
    </div>):<div className="todoEmpty">Keine persönlichen To-dos für heute.</div>}
  </div>;
}

function TaskCard({task,customer,onReached,onNotReached,onDone,onOpenCustomer}){
  const prep=task.type==='test_drive_prepare';
  const delivery=task.type==='delivery_prepare';
  const contact=!prep&&!delivery;
  const waiting=task.workflow_state==='waiting_customer';
  const overdue=new Date(task.due_at)<new Date();
  return <article className={`taskCard ${overdue?'overdue':''}`}>
    <div className="taskIcon">{prep?'🚗':'☎'}</div>
    <div className="taskMain">
      <div className="taskTop"><div><span className={`statusBadge ${delivery?'violet':prep?'blue':waiting?'amber':'neutral'}`}>{delivery?'Auslieferung':prep?'Probefahrt':waiting?'Wartet auf Kunde':'Kontakt'}</span><b>{task.title}</b></div><span className="due">{fmtDateTime(task.due_at)}</span></div>
      {customer?<button className="customerLink" onClick={()=>onOpenCustomer(customer)}>{customer.name} · {customer.customer_number?`KD ${customer.customer_number} · `:''}{customer.phone||'keine Tel.'} · {customer.vehicle_interest||'kein Fahrzeug'}</button>:<span className="muted">{task.details||'Kein Kunde zugeordnet'}</span>}
      <div className="taskActions">
        <button className="btn primary" onClick={onReached}>{delivery?'✓ Erledigt':prep?'✓ Fahrzeug vorbereitet':'✓ Erreicht'}</button>
        {contact&&<button className="btn soft" onClick={onNotReached}>Nicht erreicht</button>}
        <button className="btn ghost" onClick={onDone}>Erledigt</button>
      </div>
    </div>
  </article>;
}

function AgendaItem({event,customer,onOpenCustomer}){
  const completed=event.status==='completed',cancelled=event.status==='cancelled';
  return <div className={`agendaItem ${cancelled?'agendaCancelled':''}`}>
    <div className="agendaTime">{fmtTime(event.starts_at)}</div><div className="agendaLine"/>
    <div className="agendaBody"><div className="agendaTitleRow"><b>{event.title}</b><span className={`miniStatus ${completed?'done':cancelled?'cancelled':'planned'}`}>{completed?'✓ Erfolgt':cancelled?'Abgesagt':'Geplant'}</span></div>
    {customer?<button onClick={()=>onOpenCustomer(customer)}>{customer.name}{customer.customer_number?` · KD ${customer.customer_number}`:''}</button>:<span>Kein Kunde</span>}
    <small>{event.vehicle||customer?.vehicle_interest||''}</small></div>
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
    <div className="customerHead"><div className="avatar">{initials(c.name)}</div><div className="customerIdentity"><b>{c.name}</b><span>{c.customer_number?`KD ${c.customer_number}`:'Interessent · noch keine Kundennummer'}</span></div><span className={`statusBadge ${c.waiting_on_customer?'amber':stage.tone}`}>{c.waiting_on_customer?'Wartet auf Kunde':stage.label}</span></div>
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

function CalendarEventForm({customers,event,defaultDate,onClose,onSave,onDelete}){
  function localValue(v){
    if(!v)return '';
    const d=new Date(v);
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const defaultStart=event?.starts_at?localValue(event.starts_at):(()=>{
    const d=new Date(defaultDate||new Date());
    if(d.getHours()===0&&d.getMinutes()===0)d.setHours(10,0,0,0);
    return localValue(d);
  })();
  const eventMinutes=event?.starts_at&&event?.ends_at?Math.max(15,Math.round((new Date(event.ends_at)-new Date(event.starts_at))/60000)):60;
  const [form,setForm]=useState({
    title:event?.title||'',
    starts_at:defaultStart,
    minutes:eventMinutes,
    customer_id:event?.customer_id||'',
    event_type:event?.event_type||'appointment',
    notes:event?.notes||''
  });
  const set=(k,v)=>setForm({...form,[k]:v});
  async function submit(e){e.preventDefault();await onSave(form)}
  return <div className="modalBackdrop"><form className="customerModal compactModal" onSubmit={submit}>
    <div className="modalHead"><div><span className="eyebrow">Kalender</span><h2>{event?'Termin bearbeiten':'Termin anlegen'}</h2><p>{event?'Datum, Uhrzeit, Dauer, Titel, Terminart und Kundenbezug können geändert werden.':'Kunde ist optional. AVA prüft Terminüberschneidungen automatisch.'}</p></div><button type="button" className="closeButton" onClick={onClose}>×</button></div>
    <div className="formSection"><div className="formGrid">
      <Field label="Titel" full><input required value={form.title} onChange={e=>set('title',e.target.value)} placeholder="z. B. Teammeeting, Beratung, Rückruf"/></Field>
      <Field label="Datum & Uhrzeit"><input required type="datetime-local" value={form.starts_at} onChange={e=>set('starts_at',e.target.value)}/></Field>
      <Field label="Dauer"><select value={form.minutes} onChange={e=>set('minutes',e.target.value)}><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="45">45 Minuten</option><option value="60">60 Minuten</option><option value="90">90 Minuten</option><option value="120">2 Stunden</option></select></Field>
      <Field label="Terminart"><select value={form.event_type} onChange={e=>set('event_type',e.target.value)}><option value="appointment">Termin</option><option value="consultation">Beratung</option><option value="callback">Rückruf</option><option value="meeting">Besprechung</option><option value="delivery">Fahrzeugübergabe</option><option value="internal">Interner Termin</option></select></Field>
      <Field label="Kunde / Interessent" hint="Optional"><select value={form.customer_id} onChange={e=>set('customer_id',e.target.value)}><option value="">Kein Kunde zugeordnet</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.customer_number?` · KD ${c.customer_number}`:''}</option>)}</select></Field>
      <Field label="Notiz" full><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Optional…"/></Field>
    </div></div>
    <div className="modalFoot calendarEditFoot"><div>{event&&<button type="button" className="btn dangerBtn" onClick={onDelete}>🗑 Termin löschen</button>}</div><div><button type="button" className="btn ghost" onClick={onClose}>Abbrechen</button><button className="btn primary">{event?'Änderungen speichern':'Termin speichern'}</button></div></div>
  </form></div>;
}

function CalendarView({events,customerMap,calendarMode,setCalendarMode,calendarDate,setCalendarDate,onOpenCustomer,onSetStatus,onReschedule,onCompleteTestDrive,onNewEvent,onEditEvent,onDeleteEvent}){
  function move(delta){
    const d=new Date(calendarDate);
    if(calendarMode==='month')d.setMonth(d.getMonth()+delta);
    else if(calendarMode==='week')d.setDate(d.getDate()+delta*7);
    else d.setDate(d.getDate()+delta);
    setCalendarDate(d);
  }
  function goToday(){setCalendarDate(new Date())}
  const title=calendarMode==='month'
    ?calendarDate.toLocaleDateString('de-DE',{month:'long',year:'numeric'})
    :calendarMode==='week'
      ?`Woche ab ${startOfWeek(calendarDate).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}`
      :calendarDate.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  return <div className="page">
    <div className="pageTitleRow">
      <div><span className="eyebrow">Terminplanung</span><h1>Kalender</h1><p>Probefahrten, Auslieferungen und persönliche Termine an einem Ort.</p></div>
      <div className="calendarTopActions"><button className="btn primary" onClick={()=>onNewEvent(calendarDate)}>+ Termin</button><div className="segmented three"><button className={calendarMode==='day'?'active':''} onClick={()=>setCalendarMode('day')}>Tag</button><button className={calendarMode==='week'?'active':''} onClick={()=>setCalendarMode('week')}>Woche</button><button className={calendarMode==='month'?'active':''} onClick={()=>setCalendarMode('month')}>Monat</button></div></div>
    </div>
    <div className="calendarNavigator">
      <div className="navButtons"><button onClick={()=>move(-1)}>‹</button><button className="todayBtn" onClick={goToday}>Heute</button><button onClick={()=>move(1)}>›</button></div>
      <div className="monthTitle">{title}</div>
    </div>

    {calendarMode==='month'&&<MonthCalendar events={events} customerMap={customerMap} calendarDate={calendarDate} onOpenCustomer={onOpenCustomer} onSelectDate={(d)=>{setCalendarDate(d);setCalendarMode('day')}} onNewEvent={onNewEvent} onEditEvent={onEditEvent}/>}
    {calendarMode==='week'&&<WeekCalendar events={events} customerMap={customerMap} onOpenCustomer={onOpenCustomer} baseDate={calendarDate} onEditEvent={onEditEvent}/>}
    {calendarMode==='day'&&<DayAgenda events={events} customerMap={customerMap} date={calendarDate} onOpenCustomer={onOpenCustomer} onSetStatus={onSetStatus} onReschedule={onReschedule} onCompleteTestDrive={onCompleteTestDrive} onEditEvent={onEditEvent} onDeleteEvent={onDeleteEvent} onNewEvent={onNewEvent}/>}
  </div>;
}

function startOfWeek(date){
  const d=new Date(date); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d;
}

function MonthCalendar({events,customerMap,calendarDate,onOpenCustomer,onSelectDate,onNewEvent,onEditEvent}){
  const year=calendarDate.getFullYear(),month=calendarDate.getMonth();
  const first=new Date(year,month,1);
  const last=new Date(year,month+1,0);
  const startOffset=(first.getDay()+6)%7;
  const cells=[];
  for(let i=0;i<startOffset;i++)cells.push(null);
  for(let d=1;d<=last.getDate();d++)cells.push(new Date(year,month,d));
  while(cells.length%7!==0)cells.push(null);
  const weekdays=['Mo','Di','Mi','Do','Fr','Sa','So'];
  return <div className="monthBoard">
    <div className="monthWeekdays">{weekdays.map(w=><div key={w}>{w}</div>)}</div>
    <div className="monthGrid">{cells.map((d,i)=>{
      if(!d)return <div key={'e'+i} className="monthCell emptyCell"/>;
      const es=events.filter(e=>new Date(e.starts_at).toDateString()===d.toDateString());
      const isToday=d.toDateString()===new Date().toDateString();
      return <div key={d.toISOString()} className={`monthCell ${isToday?'todayCell':''}`}>
        <div className="monthDayHead"><button className="monthDayNumber" onClick={()=>onSelectDate(d)}>{d.getDate()}</button><button className="monthAdd" onClick={()=>onNewEvent(d)}>+</button></div>
        <div className="monthEvents">{es.slice(0,3).map(e=>{const c=customerMap[e.customer_id];return <button key={e.id} className={`monthEvent ${e.status==='cancelled'?'cancelled':e.status==='completed'?'completed':''}`} onClick={()=>onEditEvent(e)}><b>{fmtTime(e.starts_at)}</b><span>{e.status==='completed'?'✓ ':e.status==='cancelled'?'× ':''}{e.title}</span><small>{c?.name||e.vehicle||''}</small></button>})}{es.length>3&&<div className="moreEvents">+{es.length-3} weitere</div>}</div>
      </div>
    })}</div>
  </div>;
}

function DayAgenda({events,customerMap,date,onOpenCustomer,onSetStatus,onReschedule,onCompleteTestDrive,onEditEvent,onDeleteEvent,onNewEvent}){
  const es=events.filter(e=>new Date(e.starts_at).toDateString()===date.toDateString()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  return <div className="dayAgendaSurface">
    <div className="dayAgendaHead"><div><span>{date.toLocaleDateString('de-DE',{weekday:'long'})}</span><b>{date.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'})}</b></div><button className="btn primary smallBtn" onClick={()=>onNewEvent(date)}>+ Termin an diesem Tag</button></div>
    <div className="dayAgendaList">{es.length?es.map(e=><div className="dayAgendaWrap" key={e.id}><CalendarEvent e={e} customer={customerMap[e.customer_id]} onOpenCustomer={onOpenCustomer} onSetStatus={onSetStatus} onReschedule={onReschedule} onCompleteTestDrive={onCompleteTestDrive}/><div className="eventManage"><button onClick={()=>onEditEvent&&onEditEvent(e)}>Bearbeiten</button>{e.event_type!=='test_drive'&&<button className="dangerText" onClick={()=>onDeleteEvent(e)}>Löschen</button>}</div></div>):<EmptyState title="Keine Termine" text="Für diesen Tag ist noch nichts eingetragen."/>}</div>
  </div>;
}

function CalendarEvent({e,customer,onOpenCustomer,onSetStatus,onReschedule,onCompleteTestDrive}){
  const completed=e.status==='completed', cancelled=e.status==='cancelled';
  return <div className={`calendarEvent ${completed?'eventCompleted':''} ${cancelled?'eventCancelled':''}`}>
    <div className="timeBlock"><b>{fmtTime(e.starts_at)}</b><span>bis {fmtTime(e.ends_at)}</span></div>
    <div className="eventAccent"/>
    <div className="eventInfo">
      <div className="eventStatusRow"><span className={`statusBadge ${completed?'green':cancelled?'neutral':'blue'}`}>{completed?'✓ Probefahrt erfolgt':cancelled?'Abgesagt':e.event_type==='test_drive'?'Probefahrt':'Termin'}</span></div>
      <h3>{e.title}</h3>
      {customer?<button className="customerLink" onClick={()=>onOpenCustomer(customer)}>{customer.name}{customer.customer_number?` · KD ${customer.customer_number}`:''}</button>:<span className="muted">Kein Kunde zugeordnet</span>}
      <small>{customer?.phone||''}{customer?.phone&&' · '}{e.vehicle||customer?.vehicle_interest||''}</small>
      {cancelled&&e.cancelled_reason&&<small className="cancelReason">Grund: {e.cancelled_reason}</small>}
      {e.event_type==='test_drive'&&!completed&&!cancelled&&<div className="eventActions"><button className="btn primary" onClick={()=>onCompleteTestDrive(e)}>✓ Probefahrt erfolgt</button><button className="btn soft" onClick={()=>onReschedule(e)}>Verschieben</button><button className="btn ghost" onClick={()=>onSetStatus(e,'cancelled')}>Kunde hat abgesagt</button></div>}
    </div>
  </div>;
}

function WeekCalendar({events,customerMap,onOpenCustomer,baseDate,onEditEvent}){
  const days=[0,1,2,3,4,5,6].map(offset=>{const d=new Date(baseDate||new Date());const dow=d.getDay();const monday=new Date(d);monday.setDate(d.getDate()-((dow+6)%7)+offset);monday.setHours(0,0,0,0);return monday});
  return <div className="weekBoard">{days.map(d=>{
    const es=events.filter(e=>new Date(e.starts_at).toDateString()===d.toDateString());
    return <div className="weekColumn" key={d.toISOString()}><div className="weekHead"><span>{d.toLocaleDateString('de-DE',{weekday:'short'})}</span><b>{d.getDate()}</b></div><div className="weekEvents">{es.map(e=>{const c=customerMap[e.customer_id];return <button key={e.id} className="weekEvent" title="Termin bearbeiten" onClick={()=>onEditEvent&&onEditEvent(e)}><b>{fmtTime(e.starts_at)}</b><span>{e.status==='completed'?'✓ ':e.status==='cancelled'?'× ':''}{e.title}</span><small>{c?.name||e.vehicle||''}</small></button>})}{!es.length&&<div className="weekEmpty">frei</div>}</div></div>
  })}</div>;
}

function HistoryView({history,customerMap}){
  return <div className="page">
    <div className="pageTitleRow"><div><span className="eyebrow">Nachvollziehbarkeit</span><h1>Historie</h1><p>Alle wichtigen Änderungen und Kundenaktionen chronologisch.</p></div></div>
    <div className="historyTimeline">{history.length?history.map(h=>{const c=customerMap[h.customer_id];return <div className="historyRow" key={h.id}><div className="historyDot"/><div className="historyCard"><div className="historyTop"><b>{h.action}</b><span>{fmtDateTime(h.created_at)}</span></div><p>{c?`${c.name} · KD ${c.customer_number}`:''}</p><small>{h.details}</small></div></div>}):<EmptyState title="Noch keine Historie" text="Sobald AVA Aktionen speichert, erscheinen sie hier."/>}</div>
  </div>;
}

function CustomerDetail({customer,history,tasks,documents,events,onClose,onEdit,onMail,onQuick,onUpload,onOpenDocument,onPurchase,onDeliveryStart,onDeliveryComplete,onWait,onDelete}){
  const stage=STAGES[customer.stage]||STAGES.lead;
  return <div className="drawerBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <aside className="drawer">
      <div className="drawerHead"><div><span className={`statusBadge ${stage.tone}`}>{stage.label}</span><h2>{customer.name}</h2><p>{customer.customer_number?`Kundennummer ${customer.customer_number}`:'Interessent · Kundennummer folgt beim Kauf'}</p></div><button className="closeButton" onClick={onClose}>×</button></div>
      <div className="drawerActions"><button className="btn primary" onClick={onEdit}>Bearbeiten</button><button className="btn soft" onClick={onMail}>E-Mail erstellen</button><button className="btn ghost" onClick={()=>onWait(customer)}>{customer.waiting_on_customer?'Warten beenden':'Wartet auf Kunde'}</button></div>
      <DetailSection title="Kontakt"><DetailRow label="Telefon" value={customer.phone}/><DetailRow label="E-Mail" value={customer.email}/></DetailSection>
      <DetailSection title="Fahrzeug"><DetailRow label="Fahrzeuginteresse" value={customer.vehicle_interest}/><DetailRow label="Gekauftes Fahrzeug" value={customer.purchased_vehicle}/><DetailRow label="Notizen" value={customer.notes}/></DetailSection>
      <DetailSection title="Termine & Vertrag">
        <DetailRow label="Probefahrt" value={customer.test_drive_at?fmtDateTime(customer.test_drive_at):null}/>
        <DetailRow label="Bestelldatum" value={customer.ordered_at?fmtDate(customer.ordered_at):null}/>
        <DetailRow label="Geplante Auslieferung" value={customer.planned_delivery_at?fmtDateTime(customer.planned_delivery_at):null}/>
        <DetailRow label="Auslieferungsdatum" value={customer.delivered_at?fmtDate(customer.delivered_at):null}/>
        <DetailRow label="Vertragsende Leasing / Finanzierung" value={customer.contract_end_date?fmtDate(customer.contract_end_date):null}/>
        {customer.planned_delivery_at&&<DeliveryChecklist checklist={customer.delivery_checklist}/>}
      </DetailSection>
      <DetailSection title="AVA Verkaufsassistent">
        <div className="assistantActionGrid">
          {!['ordered','customer'].includes(customer.stage)&&<button onClick={()=>onPurchase(customer)}><span>✓</span><b>Kaufabschluss</b><small>Kundennummer + gekauftes Fahrzeug</small></button>}
          {customer.stage==='ordered'&&<button onClick={()=>onDeliveryStart(customer)}><span>🚗</span><b>Auslieferung planen</b><small>AVA erstellt die Vorbereitung</small></button>}
          {customer.stage==='ordered'&&customer.planned_delivery_at&&<button onClick={()=>onDeliveryComplete(customer)}><span>✓</span><b>Auslieferung erfolgt</b><small>Nachkontakt morgen</small></button>}
        </div>
      </DetailSection>
      <DetailSection title="Dokumente & Angebote">
        <OfferDocuments customer={customer} documents={documents} onUpload={onUpload} onOpenDocument={onOpenDocument}/>
      </DetailSection>
      <DetailSection title="Nächste Aktionen">
        <div className="quickGrid"><button onClick={()=>onQuick('offer')}>Angebot nachfassen</button><button onClick={()=>onQuick('test_drive')}>Probefahrt nachfassen</button><button onClick={()=>onQuick('delivery')}>Auslieferung nachfassen</button><button onClick={()=>onQuick('delivery_update')}>Lieferstatus</button></div>
      </DetailSection>
      <DetailSection title="Offene Aufgaben">
        {tasks.filter(t=>t.status==='open').length?tasks.filter(t=>t.status==='open').map(t=><div className="miniTask" key={t.id}><b>{t.title}</b><span>{fmtDateTime(t.due_at)}</span></div>):<span className="muted">Keine offenen Aufgaben</span>}
      </DetailSection>
      <HistoryButton history={history}/>
      <DetailSection title="Verwaltung">
        <div className="dangerZone"><div><b>Kunde / Interessent löschen</b><span>Entfernt diesen Datensatz inklusive aller zugehörigen AVA-Daten endgültig.</span></div><button onClick={()=>onDelete(customer)}>Endgültig löschen</button></div>
      </DetailSection>

    </aside>
  </div>;
}

function DeliveryChecklist({checklist}){
  const c=checklist||{};
  const rows=[['vehicle_ready','Fahrzeug / Aufbereitung'],['documents_ready','Papiere'],['registration_ready','Zulassung'],['customer_confirmed','Termin mit Kunde bestätigt']];
  return <div className="deliveryChecklist">{rows.map(([k,l])=><div key={k}><span className={c[k]?'checkOn':'checkOff'}>{c[k]?'✓':'○'}</span><b>{l}</b></div>)}</div>;
}

function OfferDocuments({customer,documents,onUpload,onOpenDocument}){
  const cameraRef=useRef(null),fileRef=useRef(null);
  return <div className="docArea"><div className="docActions">
    <button className="docPrimary" onClick={()=>cameraRef.current?.click()}>📷 Angebot scannen</button>
    <button className="docSecondary" onClick={()=>fileRef.current?.click()}>↑ Angebot hochladen</button>
    <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];if(f)onUpload(customer,f);e.target.value=''}}/>
    <input ref={fileRef} hidden type="file" accept="application/pdf,image/*" onChange={e=>{const f=e.target.files?.[0];if(f)onUpload(customer,f);e.target.value=''}}/>
  </div><div className="docList">
    {documents.length?documents.map(d=><button key={d.id} className="docItem" onClick={()=>onOpenDocument(d)}><span className="docIcon">{d.mime_type==='application/pdf'?'PDF':'IMG'}</span><span className="docMeta"><b>{d.file_name}</b><small>{fmtDateTime(d.created_at)} · Angebot</small></span><span className="docArrow">›</span></button>):<div className="docEmpty">Noch kein Angebot hinterlegt.</div>}
  </div></div>;
}

function HistoryButton({history}){
  const [open,setOpen]=useState(false);
  return <DetailSection title="Historie">
    <button className="historyOpenBtn" onClick={()=>setOpen(true)}>Historie öffnen <span>{history.length}</span></button>
    {open&&<div className="historyOverlay"><div className="historyPanel"><div className="modalHead"><div><span className="eyebrow">Kundenhistorie</span><h2>Alle Vorgänge</h2></div><button className="closeButton" onClick={()=>setOpen(false)}>×</button></div><div className="historyList">{history.length?history.map(h=><div className="historyListItem" key={h.id}><div><b>{h.action}</b><span>{fmtDateTime(h.created_at)}</span></div><p>{h.details}</p></div>):<span className="muted">Noch keine Historieneinträge.</span>}</div></div></div>}
  </DetailSection>;
}

function CustomerForm({selected,form,setForm,onClose,onSubmit}){
  const set=(k,v)=>setForm({...form,[k]:v});
  return <div className="modalBackdrop">
    <form className="customerModal" onSubmit={onSubmit}>
      <div className="modalHead"><div><span className="eyebrow">{selected?'Kundenakte':'Neuer Datensatz'}</span><h2>{selected?'Kunde bearbeiten':'Testkunde anlegen'}</h2><p>Alle gespeicherten Daten bleiben jederzeit bearbeitbar.</p></div><button type="button" className="closeButton" onClick={onClose}>×</button></div>
      <div className="formSection"><h3>Stammdaten</h3><div className="formGrid">
        <Field label="Name"><input required value={form.name} onChange={e=>set('name',e.target.value)}/></Field>
        <Field label="Kundennummer" hint="Bei Interessenten optional. AVA fordert sie beim Kauf an."><input value={form.customer_number} onChange={e=>set('customer_number',e.target.value)}/></Field>
        <Field label="Telefon"><input value={form.phone} onChange={e=>set('phone',e.target.value)}/></Field>
        <Field label="E-Mail"><input type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></Field>
        <Field label="Fahrzeuginteresse" full><input value={form.vehicle_interest} onChange={e=>set('vehicle_interest',e.target.value)}/></Field>
        <Field label="Gekauftes Fahrzeug" hint="Erst relevant, sobald der Interessent kauft." full><input value={form.purchased_vehicle||''} onChange={e=>set('purchased_vehicle',e.target.value)}/></Field>
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

function VoiceAssistant({text,setText,result,listening,running,onListen,onRun,onClose}){
  const hasText=Boolean((text||'').trim());
  return <div className="modalBackdrop voiceBackdrop">
    <div className="voiceModal">
      <div className="modalHead"><div><span className="eyebrow">AVA Sprachassistent</span><h2>Was soll AVA erledigen?</h2><p>Einsprechen, prüfen und anschließend bewusst in AVA übernehmen.</p></div><button className="closeButton" onClick={onClose}>×</button></div>
      <div className={`voiceOrb ${listening?'listening':''}`} onClick={onListen}>🎙</div>
      <div className="voiceStatus">{listening?'Ich höre zu…':hasText?'Sprache erkannt – jetzt prüfen und übernehmen':'Mikrofon antippen oder Befehl eintippen'}</div>
      {hasText&&<div className="voiceRecognized"><span>Erkannt</span><b>„{text}“</b></div>}
      <textarea className="voiceInput" value={text} onChange={e=>setText(e.target.value)} placeholder='z. B. „Probefahrt mit Rafael Huber morgen um 15 Uhr“'/>
      <div className="voiceExamples">
        <button onClick={()=>setText('Neuen Interessenten anlegen mit dem Namen Max Mustermann')}>Interessent anlegen</button>
        <button onClick={()=>setText('Neuer Interessent Thomas Berger, Telefon 0176 12345678, möchte einen CX-5 probefahren, Freitag um 14 Uhr')}>Interessent + Probefahrt</button>
        <button onClick={()=>setText('Probefahrt mit Rafael Huber morgen um 15 Uhr')}>Probefahrt planen</button>
        <button onClick={()=>setText('Rafael Huber nicht erreicht')}>Nicht erreicht</button>
        <button onClick={()=>setText('Notiz bei Rafael Huber: Kunde möchte am Freitag entscheiden')}>Notiz speichern</button>
        <button onClick={()=>setText('Termin morgen um 10 Uhr: Teammeeting')}>Termin anlegen</button>
        <button onClick={()=>setText('To-do für heute: CX-5 auf den Hof stellen')}>To-do speichern</button>
        <button onClick={()=>setText('Max Mustermann hat gekauft, Kundennummer 47182, gekauftes Fahrzeug CX-5')}>Kaufabschluss</button>
        <button onClick={()=>setText('Öffne Rafael Huber')}>Kundenakte öffnen</button>
      </div>
      {result&&<div className="voiceResult">{result}</div>}
      <div className="modalFoot voiceFoot voiceActionBar">
        <span>AVA speichert erst, wenn du bestätigst.</span>
        <div>
          <button className="btn ghost" onClick={()=>{setText('');}}>Verwerfen</button>
          <button className="btn primary voiceApply" disabled={!hasText||listening||running} onClick={onRun}>{running?'Wird übernommen…':'✓ In AVA übernehmen'}</button>
        </div>
      </div>
    </div>
  </div>;
}

function TeamView({uid,members=[],messages=[],todos=[],recipient,setRecipient,text,setText,asTask,setAsTask,onSend,onRead,onCompleteTodo}){
  const me=members.find(m=>m.user_id===uid);
  const others=members.filter(m=>m.user_id!==uid);
  const member=id=>members.find(m=>m.user_id===id);
  const assigned=todos.filter(t=>t.user_id===uid&&t.assigned_by&&t.status!=='done');
  return <div className="page teamPage">
    <div className="pageTitleRow"><div><span className="eyebrow">AVA Team Assistant</span><h1>Team</h1><p>Kurze Nachrichten, Aufgaben und Übergaben ohne WhatsApp-Chaos.</p></div></div>
    <div className="teamLayout">
      <section className="teamComposer">
        <div className="sectionTitle"><h2>Nachricht senden</h2><span>{me?.display_name||'Mein Team'}</span></div>
        <label className="teamLabel">An</label>
        <select value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">Kollegen auswählen…</option>{others.map(m=><option value={m.user_id} key={m.user_id}>{m.display_name}{m.role?` · ${m.role}`:''}</option>)}</select>
        <label className="teamLabel">Nachricht</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="z. B. Bitte stell den CX-5 für 14 Uhr bereit."/>
        <label className="teamTaskSwitch"><input type="checkbox" checked={asTask} onChange={e=>setAsTask(e.target.checked)}/><span><b>Als Aufgabe senden</b><small>Der Empfänger bekommt sie zusätzlich unter „Meine To-dos“.</small></span></label>
        <button className="btn primary wide" onClick={onSend}>{asTask?'Aufgabe senden':'Nachricht senden'}</button>
      </section>
      <section className="teamInbox">
        <div className="sectionTitle"><h2>Nachrichten</h2><span>{messages.filter(m=>m.recipient_id===uid&&!m.read_at).length} neu</span></div>
        <div className="chatList">{messages.length?messages.map(m=>{
          const incoming=m.recipient_id===uid, other=member(incoming?m.sender_id:m.recipient_id);
          return <button key={m.id} className={`chatBubble ${incoming?'incoming':'outgoing'} ${incoming&&!m.read_at?'unread':''}`} onClick={()=>onRead(m)}>
            <div className="chatAvatar">{(other?.display_name||'?').slice(0,1).toUpperCase()}</div>
            <div><span>{incoming?'Von':'An'} {other?.display_name||'Kollege'} · {fmtDateTime(m.created_at)}</span><b>{m.body}</b>{m.message_type==='task'&&<small>Aufgabe{m.due_at?` · fällig ${fmtDateTime(m.due_at)}`:''}</small>}</div>
          </button>
        }):<EmptyState title="Noch keine Nachrichten" text="Schreib einem Kollegen die erste AVA-Team-Nachricht."/>}</div>
      </section>
    </div>
    <section className="assignedTasks">
      <div className="sectionTitle"><h2>Mir zugewiesen</h2><span>{assigned.length} offen</span></div>
      <div className="assignedGrid">{assigned.length?assigned.map(t=><div className="assignedCard" key={t.id}><span>Von {member(t.assigned_by)?.display_name||'Kollege'}</span><b>{t.title}</b><small>{t.due_date?`Fällig ${fmtDate(t.due_date)}`:'Ohne Fälligkeit'}</small><button className="btn soft" onClick={()=>onCompleteTodo(t)}>✓ Erledigt</button></div>):<EmptyState title="Alles erledigt" text="Dir ist aktuell keine Team-Aufgabe zugewiesen." compact/>}</div>
    </section>
  </div>;
}

function NotificationCenter({notifications,prefs,onClose,onPermission,onPref}){
  return <div className="drawerBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <aside className="drawer notificationDrawer">
      <div className="drawerHead"><div><span className="eyebrow">AVA Notifications</span><h2>Benachrichtigungen</h2><p>AVA meldet sich, wenn wirklich etwas wichtig wird.</p></div><button className="closeButton" onClick={onClose}>×</button></div>
      <button className="btn primary wide notificationPermission" onClick={onPermission}>Push auf diesem Gerät neu einrichten</button>
      <DetailSection title="Einstellungen">
        <NotificationToggle label="Benachrichtigungen" value={prefs?.enabled!==false} onChange={v=>onPref('enabled',v)}/>
        <NotificationToggle label="Fällige Nachkontakte" value={prefs?.due_followups!==false} onChange={v=>onPref('due_followups',v)}/>
        <NotificationToggle label="Probefahrten" value={prefs?.test_drive_reminders!==false} onChange={v=>onPref('test_drive_reminders',v)}/>
        <NotificationToggle label="Auslieferungen" value={prefs?.delivery_reminders!==false} onChange={v=>onPref('delivery_reminders',v)}/>
        <NotificationToggle label="Persönliche To-dos" value={prefs?.todo_reminders!==false} onChange={v=>onPref('todo_reminders',v)}/>
        <NotificationToggle label="AVA Chancen / Nichts vergessen" value={prefs?.opportunity_alerts!==false} onChange={v=>onPref('opportunity_alerts',v)}/>
      </DetailSection>
      <DetailSection title="Letzte Meldungen">
        <div className="notificationList">{notifications.length?notifications.map(n=><div className={`notificationItem ${!n.read_at?'unread':''}`} key={n.id}><span className="notificationDot"/><div><b>{n.title}</b><p>{n.body}</p><small>{fmtDateTime(n.created_at)}</small></div></div>):<div className="muted">Noch keine Benachrichtigungen.</div>}</div>
      </DetailSection>
    </aside>
  </div>;
}
function NotificationToggle({label,value,onChange}){return <label className="notificationToggle"><span>{label}</span><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)}/><i/></label>}

function MobileNav({tab,setTab}){
  const items=[['Heute','⌂'],['Kalender','▦'],['Kunden','◉'],['Team','◇']];
  return <nav className="mobileNav">{items.slice(0,2).map(([l,i])=><button key={l} className={tab===l?'active':''} onClick={()=>setTab(l)}><span>{i}</span>{l}</button>)}<button className="mobileVoice" onClick={()=>window.dispatchEvent(new CustomEvent('ava-open-voice'))}><span>🎙</span>AVA</button>{items.slice(2).map(([l,i])=><button key={l} className={tab===l?'active':''} onClick={()=>setTab(l)}><span>{i}</span>{l}</button>)}</nav>;
}

function Metric({n,label,sub}){return <div className="metric"><div className="metricNumber">{n}</div><b>{label}</b><span>{sub}</span></div>}
function SectionTitle({title,hint}){return <div className="sectionTitle"><h2>{title}</h2><span>{hint}</span></div>}
function Field({label,hint,full,children}){return <label className={`field ${full?'full':''}`}><span>{label}</span>{hint&&<small>{hint}</small>}{children}</label>}
function DetailSection({title,children}){return <section className="detailSection"><h3>{title}</h3>{children}</section>}
function DetailRow({label,value}){return <div className="detailRow"><span>{label}</span><b>{value||'—'}</b></div>}
function EmptyState({title,text,compact}){return <div className={`emptyState ${compact?'compact':''}`}><div>✓</div><b>{title}</b><span>{text}</span></div>}
function LoadingState(){return <div className="loadingState"><div className="loader"/><span>AVA lädt deine Daten…</span></div>}
function initials(name=''){return name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'K'}
