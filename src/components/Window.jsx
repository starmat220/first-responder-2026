import React, { useState, useEffect, useRef, useCallback } from 'react'
import '../Theme.css'

const WINDOW_LAYOUT_ENABLED_KEY = 'fr2026.windowLayout.enabled'
const WINDOW_LAYOUT_KEY_PREFIX = 'fr2026.windowLayout.'

let windowZCounter = 1000
const nextWindowZ = () => {
  windowZCounter += 1
  return windowZCounter
}

const isLayoutPersistenceEnabled = () => {
  try {
    return localStorage.getItem(WINDOW_LAYOUT_ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

const getWindowLayoutKey = (id) => `${WINDOW_LAYOUT_KEY_PREFIX}${id}`

const readWindowLayout = (id) => {
  if (!id || !isLayoutPersistenceEnabled()) return null
  try {
    const raw = localStorage.getItem(getWindowLayoutKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.pos) return null
    return parsed
  } catch {
    return null
  }
}

const writeWindowLayout = (id, layout) => {
  if (!id || !isLayoutPersistenceEnabled()) return
  try {
    localStorage.setItem(getWindowLayoutKey(id), JSON.stringify(layout))
  } catch {
    // ignore storage issues
  }
}

const Window = ({ 
  id, 
  title, 
  children, 
  initialPos = { x: 100, y: 100 }, 
  initialSize = { width: 400, height: 500 },
  onClose,
  minimized: initialMinimized = false,
  resetKey = 0,
}) => {
  // Store position in pixels for stable dragging
  const initialLayout = readWindowLayout(id)
  const [pos, setPos] = useState(initialLayout?.pos || initialPos)
  const [size, setSize] = useState(initialLayout?.size || initialSize)
  const [isMinimized, setIsMinimized] = useState(
    typeof initialLayout?.isMinimized === 'boolean'
      ? initialLayout.isMinimized
      : initialMinimized
  )
  const [isDragging, setIsDragging] = useState(false)
  const [zIndex, setZIndex] = useState(() => nextWindowZ())
  
  const dragStart = useRef({ x: 0, y: 0 })
  const wrapperRef = useRef(null)
  const isResizingRef = useRef(false)
  const initialPosRef = useRef(initialPos)
  const initialSizeRef = useRef(initialSize)

  useEffect(() => {
    initialPosRef.current = initialPos
    initialSizeRef.current = initialSize
  }, [initialPos, initialSize])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const persistedLayout = readWindowLayout(id)
      const nextPos = persistedLayout?.pos || initialPosRef.current
      const nextSize = persistedLayout?.size || initialSizeRef.current
      const nextMinimized =
        typeof persistedLayout?.isMinimized === 'boolean'
          ? persistedLayout.isMinimized
          : initialMinimized
      setPos((prev) =>
        prev.x === nextPos.x && prev.y === nextPos.y ? prev : nextPos
      )
      setSize((prev) =>
        prev.width === nextSize.width && prev.height === nextSize.height ? prev : nextSize
      )
      setIsMinimized((prev) => (prev === nextMinimized ? prev : nextMinimized))
      setZIndex(nextWindowZ())
    })
    return () => cancelAnimationFrame(frame)
  }, [id, initialMinimized, resetKey])

  useEffect(() => {
    writeWindowLayout(id, { pos, size, isMinimized })
  }, [id, pos, size, isMinimized])

  const syncSizeFromDom = useCallback(() => {
    if (isMinimized) return
    const box = wrapperRef.current?.getBoundingClientRect()
    if (!box) return
    const nextWidth = Math.max(200, Math.round(box.width))
    const nextHeight = Math.max(120, Math.round(box.height))
    setSize((prev) => {
      if (
        Math.abs(prev.width - nextWidth) <= 1 &&
        Math.abs(prev.height - nextHeight) <= 1
      ) {
        return prev
      }
      return { width: nextWidth, height: nextHeight }
    })
  }, [isMinimized])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined
    const node = wrapperRef.current
    if (!node) return undefined
    const observer = new ResizeObserver((entries) => {
      if (isMinimized) return
      if (!isResizingRef.current) return
      const entry = entries[0]
      if (!entry) return
      syncSizeFromDom()
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [isMinimized, syncSizeFromDom])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (!isResizingRef.current) return
      isResizingRef.current = false
      syncSizeFromDom()
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [syncSizeFromDom])

  const bringToFront = useCallback(() => {
    setZIndex((current) => {
      const next = nextWindowZ()
      return current === next ? current : next
    })
  }, [])

  const handleResetSize = useCallback(() => {
    const nextSize = {
      width: Math.max(200, initialSize?.width || 400),
      height: Math.max(120, initialSize?.height || 500),
    }
    setSize(nextSize)
    setPos((prev) => ({
      x: Math.max(0, Math.min(prev.x, window.innerWidth - nextSize.width)),
      y: Math.max(0, Math.min(prev.y, window.innerHeight - 40)),
    }))
  }, [initialSize])

  const handleResetPosition = useCallback(() => {
    const nextWidth = isMinimized ? 240 : Math.max(200, size.width || initialSize?.width || 400)
    const nextX = Math.max(0, Math.min(initialPos?.x || 100, window.innerWidth - nextWidth))
    const nextY = Math.max(0, Math.min(initialPos?.y || 100, window.innerHeight - 40))
    setPos({ x: nextX, y: nextY })
  }, [initialPos, initialSize, isMinimized, size.width])

  const handleWrapperMouseDownCapture = useCallback((e) => {
    bringToFront()
    if (isMinimized) return
    if (e.target.closest('.window-header')) return
    if (e.target.closest('.window-controls')) return
    const node = wrapperRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const nearRight = rect.right - e.clientX <= 24
    const nearBottom = rect.bottom - e.clientY <= 24
    isResizingRef.current = nearRight && nearBottom
  }, [bringToFront, isMinimized])

  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls')) return
    bringToFront()
    setIsDragging(true)
    
    dragStart.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    }
    
    // Prevent text selection during drag
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return

    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y
    
    // Keep within visible bounds
    const windowWidth = isMinimized ? 240 : size.width
    const clampedX = Math.max(0, Math.min(window.innerWidth - windowWidth, newX))
    const clampedY = Math.max(0, Math.min(window.innerHeight - 40, newY))

    setPos({ x: clampedX, y: clampedY })
  }, [isDragging, isMinimized, size.width])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    } else {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle window resize to keep windows on screen
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth - (isMinimized ? 240 : size.width)),
        y: Math.min(prev.y, window.innerHeight - 40)
      }))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMinimized, size.width])

  return (
    <div 
      ref={wrapperRef}
      className="window-wrapper cmd-panel"
      onMouseDownCapture={handleWrapperMouseDownCapture}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: isMinimized ? '240px' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        zIndex: zIndex + (isDragging ? 1000 : 0),
        userSelect: isDragging ? 'none' : 'auto',
        transition: isDragging ? 'none' : 'left 0.15s ease, top 0.15s ease',
        resize: isMinimized ? 'none' : 'both',
        overflow: 'hidden',
      }}
    >
      <div className="window-header" onMouseDown={handleMouseDown}>
        <h2 className="cmd-header__title" style={{ pointerEvents: 'none' }}>
          {title}
        </h2>
        <div className="window-controls">
          <button
            className="window-control-btn"
            onClick={handleResetPosition}
            title="Reset Position"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 3v6M12 21v-6M3 12h6M21 12h-6" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {!isMinimized && (
            <button
              className="window-control-btn"
              onClick={handleResetSize}
              title="Reset Size"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
          )}
          <button 
            className="window-control-btn" 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5"/></svg>
            )}
          </button>
          {onClose && (
            <button 
              className="window-control-btn" 
              onClick={onClose}
              title="Close"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>
      
      {!isMinimized && (
        <div className="window-content cmd-content">
          {children}
        </div>
      )}
      {!isMinimized && <div className="window-resize-handle" aria-hidden="true" />}
    </div>
  )
}

export default Window
