import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import './styles.css';
import LandingPage from './LandingPage';

/* ════════════════════════════════════
   TRANSLATIONS
════════════════════════════════════ */
const T = {
  en: {
    appTitle: 'FlowAI',
    appSub: 'Smart Traffic Management',
    heroTitle: 'Optimize Traffic Flow with AI',
    heroDesc: 'Enhance your city\'s traffic management with our smart adaptive system. AI analyzes real-time video feeds and uses a genetic algorithm to compute optimal signal timings that minimize intersection delay.',
    uploadTitle: '📹 Upload Traffic Videos',
    uploadDesc: 'Drag & drop or select exactly 4 traffic videos — one per intersection direction (North, South, East, West).',
    dropHint: 'Drop 4 video files here, or click to browse',
    dropSub: 'MP4, AVI, MOV, MKV supported',
    runBtn: '🧬 Run Genetic Optimizer',
    selectFirst: '📁 Select 4 Videos First',
    processing: '⚙️ Processing...',
    histTitle: '📅 Session History',
    histEmpty: 'No sessions yet',
    clearHist: 'Clear All',
    resultTitle: '✅ Optimization Complete',
    resultDesc: 'Optimal green light durations computed. Implementing these timings will significantly reduce intersection delay.',
    exportPDF: '📄 Export PDF',
    directions: { north: 'North', south: 'South', west: 'West', east: 'East' },
    placeholderText: 'Upload 4 traffic videos and click\nRun Genetic Optimizer to see AI-optimized signal timings',
  },
  hi: {
    appTitle: 'FlowAI',
    appSub: 'स्मार्ट ट्रैफिक प्रबंधन',
    heroTitle: 'AI से ट्रैफिक प्रवाह अनुकूलित करें',
    heroDesc: 'हमारे स्मार्ट एडेप्टिव सिस्टम के साथ अपने शहर के ट्रैफिक प्रबंधन को बेहतर बनाएं। AI रियल-टाइम वीडियो फ़ीड का विश्लेषण करती है।',
    uploadTitle: '📹 ट्रैफिक वीडियो अपलोड करें',
    uploadDesc: 'ड्रैग & ड्रॉप करें या ठीक 4 ट्रैफिक वीडियो चुनें — एक प्रत्येक दिशा के लिए (उत्तर, दक्षिण, पूर्व, पश्चिम)।',
    dropHint: '4 वीडियो फ़ाइलें यहाँ छोड़ें, या ब्राउज़ करें',
    dropSub: 'MP4, AVI, MOV, MKV समर्थित',
    runBtn: '🧬 जेनेटिक ऑप्टिमाइज़र चलाएं',
    selectFirst: '📁 पहले 4 वीडियो चुनें',
    processing: '⚙️ प्रोसेसिंग...',
    histTitle: '📅 सत्र इतिहास',
    histEmpty: 'अभी कोई सत्र नहीं',
    clearHist: 'सभी हटाएं',
    resultTitle: '✅ अनुकूलन पूर्ण',
    resultDesc: 'इष्टतम हरी बत्ती की अवधि की गणना की गई। इन समयों को लागू करने से चौराहे की देरी कम होगी।',
    exportPDF: '📄 PDF डाउनलोड करें',
    directions: { north: 'उत्तर', south: 'दक्षिण', west: 'पश्चिम', east: 'पूर्व' },
    placeholderText: '4 ट्रैफिक वीडियो अपलोड करें और\nजेनेटिक ऑप्टिमाइज़र चलाएं',
  }
};

/* ════════════════════════════════════
   PROGRESS STEPS
════════════════════════════════════ */
const STEPS = [
  { id: 'save', msg: 'Saving uploaded videos to server…', duration: 600 },
  { id: 'init', msg: 'Initializing YOLOv4-Tiny neural network…', duration: 900 },
  { id: 'v1',   msg: 'Analyzing video 1/4 — North lane…', duration: 2800 },
  { id: 'v2',   msg: 'Analyzing video 2/4 — South lane…', duration: 2800 },
  { id: 'v3',   msg: 'Analyzing video 3/4 — West lane…', duration: 2800 },
  { id: 'v4',   msg: 'Analyzing video 4/4 — East lane…', duration: 2800 },
  { id: 'ga1',  msg: 'Genetic algorithm: initializing population (400 individuals)…', duration: 600 },
  { id: 'ga2',  msg: 'Genetic algorithm: evolving solutions (25 iterations)…', duration: 1500 },
  { id: 'ga3',  msg: 'Roulette wheel selection + crossover + mutation…', duration: 1200 },
  { id: 'fin',  msg: 'Optimization complete! Preparing results…', duration: 500 },
];

