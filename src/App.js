import React, { useState, useEffect, useRef } from 'react';

const SUPABASE_URL = 'https://ogbeczupngfuevmqdjdz.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYmVjenVwbmdmdWV2bXFkamR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTQyMDksImV4cCI6MjA4ODI3MDIwOX0.A4Hylx7B0qBDs0TWKCmC8ijUp71tzVrQ8fHGfLV7_2I';
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const TOP = 21, SIDE = 15;

function buildSeats() {
  const seats = [];
  for (let i = 0; i < TOP; i++)
    seats.push({ id: `T${i + 1}`, row: 'top', col: i, name: '', status: 'empty' });
  for (let i = 0; i < SIDE; i++)
    seats.push({ id: `L${i + 1}`, row: 'left', col: i, name: '', status: 'empty' });
  for (let i = 0; i < SIDE; i++)
    seats.push({ id: `R${i + 1}`, row: 'right', col: i, name: '', status: 'empty' });
  return seats;
}

async function loadSeats() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/seats?select=*`, { headers: HEADERS });
    const data = await res.json();
    if (Array.isArray(data) && data.length === 51) {
      return data.sort((a, b) => {
        const rowOrder = { top: 0, left: 1, right: 2 };
        if (rowOrder[a.row] !== rowOrder[b.row]) return rowOrder[a.row] - rowOrder[b.row];
        return a.col - b.col;
      });
    }
    await fetch(`${SUPABASE_URL}/rest/v1/seats`, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'ignore-duplicates' },
      body: JSON.stringify(buildSeats()),
    });
    return buildSeats();
  } catch { return buildSeats(); }
}

async function saveSeat(seat) {
  await fetch(`${SUPABASE_URL}/rest/v1/seats?id=eq.${seat.id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ name: seat.name, status: seat.status }),
  });
}

async function saveAllSeats(seats) {
  for (const seat of seats) {
    await fetch(`${SUPABASE_URL}/rest/v1/seats?id=eq.${seat.id}`, {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ name: seat.name, status: seat.status }),
    });
  }
}

async function clearAllSeats() {
  await fetch(`${SUPABASE_URL}/rest/v1/seats`, { method: 'DELETE', headers: HEADERS });
  await fetch(`${SUPABASE_URL}/rest/v1/seats`, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'ignore-duplicates' },
    body: JSON.stringify(buildSeats()),
  });
}

const COLORS = {
  empty:    { body: '#e2c9c9', legs: '#7a5c5c', border: '#c9a8a8', text: '#9e7c7c', bg: 'transparent' },
  assigned: { body: '#7ec8a4', legs: '#3a7a5c', border: '#4caf82', text: '#1a5c3c', bg: '#eafff4' },
  vip:      { body: '#f7c948', legs: '#b8860b', border: '#f0a500', text: '#7a4f00', bg: '#fff8e1' },
  selected: { body: '#7aabf7', legs: '#2355a0', border: '#4080ee', text: '#1a3a7a', bg: '#e8f0ff' },
};

