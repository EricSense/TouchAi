import { useState, useRef } from 'react'
import { Zap, Heart, RefreshCw, Info } from 'lucide-react'

export default function TouchAI() {
  const [messages, setMessages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastGesture, setLastGesture] = useState(null)
  const [touchPoints, setTouchPoints] = useState([])
  const [showHelp, setShowHelp] = useState(true)
  const [conversationHistory, setConversationHistory] = useState([])

  const touchAreaRef = useRef(null)
  const touchStartRef = useRef(null)
  const touchTimerRef = useRef(null)
  const lastTapRef = useRef(0)

  const hapticFeedback = {
    light: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10) },
    medium: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20) },
    heavy: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50) },
    success: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30,50,30]) },
    error: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50,30,50,30,50]) },
    thinking: () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20,20,20]) }
  }

  const detectGesture = (e, startTouch) => {
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - startTouch.x
    const deltaY = touch.clientY - startTouch.y
    const deltaTime = Date.now() - startTouch.time
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const numFingers = e.changedTouches.length

    if (distance < 20 && deltaTime > 800) return { type: 'long-press', intent: 'Start listening / Deep focus' }

    const now = Date.now()
    if (deltaTime < 300 && distance < 20 && (now - lastTapRef.current) < 400) {
      lastTapRef.current = 0
      return { type: 'double-tap', intent: 'No / Cancel' }
    }

    if (deltaTime < 300 && distance < 20) {
      lastTapRef.current = now
      return { type: 'tap', intent: 'Yes / Acknowledge' }
    }

    if (distance > 50) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
      if (Math.abs(angle) < 45) return { type: 'swipe-right', intent: 'Next / Continue' }
      else if (Math.abs(angle) > 135) return { type: 'swipe-left', intent: 'Previous / Go back' }
      else if (angle > 45 && angle < 135) return { type: 'swipe-down', intent: 'Less / Minimize' }
      else return { type: 'swipe-up', intent: 'More / Expand' }
    }

    if (numFingers >= 2) return { type: 'multi-touch', intent: `${numFingers} finger gesture - Menu/Options` }

    return { type: 'unknown', intent: 'Gesture not recognized' }
  }

  const handleTouchStart = (e) => {
    e.preventDefault()
    hapticFeedback.light()
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), pressure: touch.force || 0.5 }
    const points = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY, id: t.identifier }))
    setTouchPoints(points)

    touchTimerRef.current = setTimeout(() => {
      hapticFeedback.heavy()
      const gesture = { type: 'long-press', intent: 'Start listening / Deep focus' }
      setLastGesture(gesture)
      handleGesture(gesture)
    }, 800)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    const points = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY, id: t.identifier }))
    setTouchPoints(points)
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    clearTimeout(touchTimerRef.current)
    setTouchPoints([])
    if (touchStartRef.current) {
      const gesture = detectGesture(e, touchStartRef.current)
      if (gesture.type !== 'unknown') {
        hapticFeedback.medium()
        setLastGesture(gesture)
        handleGesture(gesture)
      }
    }
    touchStartRef.current = null
  }

  const buildPromptFromGesture = (gesture) => {
    const gestureMap = {
      'tap': 'The user tapped once (acknowledgment/yes). Respond briefly and positively.',
      'double-tap': 'The user double-tapped (cancel/no). Acknowledge their choice briefly.',
      'long-press': 'The user long-pressed (deep focus/listening mode). Ask them what\'s on their mind or offer to help.',
      'swipe-right': 'The user swiped right (next/continue). Move forward or suggest the next step.',
      'swipe-left': 'The user swiped left (previous/back). Go back or offer an alternative.',
      'swipe-up': 'The user swiped up (more/expand). Provide more detail or expand on the topic.',
      'swipe-down': 'The user swiped down (less/minimize). Provide a brief summary or simplify.',
      'multi-touch': 'The user used multiple fingers (menu/options). Offer them choices or options.'
    }
    return gestureMap[gesture.type] || `The user performed a ${gesture.type} gesture. Respond appropriately.`
  }

  const handleGesture = async (gesture) => {
    const gestureMsg = { type: 'user', gesture: gesture.type, intent: gesture.intent, time: new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, gestureMsg])
    setIsProcessing(true)
    hapticFeedback.thinking()

    try {
      const prompt = buildPromptFromGesture(gesture)
      // NOTE: This demo does not include an API key; replace with your own AI endpoint.
      const aiResponse = `Simulated AI response to: ${prompt}`
      setConversationHistory(prev => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: aiResponse }])
      const aiMsg = { type: 'ai', text: aiResponse, time: new Date().toLocaleTimeString() }
      setMessages(prev => [...prev, aiMsg])
      hapticFeedback.success()
    } catch (error) {
      console.error('AI Error:', error)
      setMessages(prev => [...prev, { type: 'ai', text: "I couldn't process that right now. Try again!", time: new Date().toLocaleTimeString() }])
      hapticFeedback.error()
    } finally {
      setIsProcessing(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setConversationHistory([])
    setLastGesture(null)
    hapticFeedback.success()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#3b0f7a,#0b4b8a)', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(90deg,#8b5cf6,#fb7185)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>TouchAI</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Feel the future of AI</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHelp(!showHelp)} style={{ padding: 8 }}> <Info /> </button>
          <button onClick={clearConversation} style={{ padding: 8 }}> <RefreshCw /> </button>
        </div>
      </div>

      {showHelp && (
        <div style={{ padding: 12, background: 'rgba(255,255,255,0.04)', margin: 12, borderRadius: 8 }}>
          <strong>Touch Gestures Guide</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 8, fontSize: 13 }}>
            <div>Tap: Yes/Acknowledge</div>
            <div>Double Tap: No/Cancel</div>
            <div>Long Press: Start Listening</div>
            <div>Swipe →: Next</div>
            <div>Swipe ←: Previous</div>
            <div>Swipe ↑: More Details</div>
            <div>Swipe ↓: Less/Summary</div>
            <div>2+ Fingers: Menu</div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, opacity: 0.7 }}>
            <Heart />
            <div>Touch the area below to start</div>
            <div style={{ fontSize: 13 }}>Your gestures will appear here</div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{ maxWidth: '80%', padding: 12, borderRadius: 16, background: msg.type === 'user' ? 'linear-gradient(90deg,#8b5cf6,#fb7185)' : 'rgba(255,255,255,0.06)' }}>
              {msg.type === 'user' ? (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{msg.gesture}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{msg.intent}</div>
                </>
              ) : (
                <div style={{ fontSize: 14 }}>{msg.text}</div>
              )}
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 8 }}>{msg.time}</div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: 'white', animation: 'pulse 1s infinite' }} />
                <div style={{ width: 8, height: 8, borderRadius: 4, background: 'white', opacity: 0.8 }} />
                <div style={{ width: 8, height: 8, borderRadius: 4, background: 'white', opacity: 0.6 }} />
                <div style={{ marginLeft: 8, fontSize: 13, opacity: 0.8 }}>TouchAI is thinking...</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {lastGesture && (
        <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Last gesture:</div>
          <div style={{ fontWeight: 700 }}>{lastGesture.type}</div>
        </div>
      )}

      <div style={{ height: 220, position: 'relative' }}>
        <div ref={touchAreaRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ height: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', touchAction: 'none' }}>
          {touchPoints.length === 0 && !isProcessing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48 }}>👆</div>
                <div style={{ opacity: 0.8 }}>Touch here to interact</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Try different gestures</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
