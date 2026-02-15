import { useState, useRef } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [lastGesture, setLastGesture] = useState(null);
  const [touchPoints, setTouchPoints] = useState([]);
  const [showHelp, setShowHelp] = useState(true);
  
  const touchAreaRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchTimerRef = useRef(null);
  const lastTapRef = useRef(0);

  const hapticFeedback = {
    light: () => { if (navigator.vibrate) navigator.vibrate(10); },
    medium: () => { if (navigator.vibrate) navigator.vibrate(20); },
    heavy: () => { if (navigator.vibrate) navigator.vibrate(50); },
    success: () => { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); },
    thinking: () => { if (navigator.vibrate) navigator.vibrate([20, 20, 20]); },
  };

  const detectGesture = (e, startTouch) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startTouch.x;
    const deltaY = touch.clientY - startTouch.y;
    const deltaTime = Date.now() - startTouch.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const numFingers = e.changedTouches.length;

    if (distance < 20 && deltaTime > 800) {
      return { type: 'long-press', intent: 'Start listening / Deep focus' };
    }

    const now = Date.now();
    if (deltaTime < 300 && distance < 20 && (now - lastTapRef.current) < 400) {
      lastTapRef.current = 0;
      return { type: 'double-tap', intent: 'No / Cancel' };
    }

    if (deltaTime < 300 && distance < 20) {
      lastTapRef.current = now;
      return { type: 'tap', intent: 'Yes / Acknowledge' };
    }

    if (distance > 50) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      if (Math.abs(angle) < 45) {
        return { type: 'swipe-right', intent: 'Next / Continue' };
      } else if (Math.abs(angle) > 135) {
        return { type: 'swipe-left', intent: 'Previous / Go back' };
      } else if (angle > 45 && angle < 135) {
        return { type: 'swipe-down', intent: 'Less / Minimize' };
      } else {
        return { type: 'swipe-up', intent: 'More / Expand' };
      }
    }

    if (numFingers >= 2) {
      return { type: 'multi-touch', intent: `${numFingers} finger gesture - Menu/Options` };
    }

    return { type: 'unknown', intent: 'Gesture not recognized' };
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    hapticFeedback.light();
    
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setTouchPoints(Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY, id: t.identifier })));

    touchTimerRef.current = setTimeout(() => {
      hapticFeedback.heavy();
      const gesture = { type: 'long-press', intent: 'Start listening / Deep focus' };
      setLastGesture(gesture);
      handleGesture(gesture);
    }, 800);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    setTouchPoints(Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY, id: t.identifier })));
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    clearTimeout(touchTimerRef.current);
    setTouchPoints([]);

    if (touchStartRef.current) {
      const gesture = detectGesture(e, touchStartRef.current);
      if (gesture.type !== 'unknown') {
        hapticFeedback.medium();
        setLastGesture(gesture);
        handleGesture(gesture);
      }
    }
    touchStartRef.current = null;
  };

  const handleGesture = (gesture) => {
    const gestureMsg = { type: 'user', gesture: gesture.type, intent: gesture.intent, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, gestureMsg]);
    hapticFeedback.thinking();

    setTimeout(() => {
      const responses = {
        'tap': '✓ Got your tap!',
        'double-tap': '✗ Double tap received',
        'long-press': '🎤 Listening mode activated',
        'swipe-right': '→ Moving forward',
        'swipe-left': '← Going back',
        'swipe-up': '↑ More details',
        'swipe-down': '↓ Summary view',
        'multi-touch': '⚙️ Menu options'
      };

      const aiMsg = { type: 'ai', text: responses[gesture.type] || 'Gesture detected', time: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, aiMsg]);
      hapticFeedback.success();
    }, 500);
  };

  const clearConversation = () => {
    setMessages([]);
    setLastGesture(null);
    hapticFeedback.success();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #581c87, #312e81, #1e3a8a)', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⚡</div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>TouchAI</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0.25rem 0 0 0' }}>Feel the future of interaction</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowHelp(!showHelp)} style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: 'white', fontSize: '1.25rem' }}>ℹ️</button>
          <button onClick={clearConversation} style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: 'white', fontSize: '1.25rem' }}>🔄</button>
        </div>
      </div>

      {showHelp && (
        <div style={{ background: 'rgba(37, 99, 235, 0.3)', backdropFilter: 'blur(4px)', padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontWeight: '600', margin: '0 0 0.5rem 0' }}>👆 Touch Gestures Guide</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Tap:</b> Yes/Acknowledge</div>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Double Tap:</b> No/Cancel</div>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Long Press:</b> Start Listening</div>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe:</b> Navigate</div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '3rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❤️</div>
            <p style={{ fontSize: '1.125rem', margin: 0 }}>Touch the area below to start</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.2)', margin: 0 }}>Your gestures will appear here</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', borderRadius: '1rem', padding: '1rem', background: msg.type === 'user' ? 'linear-gradient(to right, #a855f7, #ec4899)' : 'rgba(255, 255, 255, 0.1)' }}>
              {msg.type === 'user' ? (
                <>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{msg.gesture}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>{msg.intent}</div>
                </>
              ) : (
                <div style={{ fontSize: '0.875rem' }}>{msg.text}</div>
              )}
              <div style={{ fontSize: '0.625rem', opacity: 0.5, marginTop: '0.5rem' }}>{msg.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <div ref={touchAreaRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ height: '16rem', background: 'linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent)', borderTop: '1px solid rgba(255, 255, 255, 0.2)', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
          {touchPoints.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👆</div>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Touch here to interact</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>Try different gestures</p>
              </div>
            </div>
          )}
          {touchPoints.map(point => (
            <div key={point.id} style={{ position: 'absolute', width: '5rem', height: '5rem', left: point.x - 40, top: point.y - 40, pointerEvents: 'none' }}>
              <div style={{ width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '9999px', animation: 'ping 1s infinite' }} />
              <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '9999px' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: '#4ade80' }} />
          Ready
        </div>
        <div>{messages.length} {messages.length === 1 ? 'interaction' : 'interactions'}</div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
