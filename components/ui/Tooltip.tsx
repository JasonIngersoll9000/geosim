'use client'
import { useState, useRef, useCallback } from 'react'

interface Props {
  content: string
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  maxWidth?: number
  display?: 'inline-flex' | 'block' | 'flex' | 'contents'
}

export function Tooltip({ content, children, placement = 'top', maxWidth = 200, display = 'inline-flex' }: Props) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const touchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => setVisible(true),  [])
  const hide = useCallback(() => setVisible(false), [])

  function handleTouchStart() {
    if (visible) {
      hide()
    } else {
      show()
      touchRef.current = setTimeout(hide, 2500)
    }
  }

  const offsetMap = {
    top:    { transform: 'translateX(-50%)', bottom: 'calc(100% + 6px)', left: '50%', top: undefined, right: undefined },
    bottom: { transform: 'translateX(-50%)', top: 'calc(100% + 6px)',    left: '50%', bottom: undefined, right: undefined },
    left:   { transform: 'translateY(-50%)', right: 'calc(100% + 6px)',  top: '50%',  left: undefined, bottom: undefined },
    right:  { transform: 'translateY(-50%)', left: 'calc(100% + 6px)',   top: '50%',  right: undefined, bottom: undefined },
  }
  const pos = offsetMap[placement]

  const arrowMap: Record<typeof placement, React.CSSProperties> = {
    top:    { bottom: -4, left: '50%', transform: 'translateX(-50%)', borderWidth: '4px 4px 0 4px', borderColor: 'rgba(30,30,30,0.98) transparent transparent transparent' },
    bottom: { top: -4,    left: '50%', transform: 'translateX(-50%)', borderWidth: '0 4px 4px 4px', borderColor: 'transparent transparent rgba(30,30,30,0.98) transparent' },
    left:   { right: -4,  top: '50%',  transform: 'translateY(-50%)', borderWidth: '4px 0 4px 4px', borderColor: 'transparent transparent transparent rgba(30,30,30,0.98)' },
    right:  { left: -4,   top: '50%',  transform: 'translateY(-50%)', borderWidth: '4px 4px 4px 0', borderColor: 'transparent rgba(30,30,30,0.98) transparent transparent' },
  }
  const arrow = arrowMap[placement]

  const wrapperStyle: React.CSSProperties =
    display === 'contents'
      ? { display: 'contents' }
      : { position: 'relative', display, alignItems: display === 'inline-flex' || display === 'flex' ? 'center' : undefined }

  return (
    <span
      ref={ref}
      style={wrapperStyle}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={handleTouchStart}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 1000,
            maxWidth,
            padding: '5px 8px',
            background: 'rgba(10,15,24,0.97)',
            border: '1px solid #2a2a2a',
            borderRadius: 2,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            lineHeight: 1.5,
            letterSpacing: '0.04em',
            color: '#c8c6c0',
            whiteSpace: 'normal',
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            ...pos,
          }}
        >
          {content}
          <span style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            ...arrow,
          }} />
        </span>
      )}
    </span>
  )
}
