import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, IndianRupee, Printer, BarChart3, Shield,
  ChevronRight, Menu, X, Check, ArrowRight,
  Zap, Globe, Star, MessageCircle, Cpu
} from 'lucide-react';
import { useAppSettings } from '../hooks/useAppSettings';
import { getServerDateObject } from '../hooks/useServerTime';

function useReveal(threshold = 0.10) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, className = '', delay = 0, y = 32 }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

function CountUp({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function MagneticButton({ children, className, onClick, style }) {
  const ref = useRef(null);
  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
  };
  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0,0)';
  };
  return (
    <div ref={ref} style={{ display: 'inline-block', transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)', ...style }}>
      <button className={className} onClick={onClick} onMouseMove={handleMove} onMouseLeave={handleLeave}>
        {children}
      </button>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Cabinet+Grotesk:wght@400;500;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --indigo:     #5b5fcf;
    --indigo-d:   #4338ca;
    --indigo-l:   #818cf8;
    --indigo-xl:  #c7d2fe;
    --indigo-bg:  rgba(91,95,207,0.06);
    --indigo-bg2: rgba(91,95,207,0.12);
    --text-1:     #07070f;
    --text-2:     #35374e;
    --text-3:     #7a7d9a;
    --border:     #e4e6f0;
    --border-l:   rgba(91,95,207,0.15);
    --surface:    #f6f7fc;
    --surface2:   #f0f1fa;
    --white:      #ffffff;
    --font-serif: 'Cormorant Garamond', serif;
    --font-head:  'Cabinet Grotesk', sans-serif;
    --font-body:  'DM Sans', sans-serif;
    --r:          16px;
    --r-lg:       24px;
    --sh-sm:      0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
    --sh-md:      0 2px 8px rgba(0,0,0,0.05), 0 12px 40px rgba(0,0,0,0.07);
    --sh-lg:      0 4px 24px rgba(0,0,0,0.06), 0 24px 72px rgba(0,0,0,0.09);
    --sh-indigo:  0 8px 32px rgba(91,95,207,0.22);
  }

  html { scroll-behavior: smooth; }
  body { font-family: var(--font-body); background: var(--white); color: var(--text-1); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
  a { text-decoration: none; color: inherit; }

  /* CURSOR */
  .cursor-dot {
    width: 8px; height: 8px; background: var(--indigo); border-radius: 50%;
    position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: none;
    transform: translate(-50%, -50%) translate3d(0,0,0);
    will-change: transform;
  }
  .cursor-ring {
    width: 36px; height: 36px; border: 1.5px solid rgba(91,95,207,0.4);
    border-radius: 50%; position: fixed; top: 0; left: 0; z-index: 9998;
    pointer-events: none;
    transform: translate(-50%, -50%) translate3d(0,0,0);
    will-change: transform;
  }
  @media (max-width: 768px) {
    .cursor-dot, .cursor-ring { display: none; }
  }

  /* AMBIENT BG */
  .ambient {
    position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
  }
  .amb-blob {
    position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.45;
    animation: blobdrift 18s ease-in-out infinite;
  }
  .amb-blob:nth-child(1) {
    width: 700px; height: 700px; top: -200px; left: -200px;
    background: radial-gradient(circle, rgba(91,95,207,0.12), transparent 70%);
    animation-delay: 0s;
  }
  .amb-blob:nth-child(2) {
    width: 500px; height: 500px; top: 40%; right: -150px;
    background: radial-gradient(circle, rgba(129,140,248,0.10), transparent 70%);
    animation-delay: -6s;
  }
  .amb-blob:nth-child(3) {
    width: 400px; height: 400px; bottom: -100px; left: 30%;
    background: radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%);
    animation-delay: -12s;
  }
  @keyframes blobdrift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%  { transform: translate(40px, -30px) scale(1.05); }
    66%  { transform: translate(-20px, 40px) scale(0.97); }
  }

  /* GRAIN OVERLAY */
  body::before {
    content: ''; position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    opacity: 0.022;
  }

  /* GRID LINES */
  .grid-lines {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 80%);
    opacity: 0.35;
  }

  /* NAVBAR */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 0 6%;
    transition: all 0.4s ease;
  }
  .nav.scrolled {
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 1px 0 var(--border), 0 4px 30px rgba(0,0,0,0.04);
  }
  .nav-inner { max-width: 1180px; margin: 0 auto; height: 68px; display: flex; align-items: center; justify-content: space-between; }
  .nav-brand { display: flex; align-items: center; gap: 12px; }
  .nav-logo {
    width: 38px; height: 38px; border-radius: 11px;
    background: linear-gradient(135deg, var(--indigo-d), var(--indigo));
    box-shadow: 0 2px 14px rgba(91,95,207,0.32);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    position: relative; overflow: hidden;
  }
  .nav-logo::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
  }
  .nav-name { font-family: var(--font-head); font-size: 14px; font-weight: 800; color: var(--text-1); letter-spacing: -0.3px; }
  .nav-name span { display: block; font-size: 9px; font-weight: 500; color: var(--text-3); letter-spacing: 1.2px; text-transform: uppercase; margin-top: 1px; font-family: var(--font-body); }
  .nav-links { display: flex; align-items: center; gap: 36px; list-style: none; }
  .nav-links a {
    font-size: 13px; font-weight: 500; color: var(--text-2);
    transition: color 0.2s; position: relative; padding-bottom: 2px;
  }
  .nav-links a::after {
    content: ''; position: absolute; bottom: -2px; left: 0; right: 0;
    height: 1.5px; background: var(--indigo); transform: scaleX(0); transform-origin: right;
    transition: transform 0.28s cubic-bezier(0.22,1,0.36,1);
  }
  .nav-links a:hover { color: var(--indigo); }
  .nav-links a:hover::after { transform: scaleX(1); transform-origin: left; }
  .nav-actions { display: flex; align-items: center; gap: 10px; }

  .btn-ghost {
    padding: 8px 18px; background: transparent;
    border: 1.5px solid var(--border); border-radius: 10px;
    font-size: 13px; font-weight: 600; color: var(--text-2);
    cursor: pointer; font-family: var(--font-body);
    transition: all 0.22s ease;
  }
  .btn-ghost:hover { border-color: var(--indigo); color: var(--indigo); background: var(--indigo-bg); transform: translateY(-1px); }

  .btn-primary {
    padding: 9px 20px; background: var(--indigo); border: none; border-radius: 10px;
    font-size: 13px; font-weight: 700; color: #fff; cursor: pointer;
    font-family: var(--font-body);
    box-shadow: 0 2px 12px rgba(91,95,207,0.30);
    transition: all 0.22s ease; display: flex; align-items: center; gap: 5px;
    position: relative; overflow: hidden;
  }
  .btn-primary::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
  }
  .btn-primary:hover { background: var(--indigo-d); transform: translateY(-2px); box-shadow: 0 6px 24px rgba(91,95,207,0.38); }

  .nav-hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--text-1); padding: 4px; }
  .nav-mobile { display: none; position: fixed; inset: 0; z-index: 200; background: rgba(255,255,255,0.98); backdrop-filter: blur(24px); flex-direction: column; align-items: center; justify-content: center; gap: 28px; }
  .nav-mobile.open { display: flex; }
  .nav-mobile-close { position: absolute; top: 22px; right: 22px; background: none; border: none; cursor: pointer; color: var(--text-1); }
  .nav-mobile a { font-size: 22px; font-weight: 700; color: var(--text-2); transition: color 0.18s; font-family: var(--font-head); }
  .nav-mobile a:hover { color: var(--indigo); }
  @media (max-width: 800px) { .nav-links, .nav-actions { display: none; } .nav-hamburger { display: flex; } }

  /* LAYOUT */
  .section { max-width: 1180px; margin: 0 auto; padding: 0 6%; position: relative; z-index: 2; }
  .section-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent); margin: 0 6%; position: relative; z-index: 2; }

  /* HERO */
  .hero { padding: 164px 6% 108px; text-align: center; position: relative; overflow: hidden; }
  .hero-inner { position: relative; z-index: 2; }

  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, rgba(91,95,207,0.08), rgba(129,140,248,0.06));
    border: 1px solid rgba(91,95,207,0.18);
    padding: 6px 16px; border-radius: 30px;
    font-size: 10.5px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase;
    color: var(--indigo); margin-bottom: 32px;
    opacity: 0; animation: fadeUp 0.7s ease 0.1s forwards;
    backdrop-filter: blur(12px);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.8) inset, var(--sh-sm);
  }
  .badge-pulse {
    width: 6px; height: 6px; border-radius: 50%; background: var(--indigo);
    animation: pulse 2.2s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(91,95,207,0.5); } 50%{ box-shadow: 0 0 0 6px rgba(91,95,207,0); } }

  .hero-title {
    font-family: var(--font-serif);
    font-size: clamp(52px, 7.5vw, 100px);
    font-weight: 300;
    color: var(--text-1);
    line-height: 1.02;
    letter-spacing: -3px;
    margin-bottom: 28px;
    opacity: 0; animation: fadeUp 0.8s ease 0.2s forwards;
  }
  .hero-title em { font-style: italic; color: var(--indigo); }
  .hero-title .line-wrap { overflow: hidden; display: block; }

  .hero-sub {
    font-size: clamp(15px, 1.7vw, 18px); color: var(--text-2);
    font-weight: 300; line-height: 1.78;
    max-width: 520px; margin: 0 auto 48px;
    opacity: 0; animation: fadeUp 0.8s ease 0.32s forwards;
  }

  .hero-cta {
    display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap;
    opacity: 0; animation: fadeUp 0.8s ease 0.44s forwards;
    margin-bottom: 80px;
  }

  .hero-btn-a {
    padding: 15px 32px;
    background: linear-gradient(135deg, var(--indigo), var(--indigo-d));
    border: none; border-radius: 12px;
    font-size: 14px; font-weight: 700; font-family: var(--font-body);
    color: #fff; cursor: pointer;
    box-shadow: 0 4px 20px rgba(91,95,207,0.32), 0 0 0 1px rgba(255,255,255,0.15) inset;
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    display: flex; align-items: center; gap: 8px; position: relative; overflow: hidden;
  }
  .hero-btn-a::before {
    content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transition: left 0.5s ease;
  }
  .hero-btn-a:hover::before { left: 100%; }
  .hero-btn-a:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(91,95,207,0.42), 0 0 0 1px rgba(255,255,255,0.15) inset; }

  .hero-btn-b {
    padding: 15px 28px;
    background: rgba(255,255,255,0.8);
    border: 1.5px solid var(--border); border-radius: 12px;
    font-size: 14px; font-weight: 600; font-family: var(--font-body);
    color: var(--text-2); cursor: pointer;
    transition: all 0.22s ease;
    backdrop-filter: blur(12px);
    box-shadow: var(--sh-sm);
  }
  .hero-btn-b:hover { border-color: var(--indigo); color: var(--indigo); transform: translateY(-2px); box-shadow: var(--sh-md); }

  @keyframes fadeUp { from{ opacity:0; transform:translateY(22px); } to{ opacity:1; transform:translateY(0); } }

  /* HERO STATS */
  .hero-stats {
    display: flex; align-items: stretch; justify-content: center;
    border: 1px solid rgba(91,95,207,0.12);
    border-radius: 20px; overflow: hidden;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px);
    box-shadow: var(--sh-md), 0 0 0 1px rgba(255,255,255,0.6) inset;
    max-width: 720px; margin: 0 auto;
    opacity: 0; animation: fadeUp 0.8s ease 0.58s forwards;
  }
  .hero-stat {
    flex: 1; padding: 28px 0; text-align: center;
    border-right: 1px solid rgba(91,95,207,0.09);
    position: relative; transition: background 0.3s;
  }
  .hero-stat:hover { background: var(--indigo-bg); }
  .hero-stat:last-child { border-right: none; }
  .hero-stat-val {
    font-family: var(--font-serif); font-size: 32px; font-weight: 400;
    color: var(--text-1); line-height: 1; margin-bottom: 5px; letter-spacing: -1px;
  }
  .hero-stat-val em { color: var(--indigo); font-style: normal; }
  .hero-stat-lbl { font-size: 10.5px; color: var(--text-3); font-weight: 500; letter-spacing: 0.5px; }

  /* TICKER */
  .ticker-wrap {
    overflow: hidden; padding: 18px 0; background: var(--surface);
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
    position: relative; z-index: 2;
  }
  .ticker-track {
    display: flex; gap: 0; white-space: nowrap;
    animation: ticker 30s linear infinite;
  }
  .ticker-item {
    display: flex; align-items: center; gap: 10px;
    padding: 0 40px;
    font-family: var(--font-head); font-size: 12px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-3);
    border-right: 1px solid var(--border);
  }
  .ticker-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--indigo); }
  @keyframes ticker { from{ transform: translateX(0); } to{ transform: translateX(-50%); } }

  /* SEC COMMON */
  .sec-eye {
    display: inline-flex; align-items: center; gap: 10px;
    font-family: var(--font-head); font-size: 10px; font-weight: 700;
    letter-spacing: 2.5px; text-transform: uppercase; color: var(--indigo); margin-bottom: 14px;
  }
  .sec-eye::before { content:''; width:20px; height:1.5px; background: linear-gradient(90deg, var(--indigo), transparent); flex-shrink:0; }
  .sec-title {
    font-family: var(--font-serif); font-size: clamp(32px, 4vw, 56px);
    font-weight: 300; color: var(--text-1); line-height: 1.1;
    letter-spacing: -1.5px; margin-bottom: 16px;
  }
  .sec-title em { font-style: italic; color: var(--indigo); }
  .sec-sub { font-size: 15px; color: var(--text-2); line-height: 1.78; max-width: 480px; font-weight: 300; }

  /* FEATURES */
  .feat-sec { padding: 128px 0; }
  .feat-head { margin-bottom: 72px; }
  .feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }

  .feat-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 36px 30px;
    box-shadow: var(--sh-sm);
    transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
    position: relative; overflow: hidden;
  }
  .feat-card::before {
    content: ''; position: absolute; inset: 0; border-radius: 20px;
    background: linear-gradient(135deg, var(--indigo-bg), transparent 60%);
    opacity: 0; transition: opacity 0.35s;
  }
  .feat-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: var(--sh-lg); border-color: var(--border-l); }
  .feat-card:hover::before { opacity: 1; }
  .feat-card-glow {
    position: absolute; width: 200px; height: 200px; border-radius: 50%;
    background: radial-gradient(circle, rgba(91,95,207,0.08), transparent 70%);
    top: -60px; right: -60px; pointer-events: none;
    transition: opacity 0.35s;
    opacity: 0;
  }
  .feat-card:hover .feat-card-glow { opacity: 1; }

  .feat-ico {
    width: 48px; height: 48px; border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 22px; position: relative; z-index: 1;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  }
  .feat-title {
    font-family: var(--font-head); font-size: 15px; font-weight: 800;
    color: var(--text-1); margin-bottom: 9px; position: relative; z-index: 1;
    letter-spacing: -0.2px;
  }
  .feat-desc { font-size: 13px; color: var(--text-2); line-height: 1.72; font-weight: 300; position: relative; z-index: 1; }
  @media (max-width:880px){ .feat-grid{ grid-template-columns: repeat(2,1fr); } }
  @media (max-width:560px){ .feat-grid{ grid-template-columns: 1fr; } }

  /* HOW IT WORKS */
  .how-sec { padding: 128px 0; background: var(--surface); position: relative; overflow: hidden; }
  .how-sec::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--indigo-xl) 30%, var(--indigo-xl) 70%, transparent);
  }
  .how-head { margin-bottom: 72px; }
  .how-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }

  .how-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 42px 34px;
    box-shadow: var(--sh-sm);
    transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
    position: relative; overflow: hidden;
  }
  .how-card:hover { transform: translateY(-5px); box-shadow: var(--sh-lg); }
  .how-num {
    font-family: var(--font-serif); font-size: 80px; font-weight: 300;
    font-style: italic; color: rgba(91,95,207,0.08); line-height: 1;
    margin-bottom: 22px; letter-spacing: -3px;
    transition: color 0.35s;
  }
  .how-card:hover .how-num { color: rgba(91,95,207,0.16); }
  .how-num-badge {
    display: inline-flex; width: 28px; height: 28px; border-radius: 8px;
    background: var(--indigo-bg2); color: var(--indigo);
    font-family: var(--font-head); font-size: 11px; font-weight: 800;
    align-items: center; justify-content: center;
    margin-bottom: 16px; letter-spacing: 0;
    border: 1px solid rgba(91,95,207,0.18);
  }
  .how-title { font-family: var(--font-head); font-size: 16px; font-weight: 800; color: var(--text-1); margin-bottom: 10px; letter-spacing: -0.3px; }
  .how-desc { font-size: 13px; color: var(--text-2); line-height: 1.72; font-weight: 300; }
  @media (max-width:740px){ .how-grid{ grid-template-columns: 1fr; } }

  /* SERVICES */
  .svc-sec { padding: 128px 0; }
  .svc-head { margin-bottom: 64px; }
  .svc-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 13px; }
  .svc-card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: 16px; padding: 24px 22px;
    box-shadow: var(--sh-sm);
    transition: all 0.28s cubic-bezier(0.22,1,0.36,1);
    display: flex; flex-direction: column; gap: 9px;
    cursor: default; position: relative; overflow: hidden;
  }
  .svc-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
    background: var(--svc-color, var(--indigo));
    transform: scaleX(0); transform-origin: left;
    transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
  }
  .svc-card:hover { transform: translateY(-4px); box-shadow: var(--sh-md); border-color: rgba(91,95,207,0.14); }
  .svc-card:hover::after { transform: scaleX(1); }
  .svc-dot { width: 9px; height: 9px; border-radius: 50%; transition: transform 0.3s; }
  .svc-card:hover .svc-dot { transform: scale(1.5); }
  .svc-name { font-family: var(--font-head); font-size: 13px; font-weight: 800; color: var(--text-1); letter-spacing: -0.1px; }
  .svc-desc { font-size: 11px; color: var(--text-3); line-height: 1.52; }
  @media (max-width:880px){ .svc-grid{ grid-template-columns: repeat(2,1fr); } }
  @media (max-width:500px){ .svc-grid{ grid-template-columns: 1fr; } }

  /* TRUST */
  .trust-sec { padding: 96px 0; background: linear-gradient(180deg, var(--surface2) 0%, var(--white) 100%); }
  .trust-inner { display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; }
  .trust-text {
    font-family: var(--font-serif); font-size: clamp(26px, 3vw, 42px);
    font-weight: 300; color: var(--text-1); line-height: 1.22;
    letter-spacing: -1px; max-width: 420px;
  }
  .trust-text em { font-style: italic; color: var(--indigo); }
  .trust-badges { display: flex; flex-direction: column; gap: 12px; }
  .trust-badge {
    display: flex; align-items: center; gap: 14px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 20px;
    box-shadow: var(--sh-sm);
    font-size: 13px; font-weight: 500; color: var(--text-1);
    transition: all 0.25s ease;
  }
  .trust-badge:hover { transform: translateX(5px); border-color: var(--border-l); box-shadow: var(--sh-md); }
  .trust-badge-ico {
    width: 32px; height: 32px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    background: var(--indigo-bg); flex-shrink: 0;
  }

  /* PRICING */
  .price-sec { padding: 128px 0; }
  .price-head { margin-bottom: 64px; text-align: center; }
  .price-head .sec-eye { justify-content: center; }
  .price-head .sec-sub { margin: 0 auto; }
  .price-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; align-items: start; }

  .p-card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: 22px; padding: 36px 30px;
    box-shadow: var(--sh-sm);
    transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
    position: relative; overflow: hidden;
  }
  .p-card:hover { transform: translateY(-5px); box-shadow: var(--sh-lg); }
  .p-card.featured {
    border-color: var(--indigo);
    box-shadow: 0 0 0 1px var(--indigo), var(--sh-lg), 0 0 60px rgba(91,95,207,0.07);
    transform: scale(1.04);
    background: linear-gradient(160deg, #f8f9ff, var(--white));
  }
  .p-card.featured:hover { transform: scale(1.04) translateY(-5px); }
  .p-card-shine {
    position: absolute; top: 0; right: 0; width: 180px; height: 180px;
    background: radial-gradient(circle, rgba(91,95,207,0.06), transparent 70%);
    pointer-events: none;
  }

  .p-popular {
    display: inline-block; padding: 4px 12px; border-radius: 20px;
    font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    background: linear-gradient(135deg, var(--indigo-bg2), rgba(99,102,241,0.08));
    color: var(--indigo); border: 1px solid rgba(91,95,207,0.22);
    margin-bottom: 24px;
  }
  .p-name { font-family: var(--font-head); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: var(--text-3); margin-bottom: 12px; }
  .p-row { display: flex; align-items: baseline; gap: 3px; margin-bottom: 6px; }
  .p-sym { font-size: 18px; font-weight: 600; color: var(--text-2); margin-top: 6px; }
  .p-num { font-family: var(--font-serif); font-size: 56px; font-weight: 300; color: var(--text-1); line-height: 1; letter-spacing: -3px; }
  .p-per { font-size: 13px; color: var(--text-3); }
  .p-desc { font-size: 12.5px; color: var(--text-3); margin-bottom: 28px; line-height: 1.65; font-weight: 300; }
  .p-feats { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px; }
  .p-feat { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--text-2); font-weight: 500; }
  .pfc { color: #10b981; flex-shrink: 0; }
  .pfx { color: #d1d5db; flex-shrink: 0; }
  .pfxt { color: #b0b3c6; }

  .p-btn {
    width: 100%; padding: 13px; border-radius: 11px;
    cursor: pointer; font-size: 13.5px; font-weight: 700;
    font-family: var(--font-body); transition: all 0.25s ease;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    position: relative; overflow: hidden;
  }
  .p-btn::before {
    content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    transition: left 0.5s ease;
  }
  .p-btn:hover::before { left: 100%; }
  .p-btn-o { background: transparent; border: 1.5px solid var(--border); color: var(--text-2); }
  .p-btn-o:hover { border-color: var(--indigo); color: var(--indigo); background: var(--indigo-bg); transform: translateY(-2px); }
  .p-btn-f { background: linear-gradient(135deg, var(--indigo), var(--indigo-d)); border: none; color: #fff; box-shadow: 0 4px 16px rgba(91,95,207,0.30); }
  .p-btn-f:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(91,95,207,0.40); }
  @media (max-width:880px){ .price-grid{ grid-template-columns: 1fr; } .p-card.featured{ transform: none; } .p-card.featured:hover{ transform: translateY(-5px); } }

  /* TESTIMONIALS */
  .test-sec { padding: 128px 0; background: var(--surface); }
  .test-head { margin-bottom: 64px; }
  .test-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }

  .t-card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: 20px; padding: 32px 28px;
    box-shadow: var(--sh-sm);
    transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
    position: relative; overflow: hidden;
  }
  .t-card::before {
    content: '"'; position: absolute; top: -10px; right: 20px;
    font-family: var(--font-serif); font-size: 120px; font-style: italic;
    color: rgba(91,95,207,0.05); line-height: 1; pointer-events: none;
  }
  .t-card:hover { transform: translateY(-5px); box-shadow: var(--sh-lg); border-color: var(--border-l); }
  .t-stars { display: flex; gap: 3px; margin-bottom: 18px; }
  .t-text {
    font-family: var(--font-serif); font-size: 15px; font-style: italic;
    color: var(--text-2); line-height: 1.75; margin-bottom: 24px; font-weight: 300;
    position: relative; z-index: 1;
  }
  .t-author { display: flex; align-items: center; gap: 13px; }
  .t-av {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, var(--indigo-d), var(--indigo));
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-head); font-size: 13px; font-weight: 800;
    color: #fff; flex-shrink: 0;
    box-shadow: 0 2px 10px rgba(91,95,207,0.28);
  }
  .t-name { font-family: var(--font-head); font-size: 13px; font-weight: 800; color: var(--text-1); }
  .t-loc { font-size: 11px; color: var(--text-3); margin-top: 2px; }
  @media (max-width:880px){ .test-grid{ grid-template-columns: 1fr; } }

  /* CTA */
  .cta-sec { padding: 128px 0 144px; }
  .cta-box {
    background: linear-gradient(135deg, #f0f1ff 0%, #f8f9ff 50%, #fff 100%);
    border: 1px solid rgba(91,95,207,0.16);
    border-radius: 32px; padding: 96px 64px;
    text-align: center; position: relative; overflow: hidden;
    box-shadow: 0 8px 60px rgba(91,95,207,0.08), 0 0 0 1px rgba(255,255,255,0.6) inset;
  }
  .cta-box::before {
    content:''; position:absolute; top:-200px; left:50%; transform:translateX(-50%);
    width:700px; height:700px; border-radius:50%;
    background: radial-gradient(circle, rgba(91,95,207,0.09), transparent 65%);
    pointer-events:none;
  }
  .cta-box::after {
    content:''; position:absolute; bottom:-100px; right:-100px;
    width:400px; height:400px; border-radius:50%;
    background: radial-gradient(circle, rgba(129,140,248,0.06), transparent 65%);
    pointer-events:none;
  }
  .cta-title {
    font-family: var(--font-serif); font-size: clamp(34px, 5vw, 64px);
    font-weight: 300; color: var(--text-1); line-height: 1.06;
    letter-spacing: -2px; margin-bottom: 18px; position: relative; z-index: 1;
  }
  .cta-title em { font-style: italic; color: var(--indigo); }
  .cta-sub { font-size: 16px; color: var(--text-2); max-width: 460px; margin: 0 auto 42px; line-height: 1.78; font-weight: 300; position: relative; z-index: 1; }
  .cta-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
  @media (max-width:640px){ .cta-box{ padding: 56px 24px; } }

  /* FAQ */
  .faq-sec { padding: 128px 0; }
  .faq-head { margin-bottom: 56px; }
  .faq-list { max-width: 720px; }
  .faq-item { border-bottom: 1px solid var(--border); cursor: pointer; transition: border-color 0.22s; }
  .faq-item:hover { border-color: rgba(91,95,207,0.18); }
  .faq-q {
    display: flex; align-items: center; justify-content: space-between; gap: 18px;
    font-family: var(--font-head); font-size: 14px; font-weight: 800;
    color: var(--text-1); padding: 24px 0; letter-spacing: -0.2px;
    transition: color 0.22s;
  }
  .faq-item.open .faq-q { color: var(--indigo); }
  .faq-ic {
    width: 24px; height: 24px; border-radius: 50%;
    border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--indigo); flex-shrink: 0;
    font-size: 18px; line-height: 1; font-weight: 300;
    transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .faq-item.open .faq-ic { transform: rotate(45deg); background: var(--indigo); color: white; border-color: var(--indigo); }
  .faq-a {
    font-size: 13.5px; color: var(--text-2); line-height: 1.78;
    max-height: 0; overflow: hidden; font-weight: 300;
    transition: max-height 0.4s cubic-bezier(0.22,1,0.36,1), padding 0.3s;
  }
  .faq-item.open .faq-a { max-height: 240px; padding-bottom: 22px; }

  /* FOOTER */
  .footer { border-top: 1px solid var(--border); background: var(--surface); padding: 72px 6% 48px; position: relative; z-index: 2; }
  .footer-inner { max-width: 1180px; margin: 0 auto; }
  .footer-top { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 52px; }
  .f-bname { font-family: var(--font-head); font-size: 16px; font-weight: 800; color: var(--text-1); margin-bottom: 2px; letter-spacing: -0.3px; }
  .f-btag { font-size: 9px; color: var(--text-3); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; font-family: var(--font-head); }
  .f-bdesc { font-size: 12.5px; color: var(--text-3); line-height: 1.72; max-width: 240px; font-weight: 300; }
  .f-ctitle { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: var(--text-3); margin-bottom: 18px; font-family: var(--font-head); }
  .f-links { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .f-links a { font-size: 13px; color: var(--text-2); transition: all 0.2s ease; font-weight: 300; display: inline-block; }
  .f-links a:hover { color: var(--indigo); transform: translateX(3px); }
  .footer-bot { display: flex; align-items: center; justify-content: space-between; padding-top: 28px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px; }
  .f-copy { font-size: 12px; color: var(--text-3); font-weight: 300; }
  .f-govt { font-size: 11px; color: var(--text-3); display: flex; align-items: center; gap: 6px; font-weight: 300; }
  @media (max-width:800px){ .footer-top{ grid-template-columns: 1fr 1fr; } }
  @media (max-width:500px){ .footer-top{ grid-template-columns: 1fr; } .footer-bot{ flex-direction: column; align-items: flex-start; } }

  /* FLOATING SUPPORT */
  .float-btn {
    position: fixed; z-index: 300;
    width: 52px; height: 52px; border-radius: 50%;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 24px;
    transition: all 0.28s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 0 4px 24px rgba(0,0,0,0.20);
    animation: floatIn 0.6s ease both;
  }
  
  .float-btn-whatsapp {
    bottom: 28px; right: 28px;
    background: linear-gradient(135deg, #25d366, #1eaa54);
    animation-delay: 0s;
  }
  
  .float-btn-ai {
    bottom: 100px; right: 28px;
    background: linear-gradient(135deg, var(--indigo), var(--indigo-d));
    animation-delay: 0.1s;
  }
  
  .float-btn:hover { 
    transform: scale(1.12) translateY(-3px); 
    box-shadow: 0 8px 36px rgba(0,0,0,0.28);
  }
  
  @keyframes floatIn { 
    from{ opacity:0; transform: translateY(20px) scale(0.8); } 
    to{ opacity:1; transform: translateY(0) scale(1); } 
  }
  
  @media (max-width:768px) {
    .float-btn { width: 48px; height: 48px; }
    .float-btn-whatsapp { bottom: 20px; right: 20px; }
    .float-btn-ai { bottom: 80px; right: 20px; }
  }
`;

const FEATURES = [
  { icon: FileText,    color: '#5b5fcf', bg: 'rgba(91,95,207,0.09)',  title: 'Complete Service Entry System',    desc: 'Log every customer with service type, payment amount, GST, and status. Custom fields per service type.' },
  { icon: IndianRupee, color: '#10b981', bg: 'rgba(16,185,129,0.09)', title: 'Payment & Work Status Tracking',  desc: 'Track work progress and payment status simultaneously. Know exactly who paid, partially paid, and who owes you.' },
  { icon: Printer,     color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', title: 'Instant Invoice Generation',      desc: 'Generate professional invoices with GST calculation. Print or email to customers in one click.' },
  { icon: BarChart3,   color: '#06b6d4', bg: 'rgba(6,182,212,0.09)',  title: 'Real-time Analytics & Reports',   desc: 'Charts, trends, and performance metrics. Revenue by service, daily collections, payment analysis.' },
  { icon: Shield,      color: '#8b5cf6', bg: 'rgba(139,92,246,0.09)', title: 'Secure & Encrypted',              desc: 'Bank-grade encryption. Your data is yours alone. Admin cannot view your records.' },
  { icon: Zap,         color: '#ef4444', bg: 'rgba(239,68,68,0.07)',  title: 'Works Offline & Slow Networks',   desc: 'Syncs when connected. Optimized for 2G/3G. Never lose work due to poor connectivity.' },
];

const SERVICES = [
  { name: 'Aadhaar Updates',    desc: 'Name, address, mobile, DOB changes', color: '#5b5fcf' },
  { name: 'PAN Card',           desc: 'New application & correction',       color: '#06b6d4' },
  { name: 'Passport Services',  desc: 'Fresh, renewal & tatkal',            color: '#10b981' },
  { name: 'Driving License',    desc: 'New, renewal, duplicate',            color: '#f59e0b' },
  { name: 'Banking Services',   desc: 'Account opening & transfers',        color: '#8b5cf6' },
  { name: 'Insurance',          desc: 'PMJJBY, PMSBY, PM Fasal',            color: '#ec4899' },
  { name: 'Government Schemes', desc: 'PMKISAN, ration, certificates',      color: '#06b6d4' },
  { name: 'Custom Services',    desc: 'Create your own with custom pricing', color: '#ef4444' },
];

const TESTIMONIALS = [
  { init: 'RK', name: 'Ramesh Kumar', loc: 'Patna, Bihar',       text: 'I was maintaining records in a diary and getting lost in calculations. Now I track 200+ entries every month, print invoices instantly, and can see exactly how much I earned. Changed my entire business.' },
  { init: 'PV', name: 'Priya Verma',  loc: 'Bangalore, Karnataka', text: 'The pending payments feature alone has helped me collect ₹2+ lakhs that I would have forgotten about. It sends me reminders for everything overdue. Saves so much time.' },
  { init: 'AS', name: 'Anil Singh',   loc: 'Indore, MP',         text: 'The customer search is lightning fast. I can find any entry by name or phone instantly. No more wasting time digging through notebooks. This system is a game-changer.' },
];

const FAQS = [
  { q: 'What happens to my data if I stop my subscription?', a: 'All your data remains yours forever. You can access it anytime by upgrading again, or export it. We never delete or lock your records.' },
  { q: 'Is my center data private?', a: 'Completely. Your data is encrypted end-to-end. No other operator, no admin, no government agency can see your entries. This is your business data.' },
  { q: 'Can I generate invoices and print receipts?', a: 'Yes. Create professional invoices in seconds with automatic GST calculation. Print or email receipts to customers. Multi-entry invoicing for bulk billing.' },
  { q: 'How do I track outstanding payments?', a: 'One dedicated page shows all pending payments by customer. Filter by service, date range, or amount. Set reminders for overdue payments. Never lose track again.' },
  { q: 'Can I manage multiple services at different prices?', a: 'Yes. Create unlimited custom services with custom pricing per service option. For example: "PAN - New" at ₹100 vs "PAN - Correction" at ₹50.' },
  { q: 'What if my internet goes down?', a: 'The platform is optimized for low-bandwidth connections (works on 2G/3G). Data syncs automatically when connection is restored. Never lose an entry.' },
  { q: 'Can I see reports and analytics?', a: 'Yes. Monthly revenue, service distribution, work completion rates, payment breakdown — all visualized with charts and trends. Export data as CSV.' },
  { q: 'Is there a contract or lock-in period?', a: 'No. Choose Starter (free, 50 entries/month), Pro (₹49/month or ₹99 for 2 months), or Enterprise (₹499/month). Cancel anytime. No setup fees, no hidden charges.' },
];

const TICKER_ITEMS = ['500+ Active Centers','50K+ Entries Logged','99.9% Uptime','8+ States','GST Ready','Works Offline','Instant Invoicing','Secure & Encrypted'];

export default function LandingPage() {
  const [scrolled,   setScrolled]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq,    setOpenFaq]   = useState(null);
  const settings = useAppSettings();
  const whatsapp_number = settings?.whatsapp_number;
  const rafRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    let mx = -100, my = -100;
    let rx = -100, ry = -100;
    let animating = false;
    const dotEl = document.querySelector('.cursor-dot');
    const ringEl = document.querySelector('.cursor-ring');

    const animate = () => {
      if (animating) {
        // Direct transform updates without state
        rx += (mx - rx) * 0.22;
        ry += (my - ry) * 0.22;
        if (dotEl) dotEl.style.transform = `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) translate3d(0,0,0)`;
        if (ringEl) ringEl.style.transform = `translate(calc(-50% + ${rx}px), calc(-50% + ${ry}px)) translate3d(0,0,0)`;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!animating) {
        animating = true;
        animate();
      }
    };

    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      animating = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {/* Custom cursor */}
      <div className="cursor-dot" />
      <div className="cursor-ring" />

      {/* Ambient background */}
      <div className="ambient">
        <div className="amb-blob"/>
        <div className="amb-blob"/>
        <div className="amb-blob"/>
      </div>
      <div className="grid-lines"/>

      {/* NAVBAR */}
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="nav-brand">
            <div className="nav-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="nav-name">One Net Solution<span>CSC Center Manager</span></div>
          </div>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="nav-actions">
            <Link to="/login"><button className="btn-ghost">Sign In</button></Link>
            <Link to="/signup"><button className="btn-primary">Get Started <ChevronRight size={13}/></button></Link>
          </div>
          <button className="nav-hamburger" onClick={() => setMobileOpen(true)}><Menu size={22}/></button>
        </div>
      </nav>

      <div className={`nav-mobile${mobileOpen ? ' open' : ''}`}>
        <button className="nav-mobile-close" onClick={() => setMobileOpen(false)}><X size={26}/></button>
        <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
        <a href="#services" onClick={() => setMobileOpen(false)}>Services</a>
        <a href="#pricing"  onClick={() => setMobileOpen(false)}>Pricing</a>
        <a href="#faq"      onClick={() => setMobileOpen(false)}>FAQ</a>
        <Link to="/login"   onClick={() => setMobileOpen(false)}>Sign In</Link>
        <Link to="/signup"  onClick={() => setMobileOpen(false)}>
          <button className="btn-primary" style={{ padding:'13px 30px', fontSize:15 }}>Get Started</button>
        </Link>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="badge-pulse"/>
            Built for CSC Operators across India
          </div>
          <h1 className="hero-title">
            Your entire center.<br/>
            <em>One</em> dashboard.<br/>
            Zero paperwork.
          </h1>
          <p className="hero-sub">One Net Solution replaces your diary, calculator, and receipt book with one simple platform — designed for operators, not engineers.</p>
          <div className="hero-cta">
            <Link to="/signup">
              <button className="hero-btn-a">Start for Free <ArrowRight size={15}/></button>
            </Link>
            <a href="#features">
              <button className="hero-btn-b">See How It Works</button>
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-val"><CountUp end={500} suffix="+"/></div>
              <div className="hero-stat-lbl">Active Centers</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val"><CountUp end={50} suffix="K+"/></div>
              <div className="hero-stat-lbl">Entries Logged</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val">99.9<em>%</em></div>
              <div className="hero-stat-lbl">Uptime</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val"><CountUp end={8} suffix="+"/></div>
              <div className="hero-stat-lbl">States</div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap" style={{ position: 'relative', zIndex: 2 }}>
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-dot"/>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="feat-sec">
        <div className="section">
          <Reveal className="feat-head">
            <div className="sec-eye">Features</div>
            <h2 className="sec-title">Everything your center needs.<br/><em>Nothing it doesn't.</em></h2>
            <p className="sec-sub">Every feature built from real CSC operator feedback — practical tools for daily work, nothing unnecessary.</p>
          </Reveal>
          <div className="feat-grid">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }, i) => (
              <Reveal key={title} delay={0.07 * (i % 3)}>
                <div className="feat-card">
                  <div className="feat-card-glow"/>
                  <div className="feat-ico" style={{ background: bg }}><Icon size={21} color={color} strokeWidth={1.6}/></div>
                  <div className="feat-title">{title}</div>
                  <div className="feat-desc">{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider"/>

      {/* HOW IT WORKS */}
      <section className="how-sec">
        <div className="section">
          <Reveal className="how-head">
            <div className="sec-eye">How It Works</div>
            <h2 className="sec-title">Set up in minutes.<br/><em>Operate for years.</em></h2>
          </Reveal>
          <div className="how-grid">
            {[
              { n:'01', t:'Create Your Account',  d:'Register with your email and basic center details. No technical knowledge required. Takes under 2 minutes.' },
              { n:'02', t:'Add Your First Entry',  d:'Log a customer name, service, amount, and payment status. Print their receipt immediately.' },
              { n:'03', t:'Track & Grow',          d:'Monitor daily collections, pending payments, and monthly performance from your dashboard — any time.' },
            ].map(({ n, t, d }, i) => (
              <Reveal key={n} delay={0.1 * i}>
                <div className="how-card">
                  <div className="how-num">{n}</div>
                  <div className="how-num-badge">{n}</div>
                  <div className="how-title">{t}</div>
                  <div className="how-desc">{d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider"/>

      {/* SERVICES */}
      <section id="services" className="svc-sec">
        <div className="section">
          <Reveal className="svc-head">
            <div className="sec-eye">Services Covered</div>
            <h2 className="sec-title">Manage every service<br/><em>your center offers.</em></h2>
            <p className="sec-sub">All standard CSC services tracked under one roof — no separate tools needed.</p>
          </Reveal>
          <div className="svc-grid">
            {SERVICES.map(({ name, desc, color }, i) => (
              <Reveal key={name} delay={0.06 * (i % 4)}>
                <div className="svc-card" style={{ '--svc-color': color }}>
                  <div className="svc-dot" style={{ background: color, boxShadow: `0 0 8px ${color}60` }}/>
                  <div className="svc-name">{name}</div>
                  <div className="svc-desc">{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider"/>

      {/* TRUST */}
      <section className="trust-sec">
        <div className="section">
          <div className="trust-inner">
            <Reveal>
              <p className="trust-text">Built for operators who need <em>reliability</em>, not complexity.</p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="trust-badges">
                {[
                  { icon: Shield, color: '#10b981', text: 'Data encrypted end-to-end' },
                  { icon: Zap,    color: '#f59e0b', text: 'Works on 2G / 3G networks' },
                  { icon: Globe,  color: '#5b5fcf', text: 'Accessible from any device' },
                ].map(({ icon: Icon, color, text }) => (
                  <div key={text} className="trust-badge">
                    <div className="trust-badge-ico"><Icon size={15} color={color} strokeWidth={2}/></div>
                    {text}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="section-divider"/>

      {/* PRICING */}
      <section id="pricing" className="price-sec">
        <div className="section">
          <Reveal className="price-head">
            <div className="sec-eye">Pricing</div>
            <h2 className="sec-title">Simple, honest pricing.<br/><em>No hidden charges.</em></h2>
            <p className="sec-sub">Choose the plan that fits your center. Upgrade or cancel any time.</p>
          </Reveal>
          <div className="price-grid">
            <Reveal delay={0.0}>
              <div className="p-card">
                <div className="p-card-shine"/>
                <div className="p-name">Starter</div>
                <div className="p-row"><span className="p-sym">₹</span><span className="p-num">0</span><span className="p-per">/ month</span></div>
                <div className="p-desc">For operators just getting started. No credit card needed.</div>
                <ul className="p-feats">
                  {['Up to 50 entries/month','Basic payment tracking','Manual receipts','Email support'].map(f=>(
                    <li key={f} className="p-feat"><Check size={13} className="pfc"/>{f}</li>
                  ))}
                  {['Automated reports','Priority support'].map(f=>(
                    <li key={f} className="p-feat"><X size={13} className="pfx"/><span className="pfxt">{f}</span></li>
                  ))}
                </ul>
                <Link to="/signup"><button className="p-btn p-btn-o">Get Started Free</button></Link>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="p-card featured">
                <div className="p-card-shine"/>
                <div className="p-popular">Most Popular</div>
                <div className="p-name">Pro</div>
                <div className="p-row"><span className="p-sym">₹</span><span className="p-num">49</span><span className="p-per">/ month</span></div>
                <div className="p-desc">Recommended for active centers. Or choose 2 months for ₹99 and save 50%.</div>
                <ul className="p-feats">
                  {['Unlimited entries','Full payment tracking','Instant receipt printing','Monthly reports','Priority support','Multi-device access'].map(f=>(
                    <li key={f} className="p-feat"><Check size={13} className="pfc"/>{f}</li>
                  ))}
                </ul>
                <Link to="/signup"><button className="p-btn p-btn-f">Start Pro Trial <ArrowRight size={13}/></button></Link>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="p-card">
                <div className="p-card-shine"/>
                <div className="p-name">Enterprise</div>
                <div className="p-row"><span className="p-sym">₹</span><span className="p-num">499</span><span className="p-per">/ month</span></div>
                <div className="p-desc">For franchisees and operators managing multiple centers.</div>
                <ul className="p-feats">
                  {['Everything in Pro','Multi-center dashboard','Staff accounts','Advanced analytics','Dedicated support','Custom branding'].map(f=>(
                    <li key={f} className="p-feat"><Check size={13} className="pfc"/>{f}</li>
                  ))}
                </ul>
                <Link to="/signup"><button className="p-btn p-btn-o">Contact Us</button></Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="section-divider"/>

      {/* TESTIMONIALS */}
      <section className="test-sec">
        <div className="section">
          <Reveal className="test-head">
            <div className="sec-eye">Testimonials</div>
            <h2 className="sec-title">What operators<br/><em>say about us.</em></h2>
          </Reveal>
          <div className="test-grid">
            {TESTIMONIALS.map(({ init, name, loc, text }, i) => (
              <Reveal key={name} delay={0.1 * i}>
                <div className="t-card">
                  <div className="t-stars">{[...Array(5)].map((_,j)=><Star key={j} size={13} fill="#f59e0b" color="#f59e0b"/>)}</div>
                  <p className="t-text">"{text}"</p>
                  <div className="t-author">
                    <div className="t-av">{init}</div>
                    <div><div className="t-name">{name}</div><div className="t-loc">{loc}</div></div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider"/>

      {/* CTA */}
      <section className="cta-sec">
        <div className="section">
          <Reveal>
            <div className="cta-box">
              <h2 className="cta-title">Ready to run your center<br/><em>the right way?</em></h2>
              <p className="cta-sub">Join 500+ CSC operators already using One Net Solution to manage their center, track payments, and grow their business.</p>
              <div className="cta-btns">
                <Link to="/signup"><button className="hero-btn-a">Create Free Account <ArrowRight size={14}/></button></Link>
                <Link to="/login"><button className="hero-btn-b">Sign In</button></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="section-divider"/>

      {/* FAQ */}
      <section id="faq" className="faq-sec">
        <div className="section">
          <Reveal className="faq-head">
            <div className="sec-eye">FAQ</div>
            <h2 className="sec-title">Common <em>questions.</em></h2>
          </Reveal>
          <div className="faq-list">
            {FAQS.map((item, i) => (
              <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="faq-q">{item.q}<span className="faq-ic">+</span></div>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="f-bname">One Net Solution</div>
              <div className="f-btag">CSC Center Manager</div>
              <p className="f-bdesc">A complete digital management system built exclusively for Common Service Centre operators across India.</p>
            </div>
            <div>
              <div className="f-ctitle">Product</div>
              <ul className="f-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="f-ctitle">Account</div>
              <ul className="f-links">
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/signup">Create Account</Link></li>
                <li><Link to="/forgot-password">Reset Password</Link></li>
              </ul>
            </div>
            <div>
              <div className="f-ctitle">Support</div>
              <ul className="f-links">
                <li><a href="mailto:support@onenetsolution.in">Email Support</a></li>
                <li><a href="#faq">Help Center</a></li>
                <li><a href="#faq">Documentation</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bot">
            <div className="f-copy">© {getServerDateObject()?.getFullYear() || new Date().getFullYear()} One Net Solution. All rights reserved.</div>
            <div className="f-govt"><Globe size={11}/> Designed for Aadhaar, PAN, Banking, Insurance &amp; Govt. Schemes</div>
          </div>
        </div>
      </footer>

      {/* FLOATING ACTION BUTTONS */}
      {whatsapp_number && (
        <a 
          href={`https://wa.me/${whatsapp_number.replace(/\D/g, '')}`} 
          target="_blank" 
          rel="noopener noreferrer"
          title={`Chat on WhatsApp: ${whatsapp_number}`}
        >
          <button className="float-btn float-btn-whatsapp">
            <MessageCircle size={24} fill="currentColor"/>
          </button>
        </a>
      )}
    </>
  );
}