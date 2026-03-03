import React from 'react'

export function Card({ children, className = '' }) {
  return <div className={'card ' + className}>{children}</div>
}

export function Button({ children, onClick, variant = 'primary', type = 'button', disabled }) {
  return (
    <button type={type} className={'btn ' + variant} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Pill({ children, tone = 'violet' }) {
  return <span className={'pill ' + tone}>{children}</span>
}

export function BottomNav({ tabs, current, onChange }) {
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.key}
          className={'nav-item ' + (current === t.key ? 'active' : '')}
          onClick={() => onChange(t.key)}
          aria-label={t.label}
        >
          <div className="nav-icon">{t.icon}</div>
          <div className="nav-label">{t.label}</div>
        </button>
      ))}
    </nav>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={'seg-btn ' + (value === opt.value ? 'active' : '')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
