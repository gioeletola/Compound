import { useState, useRef } from "react";

const PALETTE = [
  { id:"blue",   accent:"#4A9EFF" },
  { id:"rose",   accent:"#FF6B8A" },
  { id:"green",  accent:"#4ECBA0" },
  { id:"amber",  accent:"#FFB830" },
  { id:"violet", accent:"#9B7FFF" },
  { id:"coral",  accent:"#FF7A5A" },
];

const FOLDERS = [
  { id:"all",       label:"Tutte",     icon:"⊞" },
  { id:"Personale", label:"Personale", icon:"🏠" },
  { id:"Lavoro",    label:"Lavoro",    icon:"💼" },
  { id:"Idee",      label:"Idee",      icon:"💡" },
  { id:"Casa",      label:"Casa",      icon:"🛒" },
  { id:"Studio",    label:"Studio",    icon:"📚" },
];

const ts = () => new Date().toISOString();

const SEED = [
  {
    id:1, pinned:true, title:"Benvenuto in NoteFlow 👋",
    body:"Prova le nuove funzioni: checklist interattive, cartelle per organizzare e PIN per proteggere le note private.",
    type:"text", palette:PALETTE[0], tags:["intro"], folder:"Personale",
    reminder:null, locked:false, created:ts(),
  },
  {
    id:2, pinned:false, title:"Lista della spesa",
    body:"", type:"checklist",
    checklist:[
      {text:"Pane integrale",done:false},
      {text:"Latte di avena",done:true},
      {text:"Verdure di stagione",done:false},
      {text:"Olio EVO",done:false},
      {text:"Cioccolato fondente",done:true},
    ],
    palette:PALETTE[2], tags:["casa"], folder:"Casa",
    reminder:new Date(Date.now()+7200000).toISOString(), locked:false, created:ts(),
  },
  {
    id:3, pinned:false, title:"Sprint Q2 — task aperti",
    body:"", type:"checklist",
    checklist:[
      {text:"Prototipo onboarding",done:true},
      {text:"Review design system",done:false},
      {text:"Testing mobile",done:false},
      {text:"Deploy staging",done:false},
    ],
    palette:PALETTE[4], tags:["lavoro"], folder:"Lavoro",
    reminder:null, locked:false, created:ts(),
  },
  {
    id:4, pinned:false, title:"Nota privata 🔒",
    body:"Questo contenuto è protetto da PIN. Solo tu puoi vederlo.",
    type:"text", palette:PALETTE[1], tags:[], folder:"Personale",
    reminder:null, locked:true, created:ts(),
  },
  {
    id:5, pinned:false, title:"Libri da leggere",
    body:"• Il nome della rosa — Eco\n• Sapiens — Harari\n• La strada — McCarthy\n• Norwegian Wood — Murakami",
    type:"text", palette:PALETTE[3], tags:["lettura"], folder:"Studio",
    reminder:null, locked:false, created:ts(),
  },
];

