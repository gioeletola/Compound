import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtShort = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${n.toFixed(0)}`;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050d18; }

  input[type=range] {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 3px; border-radius: 3px;
    outline: none; cursor: pointer; touch-action: pan-y; display: block;
    transition: height 0.2s;
  }
  input[type=range]:hover { height: 5px; }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; cursor: pointer;
    box-shadow: 0 0 0 3px #3b9ede, 0 2px 8px rgba(0,0,0,0.4);
    border: none; transition: transform 0.15s, box-shadow 0.15s;
  }
  input[type=range]::-webkit-slider-thumb:hover {
    transform: scale(1.25);
    box-shadow: 0 0 0 4px #4fc3f7, 0 2px 12px rgba(79,195,247,0.4);
  }
  input[type=range]::-moz-range-thumb {
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; cursor: pointer; border: none;
    box-shadow: 0 0 0 3px #3b9ede;
  }

  .num-input {
    background: transparent; border: none;
    border-bottom: 1.5px solid #1e3a5f;
    color: #e8f4ff; font-family: 'DM Mono', monospace;
    font-size: 1rem; font-weight: 500;
    padding: 2px 0 4px; width: 90px; text-align: right;
    outline: none; transition: border-color 0.2s;
    -moz-appearance: textfield;
  }
  .num-input:focus { border-bottom-color: #4fc3f7; }
  .num-input::-webkit-inner-spin-button,
  .num-input::-webkit-outer-spin-button { -webkit-appearance: none; }

  .freq-btn {
    padding: 0.55rem 0; border-radius: 10px; border: 1.5px solid #1a2f47;
    background: transparent; color: #3a6080;
    font-size: 0.72rem; font-family: 'Syne', sans-serif; font-weight: 600;
    cursor: pointer; transition: all 0.2s; letter-spacing: 0.03em;
  }
  .freq-btn:hover { border-color: #2a5a80; color: #6aaac8; background: #0a1f30; }
  .freq-btn.active {
    border-color: #4fc3f7; background: #0d2a3f; color: #4fc3f7;
    box-shadow: 0 0 12px rgba(79,195,247,0.15);
  }

  .kpi-card {
    background: #0a1929; border: 1px solid #1a2f47; border-radius: 14px;
    padding: 1rem 1.1rem;
    transition: border-color 0.2s, transform 0.2s;
    display: flex; flex-direction: column; gap: 0.4rem;
  }
  .kpi-card:hover { border-color: #2a4a6a; transform: translateY(-2px); }
`;

