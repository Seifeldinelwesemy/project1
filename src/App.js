import React, { useState, useEffect, useRef } from 'react';

const SUPABASE_URL = 'https://ogbeczupngfuevmqdjdz.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYmVjenVwbmdmdWV2bXFkamR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTQyMDksImV4cCI6MjA4ODI3MDIwOX0.A4Hylx7B0qBDs0TWKCmC8ijUp71tzVrQ8fHGfLV7_2I';
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const DEFAULT_TOP = 21, DEFAULT_SIDE = 15;
const MIN_SEATS = 1, MAX_TOP = 40, MAX_SIDE = 30;

function buildSeats(topCount = DEFAULT_TOP, sideCount = DEFAULT_SIDE) {
  const seats = [];
  for (let i = 0; i < topCount; i++)
    seats.push({ id: `T${i + 1}`, row: 'top', col: i, name: '', status: 'empty' });
  for (let i = 0; i < sideCount; i++)
    seats.push({ id: `L${i + 1}`, row: 'left', col: i, name: '', status: 'empty' });
  for (let i = 0; i < sideCount; i++)
    seats.push({ id: `R${i + 1}`, row: 'right', col: i, name: '', status: 'empty' });
  return seats;
}

function insertTopLeft(oldSeats) {
  const topSeats = oldSeats.filter(s => s.row === 'top');
  return [
    { id: 'T1', row: 'top', col: 0, name: '', status: 'empty' },
    ...topSeats.map((s, i) => ({ ...s, id: `T${i + 2}`, col: i + 1 })),
    ...oldSeats.filter(s => s.row !== 'top'),
  ];
}
function removeTopLeft(oldSeats) {
  const topSeats = oldSeats.filter(s => s.row === 'top');
  if (topSeats.length <= 1) return oldSeats;
  return [...topSeats.slice(1).map((s, i) => ({ ...s, id: `T${i + 1}`, col: i })), ...oldSeats.filter(s => s.row !== 'top')];
}
function insertTopRight(oldSeats) {
  const topSeats = oldSeats.filter(s => s.row === 'top');
  const newSeat = { id: `T${topSeats.length + 1}`, row: 'top', col: topSeats.length, name: '', status: 'empty' };
  return [...oldSeats.filter(s => s.row !== 'top'), ...topSeats, newSeat]
    .sort((a, b) => { const ro = { top: 0, left: 1, right: 2 }; return ro[a.row] !== ro[b.row] ? ro[a.row] - ro[b.row] : a.col - b.col; });
}
function removeTopRight(oldSeats) {
  const topSeats = oldSeats.filter(s => s.row === 'top');
  if (topSeats.length <= 1) return oldSeats;
  return [...topSeats.slice(0, -1), ...oldSeats.filter(s => s.row !== 'top')];
}
function insertSideBottom(oldSeats) {
  const l = oldSeats.filter(s => s.row === 'left'), r = oldSeats.filter(s => s.row === 'right'), n = l.length;
  return [...oldSeats.filter(s => s.row === 'top'), ...l, { id: `L${n + 1}`, row: 'left', col: n, name: '', status: 'empty' }, ...r, { id: `R${n + 1}`, row: 'right', col: n, name: '', status: 'empty' }];
}
function removeSideBottom(oldSeats) {
  const l = oldSeats.filter(s => s.row === 'left'), r = oldSeats.filter(s => s.row === 'right');
  if (l.length <= 1) return oldSeats;
  return [...oldSeats.filter(s => s.row === 'top'), ...l.slice(0, -1), ...r.slice(0, -1)];
}

async function loadSeats() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/seats?select=*`, { headers: HEADERS });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0)
      return data.sort((a, b) => { const ro = { top: 0, left: 1, right: 2 }; return ro[a.row] !== ro[b.row] ? ro[a.row] - ro[b.row] : a.col - b.col; });
    const initial = buildSeats();
    await fetch(`${SUPABASE_URL}/rest/v1/seats`, { method: 'POST', headers: { ...HEADERS, Prefer: 'ignore-duplicates' }, body: JSON.stringify(initial) });
    return initial;
  } catch { return buildSeats(); }
}
async function saveSeat(seat) {
  await fetch(`${SUPABASE_URL}/rest/v1/seats?id=eq.${seat.id}`, { method: 'PATCH', headers: { ...HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ name: seat.name, status: seat.status }) });
}
async function saveAllSeats(seats) {
  for (const s of seats)
    await fetch(`${SUPABASE_URL}/rest/v1/seats?id=eq.${s.id}`, { method: 'PATCH', headers: { ...HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ name: s.name, status: s.status }) });
}
async function clearAllSeats(topCount = DEFAULT_TOP, sideCount = DEFAULT_SIDE) {
  await fetch(`${SUPABASE_URL}/rest/v1/seats`, { method: 'DELETE', headers: HEADERS });
  await fetch(`${SUPABASE_URL}/rest/v1/seats`, { method: 'POST', headers: { ...HEADERS, Prefer: 'ignore-duplicates' }, body: JSON.stringify(buildSeats(topCount, sideCount)) });
}
async function syncLayoutChange(newSeats, oldSeats) {
  const newIds = new Set(newSeats.map(s => s.id));
  for (const id of oldSeats.map(s => s.id).filter(id => !newIds.has(id)))
    await fetch(`${SUPABASE_URL}/rest/v1/seats?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  await fetch(`${SUPABASE_URL}/rest/v1/seats`, { method: 'POST', headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(newSeats) });
}