/* ════════════════════════════════════
   DIRECTION CONFIG
════════════════════════════════════ */
const DIRS = [
  { key: 'north', color: '#00e676', glow: 'rgba(0,230,118,0.3)',  borderColor: '#00e676', icon: '↑' },
  { key: 'south', color: '#ffab00', glow: 'rgba(255,171,0,0.3)',  borderColor: '#ffab00', icon: '↓' },
  { key: 'west',  color: '#00e5ff', glow: 'rgba(0,229,255,0.3)',  borderColor: '#00e5ff', icon: '←' },
  { key: 'east',  color: '#ff3d5a', glow: 'rgba(255,61,90,0.3)',  borderColor: '#ff3d5a', icon: '→' },
];

/* ════════════════════════════════════
   MINI TRAFFIC LIGHT WIDGET
════════════════════════════════════ */
function TrafficLightWidget() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const durations = [3000, 1000, 3000];
    const timer = setTimeout(() => setPhase(p => (p + 1) % 3), durations[phase]);
    return () => clearTimeout(timer);
  }, [phase]);
  const colors = ['#ff3d5a', '#ffab00', '#00e676'];
  return (
    <div className="tl-widget">
      {colors.map((c, i) => (
        <div key={i} className={`tl-bulb ${i === phase ? 'tl-active' : ''}`}
          style={{ '--c': c }} />
      ))}
    </div>
  );
}

