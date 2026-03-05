import React from 'react';
import { useState, useEffect, useRef } from 'react';

const BIN_ID = '69a93f18d0ea881f40f0ef6b';
const API_KEY = '$2a$10$1CESx41NlQsqHGriap/fquvmqNnmqIiHolXObZdYfJz2tdq2IZ5bS';
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const TOP = 21,
  SIDE = 15;
const SEAT_W = 44,
  SEAT_H = 40,
  GAP_X = 8,
  GAP_Y = 10;
const STEP_X = SEAT_W + GAP_X,
  STEP_Y = SEAT_H + GAP_Y;

function buildSeats() {
  const seats = [];
  for (let i = 0; i < TOP; i++)
    seats.push({
      id: `T${i + 1}`,
      row: 'top',
      col: i,
      name: '',
      status: 'empty',
    });
  for (let i = 0; i < SIDE; i++)
    seats.push({
      id: `L${i + 1}`,
      row: 'left',
      col: i,
      name: '',
      status: 'empty',
    });
  for (let i = 0; i < SIDE; i++)
    seats.push({
      id: `R${i + 1}`,
      row: 'right',
      col: i,
      name: '',
      status: 'empty',
    });
  return seats;
}

const STATUS_STYLE = {
  empty: { bg: '#1e2235', border: '#3d4466', text: '#6b7db3' },
  assigned: { bg: '#0d2e1a', border: '#22c55e', text: '#4ade80' },
  vip: { bg: '#2e1a00', border: '#f59e0b', text: '#fbbf24' },
  selected: { bg: '#1a1a3e', border: '#818cf8', text: '#a5b4fc' },
};

async function loadSeats() {
  try {
    const res = await fetch(API_URL + '/latest', {
      headers: { 'X-Master-Key': API_KEY },
    });
    const data = await res.json();
    const seats = data?.record?.seats;
    return Array.isArray(seats) && seats.length > 0 ? seats : buildSeats();
  } catch (e) {
    return buildSeats();
  }
}

async function saveSeats(seats) {
  await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
    body: JSON.stringify({ seats }),
  });
}