function SeatIcon({ status, size = 40 }) {
  const c = COLORS[status];
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

// Top row seat — icon on top, id + name below
function TopSeat({ seat, isSelected, onClick }) {
  const status = isSelected ? 'selected' : seat.status;
  const c = COLORS[status];
  return (
    <div onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      cursor: 'pointer', width: 58, gap: 2, padding: '5px 3px 6px', borderRadius: 10,
      background: isSelected ? '#ddeeff' : seat.status === 'empty' ? 'transparent' : c.bg,
      border: isSelected ? '2px solid #4080ee' : seat.status === 'empty' ? '2px solid transparent' : `2px solid ${c.border}`,
      boxShadow: isSelected ? '0 4px 16px rgba(64,128,238,0.25)' : seat.status !== 'empty' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      transition: 'all 0.15s ease',
      transform: isSelected ? 'translateY(-2px) scale(1.05)' : 'scale(1)',
    }}>
      <SeatIcon status={status} size={38} />
      <div style={{ fontSize: 11, fontWeight: 700, color: c.text, letterSpacing: 0.5 }}>{seat.id}</div>
      {seat.name && (
        <div style={{ fontSize: 11, color: c.text, fontWeight: 600, maxWidth: 54, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
          {seat.name}
        </div>
      )}
      {seat.status === 'vip' && <div style={{ fontSize: 9, color: '#f0a500' }}>★</div>}
    </div>
  );
}

// Side seat — icon + id in center, name to the side
function SideSeat({ seat, isSelected, onClick, namePosition }) {
  // namePosition: 'right' for L seats (name appears to the right), 'left' for R seats
  const status = isSelected ? 'selected' : seat.status;
  const c = COLORS[status];

  const nameBlock = seat.name ? (
    <div style={{
      fontSize: 13, color: c.text, fontWeight: 600,
      maxWidth: 90, lineHeight: 1.3, wordBreak: 'break-word',
      textAlign: namePosition === 'right' ? 'left' : 'right',
    }}>
      {seat.name}
      {seat.status === 'vip' && <span style={{ color: '#f0a500', marginLeft: 3 }}>★</span>}
    </div>
  ) : null;

  return (
    <div onClick={onClick} style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      padding: '3px 6px',
      borderRadius: 10,
      background: isSelected ? '#ddeeff' : seat.status === 'empty' ? 'transparent' : c.bg,
      border: isSelected ? '2px solid #4080ee' : seat.status === 'empty' ? '2px solid transparent' : `2px solid ${c.border}`,
      boxShadow: isSelected ? '0 4px 16px rgba(64,128,238,0.25)' : seat.status !== 'empty' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      transition: 'all 0.15s ease',
      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
      minHeight: 48,
      minWidth: 160,
    }}>
      {/* For R seats: name LEFT, then icon+id RIGHT */}
      {namePosition === 'left' && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {nameBlock}
        </div>
      )}

      {/* Icon + seat id */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <SeatIcon status={status} size={38} />
        <div style={{ fontSize: 11, fontWeight: 700, color: c.text, letterSpacing: 0.5 }}>{seat.id}</div>
      </div>

      {/* For L seats: name RIGHT of icon */}
      {namePosition === 'right' && (
        <div style={{ flex: 1 }}>
          {nameBlock}
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fffaf7', borderRadius: 20, border: '1.5px solid #f0d8cc', padding: '32px 36px', maxWidth: 340, textAlign: 'center', boxShadow: '0 12px 48px rgba(200,120,80,0.18)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#3a2a2a', marginBottom: 8 }}>Are you sure?</div>
        <div style={{ fontSize: 13, color: '#a08070', marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #d0c0b8', borderRadius: 10, padding: '10px 0', color: '#806050', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: '#fff0f0', border: '1.5px solid #e07070', borderRadius: 10, padding: '10px 0', color: '#a02020', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Clear All</button>
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

  const handleParse = () => {
    const parsed = rawText.split('\n').map(n => n.trim()).filter(Boolean);
    if (parsed.length === 0) return;
    setNames(parsed);
    setStep('order');
  };

  const onDragStart = (i) => setDragIdx(i);
  const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...names];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(i, 0, moved);
    setNames(reordered);
    setDragIdx(null); setOverIdx(null);
  };

  const handleImport = () => {
    const assignments = names.slice(0, emptySeats.length).map((name, i) => ({
      ...emptySeats[i], name, status: 'assigned',
    }));
    onImport(assignments);
    onClose();
  };

  const canAssign = Math.min(names.length, emptySeats.length);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fffaf7', borderRadius: 24, border: '1.5px solid #f0d8cc', padding: '28px 28px 24px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 60px rgba(200,120,80,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#3a2a2a' }}>📋 Bulk Import</div>
            <div style={{ fontSize: 11, color: '#c49a8a', marginTop: 2 }}>
              {step === 'paste' ? 'Paste names — one per line' : `Drag to reorder · ${canAssign} will be assigned`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#c49a8a' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {['Paste Names', 'Set Order', 'Import'].map((label, i) => {
            const stepNum = step === 'paste' ? 0 : 1;
            return (
              <div key={label} style={{
                flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: i <= stepNum ? '#fff0ea' : '#f5f0ee',
                color: i <= stepNum ? '#e07850' : '#c4b0a8',
                border: `1.5px solid ${i <= stepNum ? '#e07850' : '#f0d8cc'}`,
              }}>{i + 1}. {label}</div>
            );
          })}
        </div>

        {step === 'paste' && (
          <>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={'Ahmed Al-Rashid\nSarah Johnson\nMohamed Ali\n...'}
              style={{ width: '100%', boxSizing: 'border-box', height: 220, background: '#fff5f0', border: '1.5px solid #f0c0a0', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#3a2a2a', outline: 'none', fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' }}
            />
            <div style={{ fontSize: 11, color: '#c49a8a', marginTop: 6, marginBottom: 16 }}>
              {rawText.split('\n').filter(n => n.trim()).length} names detected · {emptySeats.length} empty seats available
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #d0c0b8', borderRadius: 10, padding: '11px 0', color: '#806050', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleParse} disabled={!rawText.trim()} style={{ flex: 2, background: rawText.trim() ? '#fff0ea' : '#f5f0ee', border: `1.5px solid ${rawText.trim() ? '#e07850' : '#ddd'}`, borderRadius: 10, padding: '11px 0', color: rawText.trim() ? '#e07850' : '#bbb', fontWeight: 700, fontSize: 13, cursor: rawText.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                Next → Set Order
              </button>
            </div>
          </>
        )}

        {step === 'order' && (
          <>
            <div style={{ fontSize: 12, color: '#a08070', marginBottom: 10, background: '#fff5f0', borderRadius: 8, padding: '8px 12px', border: '1px solid #f0d8cc' }}>
              💡 Drag names to reorder. Top of list = first empty seat. Only the first <strong>{emptySeats.length}</strong> names will be assigned.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#c49a8a', letterSpacing: 1 }}>SEAT</div>
              <div style={{ flex: 3, fontSize: 10, fontWeight: 700, color: '#c49a8a', letterSpacing: 1 }}>GUEST NAME</div>
              <div style={{ width: 32 }} />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
              {names.map((name, i) => {
                const seat = emptySeats[i];
                const willAssign = !!seat;
                return (
                  <div key={i} draggable onDragStart={() => onDragStart(i)} onDragOver={e => onDragOver(e, i)} onDrop={() => onDrop(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 4, borderRadius: 10, background: overIdx === i ? '#e8f0ff' : willAssign ? '#fffaf7' : '#fff5f5', border: `1.5px solid ${overIdx === i ? '#4080ee' : willAssign ? '#f0d8cc' : '#f0c0c0'}`, cursor: 'grab', opacity: dragIdx === i ? 0.4 : 1, transition: 'all 0.1s' }}>
                    <div style={{ fontSize: 14, color: '#ccc', userSelect: 'none' }}>⠿</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: willAssign ? '#e07850' : '#e07070' }}>{seat ? seat.id : '—'}</div>
                    <div style={{ flex: 3, fontSize: 13, color: willAssign ? '#3a2a2a' : '#c09090', fontStyle: willAssign ? 'normal' : 'italic' }}>{name}</div>
                    <div style={{ fontSize: 11, color: willAssign ? '#4caf82' : '#e07070' }}>{willAssign ? '✓' : 'no seat'}</div>
                  </div>
                );
              })}
            </div>
            {names.length > emptySeats.length && (
              <div style={{ fontSize: 11, color: '#e07070', marginBottom: 12, background: '#fff5f5', padding: '8px 12px', borderRadius: 8, border: '1px solid #f0c0c0' }}>
                ⚠️ {names.length - emptySeats.length} name(s) won't be assigned — not enough empty seats.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('paste')} style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #d0c0b8', borderRadius: 10, padding: '11px 0', color: '#806050', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button onClick={handleImport} style={{ flex: 2, background: '#e8fff4', border: '1.5px solid #4caf82', borderRadius: 10, padding: '11px 0', color: '#1a6a42', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✓ Assign {canAssign} Seats
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SeatingPlan() {
  const [seats, setSeats] = useState(buildSeats());
  const [sel, setSel] = useState(null);
  const [name, setName] = useState('');
  const [tab, setTab] = useState('plan');
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const isSaving = useRef(false);
  const isCleared = useRef(false);

  useEffect(() => {
    loadSeats().then(s => { setSeats(s); setLoaded(true); });
    const poll = setInterval(() => {
      if (!isSaving.current && !isCleared.current) loadSeats().then(s => setSeats(s));
    }, 20000);
    return () => clearInterval(poll);
  }, []);

  const pushHistory = (cur) => {
    setHistory(prev => { const next = [...prev, cur]; return next.length > 10 ? next.slice(-10) : next; });
    setFuture([]);
  };

  const updateSeat = (updatedSeat) => {
    setSeats(prev => {
      pushHistory(prev);
      const next = prev.map(s => s.id === updatedSeat.id ? updatedSeat : s);
      setSaveStatus('saving'); isSaving.current = true;
      saveSeat(updatedSeat).then(() => { setSaveStatus('saved'); isSaving.current = false; }).catch(() => { setSaveStatus('error'); isSaving.current = false; });
      return next;
    });
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFuture(f => [seats, ...f].slice(0, 10));
    setSeats(prev);
    setSaveStatus('saving'); isSaving.current = true;
    saveAllSeats(prev).then(() => { setSaveStatus('saved'); isSaving.current = false; }).catch(() => { setSaveStatus('error'); isSaving.current = false; });
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setFuture(f => f.slice(1));
    setHistory(h => [...h, seats].slice(-10));
    setSeats(next);
    setSaveStatus('saving'); isSaving.current = true;
    saveAllSeats(next).then(() => { setSaveStatus('saved'); isSaving.current = false; }).catch(() => { setSaveStatus('error'); isSaving.current = false; });
  };

  const handleBulkImport = (assignments) => {
    pushHistory(seats);
    const updated = seats.map(s => { const m = assignments.find(a => a.id === s.id); return m ? m : s; });
    setSeats(updated);
    setSaveStatus('saving'); isSaving.current = true;
    saveAllSeats(assignments).then(() => { setSaveStatus('saved'); isSaving.current = false; }).catch(() => { setSaveStatus('error'); isSaving.current = false; });
  };

  const getSeat = (id) => seats.find(s => s.id === id);
  const select = (id) => { if (sel === id) { setSel(null); setName(''); return; } setSel(id); setName(getSeat(id)?.name || ''); };
  const assign = () => { if (!sel) return; const seat = getSeat(sel); updateSeat({ ...seat, name, status: name ? (seat.status === 'vip' ? 'vip' : 'assigned') : 'empty' }); };
  const toggleVIP = () => { if (!sel) return; const seat = getSeat(sel); updateSeat({ ...seat, status: seat.status === 'vip' ? (seat.name ? 'assigned' : 'empty') : 'vip' }); };
  const clearSeat = () => { if (!sel) return; updateSeat({ ...getSeat(sel), name: '', status: 'empty' }); setName(''); setSel(null); };
  const confirmClearAll = () => {
    setShowConfirm(false); pushHistory(seats);
    setSeats(buildSeats()); setSel(null); setName('');
    setSaveStatus('saving'); isSaving.current = true; isCleared.current = true;
    clearAllSeats().then(() => { setSaveStatus('saved'); isSaving.current = false; }).catch(() => { setSaveStatus('error'); isSaving.current = false; });
  };

  const topSeats   = seats.filter(s => s.row === 'top');
  const leftSeats  = seats.filter(s => s.row === 'left');
  const rightSeats = seats.filter(s => s.row === 'right');
  const assigned   = seats.filter(s => s.name).length;
  const vips       = seats.filter(s => s.status === 'vip').length;
  const emptyCount = seats.filter(s => s.status === 'empty').length;
  const selData    = sel ? getSeat(sel) : null;

  if (!loaded) return (
    <div style={{ minHeight: '100vh', background: '#fdf6f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', color: '#b08070', fontSize: 18, letterSpacing: 4 }}>
      Loading seats...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fdf6f0 0%,#fdeee4 50%,#fdf0f8 100%)', fontFamily: "'Segoe UI',sans-serif", color: '#3a2a2a', padding: '28px 16px 60px' }}>

      {showConfirm && <ConfirmDialog message="This will permanently clear all seat assignments." onConfirm={confirmClearAll} onCancel={() => setShowConfirm(false)} />}
      {showBulk && <BulkImportModal seats={seats} onClose={() => setShowBulk(false)} onImport={handleBulkImport} />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: '#c49a8a', textTransform: 'uppercase', marginBottom: 6 }}>Event Seating System</div>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: '-1px', background: 'linear-gradient(90deg,#e07850,#d050a0,#6060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SEAT PLANNER</h1>
        <div style={{ fontSize: 11, color: '#c49a8a', marginTop: 6, letterSpacing: 3 }}>21 TOP · 15 LEFT · 15 RIGHT · {seats.length} SEATS</div>
        <div style={{ marginTop: 6, fontSize: 11, letterSpacing: 2, fontWeight: 600, color: saveStatus === 'saved' ? '#4caf82' : saveStatus === 'saving' ? '#f0a500' : '#e05050' }}>
          {saveStatus === 'saved' ? '✓ ALL CHANGES SAVED' : saveStatus === 'saving' ? '● SAVING...' : '✕ SAVE ERROR'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <button onClick={undo} disabled={!history.length} style={{ background: history.length ? '#eeeeff' : '#f5f5f5', border: `1.5px solid ${history.length ? '#6060e0' : '#ddd'}`, borderRadius: 10, padding: '7px 18px', color: history.length ? '#4040c0' : '#bbb', fontWeight: 700, fontSize: 12, cursor: history.length ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            ↩ Undo {history.length > 0 ? `(${history.length})` : ''}
          </button>
          <button onClick={redo} disabled={!future.length} style={{ background: future.length ? '#eeeeff' : '#f5f5f5', border: `1.5px solid ${future.length ? '#6060e0' : '#ddd'}`, borderRadius: 10, padding: '7px 18px', color: future.length ? '#4040c0' : '#bbb', fontWeight: 700, fontSize: 12, cursor: future.length ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            Redo {future.length > 0 ? `(${future.length})` : ''} ↪
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',    val: seats.length,  color: '#6060e0', bg: '#eeeeff' },
          { label: 'Assigned', val: assigned,       color: '#3a9a6a', bg: '#e8fff4' },
          { label: 'VIP',      val: vips,           color: '#c07800', bg: '#fff8e0' },
          { label: 'Empty',    val: emptyCount,     color: '#b08070', bg: '#fff0ea' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 22px', borderRadius: 16, background: s.bg, border: `1.5px solid ${s.color}22`, textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: s.color, opacity: 0.7, marginTop: 2 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Seating Canvas */}
        <div style={{ background: '#fffaf7', borderRadius: 24, border: '1.5px solid #f0d8cc', padding: '20px 16px 16px', boxShadow: '0 8px 40px rgba(200,120,80,0.10)' }}>

          {/* Stage */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 10 }}>
            <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,transparent,#e0a090)', borderRadius: 2 }} />
            <div style={{ fontSize: 11, letterSpacing: 4, color: '#e07850', border: '2px solid #f0c0a0', padding: '5px 20px', borderRadius: 8, background: '#fff5f0', fontWeight: 700 }}>▼ STAGE / FRONT ▼</div>
            <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,#e0a090,transparent)', borderRadius: 2 }} />
          </div>

          {/* Top row — tighter gap */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            {topSeats.map(s => <TopSeat key={s.id} seat={s} isSelected={sel === s.id} onClick={() => select(s.id)} />)}
          </div>

          {/* Left + Right columns side by side */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>

            {/* LEFT column — name to the RIGHT of icon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {leftSeats.map(s => (
                <SideSeat key={s.id} seat={s} isSelected={sel === s.id} onClick={() => select(s.id)} namePosition="right" />
              ))}
            </div>

            {/* RIGHT column — name to the LEFT of icon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {rightSeats.map(s => (
                <SideSeat key={s.id} seat={s} isSelected={sel === s.id} onClick={() => select(s.id)} namePosition="left" />
              ))}
            </div>

          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            {[{ label: 'Empty', color: '#c9a8a8' }, { label: 'Assigned', color: '#4caf82' }, { label: 'VIP', color: '#f0a500' }, { label: 'Selected', color: '#4080ee' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#a08070' }}>
                <div style={{ width: 11, height: 11, borderRadius: 3, background: l.color, opacity: 0.8 }} />{l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 240 }}>

          {/* Bulk Import */}
          <button onClick={() => setShowBulk(true)} style={{ width: '100%', background: 'linear-gradient(90deg,#fff0ea,#fde8ff)', border: '1.5px solid #e07850', borderRadius: 14, padding: '12px 0', color: '#e07850', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1, boxShadow: '0 4px 16px rgba(224,120,80,0.12)' }}>
            📋 BULK IMPORT NAMES
            <div style={{ fontSize: 10, color: '#c49a8a', fontWeight: 500, marginTop: 2 }}>{emptyCount} seats available</div>
          </button>

          {/* Seat Editor */}
          <div style={{ background: '#fffaf7', borderRadius: 20, border: '1.5px solid #f0d8cc', padding: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: '#c49a8a', marginBottom: 12, fontWeight: 700 }}>
              {selData ? `✏️ EDITING — ${selData.id}` : '👆 SELECT A SEAT'}
            </div>
            {selData ? (
              <>
                <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && assign()} placeholder="Guest name…"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#fff5f0', border: '1.5px solid #f0c0a0', borderRadius: 10, padding: '10px 14px', color: '#3a2a2a', fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 12 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: '✓ Assign', fn: assign,    bg: '#e8fff4', border: '#4caf82', color: '#1a6a42' },
                    { label: '★ VIP',    fn: toggleVIP, bg: '#fff8e0', border: '#f0a500', color: '#7a5000' },
                    { label: '✕ Clear',  fn: clearSeat, bg: '#fff0f0', border: '#e07070', color: '#a02020' },
                    { label: 'Cancel',   fn: () => { setSel(null); setName(''); }, bg: '#f5f5f5', border: '#d0c0b8', color: '#806050' },
                  ].map(b => (
                    <button key={b.label} onClick={b.fn} style={{ background: b.bg, border: `1.5px solid ${b.border}`, borderRadius: 10, padding: '10px 0', color: b.color, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{b.label}</button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: '#c4a898', fontSize: 13, lineHeight: 1.7 }}>Click any seat to assign a guest, mark as VIP, or clear.</div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['plan', 'guests'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? '#fff0ea' : '#fffaf7', border: `1.5px solid ${tab === t ? '#e07850' : '#f0d8cc'}`, borderRadius: 10, padding: '9px 0', color: tab === t ? '#e07850' : '#c49a8a', fontSize: 11, letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', fontWeight: 700 }}>{t}</button>
            ))}
          </div>

          {tab === 'plan' && (
            <div style={{ background: '#fffaf7', borderRadius: 20, border: '1.5px solid #f0d8cc', padding: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#c49a8a', marginBottom: 12, fontWeight: 700 }}>LAYOUT INFO</div>
              {[
                { label: 'Top Row',   val: 'T1–T21', note: '21 seats' },
                { label: 'Left Col',  val: 'L1–L15', note: '15 seats' },
                { label: 'Right Col', val: 'R1–R15', note: '15 seats' },
                { label: 'Total',     val: '51 seats', note: '' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5e8e0', fontSize: 12 }}>
                  <span style={{ color: '#c49a8a' }}>{r.label}</span>
                  <span style={{ color: '#e07850', fontWeight: 700 }}>{r.val} <span style={{ color: '#d0b8a8', fontWeight: 400 }}>{r.note}</span></span>
                </div>
              ))}
              <button onClick={() => setShowConfirm(true)} style={{ marginTop: 12, width: '100%', background: '#fff0f0', border: '1.5px solid #e07070', borderRadius: 10, padding: '10px 0', color: '#a02020', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                ⌫ CLEAR ALL SEATS
              </button>
            </div>
          )}

          {tab === 'guests' && (
            <div style={{ background: '#fffaf7', borderRadius: 20, border: '1.5px solid #f0d8cc', padding: 16, maxHeight: 340, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#c49a8a', marginBottom: 10, fontWeight: 700 }}>GUEST LIST ({assigned})</div>
              {seats.filter(s => s.name).length === 0
                ? <div style={{ color: '#d0b8a8', fontSize: 13 }}>No guests assigned yet.</div>
                : seats.filter(s => s.name).map(s => (
                  <div key={s.id} onClick={() => select(s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5e8e0', cursor: 'pointer', fontSize: 12 }}>
                    <span style={{ color: s.status === 'vip' ? '#c07800' : '#6060e0', fontWeight: 700 }}>{s.id}{s.status === 'vip' ? ' ★' : ''}</span>
                    <span style={{ color: '#806050' }}>{s.name}</span>
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