function formatTimestamp(date) {
  if (!date) return null;
  const now = new Date(), diff = now - date;
  const s = Math.floor(diff / 1000), m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000);
  if (s < 10) return 'Just now'; if (s < 60) return `${s}s ago`; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`;
  const t = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yd = new Date(now); yd.setDate(yd.getDate() - 1);
  return date.toDateString() === now.toDateString() ? `Today at ${t}` : date.toDateString() === yd.toDateString() ? `Yesterday at ${t}` : `${date.toLocaleDateString()} at ${t}`;
}

function useIsMobile() {
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => { const h = () => setV(window.innerWidth < 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return v;
}

const COLORS = {
  empty:      { body: '#e2c9c9', legs: '#7a5c5c', border: '#c9a8a8', text: '#9e7c7c', bg: 'transparent' },
  assigned:   { body: '#7ec8a4', legs: '#3a7a5c', border: '#4caf82', text: '#1a5c3c', bg: '#eafff4' },
  vip:        { body: '#f7c948', legs: '#b8860b', border: '#f0a500', text: '#7a4f00', bg: '#fff8e1' },
  selected:   { body: '#7aabf7', legs: '#2355a0', border: '#4080ee', text: '#1a3a7a', bg: '#e8f0ff' },
  duplicate:  { body: '#f7a0a0', legs: '#a03030', border: '#e05050', text: '#7a1010', bg: '#fff0f0' },
  swapSource: { body: '#f7a84a', legs: '#a05c00', border: '#e07800', text: '#7a3a00', bg: '#fff3e0' },
  swapTarget: { body: '#b87af7', legs: '#5a20a0', border: '#8040e0', text: '#3a1a7a', bg: '#f0e8ff' },
};

function SeatIcon({ status, size = 36 }) {
  const c = COLORS[status] || COLORS.empty;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
      <rect x="10" y="4" width="28" height="22" rx="6" fill={c.body} stroke={c.border} strokeWidth="1.5" />
      <rect x="8" y="24" width="32" height="12" rx="5" fill={c.body} stroke={c.border} strokeWidth="1.5" />
      <rect x="11" y="36" width="5" height="8" rx="2.5" fill={c.legs} />
      <rect x="32" y="36" width="5" height="8" rx="2.5" fill={c.legs} />
      <rect x="5" y="22" width="5" height="10" rx="2.5" fill={c.legs} />
      <rect x="38" y="22" width="5" height="10" rx="2.5" fill={c.legs} />
    </svg>
  );
}

function TopSeat({ seat, isSelected, isDuplicate, isSwapSource, isSwapTarget, swapMode, onClick, compact }) {
  const status = isSwapSource ? 'swapSource' : isSwapTarget ? 'swapTarget' : isSelected ? 'selected' : isDuplicate ? 'duplicate' : seat.status;
  const c = COLORS[status] || COLORS.empty;
  const w = compact ? 52 : 76, h = compact ? 82 : 110, ic = compact ? 26 : 34;
  return (
    <div onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
      width: w, height: h, flexShrink: 0, padding: compact ? '4px 2px' : '5px 4px', borderRadius: 10, boxSizing: 'border-box',
      background: isSwapSource ? '#fff3e0' : isSwapTarget ? '#f0e8ff' : isSelected ? '#ddeeff' : isDuplicate ? '#fff0f0' : seat.status === 'empty' ? 'transparent' : c.bg,
      border: isSwapSource ? '2px solid #e07800' : isSwapTarget ? '2px dashed #8040e0' : isSelected ? '2px solid #4080ee' : isDuplicate ? '2px solid #e05050' : seat.status === 'empty' ? '2px solid transparent' : `2px solid ${c.border}`,
      boxShadow: isSelected ? '0 4px 16px rgba(64,128,238,0.25)' : seat.status !== 'empty' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      transition: 'all 0.15s ease', transform: isSwapSource ? 'translateY(-3px) scale(1.06)' : isSelected ? 'translateY(-2px) scale(1.04)' : 'scale(1)',
      animation: (swapMode && !isSwapSource && seat.status !== 'empty') ? 'swapPulse 1.4s ease-in-out infinite' : 'none',
      overflow: 'hidden', justifyContent: 'flex-start',
    }}>
      <SeatIcon status={status} size={ic} />
      <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: c.text, letterSpacing: 0.5, whiteSpace: 'nowrap', marginTop: 2 }}>{seat.id}</div>
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 2 }}>
        {seat.name && <div style={{ fontSize: compact ? 9 : 11, color: c.text, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word', whiteSpace: 'normal', width: '100%', display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{seat.name}{seat.status === 'vip' ? ' ★' : ''}</div>}
        {isDuplicate && !isSelected && <div style={{ fontSize: 8, color: '#e05050', fontWeight: 700 }}>⚠</div>}
        {seat.status === 'vip' && !seat.name && <div style={{ fontSize: 9, color: '#f0a500' }}>★</div>}
        {isSwapTarget && <div style={{ fontSize: 8, color: '#8040e0', fontWeight: 700 }}>↔</div>}
      </div>
    </div>
  );
}

function SideSeat({ seat, isSelected, isDuplicate, isSwapSource, isSwapTarget, swapMode, onClick, namePosition, compact }) {
  const status = isSwapSource ? 'swapSource' : isSwapTarget ? 'swapTarget' : isSelected ? 'selected' : isDuplicate ? 'duplicate' : seat.status;
  const c = COLORS[status] || COLORS.empty;
  const w = compact ? 158 : 220, ic = compact ? 26 : 34;
  const nameBlock = (
    <div style={{ flex: 1, fontSize: compact ? 11 : 13, color: seat.name ? c.text : 'transparent', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', minWidth: 0 }}>
      {seat.name || '·'}{isDuplicate && <span style={{ color: '#e05050', marginLeft: 4, fontSize: 10 }}>⚠</span>}
      {seat.status === 'vip' && seat.name && !isDuplicate && <span style={{ color: '#f0a500', marginLeft: 3 }}>★</span>}
      {isSwapTarget && <span style={{ color: '#8040e0', marginLeft: 4, fontSize: 10 }}>↔</span>}
    </div>
  );
  return (
    <div onClick={onClick} style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: compact ? 3 : 6,
      cursor: 'pointer', padding: compact ? '2px 4px' : '2px 6px', borderRadius: 10,
      background: isSwapSource ? '#fff3e0' : isSwapTarget ? '#f0e8ff' : isSelected ? '#ddeeff' : isDuplicate ? '#fff0f0' : seat.status === 'empty' ? 'transparent' : c.bg,
      border: isSwapSource ? '2px solid #e07800' : isSwapTarget ? '2px dashed #8040e0' : isSelected ? '2px solid #4080ee' : isDuplicate ? '2px solid #e05050' : seat.status === 'empty' ? '2px solid transparent' : `2px solid ${c.border}`,
      boxShadow: isSelected ? '0 4px 16px rgba(64,128,238,0.25)' : seat.status !== 'empty' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      transition: 'all 0.15s ease', transform: isSwapSource ? 'scale(1.04)' : isSelected ? 'scale(1.03)' : 'scale(1)',
      animation: (swapMode && !isSwapSource && seat.status !== 'empty') ? 'swapPulse 1.4s ease-in-out infinite' : 'none',
      height: compact ? 42 : 50, width: w,
    }}>
      {namePosition === 'left' && nameBlock}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <SeatIcon status={status} size={ic} />
        <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: c.text }}>{seat.id}</div>
      </div>
      {namePosition === 'right' && nameBlock}
    </div>
  );
}

// Small circular/pill resize button
function RBtn({ onClick, disabled, red, children, pill }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: pill ? 'auto' : 32, height: 32, minWidth: pill ? 48 : 32,
      borderRadius: pill ? 8 : '50%', flexShrink: 0,
      background: disabled ? '#f0f0f0' : red ? '#fff0f0' : '#e8fff4',
      border: `1.5px solid ${disabled ? '#ddd' : red ? '#e07070' : '#4caf82'}`,
      color: disabled ? '#bbb' : red ? '#a02020' : '#1a6a42',
      fontWeight: 800, fontSize: 15, cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', padding: pill ? '0 10px' : 0,
    }}>{children}</button>
  );
}

function SwapBanner({ swapSource, seats, onCancel }) {
  const src = seats.find(s => s.id === swapSource);
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 400, background: 'linear-gradient(90deg,#fff3e0,#f0e8ff)', border: '2px solid #e07800', borderRadius: 14, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 6px 24px rgba(224,120,0,0.18)', animation: 'slideDown 0.25s ease' }}>
      <div style={{ fontSize: 20 }}>↔️</div>
      <div style={{ flex: 1, minWidth: 100 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#7a3a00' }}>SWAP — {swapSource}</div>
        <div style={{ fontSize: 10, color: '#c07030', marginTop: 1 }}>{src?.name ? <>Moving <strong>{src.name}</strong> · tap another seat</> : <>Tap any other seat</>}</div>
      </div>
      <button onClick={onCancel} style={{ background: '#fff', border: '1.5px solid #e07800', borderRadius: 10, padding: '6px 12px', color: '#a04000', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Cancel</button>
    </div>
  );
}

function SwapToast({ fromSeat, toSeat, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg,#1a3a1a,#0a2a3a)', color: '#fff', borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 600, fontSize: 13, fontWeight: 600, animation: 'toastIn 0.3s ease', whiteSpace: 'nowrap', maxWidth: '90vw' }}>
      <span style={{ fontSize: 18 }}>✅</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ color: '#7ef7b4' }}>{fromSeat.id}</span>{fromSeat.name ? ` (${fromSeat.name})` : ''} ↔ <span style={{ color: '#b87af7' }}>{toSeat.id}</span>{toSeat.name ? ` (${toSeat.name})` : ''}</span>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fffaf7', borderRadius: 20, border: '1.5px solid #f0d8cc', padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 12px 48px rgba(200,120,80,0.18)' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2a2a', marginBottom: 8 }}>Are you sure?</div>
        <div style={{ fontSize: 13, color: '#a08070', marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #d0c0b8', borderRadius: 10, padding: '12px 0', color: '#806050', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: '#fff0f0', border: '1.5px solid #e07070', borderRadius: 10, padding: '12px 0', color: '#a02020', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Clear All</button>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ seats, onClose, onImport }) {
  const [rawText, setRawText] = useState('');
  const [names, setNames] = useState([]);
  const [step, setStep] = useState('paste');
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const emptySeats = seats.filter(s => s.status === 'empty');
  const handleParse = () => { const p = rawText.split('\n').map(n => n.trim()).filter(Boolean); if (!p.length) return; setNames(p); setStep('order'); };
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (i) => { if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; } const r = [...names]; const [m] = r.splice(dragIdx, 1); r.splice(i, 0, m); setNames(r); setDragIdx(null); setOverIdx(null); };
  const handleImport = () => { onImport(names.slice(0, emptySeats.length).map((n, i) => ({ ...emptySeats[i], name: n, status: 'assigned' }))); onClose(); };
  const canAssign = Math.min(names.length, emptySeats.length);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fffaf7', borderRadius: '24px 24px 0 0', border: '1.5px solid #f0d8cc', padding: '24px 20px 36px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(200,120,80,0.18)' }}>
        <div style={{ width: 40, height: 4, background: '#e0c8b8', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div><div style={{ fontSize: 17, fontWeight: 800, color: '#3a2a2a' }}>📋 Bulk Import</div><div style={{ fontSize: 11, color: '#c49a8a', marginTop: 2 }}>{step === 'paste' ? 'One name per line' : `${canAssign} will be assigned`}</div></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#c49a8a', padding: 4 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {['Paste Names', 'Set Order', 'Import'].map((label, i) => { const sn = step === 'paste' ? 0 : 1; return <div key={label} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, background: i <= sn ? '#fff0ea' : '#f5f0ee', color: i <= sn ? '#e07850' : '#c4b0a8', border: `1.5px solid ${i <= sn ? '#e07850' : '#f0d8cc'}` }}>{i + 1}. {label}</div>; })}
        </div>
        {step === 'paste' && (<>
          <textarea value={rawText} onChange={e => setRawText(e.target.value)} placeholder={'Ahmed Al-Rashid\nSarah Johnson\n...'} style={{ width: '100%', boxSizing: 'border-box', height: 180, background: '#fff5f0', border: '1.5px solid #f0c0a0', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#3a2a2a', outline: 'none', fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' }} />
          <div style={{ fontSize: 11, color: '#c49a8a', marginTop: 6, marginBottom: 14 }}>{rawText.split('\n').filter(n => n.trim()).length} names · {emptySeats.length} empty seats</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #d0c0b8', borderRadius: 10, padding: '13px 0', color: '#806050', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={handleParse} disabled={!rawText.trim()} style={{ flex: 2, background: rawText.trim() ? '#fff0ea' : '#f5f0ee', border: `1.5px solid ${rawText.trim() ? '#e07850' : '#ddd'}`, borderRadius: 10, padding: '13px 0', color: rawText.trim() ? '#e07850' : '#bbb', fontWeight: 700, fontSize: 14, cursor: rawText.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>Next →</button>
          </div>
        </>)}
        {step === 'order' && (<>
          <div style={{ fontSize: 12, color: '#a08070', marginBottom: 10, background: '#fff5f0', borderRadius: 8, padding: '8px 12px', border: '1px solid #f0d8cc' }}>💡 Drag to reorder. Max <strong>{emptySeats.length}</strong> seats.</div>
          <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 14 }}>
            {names.map((n, i) => { const seat = emptySeats[i]; const ok = !!seat; return (
              <div key={i} draggable onDragStart={() => onDragStart(i)} onDragOver={e => onDragOver(e, i)} onDrop={() => onDrop(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', marginBottom: 4, borderRadius: 10, background: overIdx === i ? '#e8f0ff' : ok ? '#fffaf7' : '#fff5f5', border: `1.5px solid ${overIdx === i ? '#4080ee' : ok ? '#f0d8cc' : '#f0c0c0'}`, cursor: 'grab', opacity: dragIdx === i ? 0.4 : 1 }}>
                <div style={{ fontSize: 14, color: '#ccc', userSelect: 'none' }}>⠿</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: ok ? '#e07850' : '#e07070' }}>{seat ? seat.id : '—'}</div>
                <div style={{ flex: 3, fontSize: 13, color: ok ? '#3a2a2a' : '#c09090' }}>{n}</div>
                <div style={{ fontSize: 11, color: ok ? '#4caf82' : '#e07070' }}>{ok ? '✓' : 'skip'}</div>
              </div>
            ); })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep('paste')} style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #d0c0b8', borderRadius: 10, padding: '13px 0', color: '#806050', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
            <button onClick={handleImport} style={{ flex: 2, background: '#e8fff4', border: '1.5px solid #4caf82', borderRadius: 10, padding: '13px 0', color: '#1a6a42', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Assign {canAssign}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── Desktop Floating Editor ───────────────────────────────────────────────────
function FloatingEditor({ selData, name, setName, assign, toggleVIP, clearSeat, onCancel, onStartSwap, anchorY, duplicateOf }) {
  const panelRef = useRef(null);
  const [top, setTop] = useState(0);
  useEffect(() => {
    if (!selData || !panelRef.current) return;
    const panelH = panelRef.current.offsetHeight || 260;
    const viewH = window.innerHeight, scrollY = window.scrollY;
    let t = anchorY + scrollY - panelH / 2;
    t = Math.max(scrollY + 12, Math.min(t, scrollY + viewH - panelH - 12));
    setTop(t);
  }, [selData, anchorY]);
  if (!selData) return null;
  return (
    <div ref={panelRef} style={{ position: 'absolute', top, right: 16, width: 240, background: '#fffaf7', borderRadius: 20, border: `2px solid ${duplicateOf ? '#e05050' : '#f0c0a0'}`, padding: 18, boxShadow: `0 8px 36px ${duplicateOf ? 'rgba(224,80,80,0.2)' : 'rgba(200,120,80,0.18)'}`, zIndex: 500, transition: 'top 0.2s ease' }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: '#c49a8a', marginBottom: 8, fontWeight: 700 }}>✏️ EDITING — {selData.id}</div>
      {duplicateOf && <div style={{ background: '#fff0f0', border: '1.5px solid #e05050', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: '#a02020', fontWeight: 600, lineHeight: 1.4 }}>⚠️ Duplicate! <strong>{name}</strong> in <strong>{duplicateOf}</strong></div>}
      <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && assign()} placeholder="Guest name…" autoFocus style={{ width: '100%', boxSizing: 'border-box', background: duplicateOf ? '#fff5f5' : '#fff5f0', border: `1.5px solid ${duplicateOf ? '#e07070' : '#f0c0a0'}`, borderRadius: 10, padding: '10px 14px', color: '#3a2a2a', fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 10 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: '✓ Assign', fn: assign,    bg: duplicateOf ? '#fff5f5' : '#e8fff4', border: duplicateOf ? '#e07070' : '#4caf82', color: duplicateOf ? '#a02020' : '#1a6a42' },
          { label: '★ VIP',   fn: toggleVIP, bg: '#fff8e0', border: '#f0a500', color: '#7a5000' },
          { label: '✕ Clear', fn: clearSeat, bg: '#fff0f0', border: '#e07070', color: '#a02020' },
          { label: 'Cancel',  fn: onCancel,  bg: '#f5f5f5', border: '#d0c0b8', color: '#806050' },
        ].map(b => <button key={b.label} onClick={b.fn} style={{ background: b.bg, border: `1.5px solid ${b.border}`, borderRadius: 10, padding: '10px 0', color: b.color, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{b.label}</button>)}
      </div>
      <button onClick={onStartSwap} style={{ marginTop: 8, width: '100%', background: 'linear-gradient(90deg,#fff3e0,#f0e8ff)', border: '1.5px solid #c070e0', borderRadius: 10, padding: '10px 0', color: '#6020a0', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>↔ Swap Seat</button>
    </div>
  );
}

// ── Mobile Bottom Sheet Editor ────────────────────────────────────────────────
function BottomSheetEditor({ selData, name, setName, assign, toggleVIP, clearSeat, onCancel, onStartSwap, duplicateOf }) {
  const inputRef = useRef(null);
  useEffect(() => { if (selData) setTimeout(() => inputRef.current?.focus(), 120); }, [selData?.id]);
  if (!selData) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 490, animation: 'fadeIn 0.2s ease' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 495, background: '#fffaf7', borderRadius: '24px 24px 0 0', border: `2px solid ${duplicateOf ? '#e05050' : '#f0c0a0'}`, borderBottom: 'none', padding: '16px 18px 44px', boxShadow: '0 -8px 40px rgba(200,120,80,0.2)', animation: 'sheetUp 0.25s ease' }}>
        <div style={{ width: 40, height: 4, background: '#e0c8b8', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#c49a8a', letterSpacing: 2 }}>✏️ {selData.id}</div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#c49a8a', padding: 4 }}>✕</button>
        </div>
        {duplicateOf && <div style={{ background: '#fff0f0', border: '1.5px solid #e05050', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#a02020', fontWeight: 600 }}>⚠️ <strong>{name}</strong> already in <strong>{duplicateOf}</strong></div>}
        <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && assign()} placeholder="Guest name…"
          style={{ width: '100%', boxSizing: 'border-box', background: duplicateOf ? '#fff5f5' : '#fff5f0', border: `1.5px solid ${duplicateOf ? '#e07070' : '#f0c0a0'}`, borderRadius: 12, padding: '14px 16px', color: '#3a2a2a', fontSize: 16, outline: 'none', fontFamily: 'inherit', marginBottom: 14 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[
            { label: '✓ Assign', fn: assign,    bg: duplicateOf ? '#fff5f5' : '#e8fff4', border: duplicateOf ? '#e07070' : '#4caf82', color: duplicateOf ? '#a02020' : '#1a6a42' },
            { label: '★ VIP',   fn: toggleVIP, bg: '#fff8e0', border: '#f0a500', color: '#7a5000' },
            { label: '✕ Clear', fn: clearSeat, bg: '#fff0f0', border: '#e07070', color: '#a02020' },
            { label: 'Cancel',  fn: onCancel,  bg: '#f5f5f5', border: '#d0c0b8', color: '#806050' },
          ].map(b => <button key={b.label} onClick={b.fn} style={{ background: b.bg, border: `1.5px solid ${b.border}`, borderRadius: 12, padding: '14px 0', color: b.color, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>{b.label}</button>)}
        </div>
        <button onClick={onStartSwap} style={{ width: '100%', background: 'linear-gradient(90deg,#fff3e0,#f0e8ff)', border: '1.5px solid #c070e0', borderRadius: 12, padding: '14px 0', color: '#6020a0', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>↔ Swap Seat</button>
      </div>
    </>
  );
}

function PrintView({ seats, onClose }) {
  const top = seats.filter(s => s.row === 'top'), left = seats.filter(s => s.row === 'left'), right = seats.filter(s => s.row === 'right');
  const assigned = seats.filter(s => s.name).length, vips = seats.filter(s => s.status === 'vip').length;
  const printDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const cs = (s) => ({ border: '1px solid #ccc', borderRadius: 6, padding: '4px 6px', textAlign: 'center', background: s.status === 'vip' ? '#fffde7' : s.name ? '#f0faf5' : '#fafafa', minWidth: 70, minHeight: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 });
  return (<>
    <style>{`@media print { body > *:not(#print-root) { display: none !important; } #print-root { display: block !important; } .no-print { display: none !important; } @page { margin: 12mm; size: A4 landscape; } }`}</style>
    <div id="print-root" style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 2000, overflowY: 'auto', padding: '24px 32px', fontFamily: "'Segoe UI',Arial,sans-serif", color: '#111' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: '#666' }}>Print Preview (A4 Landscape)</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: '1.5px solid #ddd', borderRadius: 10, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#666' }}>✕ Close</button>
          <button onClick={() => window.print()} style={{ background: '#1a1a2e', border: 'none', borderRadius: 10, padding: '9px 24px', fontSize: 13, cursor: 'pointer', fontWeight: 700, color: '#fff' }}>🖨 Print</button>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px solid #111', paddingBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>SEATING PLAN</div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Printed: {printDate} · Total: {seats.length} · Assigned: {assigned} · VIP: {vips} · Empty: {seats.length - assigned}</div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}><div style={{ display: 'inline-block', border: '2px solid #111', borderRadius: 6, padding: '4px 32px', fontSize: 12, fontWeight: 700, letterSpacing: 4 }}>▼ STAGE / FRONT ▼</div></div>
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 18, flexWrap: 'nowrap' }}>
        {top.map(s => (<div key={s.id} style={cs(s)}><div style={{ fontSize: 9, fontWeight: 800, color: '#555' }}>{s.id}</div>{s.name && <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-word' }}>{s.name}</div>}{s.status === 'vip' && <div style={{ fontSize: 8, color: '#b8860b' }}>★ VIP</div>}{!s.name && <div style={{ fontSize: 9, color: '#ccc' }}>—</div>}</div>))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', marginBottom: 6, textAlign: 'center' }}>LEFT SECTION</div><div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{left.map(s => (<div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 6, padding: '5px 10px', background: s.status === 'vip' ? '#fffde7' : s.name ? '#f0faf5' : '#fafafa', minHeight: 32 }}><div style={{ fontSize: 10, fontWeight: 800, color: '#555', minWidth: 28 }}>{s.id}</div><div style={{ fontSize: 12, fontWeight: 600, color: '#111', flex: 1 }}>{s.name || <span style={{ color: '#ccc' }}>—</span>}</div>{s.status === 'vip' && <div style={{ fontSize: 9, color: '#b8860b', fontWeight: 700 }}>★</div>}</div>))}</div></div>
        <div style={{ width: 1, background: '#ddd', alignSelf: 'stretch' }} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', marginBottom: 6, textAlign: 'center' }}>RIGHT SECTION</div><div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{right.map(s => (<div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 6, padding: '5px 10px', background: s.status === 'vip' ? '#fffde7' : s.name ? '#f0faf5' : '#fafafa', minHeight: 32 }}><div style={{ fontSize: 10, fontWeight: 800, color: '#555', minWidth: 28 }}>{s.id}</div><div style={{ fontSize: 12, fontWeight: 600, color: '#111', flex: 1 }}>{s.name || <span style={{ color: '#ccc' }}>—</span>}</div>{s.status === 'vip' && <div style={{ fontSize: 9, color: '#b8860b', fontWeight: 700 }}>★</div>}</div>))}</div></div>
      </div>
      <div style={{ marginTop: 20, borderTop: '1px solid #ddd', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa' }}><span>□ Empty ■ Assigned ★ VIP</span><span>Generated by المنصة الرئيسية</span></div>
    </div>
  </>);
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SeatingPlan() {
  const isMobile = useIsMobile();
  const [seats, setSeats] = useState(buildSeats());
  const [topCount, setTopCount] = useState(DEFAULT_TOP);
  const [sideCount, setSideCount] = useState(DEFAULT_SIDE);
  const [sel, setSel] = useState(null);
  const [name, setName] = useState('');
  const [tab, setTab] = useState('plan');
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [lastSavedDisplay, setLastSavedDisplay] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [anchorY, setAnchorY] = useState(200);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [swapSource, setSwapSource] = useState(null);
  const [swapToast, setSwapToast] = useState(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const presenceRef = useRef(null);
  const isSaving = useRef(false);
  const isCleared = useRef(false);

  // Presence
  useEffect(() => {
    const uid = Math.random().toString(36).slice(2);
    const ch = 'seating-presence';
    const RURL = `${SUPABASE_URL.replace('https://', 'wss://')}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
    let ws, hb, pm = {};
    const send = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
    const connect = () => {
      ws = new WebSocket(RURL);
      ws.onopen = () => {
        send({ topic: `realtime:${ch}`, event: 'phx_join', payload: { config: { presence: { key: uid }, broadcast: { self: true } } }, ref: '1' });
        setTimeout(() => send({ topic: `realtime:${ch}`, event: 'broadcast', payload: { type: 'broadcast', event: 'presence', payload: { uid, ts: Date.now() } }, ref: '2' }), 500);
        hb = setInterval(() => {
          send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'hb' });
          send({ topic: `realtime:${ch}`, event: 'broadcast', payload: { type: 'broadcast', event: 'presence', payload: { uid, ts: Date.now() } }, ref: 'hb2' });
        }, 20000);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'broadcast' && msg.payload?.event === 'presence') {
            const { uid: u, ts } = msg.payload.payload || {};
            if (u) pm[u] = ts;
            const now = Date.now();
            Object.keys(pm).forEach(k => { if (now - pm[k] > 50000) delete pm[k]; });
            pm[uid] = now;
            setOnlineCount(Object.keys(pm).length);
          }
        } catch {}
      };
      ws.onclose = () => { clearInterval(hb); setTimeout(connect, 3000); };
    };
    connect();
    presenceRef.current = { disconnect: () => { clearInterval(hb); ws?.close(); } };
    return () => presenceRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => { setLastSavedDisplay(lastSaved ? formatTimestamp(lastSaved) : null); }, 30000);
    return () => clearInterval(t);
  }, [lastSaved]);

  useEffect(() => {
    loadSeats().then(s => {
      setSeats(s);
      const tc = s.filter(x => x.row === 'top').length, sc = s.filter(x => x.row === 'left').length;
      if (tc > 0) setTopCount(tc); if (sc > 0) setSideCount(sc);
      setLoaded(true);
    });
    const poll = setInterval(() => { if (!isSaving.current && !isCleared.current) loadSeats().then(s => setSeats(s)); }, 20000);
    return () => clearInterval(poll);
  }, []);

  const getDuplicateMap = (sl) => {
    const nm = {}; sl.forEach(s => { if (s.name) { const k = s.name.trim().toLowerCase(); if (!nm[k]) nm[k] = []; nm[k].push(s.id); } });
    const dm = {}; Object.values(nm).forEach(ids => { if (ids.length > 1) ids.forEach(id => { dm[id] = ids.find(x => x !== id); }); }); return dm;
  };
  const pushHistory = (cur) => { setHistory(prev => { const n = [...prev, cur]; return n.length > 10 ? n.slice(-10) : n; }); setFuture([]); };
  const markSaved = () => { const now = new Date(); setLastSaved(now); setLastSavedDisplay(formatTimestamp(now)); setSaveStatus('saved'); isSaving.current = false; };

  const updateSeat = (us) => {
    setSeats(prev => { pushHistory(prev); const next = prev.map(s => s.id === us.id ? us : s); setSaveStatus('saving'); isSaving.current = true; saveSeat(us).then(markSaved).catch(() => { setSaveStatus('error'); isSaving.current = false; }); return next; });
  };
  const executeSwap = (idA, idB) => {
    setSeats(prev => {
      pushHistory(prev);
      const a = prev.find(s => s.id === idA), b = prev.find(s => s.id === idB);
      const na = { ...a, name: b.name, status: b.status }, nb = { ...b, name: a.name, status: a.status };
      const next = prev.map(s => s.id === idA ? na : s.id === idB ? nb : s);
      setSaveStatus('saving'); isSaving.current = true;
      Promise.all([saveSeat(na), saveSeat(nb)]).then(markSaved).catch(() => { setSaveStatus('error'); isSaving.current = false; });
      setSwapToast({ fromSeat: a, toSeat: b });
      return next;
    });
    setSwapSource(null); setSel(null); setName('');
  };
  const applyLayout = (fn) => {
    setSeats(prev => {
      pushHistory(prev); const next = fn(prev);
      setTopCount(next.filter(s => s.row === 'top').length); setSideCount(next.filter(s => s.row === 'left').length);
      setSaveStatus('saving'); isSaving.current = true;
      syncLayoutChange(next, prev).then(markSaved).catch(() => { setSaveStatus('error'); isSaving.current = false; });
      return next;
    }); setSel(null); setName('');
  };
  const undo = () => { if (!history.length) return; const prev = history[history.length - 1]; setHistory(h => h.slice(0, -1)); setFuture(f => [seats, ...f].slice(0, 10)); setSeats(prev); setSaveStatus('saving'); isSaving.current = true; saveAllSeats(prev).then(markSaved).catch(() => { setSaveStatus('error'); isSaving.current = false; }); };
  const redo = () => { if (!future.length) return; const next = future[0]; setFuture(f => f.slice(1)); setHistory(h => [...h, seats].slice(-10)); setSeats(next); setSaveStatus('saving'); isSaving.current = true; saveAllSeats(next).then(markSaved).catch(() => { setSaveStatus('error'); isSaving.current = false; }); };
  const handleBulkImport = (assignments) => { pushHistory(seats); const updated = seats.map(s => { const m = assignments.find(a => a.id === s.id); return m ? m : s; }); setSeats(updated); setSaveStatus('saving'); isSaving.current = true; saveAllSeats(assignments).then(markSaved).catch(() => { setSaveStatus('error'); isSaving.current = false; }); };
  const getSeat = (id) => seats.find(s => s.id === id);
  const select = (id, event) => {
    if (swapSource && id !== swapSource) { executeSwap(swapSource, id); return; }
    if (swapSource && id === swapSource) { setSwapSource(null); setSel(null); setName(''); return; }
    if (sel === id) { setSel(null); setName(''); return; }
    setSel(id); setName(getSeat(id)?.name || '');
    if (event && !isMobile) { const rect = event.currentTarget.getBoundingClientRect(); setAnchorY(rect.top + rect.height / 2); }
  };
  const assign    = () => { if (!sel) return; const s = getSeat(sel); updateSeat({ ...s, name, status: name ? (s.status === 'vip' ? 'vip' : 'assigned') : 'empty' }); setSel(null); setName(''); };
  const toggleVIP = () => { if (!sel) return; const s = getSeat(sel); updateSeat({ ...s, status: s.status === 'vip' ? (s.name ? 'assigned' : 'empty') : 'vip' }); setSel(null); setName(''); };
  const clearSeat = () => { if (!sel) return; updateSeat({ ...getSeat(sel), name: '', status: 'empty' }); setName(''); setSel(null); };
  const confirmClearAll = () => { setShowConfirm(false); pushHistory(seats); setSeats(buildSeats(topCount, sideCount)); setSel(null); setName(''); setSwapSource(null); setSaveStatus('saving'); isSaving.current = true; isCleared.current = true; clearAllSeats(topCount, sideCount).then(markSaved).catch(() => { setSaveStatus('error'); isSaving.current = false; }); };

  const topSeats = seats.filter(s => s.row === 'top');
  const leftSeats = seats.filter(s => s.row === 'left');
  const rightSeats = seats.filter(s => s.row === 'right');
  const assigned = seats.filter(s => s.name).length;
  const vips = seats.filter(s => s.status === 'vip').length;
  const emptyCount = seats.filter(s => s.status === 'empty').length;
  const selData = sel ? getSeat(sel) : null;
  const dupMap = getDuplicateMap(seats);
  const dupCount = Object.keys(dupMap).length / 2;
  const currentDupOf = name.trim() ? seats.find(s => s.id !== sel && s.name && s.name.trim().toLowerCase() === name.trim().toLowerCase())?.id || null : null;

  const sp = (s) => ({
    seat: s, isSelected: !swapSource && sel === s.id, isDuplicate: !!dupMap[s.id],
    isSwapSource: swapSource === s.id, isSwapTarget: !!swapSource && swapSource !== s.id,
    swapMode: !!swapSource, onClick: (e) => select(s.id, e), compact: isMobile,
  });
  const ep = {
    selData, name, setName, assign, toggleVIP, clearSeat,
    onCancel: () => { setSel(null); setName(''); },
    onStartSwap: () => { if (sel) { setSwapSource(sel); setSel(null); setName(''); } },
    duplicateOf: currentDupOf,
  };

  if (!loaded) return <div style={{ minHeight: '100vh', background: '#fdf6f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', color: '#b08070', fontSize: 18, letterSpacing: 4 }}>Loading seats...</div>;

  const M = isMobile; // shorthand

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fdf6f0 0%,#fdeee4 50%,#fdf0f8 100%)', fontFamily: "'Segoe UI',sans-serif", color: '#3a2a2a', padding: M ? '16px 8px 100px' : '28px 16px 60px', position: 'relative' }}>

      <style>{`
        @keyframes swapPulse { 0%,100%{box-shadow:0 0 0 0 rgba(128,64,224,.3)}50%{box-shadow:0 0 0 6px rgba(128,64,224,.12)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn  { from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes onlinePulse { 0%,100%{box-shadow:0 0 0 2px rgba(76,175,130,.3)}50%{box-shadow:0 0 0 5px rgba(76,175,130,.08)} }
        @keyframes sheetUp  { from{transform:translateY(100%)}to{transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0}to{opacity:1} }
      `}</style>

      {showConfirm && <ConfirmDialog message="This will permanently clear all seat assignments." onConfirm={confirmClearAll} onCancel={() => setShowConfirm(false)} />}
      {showBulk   && <BulkImportModal seats={seats} onClose={() => setShowBulk(false)} onImport={handleBulkImport} />}
      {showPrint  && <PrintView seats={seats} onClose={() => setShowPrint(false)} />}
      {swapToast  && <SwapToast fromSeat={swapToast.fromSeat} toSeat={swapToast.toSeat} onDismiss={() => setSwapToast(null)} />}

      {!M  && !swapSource && <FloatingEditor {...ep} anchorY={anchorY} />}
      {M   && !swapSource && <BottomSheetEditor {...ep} />}

      {/* ── HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: M ? 14 : 24 }}>
        <div style={{ fontSize: M ? 9 : 11, letterSpacing: M ? 3 : 6, color: '#c49a8a', textTransform: 'uppercase', marginBottom: 4 }}>Event Seating System</div>
        <h1 style={{ margin: 0, fontSize: M ? 22 : 34, fontWeight: 900, letterSpacing: '-1px', background: 'linear-gradient(90deg,#e07850,#d050a0,#6060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>المنصة الرئيسية</h1>
        <div style={{ fontSize: 10, color: '#c49a8a', marginTop: 4, letterSpacing: 2 }}>{topCount} TOP · {sideCount} L · {sideCount} R · {seats.length} SEATS</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: saveStatus === 'saved' ? '#4caf82' : saveStatus === 'saving' ? '#f0a500' : '#e05050' }}>
            {saveStatus === 'saved' ? '✓ SAVED' : saveStatus === 'saving' ? '● SAVING...' : '✕ ERROR'}
          </div>
          {lastSavedDisplay && saveStatus === 'saved' && !M && <div style={{ fontSize: 11, color: '#b8a090' }}>· {lastSavedDisplay}</div>}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fff8', border: '1.5px solid #4caf82', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#1a6a42' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf82', display: 'inline-block', animation: 'onlinePulse 2s ease-in-out infinite' }} />
            {onlineCount} online
          </div>
        </div>
        {dupCount > 0 && <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff0f0', border: '1.5px solid #e05050', borderRadius: 10, padding: '5px 12px', fontSize: 12, color: '#a02020', fontWeight: 600 }}>⚠️ {dupCount} duplicate{dupCount > 1 ? 's' : ''}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={undo} disabled={!history.length} style={{ background: history.length ? '#eeeeff' : '#f5f5f5', border: `1.5px solid ${history.length ? '#6060e0' : '#ddd'}`, borderRadius: 10, padding: M ? '7px 12px' : '7px 18px', color: history.length ? '#4040c0' : '#bbb', fontWeight: 700, fontSize: M ? 12 : 12, cursor: history.length ? 'pointer' : 'default', fontFamily: 'inherit' }}>↩ Undo{history.length > 0 ? ` (${history.length})` : ''}</button>
          <button onClick={redo}  disabled={!future.length}  style={{ background: future.length  ? '#eeeeff' : '#f5f5f5', border: `1.5px solid ${future.length  ? '#6060e0' : '#ddd'}`, borderRadius: 10, padding: M ? '7px 12px' : '7px 18px', color: future.length  ? '#4040c0' : '#bbb', fontWeight: 700, fontSize: M ? 12 : 12, cursor: future.length  ? 'pointer' : 'default', fontFamily: 'inherit' }}>Redo{future.length  > 0 ? ` (${future.length})` : ''} ↪</button>
          <button onClick={() => setShowBulk(true)} style={{ background: 'linear-gradient(90deg,#fff0ea,#fde8ff)', border: '1.5px solid #e07850', borderRadius: 10, padding: M ? '7px 12px' : '7px 14px', color: '#e07850', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>📋 {M ? 'Import' : 'Bulk Import'}</button>
          {!M && <button onClick={() => setShowPrint(true)} style={{ background: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: 10, padding: '7px 20px', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>🖨 Print</button>}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: M ? 6 : 10, marginBottom: M ? 14 : 24, flexWrap: 'wrap' }}>
        {[{ label:'Total', val:seats.length, color:'#6060e0', bg:'#eeeeff' }, { label:'Assigned', val:assigned, color:'#3a9a6a', bg:'#e8fff4' }, { label:'VIP', val:vips, color:'#c07800', bg:'#fff8e0' }, { label:'Empty', val:emptyCount, color:'#b08070', bg:'#fff0ea' }].map(s => (
          <div key={s.label} style={{ padding: M ? '8px 14px' : '10px 22px', borderRadius: 16, background: s.bg, border: `1.5px solid ${s.color}22`, textAlign: 'center', minWidth: M ? 58 : 70 }}>
            <div style={{ fontSize: M ? 20 : 24, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: M ? 8 : 10, letterSpacing: 1, color: s.color, opacity: 0.7, marginTop: 2 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
        {dupCount > 0 && <div style={{ padding: M ? '8px 14px' : '10px 22px', borderRadius: 16, background: '#fff0f0', border: '1.5px solid #e0505022', textAlign: 'center', minWidth: M ? 58 : 70 }}><div style={{ fontSize: M ? 20 : 24, fontWeight: 800, color: '#e05050' }}>{dupCount}</div><div style={{ fontSize: M ? 8 : 10, letterSpacing: 1, color: '#e05050', opacity: 0.7, marginTop: 2 }}>DUPL.</div></div>}
      </div>

      {/* ── LAYOUT ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: M ? 'wrap' : 'nowrap', justifyContent: 'center' }}>

        {/* Canvas */}
        <div style={{ background: '#fffaf7', borderRadius: 20, border: `1.5px solid ${swapSource ? '#e07800' : '#f0d8cc'}`, padding: M ? '12px 8px' : '18px 14px 14px', boxShadow: swapSource ? '0 8px 40px rgba(224,120,0,0.15)' : '0 8px 40px rgba(200,120,80,0.10)', transition: 'border-color 0.2s', width: M ? '100%' : 'auto', boxSizing: 'border-box' }}>

          {swapSource && <SwapBanner swapSource={swapSource} seats={seats} onCancel={() => { setSwapSource(null); setSel(null); setName(''); }} />}

          {/* Stage label */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, gap: 8 }}>
            <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,transparent,#e0a090)', borderRadius: 2 }} />
            <div style={{ fontSize: M ? 9 : 11, letterSpacing: M ? 2 : 4, color: '#e07850', border: '2px solid #f0c0a0', padding: M ? '4px 10px' : '5px 20px', borderRadius: 8, background: '#fff5f0', fontWeight: 700, whiteSpace: 'nowrap' }}>▼ STAGE ▼</div>
            <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,#e0a090,transparent)', borderRadius: 2 }} />
          </div>

          {/* T-row with horizontal scroll on mobile */}
          <div style={{ overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', gap: M ? 2 : 4, alignItems: 'flex-start', flexWrap: 'nowrap', minWidth: 'min-content' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'center', marginRight: M ? 2 : 4, flexShrink: 0 }}>
                <RBtn onClick={() => applyLayout(insertTopLeft)} disabled={topCount >= MAX_TOP}>+</RBtn>
                <RBtn onClick={() => applyLayout(removeTopLeft)} disabled={topCount <= MIN_SEATS} red>−</RBtn>
              </div>
              {topSeats.map((s, idx) => {
                const ci = Math.floor((topCount - 1) / 2);
                return (
                  <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <TopSeat {...sp(s)} />
                    {idx === ci && <div style={{ fontSize: M ? 8 : 11, fontWeight: 900, color: '#111', letterSpacing: M ? 1 : 2, textTransform: 'uppercase', background: '#f5f0ea', border: '1.5px solid #c0a898', borderRadius: 6, padding: M ? '2px 5px' : '3px 8px', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}>CENTER</div>}
                  </div>
                );
              })}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'center', marginLeft: M ? 2 : 4, flexShrink: 0 }}>
                <RBtn onClick={() => applyLayout(insertTopRight)} disabled={topCount >= MAX_TOP}>+</RBtn>
                <RBtn onClick={() => applyLayout(removeTopRight)} disabled={topCount <= MIN_SEATS} red>−</RBtn>
              </div>
            </div>
          </div>

          <div style={{ height: M ? 10 : 20 }} />

          {/* Side columns */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: M ? 6 : 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: M ? 2 : 3 }}>
              {leftSeats.map(s => <SideSeat key={s.id} {...sp(s)} namePosition="right" />)}
              <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'center' }}>
                <RBtn onClick={() => applyLayout(insertSideBottom)} disabled={sideCount >= MAX_SIDE} pill>+ L</RBtn>
                <RBtn onClick={() => applyLayout(removeSideBottom)} disabled={sideCount <= MIN_SEATS} red pill>− L</RBtn>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: M ? 2 : 3 }}>
              {rightSeats.map(s => <SideSeat key={s.id} {...sp(s)} namePosition="left" />)}
              <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'center' }}>
                <RBtn onClick={() => applyLayout(insertSideBottom)} disabled={sideCount >= MAX_SIDE} pill>+ R</RBtn>
                <RBtn onClick={() => applyLayout(removeSideBottom)} disabled={sideCount <= MIN_SEATS} red pill>− R</RBtn>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: M ? 8 : 14, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {[{ label:'Empty', color:'#c9a8a8' }, { label:'Assigned', color:'#4caf82' }, { label:'VIP', color:'#f0a500' }, { label:'Selected', color:'#4080ee' }, { label:'Dup', color:'#e05050' }, { label:'Swap↔', color:'#e07800' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: M ? 9 : 11, color: '#a08070' }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: l.color, opacity: 0.8 }} />{l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Side / Bottom panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: M ? '100%' : 240, flexShrink: 0, boxSizing: 'border-box' }}>
          {!M && !selData && !swapSource && (
            <div style={{ background: '#fffaf7', borderRadius: 16, border: '1.5px solid #f0d8cc', padding: '14px 16px', color: '#c4a898', fontSize: 13, lineHeight: 1.7 }}>
              👆 Click any seat to edit.<br /><span style={{ fontSize: 12 }}>Tap <strong style={{ color: '#8040e0' }}>↔ Swap Seat</strong> to swap two seats.</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {['plan', 'guests'].map(t => <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? '#fff0ea' : '#fffaf7', border: `1.5px solid ${tab === t ? '#e07850' : '#f0d8cc'}`, borderRadius: 10, padding: '9px 0', color: tab === t ? '#e07850' : '#c49a8a', fontSize: 11, letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', fontWeight: 700 }}>{t}</button>)}
          </div>
          {tab === 'plan' && (
            <div style={{ background: '#fffaf7', borderRadius: 20, border: '1.5px solid #f0d8cc', padding: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#c49a8a', marginBottom: 10, fontWeight: 700 }}>LAYOUT INFO</div>
              {[{ label: 'Top Row', val: `T1–T${topCount}`, note: `${topCount} seats` }, { label: 'Left Col', val: `L1–L${sideCount}`, note: `${sideCount} seats` }, { label: 'Right Col', val: `R1–R${sideCount}`, note: `${sideCount} seats` }, { label: 'Total', val: `${seats.length} seats`, note: '' }].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5e8e0', fontSize: 12 }}>
                  <span style={{ color: '#c49a8a' }}>{r.label}</span>
                  <span style={{ color: '#e07850', fontWeight: 700 }}>{r.val} <span style={{ color: '#d0b8a8', fontWeight: 400 }}>{r.note}</span></span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {M && <button onClick={() => setShowPrint(true)} style={{ flex: 1, background: '#1a1a2e', border: 'none', borderRadius: 10, padding: '11px 0', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>🖨 Print</button>}
                <button onClick={() => setShowConfirm(true)} style={{ flex: 1, background: '#fff0f0', border: '1.5px solid #e07070', borderRadius: 10, padding: '11px 0', color: '#a02020', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>⌫ Clear All</button>
              </div>
            </div>
          )}
          {tab === 'guests' && (
            <div style={{ background: '#fffaf7', borderRadius: 20, border: '1.5px solid #f0d8cc', padding: 16, maxHeight: M ? 280 : 400, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#c49a8a', marginBottom: 10, fontWeight: 700 }}>GUEST LIST ({assigned})</div>
              {seats.filter(s => s.name).length === 0
                ? <div style={{ color: '#d0b8a8', fontSize: 13 }}>No guests assigned yet.</div>
                : seats.filter(s => s.name).map(s => (
                  <div key={s.id} onClick={() => select(s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: M ? '10px 0' : '7px 0', borderBottom: '1px solid #f5e8e0', cursor: 'pointer', fontSize: 13 }}>
                    <span style={{ color: dupMap[s.id] ? '#e05050' : s.status === 'vip' ? '#c07800' : '#6060e0', fontWeight: 700, minWidth: 44 }}>{s.id}{s.status === 'vip' ? ' ★' : ''}{dupMap[s.id] ? ' ⚠' : ''}</span>
                    <span style={{ color: dupMap[s.id] ? '#e05050' : '#806050', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: M ? 220 : 150 }}>{s.name}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}