export default function SeatingPlan() {
  const [seats, setSeats] = useState(buildSeats());
  const [sel, setSel] = useState(null);
  const [name, setName] = useState('');
  const [tab, setTab] = useState('plan');
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimer = useRef(null);

  useEffect(() => {
    loadSeats().then((s) => {
      setSeats(s);
      setLoaded(true);
    });
    const poll = setInterval(() => loadSeats().then((s) => setSeats(s)), 10000);
    return () => clearInterval(poll);
  }, []);

  const persistSeats = (updater) => {
    setSeats((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setSaveStatus('saving');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveSeats(next)
          .then(() => setSaveStatus('saved'))
          .catch(() => setSaveStatus('error'));
      }, 500);
      return next;
    });
  };

  const getSeatData = (id) => seats.find((s) => s.id === id);
  const getPos = (s) => {
    if (s.row === 'top') return { x: s.col * STEP_X, y: 0 };
    if (s.row === 'left') return { x: 0, y: (s.col + 1) * STEP_Y };
    if (s.row === 'right')
      return { x: (TOP - 1) * STEP_X, y: (s.col + 1) * STEP_Y };
  };

  const svgW = (TOP - 1) * STEP_X + SEAT_W;
  const svgH = (SIDE + 1) * STEP_Y + SEAT_H;

  const select = (id) => {
    if (sel === id) {
      setSel(null);
      setName('');
      return;
    }
    setSel(id);
    setName(getSeatData(id)?.name || '');
  };

  const assign = () => {
    if (!sel) return;
    persistSeats((p) =>
      p.map((s) =>
        s.id === sel
          ? {
              ...s,
              name,
              status: name
                ? s.status === 'vip'
                  ? 'vip'
                  : 'assigned'
                : 'empty',
            }
          : s
      )
    );
  };

  const toggleVIP = () => {
    if (!sel) return;
    persistSeats((p) =>
      p.map((s) =>
        s.id === sel
          ? {
              ...s,
              status:
                s.status === 'vip' ? (s.name ? 'assigned' : 'empty') : 'vip',
            }
          : s
      )
    );
  };

  const clearSeat = () => {
    if (!sel) return;
    persistSeats((p) =>
      p.map((s) => (s.id === sel ? { ...s, name: '', status: 'empty' } : s))
    );
    setName('');
    setSel(null);
  };

  const clearAll = () => {
    persistSeats(buildSeats());
    setSel(null);
    setName('');
  };

  const assigned = seats.filter((s) => s.name).length;
  const vips = seats.filter((s) => s.status === 'vip').length;
  const empty = seats.length - assigned;
  const selData = sel ? getSeatData(sel) : null;

  if (!loaded)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b0d17',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Courier New', monospace",
          color: '#4b5680',
          letterSpacing: 4,
          fontSize: 12,
        }}
      >
        LOADING...
      </div>
    );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0d17',
        fontFamily: "'Courier New', monospace",
        color: '#c9d1f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '28px 16px 40px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 8,
            color: '#4b5680',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Event Seating System
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: '-1px',
            background: 'linear-gradient(90deg, #818cf8, #38bdf8, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          SEAT PLANNER
        </h1>
        <div
          style={{
            fontSize: 11,
            color: '#4b5680',
            marginTop: 4,
            letterSpacing: 3,
          }}
        >
          21 TOP · 15 LEFT · 15 RIGHT · {seats.length} SEATS
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            letterSpacing: 2,
            color:
              saveStatus === 'saved'
                ? '#22c55e'
                : saveStatus === 'saving'
                ? '#f59e0b'
                : '#f87171',
          }}
        >
          {saveStatus === 'saved'
            ? '✓ ALL CHANGES SAVED'
            : saveStatus === 'saving'
            ? '● SAVING...'
            : '✕ SAVE ERROR'}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 28,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #252a45',
          background: '#111525',
        }}
      >
        {[
          { label: 'TOTAL', val: seats.length, color: '#818cf8' },
          { label: 'ASSIGNED', val: assigned, color: '#4ade80' },
          { label: 'VIP', val: vips, color: '#fbbf24' },
          { label: 'EMPTY', val: empty, color: '#475069' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: '12px 22px',
              textAlign: 'center',
              borderRight: '1px solid #252a45',
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: '#4b5680',
                marginTop: 3,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: '#111525',
            borderRadius: 16,
            border: '1px solid #252a45',
            padding: '20px 20px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              gap: 10,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(90deg, transparent, #3d4466)',
              }}
            />
            <div
              style={{
                fontSize: 10,
                letterSpacing: 4,
                color: '#818cf8',
                border: '1px solid #3d4466',
                padding: '5px 20px',
                borderRadius: 4,
              }}
            >
              ▼ STAGE / FRONT ▼
            </div>
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(90deg, #3d4466, transparent)',
              }}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <svg width={svgW} height={svgH} style={{ display: 'block' }}>
              <line
                x1={SEAT_W / 2}
                y1={STEP_Y}
                x2={SEAT_W / 2}
                y2={svgH}
                stroke="#252a45"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <line
                x1={svgW - SEAT_W / 2}
                y1={STEP_Y}
                x2={svgW - SEAT_W / 2}
                y2={svgH}
                stroke="#252a45"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              {seats.map((s) => {
                const pos = getPos(s);
                const isSel = sel === s.id;
                const st = isSel
                  ? STATUS_STYLE.selected
                  : STATUS_STYLE[s.status];
                return (
                  <g
                    key={s.id}
                    transform={`translate(${pos.x},${pos.y})`}
                    onClick={() => select(s.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isSel && (
                      <rect
                        x={-3}
                        y={-3}
                        width={SEAT_W + 6}
                        height={SEAT_H + 6}
                        rx={9}
                        fill="#818cf8"
                        opacity={0.12}
                      />
                    )}
                    <rect
                      x={0}
                      y={0}
                      width={SEAT_W}
                      height={SEAT_H}
                      rx={6}
                      fill={st.bg}
                      stroke={st.border}
                      strokeWidth={isSel ? 2 : 1.5}
                    />
                    <rect
                      x={4}
                      y={2}
                      width={SEAT_W - 8}
                      height={6}
                      rx={3}
                      fill={st.border}
                      opacity={0.5}
                    />
                    <text
                      x={SEAT_W / 2}
                      y={s.name ? 21 : 26}
                      textAnchor="middle"
                      fontSize={s.name ? 9 : 10}
                      fontWeight={700}
                      fill={st.text}
                      fontFamily="'Courier New', monospace"
                    >
                      {s.id}
                    </text>
                    {s.name && (
                      <text
                        x={SEAT_W / 2}
                        y={34}
                        textAnchor="middle"
                        fontSize={7.5}
                        fill={st.text}
                        opacity={0.85}
                        fontFamily="'Courier New', monospace"
                      >
                        {s.name.length > 6 ? s.name.slice(0, 5) + '…' : s.name}
                      </text>
                    )}
                    {s.status === 'vip' && (
                      <text
                        x={SEAT_W - 7}
                        y={11}
                        fontSize={9}
                        textAnchor="middle"
                      >
                        ★
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              marginTop: 16,
              flexWrap: 'wrap',
            }}
          >
            {Object.entries(STATUS_STYLE).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10,
                  color: '#4b5680',
                  letterSpacing: 1,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: v.bg,
                    border: `1.5px solid ${v.border}`,
                  }}
                />
                {k.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            width: 230,
          }}
        >
          <div
            style={{
              background: '#111525',
              borderRadius: 14,
              border: '1px solid #252a45',
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: '#4b5680',
                marginBottom: 12,
              }}
            >
              {selData ? `EDITING — ${selData.id}` : 'SELECT A SEAT'}
            </div>
            {selData ? (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && assign()}
                  placeholder="Guest name…"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0b0d17',
                    border: '1px solid #3d4466',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#c9d1f5',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: "'Courier New', monospace",
                    marginBottom: 10,
                  }}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 7,
                  }}
                >
                  {[
                    {
                      label: 'ASSIGN',
                      fn: assign,
                      bg: '#1e2e5e',
                      border: '#818cf8',
                      color: '#a5b4fc',
                    },
                    {
                      label: '★ VIP',
                      fn: toggleVIP,
                      bg: '#2e1f00',
                      border: '#f59e0b',
                      color: '#fbbf24',
                    },
                    {
                      label: 'CLEAR',
                      fn: clearSeat,
                      bg: '#1a0d0d',
                      border: '#f87171',
                      color: '#fca5a5',
                    },
                    {
                      label: 'CANCEL',
                      fn: () => {
                        setSel(null);
                        setName('');
                      },
                      bg: '#15171f',
                      border: '#3d4466',
                      color: '#6b7db3',
                    },
                  ].map((b) => (
                    <button
                      key={b.label}
                      onClick={b.fn}
                      style={{
                        background: b.bg,
                        border: `1px solid ${b.border}`,
                        borderRadius: 8,
                        padding: '9px 0',
                        color: b.color,
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: 1,
                        cursor: 'pointer',
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: '#3d4466', fontSize: 12, lineHeight: 1.6 }}>
                Click any chair on the plan to assign a guest, mark as VIP, or
                clear.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {['plan', 'guests'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  background: tab === t ? '#1e2e5e' : '#111525',
                  border: `1px solid ${tab === t ? '#818cf8' : '#252a45'}`,
                  borderRadius: 8,
                  padding: '8px 0',
                  color: tab === t ? '#a5b4fc' : '#4b5680',
                  fontSize: 10,
                  letterSpacing: 2,
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                  textTransform: 'uppercase',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'plan' && (
            <div
              style={{
                background: '#111525',
                borderRadius: 14,
                border: '1px solid #252a45',
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#4b5680',
                  marginBottom: 12,
                }}
              >
                LAYOUT INFO
              </div>
              {[
                { label: 'Top Row', val: 'T1 – T21', note: '21 seats' },
                { label: 'Left Col', val: 'L1 – L15', note: '15 seats' },
                { label: 'Right Col', val: 'R1 – R15', note: '15 seats' },
                { label: 'Total', val: '51 seats', note: '' },
              ].map((r) => (
                <div
                  key={r.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #1a1f33',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: '#4b5680' }}>{r.label}</span>
                  <span style={{ color: '#818cf8' }}>
                    {r.val} <span style={{ color: '#3d4466' }}>{r.note}</span>
                  </span>
                </div>
              ))}
              <button
                onClick={clearAll}
                style={{
                  marginTop: 14,
                  width: '100%',
                  background: '#1a0d0d',
                  border: '1px solid #7f1d1d',
                  borderRadius: 8,
                  padding: '9px 0',
                  color: '#f87171',
                  fontSize: 11,
                  letterSpacing: 2,
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                ⌫ CLEAR ALL
              </button>
            </div>
          )}

          {tab === 'guests' && (
            <div
              style={{
                background: '#111525',
                borderRadius: 14,
                border: '1px solid #252a45',
                padding: 16,
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: '#4b5680',
                  marginBottom: 10,
                }}
              >
                GUEST LIST ({assigned})
              </div>
              {seats.filter((s) => s.name).length === 0 ? (
                <div style={{ color: '#3d4466', fontSize: 12 }}>
                  No guests assigned yet.
                </div>
              ) : (
                seats
                  .filter((s) => s.name)
                  .map((s) => (
                    <div
                      key={s.id}
                      onClick={() => select(s.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: '1px solid #1a1f33',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          color: s.status === 'vip' ? '#fbbf24' : '#818cf8',
                          fontWeight: 700,
                        }}
                      >
                        {s.id}
                        {s.status === 'vip' ? ' ★' : ''}
                      </span>
                      <span style={{ color: '#8892b0' }}>{s.name}</span>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
