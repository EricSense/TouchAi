import { useState, useRef } from 'react';
import { Zap, Heart, RefreshCw, Info } from 'lucide-react';

export default function TouchAI() {
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastGesture, setLastGesture] = useState(null);
  const [touchPoints, setTouchPoints] = useState([]);
  const [showHelp, setShowHelp] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const touchAreaRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchTimerRef = useRef(null);
  const lastTapRef = useRef(0);

  // Haptic feedback functions
  const hapticFeedback = {
    light: () => {
      if (navigator.vibrate) navigator.vibrate(10);
    },
    medium: () => {
      if (navigator.vibrate) navigator.vibrate(20);
    },
    heavy: () => {
      if (navigator.vibrate) navigator.vibrate(50);
    },
    success: () => {
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    },
    error: () => {
      if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);
    },
    thinking: () => {
      if (navigator.vibrate) navigator.vibrate([20, 20, 20]);
    },
    heartbeat: () => {
      if (navigator.vibrate) navigator.vibrate([100, 100, 100, 200]);
    }
  };

  // Detect gesture type
  const detectGesture = (e, startTouch) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startTouch.x;
    const deltaY = touch.clientY - startTouch.y;
    const deltaTime = Date.now() - startTouch.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const numFingers = e.changedTouches.length;

    // Long press
    if (distance < 20 && deltaTime > 800) {
      return { type: 'long-press', intent: 'Start listening / Deep focus' };
    }

    // Double tap
    const now = Date.now();
    if (deltaTime < 300 && distance < 20 && (now - lastTapRef.current) < 400) {
      lastTapRef.current = 0;
      return { type: 'double-tap', intent: 'No / Cancel' };
    }

    // Single tap
    if (deltaTime < 300 && distance < 20) {
      lastTapRef.current = now;
      return { type: 'tap', intent: 'Yes / Acknowledge' };
    }

    // Swipe detection
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

    // Multi-finger gestures
    if (numFingers >= 2) {
      return { type: 'multi-touch', intent: `${numFingers} finger gesture - Menu/Options` };
    }

    return { type: 'unknown', intent: 'Gesture not recognized' };
  };

  // Handle touch start
  const handleTouchStart = (e) => {
    e.preventDefault();
    hapticFeedback.light();
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      pressure: touch.force || 0.5
    };

    // Visual feedback
    const points = Array.from(e.touches).map(t => ({
      x: t.clientX,
      y: t.clientY,
      id: t.identifier
    }));
    setTouchPoints(points);

    // Long press detection
    touchTimerRef.current = setTimeout(() => {
      hapticFeedback.heavy();
      const gesture = { type: 'long-press', intent: 'Start listening / Deep focus' };
      setLastGesture(gesture);
      handleGesture(gesture);
    }, 800);
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    e.preventDefault();
    const points = Array.from(e.touches).map(t => ({
      x: t.clientX,
      y: t.clientY,
      id: t.identifier
    }));
    setTouchPoints(points);
  };

  // Handle touch end
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

  // Process gesture with AI
  const handleGesture = async (gesture) => {
    const gestureMsg = {
      type: 'user',
      gesture: gesture.type,
      intent: gesture.intent,
      time: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, gestureMsg]);
    setIsProcessing(true);
    hapticFeedback.thinking();

    try {
      const prompt = buildPromptFromGesture(gesture);
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [...conversationHistory, { role: "user", content: prompt }],
          system: "You are TouchAI, an AI that communicates through touch gestures. Respond naturally and briefly to touch-based interactions. Keep responses concise (2-3 sentences max). Be warm and empathetic. The user is interacting with you through touch gestures, not text."
        })
      });

      const data = await response.json();
      const aiResponse = data.content.map(item => item.text || "").join("\n");

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: prompt },
        { role: "assistant", content: aiResponse }
      ]);

      const aiMsg = {
        type: 'ai',
        text: aiResponse,
        time: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, aiMsg]);
      hapticFeedback.success();
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        type: 'ai',
        text: "I couldn't process that right now. Try again!",
        time: new Date().toLocaleTimeString()
      }]);
      hapticFeedback.error();
    } finally {
      setIsProcessing(false);
    }
  };

  // Build AI prompt from gesture
  const buildPromptFromGesture = (gesture) => {
    const gestureMap = {
      'tap': "The user tapped once (acknowledgment/yes). Respond briefly and positively.",
      'double-tap': "The user double-tapped (cancel/no). Acknowledge their choice briefly.",
      'long-press': "The user long-pressed (deep focus/listening mode). Ask them what's on their mind or offer to help.",
      'swipe-right': "The user swiped right (next/continue). Move forward or suggest the next step.",
      'swipe-left': "The user swiped left (previous/back). Go back or offer an alternative.",
      'swipe-up': "The user swiped up (more/expand). Provide more detail or expand on the topic.",
      'swipe-down': "The user swiped down (less/minimize). Provide a brief summary or simplify.",
      'multi-touch': "The user used multiple fingers (menu/options). Offer them choices or options."
    };

    return gestureMap[gesture.type] || `The user performed a ${gesture.type} gesture. Respond appropriately.`;
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setConversationHistory([]);
    setLastGesture(null);
    hapticFeedback.success();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">TouchAI</h1>
            <p className="text-xs text-white/60">Feel the future of AI</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={clearConversation}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-600/30 backdrop-blur-sm p-4 border-b border-white/10">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Touch Gestures Guide
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">Tap:</span> Yes/Acknowledge
            </div>
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">Double Tap:</span> No/Cancel
            </div>
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">Long Press:</span> Start Listening
            </div>
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">Swipe →:</span> Next
            </div>
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">Swipe ←:</span> Previous
            </div>
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">Swipe ↑:</span> More Details
            </div>
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">Swipe ↓:</span> Less/Summary
            </div>
            <div className="bg-black/20 p-2 rounded">
              <span className="font-semibold">2+ Fingers:</span> Menu
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-white/40">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Touch the area below to start</p>
            <p className="text-sm mt-2">Your gestures will appear here</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                msg.type === 'user'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'bg-white/10 backdrop-blur-sm'
              }`}
            >
              {msg.type === 'user' ? (
                <>
                  <div className="font-semibold text-sm mb-1">{msg.gesture}</div>
                  <div className="text-xs opacity-75">{msg.intent}</div>
                </>
              ) : (
                <div className="text-sm leading-relaxed">{msg.text}</div>
              )}
              <div className="text-[10px] opacity-50 mt-2">{msg.time}</div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-75" />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150" />
                <span className="ml-2 text-sm opacity-75">TouchAI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Gesture Display */}
      {lastGesture && (
        <div className="px-4 py-2 bg-black/30 backdrop-blur-sm border-t border-white/10">
          <div className="text-xs text-white/60">Last gesture:</div>
          <div className="text-sm font-semibold">{lastGesture.type}</div>
        </div>
      )}

      {/* Touch Area */}
      <div className="relative">
        <div
          ref={touchAreaRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="h-64 bg-gradient-to-t from-black/50 to-transparent border-t border-white/20 relative overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          {/* Touch visualizations */}
          {touchPoints.map(point => (
            <div
              key={point.id}
              className="absolute w-20 h-20 -ml-10 -mt-10 pointer-events-none"
              style={{
                left: point.x,
                top: point.y - touchAreaRef.current?.getBoundingClientRect().top || 0
              }}
            >
              <div className="w-full h-full bg-white/30 rounded-full animate-ping" />
              <div className="absolute inset-0 w-full h-full bg-white/50 rounded-full" />
            </div>
          ))}

          {/* Placeholder text */}
          {touchPoints.length === 0 && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">👆</div>
                <p className="text-white/40">Touch here to interact</p>
                <p className="text-white/20 text-sm mt-1">Try different gestures</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-black/40 backdrop-blur-sm px-4 py-2 text-xs text-white/40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
          {isProcessing ? 'Processing...' : 'Ready'}
        </div>
        <div>
          {messages.length} {messages.length === 1 ? 'interaction' : 'interactions'}
        </div>
      </div>

      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .delay-75 {
          animation-delay: 75ms;
        }
        .delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  );
}
