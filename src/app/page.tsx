"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import InspirationQuote from "./inspiration-quote";

import { type Data, type DeletedLog, type LogField, hasRecord, validateData, moodNames, removeLogs, restoreLog, removeHabits } from "@/lib/records";
import RecordBackups from "./record-backups";
import EditDayLog from "./edit-day-log";
import ConsistencyView from "./consistency-view";

const initial: Data = { habits: [
  { id: "move", name: "Move your body", detail: "45 minutes · Strength or movement", pillar: 0 },
  { id: "sleep", name: "Prioritize good sleep", detail: "8 hours · A rested mind, a stronger you", pillar: 0 },
  { id: "meditate", name: "Find a moment of stillness", detail: "10 minutes · Meditation & breathwork", pillar: 1 },
  { id: "journal", name: "Put your thoughts on paper", detail: "5 minutes · Reflect & reset", pillar: 1 },
  { id: "read", name: "Read a little, grow a little", detail: "20 pages · Make room for new ideas", pillar: 2 },
  { id: "focus", name: "Make time for deep work", detail: "60 minutes · One thing, undivided attention", pillar: 2 },
], checks: {}, notes: {}, moods: {}, water: {} };
const pillars = [{ name: "Physical health", short: "Body", icon: "↗", description: "A stronger foundation." }, { name: "Mental health", short: "Mind", icon: "✧", description: "A little more inner peace." }, { name: "Personal development", short: "Growth", icon: "❋", description: "Become your next chapter." }];
const listeners = new Set<() => void>();
const key = "arc-winter-2026-v1";
function subscribe(fn: () => void) { listeners.add(fn); window.addEventListener("storage", fn); return () => { listeners.delete(fn); window.removeEventListener("storage", fn); }; }
function snapshot() { try { return localStorage.getItem(key) || ""; } catch { return ""; } }
function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function dayNumber(date: string) { return Math.floor((Date.parse(date+"T12:00:00Z")-Date.parse("2026-10-03T12:00:00Z"))/86400000)+1; }
export default function Home() {
  const theme = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem("arc-theme") === "light" ? "light" : "dark"; } catch { return "dark"; } }, () => "dark");
  const toggleTheme = () => { try { localStorage.setItem("arc-theme", theme === "dark" ? "light" : "dark"); } catch { setSaveError("This browser could not save your theme preference."); } listeners.forEach(fn => fn()); };
  const stored = useSyncExternalStore(subscribe, snapshot, () => "");
  const [unsavedSnapshot, setUnsavedSnapshot] = useState<string | null>(null);
  const raw = unsavedSnapshot ?? stored;
  let data = initial;
  let loadError = false;
  try { if (raw) { const parsed: unknown = JSON.parse(raw); if (validateData(parsed)) data = parsed; else loadError = true; } } catch { loadError = true; }
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    // One-time repair explicitly requested for the two accidental walking habits.
    // Keep a recovery copy in this browser before updating the existing record.
    const repairKey = "arc-evening-walk-cleanup-v1";
    try {
      if (localStorage.getItem(repairKey)) return;
      const stored = localStorage.getItem(key);
      if (!stored) return;
      const previous: unknown = JSON.parse(stored);
      if (!validateData(previous)) return;
      const ids = previous.habits.filter(habit => habit.name.trim().toLowerCase() === "took an evening walk").map(habit => habit.id);
      if (!ids.length) return;
      localStorage.setItem("arc-before-evening-walk-cleanup-v1", stored);
      localStorage.setItem(key, JSON.stringify(removeHabits(previous, ids)));
      localStorage.setItem(repairKey, "done");
      listeners.forEach(listener => listener());
    } catch { setSaveError("The duplicate walking habits could not be removed from this browser. Please download a backup and try again."); }
  }, []);
  const today = useSyncExternalStore(subscribe, () => localDate(new Date()), () => "2026-10-12");
  const [selectedDate, setDate] = useState<string | null>(null);
  const date = selectedDate || today;
  const [view, setView] = useState("Overview");
  const [filter, setFilter] = useState(-1);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [habitError, setHabitError] = useState("");
  const [pillar, setPillar] = useState(0);
  const [saved, setSaved] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [deletedLog, setDeletedLog] = useState<{ record: DeletedLog; label: string } | null>(null);
  const checked = data.checks[date] || [];
  const complete = data.habits.filter(h => checked.includes(h.id)).length;
  const percent = data.habits.length ? Math.round(complete / data.habits.length * 100) : 0;
  const day = dayNumber(date);
  const update = (next: Data) => {
    if (loadError) { setSaveError("Your saved records could not be read. They have been kept unchanged; restore a valid backup to another browser to recover them."); return false; }
    const serialized = JSON.stringify(next);
    let persisted = false;
    try { localStorage.setItem(key, serialized); setUnsavedSnapshot(null); setSaveError(""); persisted = true; }
    catch { setUnsavedSnapshot(serialized); setSaveError("This browser could not save your changes. They are available on this page for now. Download a backup before closing or refreshing."); }
    listeners.forEach(fn => fn());
    return persisted;
  };
  const deleteLog = (fields: LogField[], label: string) => {
    if (loadError) return;
    const { next, deleted } = removeLogs(data, date, fields);
    update(next);
    setDeletedLog({ record: deleted, label });
    setSaved(false);
  };
  const toggle = (id: string) => update({ ...data, checks: {...data.checks, [date]: checked.includes(id) ? checked.filter(i => i!==id) : [...checked,id] } });
  const moveDate = (amount: number) => { const d = new Date(date+"T12:00:00"); d.setDate(d.getDate()+amount); setDate(localDate(d)); setSaved(false); };
  const displayDate = new Date(date+"T12:00:00").toLocaleDateString("en-US", {weekday:"long",month:"long",day:"numeric",year:"numeric"});
  let streak = 0; const cursor = new Date(date+"T12:00:00"); if (!complete) cursor.setDate(cursor.getDate()-1); for(let i=0;i<90;i++){ if(!(data.checks[localDate(cursor)] || []).length) break; streak++; cursor.setDate(cursor.getDate()-1); }
  const total = Object.values(data.checks).reduce((sum, arr)=>sum+arr.length,0);
  return <div className="app-shell" data-theme={theme}>
    <aside className="sidebar">
      <Link className="brand" href="/">arc<span>✳</span></Link><div className="brand-caption">SMALL STEPS. A STRONGER YOU.</div>
      <nav>{["Overview","My habits","My progress","Consistency"].map((item,i)=><button key={item} className={view===item?"nav-item active":"nav-item"} onClick={()=>{setView(item);setFilter(-1);}}><span className="nav-icon">{["◫","☷","↗","▥"][i]}</span>{item}{view===item&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-challenge"><span className="tiny-label">YOUR SEASON OF GROWTH</span><div className="winter-icon">❄</div><h3>Winter arc, 2026</h3><p>90 days of showing up<br/>for yourself.</p><div className="mini-track"><i style={{width:`${Math.min(100,Math.max(0,day/90*100))}%`}}/></div><span>Day {Math.max(0,Math.min(90,day))} <em>of 90</em></span></div>
      <div className="sidebar-bottom"><span className="avatar">A</span><div>Your personal space<small>One day at a time.</small></div><span>⌄</span></div>
    </aside>
    <main>
      <header className="topbar"><span>YOUR WINTER ARC <span className="slash">/</span> {view}</span><div><span className="local-badge"><i/> {saveError ? "Changes not saved" : loadError ? "Saved records need attention" : "Autosaved on this device"}</span><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span><span>{theme === "dark" ? "Light" : "Dark"}</span></button><span className="avatar small">A</span></div></header>
      <div className="content">
        {(saveError || loadError) && <div className="save-alert" role="alert">{saveError || "Your saved records could not be read. They have been kept unchanged. Please keep your backup; avoid entering new records until they can be recovered."}</div>}
        {deletedLog && <div className="log-undo" role="status"><span>{deletedLog.label} removed for {deletedLog.record.date}. Undo is available until your next deletion or page refresh.</span><button onClick={()=>{if(update(restoreLog(data,deletedLog.record)))setDeletedLog(null);}}>Undo deletion ↶</button><button aria-label="Dismiss deletion message" onClick={()=>setDeletedLog(null)}>×</button></div>}
        <InspirationQuote />
        <div className="page-heading"><div><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>{view==="Overview"?"Welcome to your winter arc.":view==="My habits"?"Build the life you imagine.":view==="My progress"?"Every small step adds up.":"See the patterns. Find your balance."}</h1><p>{view==="Overview"?"A personal space to build strength, find balance, and grow with intention.":view==="Consistency"?"Notice what’s working, and where a little more care could make a difference.":"You don’t need to be perfect. You just need to keep showing up."}</p></div><button className="outline-button" onClick={()=>{setDate(localDate(new Date()));setSaved(false);}}>↗ <span>Go to today</span></button></div>
        {view==="Overview" ? <div className="overview-content">
        <section className="hero"><div className="hero-copy"><div className="hero-label"><span>❄</span> THE 90-DAY WINTER ARC</div><h2>This season is yours.</h2><p>A stronger body. A calmer mind. A more intentional you.<br/>Let’s become who you know you can be.</p><div className="hero-dates">OCT 03 <span>────────</span> DEC 31, 2026</div></div><div className="arc-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><span className="star star-one">✦</span><span className="star star-two">✧</span><div className="day-circle"><span>DAY</span><strong>{Math.max(0,Math.min(day,90))}</strong><small>of 90</small></div><div className="art-caption">BECOMING, NOT RUSHING.</div></div></section>

          <section className="about-arc"><div><span className="eyebrow">WHY ARC EXISTS</span><h2>A better you.<br/>Built from the everyday.</h2></div><div><p>Arc brings fitness, routines, and personal growth into one intentional space. It’s a way to keep the promises you make to yourself, notice your progress, and return to what matters when life gets busy.</p><p>This 90-day winter challenge is about finishing 2026 stronger in every sense: more energetic, more grounded, and more deliberate with your time. Productivity, accountability, and discipline start with a sustainable rhythm.</p></div></section>
          <section className="overview-pillars"><div className="section-title"><h2>Three pillars. One whole you.</h2><span>Each one supports the others.</span></div><div className="pillar-stories">{pillars.map((p,i)=>{const descriptions=["Give yourself the energy to show up. Movement, restful sleep, and hydration build a foundation for your days. Choose routines you can return to, with room for rest and recovery.","Make room to pause and understand yourself. Meditation, reflection, and a daily mood check-in help you notice how you feel and approach the day with more awareness.","Invest in the person you’re becoming. Reading, learning, and focused work turn your goals into small daily actions. Protect your attention and let curiosity move you forward."];const practices=[["Movement","Rest & recovery","Hydration"],["Mindfulness","Journaling","Emotional awareness"],["Reading & learning","Deep work","Intentional routines"]];const habits=data.habits.filter(h=>h.pillar===i);const done=habits.filter(h=>checked.includes(h.id)).length;return <article className={`pillar-story pillar-${i}`} key={p.name}><div className="pillar-top"><span className="pillar-symbol">{p.icon}</span><span>0{i+1}</span></div><h3>{p.name}</h3><p>{descriptions[i]}</p><div className="practice-tags">{practices[i].map(practice=><span key={practice}>{practice}</span>)}</div><button onClick={()=>{setView("My habits");setFilter(i);}}>Explore {p.short.toLowerCase()} habits <span>↗</span></button><small>{done} of {habits.length} intentions complete for {displayDate}</small></article>;})}</div></section>
          <section className="overview-rhythm"><div><span className="eyebrow">YOUR DAILY RHYTHM</span><h2>Show up. Check in. Begin again.</h2><p>Choose your intentions in My Habits, mark the steps you take, and make a little space for reflection. My Progress collects those days into a picture of your journey. A missed day is an invitation to come back.</p></div><div className="overview-today"><span className="tiny-label">YOUR SELECTED DAY · {displayDate}</span><strong>{complete}<span> / {data.habits.length}</span></strong><p>intentions complete · {percent}% consistency</p><button className="primary-button" onClick={()=>{setView("My habits");setFilter(-1);}}>Go to my habits ↗</button><button className="text-button" onClick={()=>setView("My progress")}>See my 90-day journey →</button></div></section>
        </div> : view==="Consistency" ? <ConsistencyView data={data} today={today} onDay={value=>{setDate(value);setSaved(false);setView("My progress");}} onPillar={value=>{setFilter(value);setView("My habits");}} /> : <>
        <div className="stats"><div className="stat"><span className="stat-icon lavender">◷</span><div><span>Today’s consistency</span><strong>{percent}% <small>{complete} of {data.habits.length} habits</small></strong></div></div><div className="stat"><span className="stat-icon blue">♨</span><div><span>Showing-up streak</span><strong>{streak} days <small>Keep your momentum</small></strong></div></div><div className="stat"><span className="stat-icon mint">✧</span><div><span>Small wins collected</span><strong>{total} <small>Every one counts</small></strong></div></div></div>
        <section className="pillars"><div className="section-title"><h2>Your three pillars</h2><span>A balanced you is a better you.</span></div><div className="pillar-grid">{pillars.map((p,i)=>{const habits=data.habits.filter(h=>h.pillar===i);const n=habits.filter(h=>checked.includes(h.id)).length;return <button className={`pillar-card pillar-${i} ${filter===i?"selected":""}`} key={p.name} onClick={()=>setFilter(filter===i?-1:i)}><div className="pillar-top"><span className="pillar-symbol">{p.icon}</span><span>{String(i+1).padStart(2,"0")}</span></div><h3>{p.name}</h3><p>{p.description}</p><div className="pillar-progress"><div><i style={{width:`${habits.length?n/habits.length*100:0}%`}}/></div><span>{n}/{habits.length}</span></div></button>;})}</div></section>
        <div className="lower-grid"><section className="habit-panel"><div className="section-title"><h2>{view==="My progress"?"Your 90-day journey":"Today’s intentions"}</h2><button className="text-button" onClick={()=>{setHabitError("");setModal(true);}}>+ Add habit</button></div><div className="date-row"><span>{displayDate}</span><div><button aria-label="Previous day" onClick={()=>moveDate(-1)}>‹</button><button aria-label="Next day" onClick={()=>moveDate(1)}>›</button></div></div>
          {view==="My progress"?<><div className="journey-grid">{Array.from({length:90},(_,i)=>{const d=new Date("2026-10-03T12:00:00"); d.setDate(d.getDate()+i);const value=localDate(d);const count=(data.checks[value]||[]).length;const recorded=hasRecord(data,value);return <button key={i} aria-label={`Day ${i+1}, ${value}, ${count} habits completed${recorded?", saved entry":""}`} aria-pressed={date===value} title={`${value}: ${count} habits completed${recorded?" · Saved entry":""}`} className={`${count?"has-wins":recorded?"has-record":""} ${date===value?"current-day":""}`} onClick={()=>{setDate(value);setSaved(false);}}>{i+1}{recorded&&<span className="record-dot" aria-hidden="true"/>}</button>;})}</div><p className="journey-note">Select a day to read or update its record below. A dot means that day has saved activity, a check-in, or a reflection.</p>
          <section className="day-record" aria-label={`Saved record for ${date}`}><div className="day-record-heading"><span className="eyebrow">DAY {day} · YOUR SAVED RECORD</span><h3>{displayDate}</h3><p>{hasRecord(data,date)?"Here’s what you recorded. Changes to this day save automatically.":"No entries yet for this day. Start with a habit or a check-in."}</p><div className="day-log-actions"><button className="outline-button" onClick={()=>setEditingDate(date)}>Edit day’s log ↗</button>{hasRecord(data,date)&&<button className="delete-button" onClick={()=>deleteLog(["checks","notes","moods","water"],"Day’s log")}>Delete day’s log</button>}</div></div>
          <div className="day-summary"><div><span>Habits</span><strong>{complete} / {data.habits.length}</strong></div><div><span>Mood</span><strong>{data.moods[date]===undefined?"Not logged":moodNames[data.moods[date]]}</strong></div><div><span>Water</span><strong>{data.water[date]===undefined?"Not logged":`${data.water[date]} / 8 glasses`}</strong></div></div>
          <div className="habit-list">{data.habits.map(h=><div className={`habit-row ${checked.includes(h.id)?"done":""}`} key={h.id}><button className="check" aria-label={`Mark ${h.name} ${checked.includes(h.id)?"incomplete":"complete"} for ${date}`} aria-pressed={checked.includes(h.id)} onClick={()=>toggle(h.id)}>{checked.includes(h.id)?"✓":""}</button><div className="habit-text"><h3>{h.name}</h3><p>{checked.includes(h.id)?"Completed on this day":"Not marked complete"}</p></div><span className={`habit-tag tag-${h.pillar}`}>{pillars[h.pillar].short}</span></div>)}</div>
          <div className="saved-reflection"><div className="section-title"><h3>Reflection</h3>{data.notes[date]&&<button className="delete-button" onClick={()=>deleteLog(["notes"],"Reflection")}>Delete reflection</button>}</div><label className="reflection-prompt" htmlFor="journal">What made you proud today? What will you bring into tomorrow?</label><textarea id="journal" placeholder="A few words about this day…" value={data.notes[date]||""} onChange={e=>{update({...data,notes:{...data.notes,[date]:e.target.value}});setSaved(false);}}/><p className="autosave-note" role="status">{saveError?"Not saved — download a backup before leaving.":"Your reflection saves automatically for this day."}</p><button className="primary-button" onClick={()=>setSaved(update(data))}>{saved?"✓ Reflection saved":"Save reflection"}</button></div></section>
          </>:<><div className="habit-list">{data.habits.filter(h=>filter===-1||h.pillar===filter).map(h=><div className={`habit-row ${checked.includes(h.id)?"done":""}`} key={h.id}><button className="check" aria-label={`Mark ${h.name} ${checked.includes(h.id)?"incomplete":"complete"}`} aria-pressed={checked.includes(h.id)} onClick={()=>toggle(h.id)}>{checked.includes(h.id)?"✓":""}</button><div className="habit-text"><h3>{h.name}</h3><p>{h.detail}</p></div><span className={`habit-tag tag-${h.pillar}`}>{pillars[h.pillar].short}</span></div>)}</div><div className="habit-footer"><span>✧</span>{complete===data.habits.length?"You showed up for every intention. Be proud of yourself.":"Progress is built in the little things you do today."}</div></>}
        </section><aside className="right-column"><section className="check-in"><div className="section-title"><h2>A moment for you</h2><span>✧</span></div><p>How are you feeling on this day?</p><div className="moods">{["☁","☂","◡","☀","✺"].map((m,i)=><button key={m} className={data.moods[date]===i?"chosen":""} aria-label={["Low","A little off","Okay","Good","Radiant"][i]} aria-pressed={data.moods[date]===i} onClick={()=>update({...data,moods:{...data.moods,[date]:i}})}>{m}</button>)}</div>{data.moods[date]!==undefined&&<button className="delete-button clear-log" onClick={()=>deleteLog(["moods"],"Mood log")}>Clear mood log</button>}<div className="mood-labels"><span>A little low</span><span>Feeling great</span></div><div className="water-heading"><span>Stay hydrated</span><span>{data.water[date]||0} / 8 glasses</span></div><div className="water-glasses">{Array.from({length:8},(_,i)=><button key={i} className={(data.water[date]||0)>i?"filled":""} aria-label={`Log ${i+1} glasses of water`} onClick={()=>update({...data,water:{...data.water,[date]:(data.water[date]||0)===i+1?i:i+1}})}>♧</button>)}</div>{data.water[date]!==undefined&&<button className="delete-button clear-log" onClick={()=>deleteLog(["water"],"Water log")}>Clear water log</button>}</section><section className="reflection-card"><span className="tiny-label">DAILY REFLECTION</span><h3>What’s one thing you’re<br/>proud of today?</h3><p>The small wins deserve a little space, too.</p><button onClick={()=>{setView("My progress");setSaved(false);}}>Write a few words <span>↗</span></button></section><div className="quote"><span>“</span><p>You are what you<br/>repeatedly do.</p><small>LET YOUR HABITS TELL YOUR STORY.</small></div></aside></div>
        </>}
        {(view==="My progress" || view==="Consistency") && <RecordBackups data={data} onRestore={update} />}
        <footer><span>Made for your becoming.</span><span>A little intention. A little discipline. A whole lot of you. <i>✳</i></span></footer>
      </div>
    </main>
    {editingDate&&<EditDayLog key={editingDate} date={editingDate} data={data} onSave={update} onClose={()=>setEditingDate(null)} />}
    {modal&&<div className="modal-overlay" onClick={()=>setModal(false)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(!name.trim())return;if(data.habits.some(habit=>habit.name.trim().toLowerCase()===name.trim().toLowerCase())){setHabitError("This habit is already in your list. Choose a different name.");return;}setHabitError("");update({...data,habits:[...data.habits,{id:crypto.randomUUID(),name:name.trim(),detail:"Daily · A small promise to yourself",pillar,createdOn:today}]});setName("");setModal(false);}}><button type="button" className="modal-close" onClick={()=>setModal(false)} aria-label="Close">×</button><span className="eyebrow">A NEW SMALL STEP</span><h2>Make an intention.</h2><label htmlFor="habit-name">What will you show up for?</label><input autoFocus id="habit-name" required maxLength={80} placeholder="e.g. Take a morning walk" value={name} onChange={e=>{setName(e.target.value);setHabitError("");}}/>{habitError&&<p className="habit-error" role="alert">{habitError}</p>}<label htmlFor="pillar">Choose your pillar</label><select id="pillar" value={pillar} onChange={e=>setPillar(Number(e.target.value))}>{pillars.map((p,i)=><option key={p.name} value={i}>{p.name}</option>)}</select><button className="primary-button" type="submit">Add to my habits ↗</button></form></div>}
  </div>;
}