function NumericInput({ value, min, max, step, onChange, suffix, prefix }) {
  const [raw, setRaw] = useState(null);
  const handleFocus = () => setRaw(String(value));
  const handleChange = (e) => setRaw(e.target.value);
  const handleBlur = () => {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    setRaw(null);
  };
  const handleKey = (e) => {
    if (e.key === "Enter") e.target.blur();
    if (e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(max, value + step)); }
    if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(min, value - step)); }
  };
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
      {prefix && <span style={{ fontSize: "0.75rem", color: "#4a7a9a", fontFamily: "'DM Mono', monospace" }}>{prefix}</span>}
      <input className="num-input" type="number" value={raw !== null ? raw : value}
        min={min} max={max} step={step}
        onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKey} />
      {suffix && <span style={{ fontSize: "0.75rem", color: "#4a7a9a", fontFamily: "'DM Mono', monospace" }}>{suffix}</span>}
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, suffix, prefix }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: "1.8rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
        <span style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#4a6a80", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>{label}</span>
        <NumericInput value={value} min={min} max={max} step={step} onChange={onChange} suffix={suffix} prefix={prefix} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(to right, #3b9ede 0%, #4fc3f7 ${pct}%, #0f2035 ${pct}%, #0f2035 100%)` }}
      />
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#07121e", border: "1px solid #1e3a5f", borderRadius: "10px", padding: "10px 14px", fontSize: "0.78rem", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
      <div style={{ color: "#4a7a9a", marginBottom: "6px", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem" }}>Anno {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ marginBottom: "2px", display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "#4a7a9a" }}>{p.name}</span>
          <strong style={{ fontFamily: "'DM Mono', monospace", color: p.color }}>{fmtShort(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [capitale, setCapitale] = useState(10000);
  const [tasso, setTasso] = useState(7);
  const [anni, setAnni] = useState(20);
  const [versamento, setVersamento] = useState(200);
  const [freq, setFreq] = useState(12);

  const freqLabels = { 1: "Annuale", 4: "Trimestrale", 12: "Mensile", 365: "Giornaliero" };

  const { dati, totale, totaleInvestito, guadagno } = useMemo(() => {
    const n = freq, r = tasso / 100;
    const dati = [];
    for (let anno = 0; anno <= anni; anno++) {
      const cap = capitale * Math.pow(1 + r / n, n * anno);
      const vers = r > 0 ? versamento * ((Math.pow(1 + r / n, n * anno) - 1) / (r / n)) : versamento * n * anno;
      const tot = cap + vers;
      const inv = capitale + versamento * n * anno;
      dati.push({ anno, totale: Math.round(tot), investito: Math.round(inv), interessi: Math.round(tot - inv) });
    }
    const u = dati[dati.length - 1];
    return { dati, totale: u.totale, totaleInvestito: u.investito, guadagno: u.interessi };
  }, [capitale, tasso, anni, versamento, freq]);

  const card = { background: "#0a1929", border: "1px solid #1a2f47", borderRadius: "16px", padding: "1.6rem" };
  const sLabel = { fontSize: "0.6rem", letterSpacing: "0.15em", color: "#2a4a60", textTransform: "uppercase", fontFamily: "'Syne', sans-serif", fontWeight: 600 };

  const capPct = totale > 0 ? (totaleInvestito / totale) * 100 : 0;
  const rendPct = totale > 0 ? (guadagno / totale) * 100 : 0;

  const kpis = [
    { label: "Valore Finale", val: fmt(totale), color: "#4fc3f7", sub: "al termine" },
    { label: "Totale Investito", val: fmt(totaleInvestito), color: "#7ab8d4", sub: "versato" },
    { label: "Rendimento", val: fmt(guadagno), color: "#81c784", sub: "generato" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#050d18", fontFamily: "'Syne', sans-serif", color: "#c8dde8", padding: "2.5rem 1.5rem" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: "740px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.2rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.4em", color: "#2a5a74", textTransform: "uppercase", marginBottom: "0.6rem" }}>Strumento Finanziario</div>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3rem)", fontWeight: 800, color: "#e8f4ff", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Compound<span style={{ color: "#4fc3f7" }}>.</span>
          </h1>
          <p style={{ marginTop: "0.4rem", color: "#2a4a60", fontSize: "0.82rem", fontWeight: 400 }}>Simula la crescita del tuo capitale nel tempo</p>
        </div>

        {/* Parametri */}
        <div style={card}>
          <div style={{ ...sLabel, marginBottom: "1.6rem" }}>Parametri di Simulazione</div>
          <SliderField label="Capitale Iniziale" value={capitale} min={1000} max={100000} step={100} onChange={setCapitale} prefix="€" />
          <SliderField label="Tasso Annuo" value={tasso} min={0.1} max={20} step={0.1} onChange={setTasso} suffix="%" />
          <SliderField label="Orizzonte Temporale" value={anni} min={1} max={50} step={1} onChange={setAnni} suffix="anni" />
          <SliderField label="Versamento Periodico" value={versamento} min={0} max={5000} step={50} onChange={setVersamento} prefix="€" />
          <div style={{ marginTop: "0.2rem" }}>
            <div style={{ ...sLabel, marginBottom: "0.7rem" }}>Frequenza</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
              {Object.entries(freqLabels).map(([k, v]) => (
                <button key={k} className={`freq-btn${freq === Number(k) ? " active" : ""}`} onClick={() => setFreq(Number(k))}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.8rem" }}>
          {kpis.map(({ label: l, val, color, sub }) => (
            <div key={l} className="kpi-card">
              <div style={{ ...sLabel, fontSize: "0.55rem" }}>{l}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(0.82rem, 1.8vw, 1rem)", color, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{val}</div>
              <div style={{ fontSize: "0.6rem", color: "#1e3a50", fontWeight: 400 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Composizione */}
        <div style={{ ...card, padding: "1.4rem 1.6rem" }}>
          <div style={{ ...sLabel, marginBottom: "1.1rem" }}>Composizione del Rendimento</div>
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "stretch", height: "52px" }}>
            <div style={{
              flex: capPct, background: "linear-gradient(135deg, #0d3358, #1a5080)",
              borderRadius: "8px", display: "flex", flexDirection: "column",
              justifyContent: "center", padding: "0 10px",
              transition: "flex 0.6s cubic-bezier(.4,0,.2,1)", overflow: "hidden", minWidth: "60px"
            }}>
              <div style={{ fontSize: "0.55rem", color: "#4a8aaa", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Capitale</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: "#4fc3f7", fontWeight: 500 }}>{capPct.toFixed(1)}%</div>
            </div>
            <div style={{
              flex: rendPct, background: "linear-gradient(135deg, #0d3322, #1a5038)",
              borderRadius: "8px", display: "flex", flexDirection: "column",
              justifyContent: "center", padding: "0 10px",
              transition: "flex 0.6s cubic-bezier(.4,0,.2,1)", overflow: "hidden", minWidth: "60px"
            }}>
              <div style={{ fontSize: "0.55rem", color: "#4a8a6a", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Rendimento</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: "#81c784", fontWeight: 500 }}>{rendPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Grafico area */}
        <div style={card}>
          <div style={{ ...sLabel, marginBottom: "1.2rem" }}>Crescita nel Tempo</div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dati} margin={{ top: 5, right: 5, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#0a1929" />
              <XAxis dataKey="anno" stroke="transparent" tick={{ fill: "#2a4a60", fontSize: 10, fontFamily: "'DM Mono', monospace" }} label={{ value: "anni", position: "insideBottom", offset: -4, fill: "#2a4a60", fontSize: 10 }} />
              <YAxis stroke="transparent" tick={{ fill: "#2a4a60", fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={fmtShort} width={58} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="investito" name="Investito" stroke="#1e5a8a" strokeWidth={1.5} fill="url(#gI)" />
              <Area type="monotone" dataKey="totale" name="Totale" stroke="#4fc3f7" strokeWidth={2} fill="url(#gT)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grafico barre */}
        <div style={card}>
          <div style={{ ...sLabel, marginBottom: "1.2rem" }}>Capitale vs Rendimento</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dati.filter((_, i) => i % Math.max(1, Math.ceil(anni / 10)) === 0 || i === anni)}
              margin={{ top: 5, right: 5, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="2 4" stroke="#0a1929" />
              <XAxis dataKey="anno" stroke="transparent" tick={{ fill: "#2a4a60", fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
              <YAxis stroke="transparent" tick={{ fill: "#2a4a60", fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={fmtShort} width={58} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "0.68rem", fontFamily: "'Syne', sans-serif", paddingTop: "6px" }}
                formatter={(value) => (
                  <span style={{ color: value === "Investito" ? "#4a7a9a" : "#4fc3f7" }}>{value}</span>
                )}
              />
              <Bar dataKey="investito" name="Investito" stackId="a" fill="#1a3a5a" radius={[0,0,4,4]} />
              <Bar dataKey="interessi" name="Interessi" stackId="a" fill="#4fc3f7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