const fmt = iso => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT",{day:"2-digit",month:"short"}) + " · " +
    d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
};
const overdue = iso => iso && new Date(iso) < new Date();
const soon    = iso => { if (!iso) return false; const d = new Date(iso)-Date.now(); return d>0 && d<3600000; };

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [notes,    setNotes]    = useState(() => { try { const s=localStorage.getItem("nf5"); return s?JSON.parse(s):SEED; } catch { return SEED; } });
  const [folder,   setFolder]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState(null);   // {mode:"new"|"edit", note?}
  const [pinFlow,  setPinFlow]  = useState(null);   // note awaiting unlock
  const [pin,      setPin]      = useState("");
  const [pinErr,   setPinErr]   = useState(false);
  const uid = useRef(500);
  const APP_PIN = "1234";

  const persist = n => { try { localStorage.setItem("nf5", JSON.stringify(n)); } catch {} };

  const save = data => {
    const next = modal.mode === "edit"
      ? notes.map(n => n.id===data.id ? data : n)
      : [...notes, {...data, id:uid.current++, created:ts()}];
    setNotes(next); persist(next); setModal(null);
  };

  const del   = id => { const n=notes.filter(x=>x.id!==id); setNotes(n); persist(n); };
  const pinIt = id => { const n=notes.map(x=>x.id===id?{...x,pinned:!x.pinned}:x); setNotes(n); persist(n); };
  const check = (nid, idx) => {
    const n = notes.map(note => note.id===nid
      ? {...note, checklist: note.checklist.map((c,i) => i===idx ? {...c,done:!c.done} : c)}
      : note);
    setNotes(n); persist(n);
  };

  const openNote = note => {
    if (note.locked) { setPinFlow(note); setPin(""); setPinErr(false); }
    else setModal({mode:"edit", note});
  };

  const submitPin = p => {
    if (p === APP_PIN) { setPinFlow(null); setPin(""); setPinErr(false); setModal({mode:"edit", note:pinFlow}); }
    else { setPinErr(true); setPin(""); }
  };

  const visible = notes
    .filter(n => {
      const q = search.toLowerCase();
      const mQ = !q || n.title.toLowerCase().includes(q) || (n.body||"").toLowerCase().includes(q);
      const mF = folder==="all" || n.folder===folder;
      return mQ && mF;
    })
    .sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));

  const folderCount = id => id==="all" ? notes.length : notes.filter(n=>n.folder===id).length;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* HEADER */}
        <header className="hdr">
          <div className="hdr-top">
            <span className="logo">note<em>flow</em></span>
            <div className="search-wrap">
              <svg className="s-ico" viewBox="0 0 20 20" fill="none">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input className="search" placeholder="Cerca note…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button className="new-btn" onClick={()=>setModal({mode:"new"})}>+ Nuova nota</button>
          </div>

          {/* FOLDER TABS */}
          <div className="folders">
            {FOLDERS.map(f => (
              <button
                key={f.id}
                className={`ftab ${folder===f.id?"ftab-on":""}`}
                onClick={()=>setFolder(f.id)}
              >
                <span className="ftab-icon">{f.icon}</span>
                <span>{f.label}</span>
                <span className="ftab-cnt">{folderCount(f.id)}</span>
              </button>
            ))}
          </div>
        </header>

        {/* BODY */}
        <main className="body">
          {/* HERO */}
          <div className="page-title">
            {FOLDERS.find(f=>f.id===folder)?.icon} {FOLDERS.find(f=>f.id===folder)?.label}
            <span className="page-cnt">{visible.length}</span>
          </div>

          {visible.length === 0 ? (
            <div className="empty">
              <div className="e-ico">✦</div>
              <div className="e-t">Nessuna nota</div>
              <div className="e-s">Crea la tua prima nota con il pulsante +</div>
            </div>
          ) : (
            <div className="list">
              {visible.map((note,i) => (
                <Card
                  key={note.id} note={note} i={i}
                  onOpen={()=>openNote(note)}
                  onDelete={()=>del(note.id)}
                  onPin={()=>pinIt(note.id)}
                  onCheck={idx=>check(note.id,idx)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {modal && <NoteModal mode={modal.mode} initial={modal.note} onSave={save} onClose={()=>setModal(null)}/>}

      {pinFlow && (
        <PinModal
          note={pinFlow}
          value={pin}
          error={pinErr}
          onChange={v => { setPin(v); setPinErr(false); if(v.length===4) setTimeout(()=>submitPin(v),120); }}
          onClose={()=>setPinFlow(null)}
        />
      )}
    </>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function Card({ note, i, onOpen, onDelete, onPin, onCheck }) {
  const a = note.palette?.accent || "#4A9EFF";
  const cl = note.checklist || [];
  const done = cl.filter(c=>c.done).length;

  return (
    <div className="card" style={{"--a":a, animationDelay:`${i*0.04}s`}}>
      <div className="card-stripe"/>

      {/* HEADER */}
      <div className="card-hdr" onClick={onOpen}>
        <div className="card-title-row">
          {note.locked  && <span className="badge-ico">🔒</span>}
          {note.pinned  && <span className="badge-ico">📌</span>}
          <span className="card-title">{note.title}</span>
          {note.folder  && <span className="f-pill">{note.folder}</span>}
        </div>

        {note.type === "checklist" ? (
          <div className="prog-row">
            <div className="prog-track"><div className="prog-fill" style={{width: cl.length ? `${(done/cl.length)*100}%` : "0%"}}/></div>
            <span className="prog-lbl">{done}/{cl.length} completati</span>
          </div>
        ) : (
          !note.locked && note.body && <p className="card-body">{note.body}</p>
        )}
      </div>

      {/* CHECKLIST ITEMS */}
      {note.type === "checklist" && !note.locked && (
        <div className="cl-list">
          {cl.slice(0,5).map((c,idx) => (
            <label key={idx} className="cl-row" onClick={e=>e.stopPropagation()}>
              <span className={`cl-box ${c.done?"cl-box-done":""}`} onClick={()=>onCheck(idx)}>
                {c.done && <svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <span className={`cl-text ${c.done?"cl-text-done":""}`}>{c.text}</span>
            </label>
          ))}
          {cl.length > 5 && <span className="cl-more">+{cl.length-5} altri elementi</span>}
        </div>
      )}

      {/* FOOTER */}
      <div className="card-ftr">
        <div className="chips">
          {(note.tags||[]).map(t=><span key={t} className="chip">{t}</span>)}
          {note.reminder && (
            <span className={`chip chip-t ${overdue(note.reminder)?"chip-bad":soon(note.reminder)?"chip-warn":""}`}>
              ⏰ {overdue(note.reminder)?"Scaduto":fmt(note.reminder)}
            </span>
          )}
        </div>
        <div className="card-acts" onClick={e=>e.stopPropagation()}>
          <button className="act" onClick={onPin} title={note.pinned?"Rimuovi pin":"Fissa"}>{note.pinned?"★":"☆"}</button>
          <button className="act act-del" onClick={onDelete} title="Elimina">✕</button>
        </div>
      </div>
    </div>
  );
}

// ─── NOTE MODAL ──────────────────────────────────────────────────────────────
function NoteModal({ mode, initial, onSave, onClose }) {
  const [title,     setTitle]    = useState(initial?.title||"");
  const [type,      setType]     = useState(initial?.type||"text");
  const [body,      setBody]     = useState(initial?.body||"");
  const [cl,        setCl]       = useState(initial?.checklist||[{text:"",done:false}]);
  const [pal,       setPal]      = useState(initial?.palette||PALETTE[0]);
  const [reminder,  setReminder] = useState(initial?.reminder?initial.reminder.slice(0,16):"");
  const [tags,      setTags]     = useState((initial?.tags||[]).join(", "));
  const [folder,    setFolder]   = useState(initial?.folder||"Personale");
  const [locked,    setLocked]   = useState(initial?.locked||false);

  const addItem = () => setCl(c=>[...c,{text:"",done:false}]);
  const setItem = (i,v) => setCl(c=>c.map((x,j)=>j===i?{...x,text:v}:x));
  const delItem = i => setCl(c=>c.filter((_,j)=>j!==i));
  const togItem = i => setCl(c=>c.map((x,j)=>j===i?{...x,done:!x.done}:x));

  const submit = () => onSave({
    ...(initial||{}),
    title: title.trim()||"Senza titolo", type, body,
    checklist: type==="checklist" ? cl.filter(c=>c.text.trim()) : [],
    palette:pal,
    reminder: reminder ? new Date(reminder).toISOString() : null,
    tags: tags.split(",").map(t=>t.trim()).filter(Boolean),
    folder, locked, pinned: initial?.pinned||false,
  });

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{"--ma":pal.accent}}>

        {/* MODAL HEADER */}
        <div className="m-hdr">
          <span className="m-lbl">{mode==="edit"?"Modifica nota":"Nuova nota"}</span>
          <button className="m-x" onClick={onClose}>✕</button>
        </div>

        {/* TYPE SWITCH */}
        <div className="type-sw">
          <button className={`tsw-btn ${type==="text"?"tsw-on":""}`} onClick={()=>setType("text")}>📝 Testo</button>
          <button className={`tsw-btn ${type==="checklist"?"tsw-on":""}`} onClick={()=>setType("checklist")}>✅ Checklist</button>
        </div>

        <input className="mi mi-h" placeholder="Titolo…" value={title} onChange={e=>setTitle(e.target.value)} autoFocus/>

        {type==="text" ? (
          <textarea className="mi mi-ta" placeholder="Scrivi la tua nota…" value={body} onChange={e=>setBody(e.target.value)}/>
        ) : (
          <div className="cl-edit">
            {cl.map((c,i)=>(
              <div key={i} className="cle-row">
                <span className={`cle-box ${c.done?"cle-box-done":""}`} onClick={()=>togItem(i)}>
                  {c.done && <svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                <input
                  className={`cle-in ${c.done?"cle-in-done":""}`}
                  placeholder={`Elemento ${i+1}…`}
                  value={c.text}
                  onChange={e=>setItem(i,e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); addItem(); } }}
                />
                <button className="cle-rm" onClick={()=>delItem(i)}>✕</button>
              </div>
            ))}
            <button className="cle-add" onClick={addItem}>＋ Aggiungi elemento</button>
          </div>
        )}

        {/* ROW: REMINDER + FOLDER */}
        <div className="m-grid2">
          <div>
            <label className="m-lb">⏰ Promemoria</label>
            <input type="datetime-local" className="mi" value={reminder} onChange={e=>setReminder(e.target.value)}/>
          </div>
          <div>
            <label className="m-lb">🗂 Cartella</label>
            <select className="mi m-sel" value={folder} onChange={e=>setFolder(e.target.value)}>
              {FOLDERS.filter(f=>f.id!=="all").map(f=>(
                <option key={f.id} value={f.id}>{f.icon} {f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TAG */}
        <label className="m-lb">🏷 Tag <small>(separati da virgola)</small></label>
        <input className="mi" placeholder="lavoro, casa, idee…" value={tags} onChange={e=>setTags(e.target.value)}/>

        {/* COLOR */}
        <label className="m-lb">Colore</label>
        <div className="pal-row">
          {PALETTE.map(p=>(
            <button key={p.id} className={`p-dot ${pal.id===p.id?"p-on":""}`} style={{"--dot":p.accent}} onClick={()=>setPal(p)}/>
          ))}
        </div>

        {/* PIN LOCK */}
        <div className="lock-row">
          <label className="lock-lbl">
            <span className={`lock-toggle ${locked?"lock-on":""}`} onClick={()=>setLocked(v=>!v)}>
              <span className="lock-thumb"/>
            </span>
            <span>🔒 Proteggi con PIN</span>
            {locked && <span className="lock-hint">PIN demo: 1234</span>}
          </label>
        </div>

        <div className="m-ftr">
          <button className="mb mb-cancel" onClick={onClose}>Annulla</button>
          <button className="mb mb-save" onClick={submit}>{mode==="edit"?"Salva modifiche":"Crea nota"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PIN MODAL ───────────────────────────────────────────────────────────────
function PinModal({ note, value, error, onChange, onClose }) {
  const press = k => {
    if (k === "⌫") { onChange(value.slice(0,-1)); return; }
    if (value.length < 4) onChange(value + k);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="pin-box">
        <div className="pin-lock-ico">🔒</div>
        <div className="pin-ttl">{note.title}</div>
        <div className="pin-sub">Inserisci il PIN per sbloccare</div>

        {/* DOTS */}
        <div className="pin-dots">
          {[0,1,2,3].map(i=>(
            <div key={i} className={`p-dot-ind ${value.length>i?"p-dot-filled":""} ${error?"p-dot-err":""}`}/>
          ))}
        </div>

        {error && <div className="pin-err">PIN errato — riprova <span style={{opacity:.5}}>(demo: 1234)</span></div>}

        {/* PAD */}
        <div className="pin-pad">
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
            <button
              key={i}
              className={`pk ${k===""?"pk-empty":""} ${k==="⌫"?"pk-del":""}`}
              style={{visibility:k===""?"hidden":"visible"}}
              onClick={()=>k!==""&&press(String(k))}
            >{k}</button>
          ))}
        </div>

        <button className="pin-cancel" onClick={onClose}>Annulla</button>
      </div>
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --bg: #0D1117;
  --s1: #161C26;
  --s2: #1E2736;
  --s3: #243045;
  --bd: #ffffff0d;
  --txt: #E6EAF4;
  --mut: #55607A;
  --acc: #4A9EFF;
  --shd: #00000055;
}

body { background:var(--bg); color:var(--txt); font-family:'Sora',sans-serif; }
::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#ffffff15;border-radius:4px}

/* ── LAYOUT ── */
.app { max-width:660px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; }

/* ── HEADER ── */
.hdr {
  position:sticky; top:0; z-index:50;
  background:var(--bg);
  border-bottom:1px solid var(--bd);
  backdrop-filter:blur(14px);
}
.hdr-top {
  display:flex; align-items:center; gap:10px;
  padding:14px 20px;
}
.logo { font-size:1.15rem; font-weight:700; letter-spacing:-.02em; white-space:nowrap; }
.logo em { font-style:normal; color:var(--acc); }

.search-wrap { flex:1; position:relative; }
.s-ico { position:absolute; left:10px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:var(--mut); pointer-events:none; }
.search { width:100%; background:var(--s1); border:1px solid var(--bd); color:var(--txt); border-radius:8px; padding:8px 12px 8px 31px; font-family:'Sora',sans-serif; font-size:.82rem; outline:none; transition:border .18s; }
.search:focus { border-color:#4A9EFF55; }
.search::placeholder { color:var(--mut); }

.new-btn { background:var(--acc); color:#fff; border:none; border-radius:9px; padding:9px 16px; font-family:'Sora',sans-serif; font-size:.83rem; font-weight:600; cursor:pointer; white-space:nowrap; transition:all .18s; }
.new-btn:hover { background:#6AB4FF; transform:translateY(-1px); box-shadow:0 4px 16px #4A9EFF40; }

/* ── FOLDERS ── */
.folders {
  display:flex; gap:0;
  padding:0 16px;
  overflow-x:auto;
  scrollbar-width:none;
}
.folders::-webkit-scrollbar { display:none; }
.ftab {
  display:flex; align-items:center; gap:5px;
  background:none; border:none; border-bottom:2px solid transparent;
  color:var(--mut); padding:10px 12px;
  font-family:'Sora',sans-serif; font-size:.78rem; font-weight:500;
  cursor:pointer; white-space:nowrap; transition:all .18s;
}
.ftab:hover { color:var(--txt); }
.ftab-on { color:var(--acc); border-bottom-color:var(--acc); font-weight:600; }
.ftab-icon { font-size:.85rem; }
.ftab-cnt { background:var(--s2); color:var(--mut); font-size:.65rem; padding:1px 6px; border-radius:20px; }
.ftab-on .ftab-cnt { background:#4A9EFF18; color:var(--acc); }

/* ── BODY ── */
.body { flex:1; padding:22px 20px 60px; }

.page-title {
  font-size:1.45rem; font-weight:700; letter-spacing:-.03em;
  margin-bottom:20px; display:flex; align-items:center; gap:8px;
}
.page-cnt {
  font-size:.8rem; font-weight:500; background:var(--s2);
  color:var(--mut); padding:2px 9px; border-radius:20px; margin-left:2px;
}

.list { display:flex; flex-direction:column; gap:10px; }

/* ── EMPTY ── */
.empty { text-align:center; padding:5rem 2rem; }
.e-ico { font-size:2.5rem; opacity:.1; margin-bottom:10px; }
.e-t { font-size:1rem; font-weight:600; color:var(--mut); margin-bottom:4px; }
.e-s { font-size:.82rem; color:var(--mut); opacity:.6; }

/* ── CARD ── */
.card {
  background:var(--s1);
  border:1px solid var(--bd);
  border-radius:14px;
  overflow:hidden;
  transition:transform .2s, box-shadow .2s;
  animation:popIn .3s both;
}
@keyframes popIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.card:hover { transform:translateY(-2px); box-shadow:0 10px 30px var(--shd), 0 0 0 1px color-mix(in srgb,var(--a) 25%,transparent); }

.card-stripe { height:2px; background:var(--a); }

.card-hdr { padding:14px 16px 0; cursor:pointer; }
.card-title-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:7px; }
.badge-ico { font-size:.82rem; }
.card-title { font-size:.95rem; font-weight:600; color:var(--txt); line-height:1.3; }
.f-pill { margin-left:auto; font-size:.63rem; font-weight:600; background:var(--s2); color:var(--mut); padding:2px 8px; border-radius:20px; border:1px solid var(--bd); white-space:nowrap; }

.card-body { font-size:.81rem; color:var(--mut); line-height:1.7; white-space:pre-wrap; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:12px; }

/* PROGRESS */
.prog-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.prog-track { flex:1; height:4px; background:var(--s2); border-radius:4px; overflow:hidden; }
.prog-fill { height:100%; background:var(--a); border-radius:4px; transition:width .4s cubic-bezier(.4,0,.2,1); }
.prog-lbl { font-size:.71rem; color:var(--mut); white-space:nowrap; }

/* CHECKLIST IN CARD */
.cl-list { padding:0 16px 10px; display:flex; flex-direction:column; gap:6px; }
.cl-row { display:flex; align-items:center; gap:9px; cursor:default; }
.cl-box {
  width:17px; height:17px; flex-shrink:0;
  border-radius:5px; border:1.5px solid var(--mut);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .15s;
}
.cl-box svg { width:10px; height:10px; color:#fff; }
.cl-box-done { background:var(--a); border-color:var(--a); }
.cl-text { font-size:.82rem; color:var(--mut); line-height:1.4; }
.cl-text-done { text-decoration:line-through; opacity:.4; }
.cl-more { font-size:.71rem; color:var(--mut); opacity:.6; padding-left:26px; }

/* CARD FOOTER */
.card-ftr { display:flex; align-items:center; justify-content:space-between; padding:10px 16px 12px; gap:8px; }
.chips { display:flex; flex-wrap:wrap; gap:5px; }
.chip { font-size:.66rem; font-weight:600; padding:2px 8px; border-radius:20px; background:color-mix(in srgb,var(--a) 12%,transparent); color:var(--a); }
.chip-t { background:#4A9EFF12; color:#7AB8FF; }
.chip-warn { background:#FFB83015; color:#FFB830; }
.chip-bad  { background:#FF6B6B15; color:#FF6B6B; }

.card-acts { display:flex; gap:4px; }
.act { width:28px; height:28px; background:var(--s2); border:none; border-radius:7px; color:var(--mut); font-size:.8rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.act:hover { color:var(--txt); background:var(--s3); }
.act-del:hover { background:#FF6B8A20; color:#FF6B8A; }

/* ── OVERLAY ── */
.overlay { position:fixed; inset:0; background:#000000aa; backdrop-filter:blur(10px); z-index:200; display:flex; align-items:center; justify-content:center; animation:fIn .2s; }
@keyframes fIn { from{opacity:0} to{opacity:1} }

/* ── NOTE MODAL ── */
.modal {
  background:var(--s1); border:1px solid var(--bd);
  border-top:2px solid var(--ma);
  border-radius:18px; padding:24px;
  width:480px; max-width:95vw; max-height:88vh; overflow-y:auto;
  animation:sUp .22s; box-shadow:0 32px 80px #00000070;
}
@keyframes sUp { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }

.m-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.m-lbl { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--mut); }
.m-x { background:none; border:none; color:var(--mut); cursor:pointer; font-size:.95rem; width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; }
.m-x:hover { background:var(--s2); color:var(--txt); }

/* TYPE SWITCH */
.type-sw { display:flex; gap:6px; margin-bottom:14px; }
.tsw-btn { flex:1; background:var(--s2); border:1px solid var(--bd); color:var(--mut); border-radius:9px; padding:9px; font-family:'Sora',sans-serif; font-size:.82rem; font-weight:500; cursor:pointer; transition:all .15s; }
.tsw-on { background:color-mix(in srgb,var(--ma) 14%,transparent); border-color:color-mix(in srgb,var(--ma) 45%,transparent); color:var(--ma); font-weight:600; }

.mi { width:100%; background:var(--bg); border:1px solid var(--bd); border-radius:9px; padding:10px 13px; color:var(--txt); font-family:'Sora',sans-serif; font-size:.87rem; outline:none; transition:border .18s; margin-bottom:12px; display:block; }
.mi:focus { border-color:color-mix(in srgb,var(--ma) 70%,transparent); }
.mi::placeholder { color:#3A4460; }
.mi-h { font-size:1rem; font-weight:600; }
.mi-ta { resize:vertical; min-height:105px; line-height:1.65; }
input[type=datetime-local].mi { color-scheme:dark; }
.m-sel { appearance:none; cursor:pointer; }

.m-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

.m-lb { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--mut); display:block; margin-bottom:5px; }
.m-lb small { text-transform:none; font-weight:400; opacity:.5; letter-spacing:0; }

/* CHECKLIST EDIT */
.cl-edit { background:var(--bg); border:1px solid var(--bd); border-radius:10px; padding:12px; margin-bottom:12px; }
.cle-row { display:flex; align-items:center; gap:8px; margin-bottom:7px; }
.cle-box { width:18px; height:18px; flex-shrink:0; border-radius:5px; border:1.5px solid var(--mut); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.cle-box svg { width:10px; height:10px; color:#fff; }
.cle-box-done { background:var(--ma); border-color:var(--ma); }
.cle-in { flex:1; background:transparent; border:none; border-bottom:1px solid var(--bd); color:var(--txt); font-family:'Sora',sans-serif; font-size:.85rem; padding:3px 2px; outline:none; transition:border-color .15s; }
.cle-in:focus { border-bottom-color:var(--ma); }
.cle-in::placeholder { color:#3A4460; }
.cle-in-done { text-decoration:line-through; opacity:.45; }
.cle-rm { background:none; border:none; color:var(--mut); cursor:pointer; font-size:.78rem; padding:2px 4px; }
.cle-rm:hover { color:#FF6B8A; }
.cle-add { width:100%; background:none; border:1px dashed var(--s3); color:var(--mut); border-radius:7px; padding:7px; font-family:'Sora',sans-serif; font-size:.8rem; cursor:pointer; transition:all .15s; margin-top:2px; }
.cle-add:hover { border-color:var(--mut); color:var(--txt); }

/* PALETTE */
.pal-row { display:flex; gap:8px; margin-bottom:14px; }
.p-dot { width:22px; height:22px; border-radius:50%; background:var(--dot); border:2px solid transparent; cursor:pointer; transition:all .15s; box-shadow:0 0 0 2px transparent; }
.p-on  { box-shadow:0 0 0 3px var(--dot); transform:scale(1.2); }

/* LOCK TOGGLE */
.lock-row { margin-bottom:16px; }
.lock-lbl { display:flex; align-items:center; gap:10px; cursor:pointer; font-size:.85rem; color:var(--mut); user-select:none; }
.lock-toggle { width:36px; height:20px; background:var(--s2); border-radius:20px; position:relative; cursor:pointer; transition:background .2s; flex-shrink:0; }
.lock-on { background:var(--acc); }
.lock-thumb { position:absolute; top:3px; left:3px; width:14px; height:14px; background:#fff; border-radius:50%; transition:transform .2s; }
.lock-on .lock-thumb { transform:translateX(16px); }
.lock-hint { font-size:.72rem; opacity:.5; margin-left:auto; }

.m-ftr { display:flex; justify-content:flex-end; gap:8px; }
.mb { padding:9px 22px; border-radius:8px; font-family:'Sora',sans-serif; font-size:.84rem; font-weight:600; cursor:pointer; border:none; transition:all .18s; }
.mb-cancel { background:var(--s2); color:var(--mut); }
.mb-cancel:hover { color:var(--txt); }
.mb-save { background:var(--ma); color:#fff; }
.mb-save:hover { filter:brightness(1.12); transform:translateY(-1px); }

/* ── PIN MODAL ── */
.pin-box {
  background:var(--s1); border:1px solid var(--bd);
  border-radius:22px; padding:36px 28px 28px;
  width:320px; max-width:92vw;
  text-align:center;
  animation:sUp .22s;
  box-shadow:0 32px 80px #00000070;
}
.pin-lock-ico { font-size:2.4rem; margin-bottom:10px; }
.pin-ttl { font-size:1rem; font-weight:700; color:var(--txt); margin-bottom:4px; }
.pin-sub { font-size:.78rem; color:var(--mut); margin-bottom:22px; }

.pin-dots { display:flex; justify-content:center; gap:14px; margin-bottom:10px; }
.p-dot-ind { width:14px; height:14px; border-radius:50%; border:2px solid var(--s3); transition:all .18s; }
.p-dot-filled { background:var(--acc); border-color:var(--acc); transform:scale(1.1); }
.p-dot-err { border-color:#FF6B6B; background:#FF6B6B; }

.pin-err { font-size:.75rem; color:#FF6B6B; margin-bottom:14px; }

.pin-pad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px; }
.pk {
  height:52px; background:var(--s2); border:1px solid var(--bd);
  color:var(--txt); border-radius:12px;
  font-family:'Sora',sans-serif; font-size:1.15rem; font-weight:600;
  cursor:pointer; transition:all .12s; display:flex; align-items:center; justify-content:center;
}
.pk:hover { background:var(--s3); transform:scale(1.04); }
.pk:active { transform:scale(.96); }
.pk-del { font-size:.9rem; color:var(--mut); }
.pk-empty { pointer-events:none; }

.pin-cancel { background:none; border:none; color:var(--mut); font-family:'Sora',sans-serif; font-size:.82rem; cursor:pointer; text-decoration:underline; }
.pin-cancel:hover { color:var(--txt); }
`;