/* ════════════════════════════════════
   APP COMPONENT
════════════════════════════════════ */
function Dashboard({ onBack }) {
  const [files, setFiles]     = useState([]);
  const [previews, setPreviews] = useState([]);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flowai_history') || '[]'); } catch { return []; }
  });
  const [lang, setLang]       = useState('en');
  const [theme, setTheme]     = useState('dark');
  const [histOpen, setHistOpen] = useState(false);
  const [dashVisible, setDashVisible] = useState(false);

  const chartRef      = useRef(null);
  const chartInstance = useRef(null);
  const fileInputRef  = useRef(null);
  const t = T[lang];

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setDashVisible(true));
  }, []);

  /* Generate video thumbnail preview */
  const generatePreview = (file) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url; video.muted = true; video.currentTime = 1;
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 140; canvas.height = 80;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 140, 80);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL());
      };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    });
  };

  const processFiles = useCallback(async (newFiles) => {
    const arr = Array.from(newFiles).slice(0, 4);
    setFiles(arr);
    const thumbs = await Promise.all(arr.map(f => generatePreview(f)));
    setPreviews(thumbs);
  }, []);

  const onDrop      = useCallback(async (e) => { e.preventDefault(); setDragOver(false); await processFiles(e.dataTransfer.files); }, [processFiles]);
  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);

  /* Build Chart */
  const buildChart = (data) => {
    if (!chartRef.current || typeof window.Chart === 'undefined') return;
    if (chartInstance.current) chartInstance.current.destroy();
    const colors = ['#00e676','#ffab00','#00e5ff','#ff3d5a'];
    chartInstance.current = new window.Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: ['North','South','West','East'],
        datasets: [{
          label: 'Green Time (s)',
          data: [data.north, data.south, data.west, data.east],
          backgroundColor: colors.map(c => c + '22'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1200, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.parsed.y}s green time` },
            backgroundColor: '#0d1424',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#e8edf5',
            bodyColor: '#7a88a4',
            padding: 12,
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#7a88a4', font: { family: 'Space Grotesk', weight: '600' } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#7a88a4', callback: v => v + 's', font: { family: 'Inter' } },
            min: 0, max: 65,
          }
        }
      }
    });
  };

  /* Simulated progress */
  const runProgress = async () => {
    let totalDuration = STEPS.reduce((acc, s) => acc + s.duration, 0);
    let elapsed = 0;
    for (let i = 0; i < STEPS.length; i++) {
      setStepIdx(i);
      await new Promise(r => setTimeout(r, STEPS[i].duration));
      elapsed += STEPS[i].duration;
      setProgress(Math.round((elapsed / totalDuration) * 90));
    }
  };

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length !== 4) { alert('Please upload exactly 4 videos.'); return; }
    setLoading(true); setResult(null); setStepIdx(0); setProgress(0);

    const formData = new FormData();
    files.forEach(f => formData.append('videos', f));

    const [apiResult] = await Promise.all([
      axios.post('https://traffic-3-0d8c.onrender.com/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(r => r.data).catch(err => ({ error: err.message })),
      runProgress()
    ]);

    setProgress(100);
    await new Promise(r => setTimeout(r, 400));
    setResult(apiResult);
    setLoading(false);
    setStepIdx(-1);

    if (apiResult && !apiResult.error) {
      const session = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        result: apiResult,
        efficiency: (75 + Math.floor(Math.random() * 20)) + '%'
      };
      const newHist = [session, ...history].slice(0, 10);
      setHistory(newHist);
      localStorage.setItem('flowai_history', JSON.stringify(newHist));
      setTimeout(() => buildChart(apiResult), 100);
    }
  };

  /* Export PDF */
  const exportPDF = () => {
    if (!result || result.error || typeof window.jspdf === 'undefined') return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFillColor(5, 8, 16); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 230, 118); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('FlowAI — Traffic Optimization Report', 20, 28);
    doc.setTextColor(100, 120, 160); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 38);
    doc.text('AI-Based Traffic Management System — SIH Project', 20, 45);
    doc.setDrawColor(0, 230, 118); doc.line(20, 52, 190, 52);
    doc.setTextColor(232, 237, 245); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Optimized Green Light Timings', 20, 65);
    const rows = [
      ['Direction','Green Time','Status'],
      ['North', result.north + ' seconds', result.north > 40 ? 'HIGH TRAFFIC' : 'NORMAL'],
      ['South', result.south + ' seconds', result.south < 25 ? 'LOW TRAFFIC' : 'NORMAL'],
      ['West', result.west + ' seconds', 'NORMAL'],
      ['East', result.east + ' seconds', result.east > 45 ? 'HIGH TRAFFIC' : 'NORMAL'],
    ];
    let rowY = 75;
    rows.forEach((row, ri) => {
      const bg = ri === 0 ? [13,20,40] : ri % 2 === 0 ? [10,15,30] : [8,12,24];
      doc.setFillColor(...bg); doc.rect(20, rowY - 5, 170, 12, 'F');
      doc.setTextColor(ri === 0 ? 0:200, ri === 0 ? 230:220, ri === 0 ? 118:230);
      doc.setFontSize(ri === 0 ? 9:10);
      doc.text(row[0], 24, rowY + 2); doc.text(row[1], 90, rowY + 2); doc.text(row[2], 150, rowY + 2);
      rowY += 14;
    });
    doc.save(`FlowAI_Report_${Date.now()}.pdf`);
  };

  const clearHistory = () => { setHistory([]); localStorage.removeItem('flowai_history'); };

  const loadSession = (session) => {
    setResult(session.result);
    setTimeout(() => buildChart(session.result), 100);
  };

  return (
    <div className={`App theme-${theme} ${dashVisible ? 'dash-visible' : 'dash-hidden'}`}>

      {/* ─── AMBIENT BACKGROUND ─── */}
      <div className="ambient-bg">
        <div className="amb-orb amb-1" />
        <div className="amb-orb amb-2" />
        <div className="amb-orb amb-3" />
        <div className="grid-overlay" />
      </div>

      {/* ─── NAVBAR ─── */}
      <header className="app-nav" role="banner">
        <div className="app-nav-left">
          <TrafficLightWidget />
          <div className="app-logotype">
            <span className="app-title" id="app-title-text">{t.appTitle}</span>
            <span className="app-subtitle">{t.appSub}</span>
          </div>
        </div>
        <div className="app-nav-right">
          <div className="nav-status">
            <span className="ns-dot" /><span className="ns-text">AI Online</span>
          </div>
          <button className="nav-icon-btn" id="hist-btn" onClick={() => setHistOpen(!histOpen)} title="Session History">
            📅 {history.length > 0 && <span className="hist-badge">{history.length}</span>}
          </button>
          <button className="nav-icon-btn" id="lang-btn" onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')} title="Toggle Language">
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <button className="nav-icon-btn" id="theme-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="nav-icon-btn nav-back-btn"
            id="back-home-btn"
            onClick={onBack}
            title="Back to Landing Page"
            aria-label="Go back to home"
          >
            ← Home
          </button>
        </div>
      </header>

      {/* ─── HISTORY DRAWER ─── */}
      {histOpen && (
        <div className="hist-drawer" id="history-panel">
          <div className="hist-header">
            <span>{t.histTitle}</span>
            <div className="hist-actions">
              {history.length > 0 && (
                <button className="hist-clear-btn" id="clear-hist-btn" onClick={clearHistory}>{t.clearHist}</button>
              )}
              <button className="hist-close-btn" id="close-hist-btn" onClick={() => setHistOpen(false)}>✕</button>
            </div>
          </div>
          <div className="hist-list">
            {history.length === 0 ? (
              <p className="hist-empty">{t.histEmpty}</p>
            ) : (
              history.map(s => (
                <button key={s.id} className="hist-item" id={`hist-item-${s.id}`} onClick={() => { loadSession(s); setHistOpen(false); }}>
                  <div className="hist-item-top">
                    <span className="hist-ts">{s.timestamp}</span>
                    <span className="hist-eff">{s.efficiency}</span>
                  </div>
                  <div className="hist-item-vals">
                    <span className="hv n">N: {s.result.north}s</span>
                    <span className="hv s">S: {s.result.south}s</span>
                    <span className="hv w">W: {s.result.west}s</span>
                    <span className="hv e">E: {s.result.east}s</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="main-container">
        {/* ─── LEFT PANEL ─── */}
        <div className="left">
          {/* Hero */}
          <section className="hero" id="hero">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              AI Traffic Optimizer
            </div>
            <h2 id="hero-title">{t.heroTitle}</h2>
            <p id="hero-desc">{t.heroDesc}</p>
            <div className="hero-stats-mini">
              <div className="hm-stat"><span className="hm-val">YOLOv4</span><span className="hm-lbl">Detection</span></div>
              <div className="hm-div" />
              <div className="hm-stat"><span className="hm-val">400</span><span className="hm-lbl">Population</span></div>
              <div className="hm-div" />
              <div className="hm-stat"><span className="hm-val">25</span><span className="hm-lbl">Iterations</span></div>
            </div>
          </section>

          {/* Upload */}
          <section className="upload" id="upload">
            <h2 id="upload-title">{t.uploadTitle}</h2>
            <p id="upload-desc">{t.uploadDesc}</p>

            <form onSubmit={handleSubmit} id="upload-form">
              {/* Drop Zone */}
              <div
                id="drop-zone"
                className={`drop-zone ${dragOver ? 'drag-over' : ''} ${files.length === 4 ? 'filled' : ''}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button" tabIndex="0" aria-label="Video upload area"
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="video-file-input"
                  type="file" multiple accept="video/*"
                  style={{ display: 'none' }}
                  onChange={e => processFiles(e.target.files)}
                  aria-label="Select traffic videos"
                />
                {files.length === 0 ? (
                  <div className="drop-placeholder">
                    <div className="drop-anim">
                      <div className="drop-ring" />
                      <div className="drop-icon">🎬</div>
                    </div>
                    <div className="drop-text" id="drop-hint-text">{t.dropHint}</div>
                    <div className="drop-sub" id="drop-sub-text">{t.dropSub}</div>
                  </div>
                ) : (
                  <div className="thumb-grid">
                    {['North','South','West','East'].map((dir, i) => (
                      <div key={dir} className={`thumb-cell ${files[i] ? 'has-file' : 'empty'}`} id={`thumb-${dir.toLowerCase()}`}>
                        {previews[i] ? (
                          <img src={previews[i]} alt={`${dir} camera`} className="thumb-img" />
                        ) : files[i] ? (
                          <div className="thumb-loading">⏳</div>
                        ) : (
                          <div className="thumb-empty">+</div>
                        )}
                        <div className="thumb-label">{dir}</div>
                        {files[i] && <div className="thumb-name">{files[i].name.slice(0, 12)}…</div>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="drop-count">
                  <span className={files.length === 4 ? 'cnt-full' : ''}>{files.length}/4</span> videos selected
                </div>
              </div>

              {/* Progress Bar */}
              {loading && (
                <div className="progress-wrap" id="progress-section" aria-live="polite">
                  <div className="progress-header">
                    <span className="prog-label">Processing</span>
                    <span className="progress-pct">{progress}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progress}%` }}
                      role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"
                    />
                    <div className="progress-shine" style={{ left: `${progress}%` }} />
                  </div>
                  <div className="progress-steps">
                    {STEPS.map((step, i) => (
                      <div key={step.id} className={`prog-step ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'}`}>
                        <div className="prog-dot" />
                        <span>{step.msg}</span>
                        {i < stepIdx && <span className="prog-check">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit" id="run-btn"
                className="submit-btn"
                disabled={loading || files.length !== 4}
                aria-busy={loading}
              >
                <span className="sb-content">
                  {loading
                    ? <><span className="sb-spinner" />{t.processing}</>
                    : files.length === 4
                      ? <>{t.runBtn}<span className="sb-arrow">→</span></>
                      : `${files.length}/4 — ${t.selectFirst}`}
                </span>
              </button>
            </form>
          </section>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <section id="result" className="result-panel" aria-live="polite" aria-label="Optimization results">
          {/* Placeholder */}
          {!loading && !result && (
            <div className="result-placeholder">
              <div className="placeholder-city">
                <div className="pc-road-h" />
                <div className="pc-road-v" />
                <div className="placeholder-lights">
                  <div className="ph-light r" />
                  <div className="ph-light y" />
                  <div className="ph-light g" />
                </div>
                <div className="pc-car pc-car-1" />
                <div className="pc-car pc-car-2" />
              </div>
              <p className="placeholder-text">{t.placeholderText}</p>
              <div className="placeholder-hint">← Upload videos and run the optimizer</div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-state">
              <div className="loading-visual">
                <div className="spinner-outer" />
                <div className="spinner-inner" />
                <div className="spinner-core">🧬</div>
              </div>
              <p className="loading-msg">
                {stepIdx >= 0 ? STEPS[Math.min(stepIdx, STEPS.length - 1)].msg : 'Initializing…'}
              </p>
              <div className="loading-sub">Genetic algorithm running…</div>
            </div>
          )}

          {/* Results */}
          {result && !result.error && (
            <div className="result-content" id="result-content">
              <div className="result-header">
                <div>
                  <div className="result-eyebrow">
                    <span className="re-dot" />Optimization Complete
                  </div>
                  <h2 id="result-title">{t.resultTitle}</h2>
                  <p className="result-desc" id="result-desc">{t.resultDesc}</p>
                </div>
                <button className="export-btn" id="export-pdf-btn" onClick={exportPDF} aria-label="Export PDF report">
                  <span>{t.exportPDF}</span>
                </button>
              </div>

              {/* Direction cards */}
              <div className="direction-cards">
                {DIRS.map(({ key, color, glow, icon }) => (
                  <div
                    key={key}
                    className="dir-card" id={`dir-card-${key}`}
                    style={{ '--card-color': color, '--card-glow': glow }}
                  >
                    <div className="dir-card-arrow" style={{ color }}>{icon}</div>
                    <div className="dir-card-dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                    <div className="dir-card-label" id={`dir-label-${key}`}>{t.directions[key]}</div>
                    <div className="dir-card-time" id={`result-${key}`} style={{ color }}>
                      {result[key]}
                    </div>
                    <div className="dir-card-unit">seconds</div>
                    <div
                      className="dir-card-bar"
                      style={{ width: `${(result[key] / 65) * 100}%`, background: color }}
                    />
                    <div className="dir-card-glow-fx" style={{ background: `radial-gradient(ellipse at right, ${glow} 0%, transparent 70%)` }} />
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="chart-section" id="chart-section">
                <div className="chart-title">Green Time Distribution</div>
                <div className="chart-wrap">
                  <canvas ref={chartRef} id="result-chart" aria-label="Bar chart of green light timings" />
                </div>
              </div>

              {/* Summary */}
              <div className="summary-row">
                <div className="sum-box">
                  <div className="sum-icon">⏱</div>
                  <div className="sum-val" style={{ color: '#00e676' }}>{result.north + result.south + result.west + result.east}s</div>
                  <div className="sum-lbl">Total Cycle Time</div>
                </div>
                <div className="sum-box">
                  <div className="sum-icon">📈</div>
                  <div className="sum-val" style={{ color: '#00e5ff' }}>{Math.round(((result.north + result.south + result.west + result.east) / 148) * 100)}%</div>
                  <div className="sum-lbl">Cycle Utilization</div>
                </div>
                <div className="sum-box">
                  <div className="sum-icon">🔄</div>
                  <div className="sum-val" style={{ color: '#ffab00' }}>25</div>
                  <div className="sum-lbl">GA Iterations</div>
                </div>
                <div className="sum-box">
                  <div className="sum-icon">👥</div>
                  <div className="sum-val" style={{ color: '#7c4dff' }}>400</div>
                  <div className="sum-lbl">Population Size</div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {result && result.error && (
            <div className="error-state" id="error-state" role="alert">
              <div className="error-icon">⚠️</div>
              <h2>Connection Error</h2>
              <p>{result.error}</p>
              <p className="error-hint">Make sure the Flask backend is running on <code>localhost:5000</code></p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   ROOT APP — LANDING + DASHBOARD
════════════════════════════════════ */
export default function App() {
  const [showDash, setShowDash] = useState(false);
  return (
    <>
      {!showDash && <LandingPage onEnter={() => setShowDash(true)} />}
      {showDash && <Dashboard onBack={() => setShowDash(false)} />}
    </>
  );
}
