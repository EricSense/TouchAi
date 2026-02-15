import { useState, useRef, useEffect } from 'react';

// Context modes for the AI system
const CONTEXTS = {
  WRITING: 'writing',
  BRAINSTORMING: 'brainstorming',
  LEARNING: 'learning',
  DECISION: 'decision',
  GENERAL: 'general'
};

// User preference defaults
const DEFAULT_PREFERENCES = {
  gestureSpeed: 'medium',
  hapticIntensity: 'medium',
  gestureStyle: 'balanced', // tap-heavy, swipe-heavy, balanced
  favoriteGestures: [],
  customMappings: {},
  gestureHistory: []
};

export default function TouchLanguage() {
  // State management
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState(CONTEXTS.GENERAL);
  const [lastGesture, setLastGesture] = useState(null);
  const [touchPoints, setTouchPoints] = useState([]);
  const [showHelp, setShowHelp] = useState(true);
  const [showDictionary, setShowDictionary] = useState(false);
  const [aiState, setAiState] = useState('ready'); // ready, listening, interpreting, responding, confirming
  const [gestureTrail, setGestureTrail] = useState([]);
  const [userPreferences, setUserPreferences] = useState(DEFAULT_PREFERENCES);
  const [gestureCombo, setGestureCombo] = useState([]);
  
  // Refs
  const touchAreaRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchTimerRef = useRef(null);
  const lastTapRef = useRef(0);
  const touchPathRef = useRef([]);
  const comboTimerRef = useRef(null);

  // Load user preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('touchLanguagePreferences');
    if (saved) {
      try {
        setUserPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('touchLanguagePreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  // Haptic feedback patterns
  const hapticFeedback = {
    light: () => { 
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        const intensity = userPreferences.hapticIntensity === 'light' ? 5 : 
                         userPreferences.hapticIntensity === 'medium' ? 10 : 15;
        navigator.vibrate(intensity);
      }
    },
    medium: () => { 
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        const intensity = userPreferences.hapticIntensity === 'light' ? 15 : 
                         userPreferences.hapticIntensity === 'medium' ? 25 : 35;
        navigator.vibrate(intensity);
      }
    },
    heavy: () => { 
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        const intensity = userPreferences.hapticIntensity === 'light' ? 30 : 
                         userPreferences.hapticIntensity === 'medium' ? 50 : 70;
        navigator.vibrate(intensity);
      }
    },
    success: () => { 
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        navigator.vibrate([30, 50, 30]); 
      }
    },
    error: () => { 
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        navigator.vibrate([50, 30, 50, 30, 50]); 
      }
    },
    thinking: () => { 
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        navigator.vibrate([20, 20, 20]); 
      }
    },
    joyful: () => {
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        navigator.vibrate([50, 30, 50, 30, 100]);
      }
    },
    excited: () => {
      if (navigator.vibrate && userPreferences.hapticIntensity !== 'off') {
        navigator.vibrate([30, 20, 30, 20, 30, 20, 60]);
      }
    }
  };

  // Detect circular/spiral motion
  const detectCircularMotion = (path) => {
    if (path.length < 10) return null;
    
    const centerX = path.reduce((sum, p) => sum + p.x, 0) / path.length;
    const centerY = path.reduce((sum, p) => sum + p.y, 0) / path.length;
    
    let angleSum = 0;
    for (let i = 1; i < path.length; i++) {
      const angle1 = Math.atan2(path[i-1].y - centerY, path[i-1].x - centerX);
      const angle2 = Math.atan2(path[i].y - centerY, path[i].x - centerX);
      let diff = angle2 - angle1;
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      angleSum += diff;
    }
    
    const totalRotation = Math.abs(angleSum);
    if (totalRotation > Math.PI * 1.5) {
      return angleSum > 0 ? 'circle-clockwise' : 'circle-counter-clockwise';
    }
    
    return null;
  };

  // Calculate gesture velocity and acceleration
  const calculateVelocity = (path) => {
    if (path.length < 2) return 0;
    
    const recent = path.slice(-5);
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].x - recent[i-1].x;
      const dy = recent[i].y - recent[i-1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const time = recent[i].time - recent[i-1].time;
      totalDistance += distance;
      totalTime += time;
    }
    
    return totalTime > 0 ? totalDistance / totalTime : 0;
  };

  // Detect pressure (simulated based on touch area if available)
  const detectPressure = (touch) => {
    // Note: Real pressure detection requires force touch capability
    // This is a simulation based on touch radius if available
    if (touch.force !== undefined) {
      if (touch.force < 0.3) return 'light';
      if (touch.force < 0.7) return 'medium';
      return 'heavy';
    }
    return 'medium'; // Default fallback
  };

  // Advanced gesture detection with combinations
  const detectGesture = (e, startTouch, path) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startTouch.x;
    const deltaY = touch.clientY - startTouch.y;
    const deltaTime = Date.now() - startTouch.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const numFingers = e.changedTouches.length;
    const velocity = calculateVelocity(path);
    const pressure = detectPressure(touch);
    const circularMotion = detectCircularMotion(path);
    
    // Check for circular gestures first
    if (circularMotion) {
      return { 
        type: circularMotion, 
        intent: getContextIntent(circularMotion, context),
        velocity,
        pressure,
        fingers: numFingers
      };
    }
    
    // Long press with pressure sensitivity
    if (distance < 20 && deltaTime > 800) {
      return { 
        type: `long-press-${pressure}`, 
        intent: getContextIntent(`long-press-${pressure}`, context),
        velocity,
        pressure,
        fingers: numFingers
      };
    }

    // Double tap detection
    const now = Date.now();
    if (deltaTime < 300 && distance < 20 && (now - lastTapRef.current) < 400) {
      lastTapRef.current = 0;
      return { 
        type: `double-tap-${pressure}`, 
        intent: getContextIntent(`double-tap-${pressure}`, context),
        velocity,
        pressure,
        fingers: numFingers
      };
    }

    // Single tap with pressure
    if (deltaTime < 300 && distance < 20) {
      lastTapRef.current = now;
      return { 
        type: `tap-${pressure}`, 
        intent: getContextIntent(`tap-${pressure}`, context),
        velocity,
        pressure,
        fingers: numFingers
      };
    }

    // Swipe gestures with velocity and multi-finger support
    if (distance > 50) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      let direction = '';
      
      if (Math.abs(angle) < 45) {
        direction = 'swipe-right';
      } else if (Math.abs(angle) > 135) {
        direction = 'swipe-left';
      } else if (angle > 45 && angle < 135) {
        direction = 'swipe-down';
      } else {
        direction = 'swipe-up';
      }
      
      const speed = velocity > 2 ? 'fast' : velocity > 1 ? 'medium' : 'slow';
      const gestureType = numFingers > 1 ? `${numFingers}f-${direction}` : `${direction}-${speed}`;
      
      return { 
        type: gestureType, 
        intent: getContextIntent(gestureType, context),
        velocity,
        pressure,
        fingers: numFingers
      };
    }

    // Multi-finger tap
    if (numFingers >= 2) {
      return { 
        type: `${numFingers}f-tap`, 
        intent: getContextIntent(`${numFingers}f-tap`, context),
        velocity,
        pressure,
        fingers: numFingers
      };
    }

    return { 
      type: 'unknown', 
      intent: 'Gesture not recognized',
      velocity,
      pressure,
      fingers: numFingers
    };
  };

  // Get context-specific intent for gestures
  const getContextIntent = (gestureType, currentContext) => {
    const contextMappings = {
      [CONTEXTS.WRITING]: {
        'swipe-right-medium': 'Suggest next sentence',
        'swipe-right-fast': 'Auto-complete paragraph',
        'swipe-left-medium': 'Undo last edit',
        'swipe-left-fast': 'Revert to previous version',
        'tap-medium': 'Accept suggestion',
        'double-tap-medium': 'Reject suggestion',
        'circle-clockwise': 'Expand on this idea',
        'circle-counter-clockwise': 'Simplify language',
        '2f-tap': 'Show writing options',
        'long-press-medium': 'Start voice dictation'
      },
      [CONTEXTS.BRAINSTORMING]: {
        'swipe-right-medium': 'Next idea',
        'swipe-left-medium': 'Previous idea',
        'tap-medium': 'Rate this idea',
        'tap-heavy': 'Love this idea!',
        'circle-clockwise': 'Generate variations',
        'circle-counter-clockwise': 'Merge ideas',
        '2f-swipe-up': 'Expand idea cluster',
        '2f-swipe-down': 'Collapse idea cluster',
        'double-tap-medium': 'Mark as favorite',
        'long-press-medium': 'Deep dive into concept'
      },
      [CONTEXTS.LEARNING]: {
        'swipe-up-medium': 'Go deeper / More detail',
        'swipe-up-fast': 'Show expert level',
        'swipe-down-medium': 'Simplify explanation',
        'swipe-down-fast': 'ELI5 mode',
        'swipe-right-medium': 'Next topic',
        'swipe-left-medium': 'Previous topic',
        'tap-medium': 'I understand',
        'double-tap-medium': 'Show examples',
        'circle-clockwise': 'Show related concepts',
        'long-press-medium': 'Quiz me on this',
        '3f-tap': 'Show concept map'
      },
      [CONTEXTS.DECISION]: {
        'swipe-left-medium': 'Show pros',
        'swipe-right-medium': 'Show cons',
        'tap-medium': 'Compare options',
        'double-tap-medium': 'Final decision',
        'circle-clockwise': 'Show alternatives',
        'long-press-medium': 'Deep analysis',
        '2f-swipe-left': 'Option A',
        '2f-swipe-right': 'Option B',
        'swipe-up-medium': 'Show impact',
        'swipe-down-medium': 'Show risks'
      },
      [CONTEXTS.GENERAL]: {
        'tap-medium': 'Yes / Acknowledge',
        'tap-light': 'Maybe / Soft yes',
        'tap-heavy': 'Definitely yes!',
        'double-tap-medium': 'No / Cancel',
        'long-press-medium': 'Start listening',
        'long-press-heavy': 'Deep focus mode',
        'swipe-right-medium': 'Next / Continue',
        'swipe-left-medium': 'Previous / Go back',
        'swipe-up-medium': 'More / Expand',
        'swipe-down-medium': 'Less / Minimize',
        'circle-clockwise': 'Show options',
        'circle-counter-clockwise': 'Cycle contexts',
        '2f-tap': 'Menu',
        '3f-tap': 'Settings',
        '2f-swipe-up': 'Help',
        '2f-swipe-down': 'Close'
      }
    };

    return contextMappings[currentContext]?.[gestureType] || 
           contextMappings[CONTEXTS.GENERAL]?.[gestureType] ||
           'Gesture recognized';
  };

  // Handle touch start
  const handleTouchStart = (e) => {
    e.preventDefault();
    setAiState('listening');
    hapticFeedback.light();
    
    const touch = e.touches[0];
    touchStartRef.current = { 
      x: touch.clientX, 
      y: touch.clientY, 
      time: Date.now(),
      pressure: detectPressure(touch)
    };
    
    touchPathRef.current = [{ 
      x: touch.clientX, 
      y: touch.clientY, 
      time: Date.now() 
    }];
    
    setTouchPoints(Array.from(e.touches).map(t => ({ 
      x: t.clientX, 
      y: t.clientY, 
      id: t.identifier 
    })));
    
    setGestureTrail([{ x: touch.clientX, y: touch.clientY }]);

    // Long press timer
    touchTimerRef.current = setTimeout(() => {
      hapticFeedback.heavy();
      const gesture = { 
        type: `long-press-${touchStartRef.current.pressure}`, 
        intent: getContextIntent(`long-press-${touchStartRef.current.pressure}`, context),
        pressure: touchStartRef.current.pressure,
        fingers: e.touches.length
      };
      setLastGesture(gesture);
      handleGesture(gesture);
    }, 800);
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    
    touchPathRef.current.push({ 
      x: touch.clientX, 
      y: touch.clientY, 
      time: Date.now() 
    });
    
    setTouchPoints(Array.from(e.touches).map(t => ({ 
      x: t.clientX, 
      y: t.clientY, 
      id: t.identifier 
    })));
    
    // Update trail (keep last 20 points)
    setGestureTrail(prev => [...prev, { x: touch.clientX, y: touch.clientY }].slice(-20));
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    e.preventDefault();
    clearTimeout(touchTimerRef.current);
    setTouchPoints([]);
    setGestureTrail([]);

    if (touchStartRef.current) {
      setAiState('interpreting');
      const gesture = detectGesture(e, touchStartRef.current, touchPathRef.current);
      
      if (gesture.type !== 'unknown') {
        hapticFeedback.medium();
        setLastGesture(gesture);
        
        // Add to gesture combo
        setGestureCombo(prev => [...prev, gesture]);
        
        // Clear combo after 2 seconds
        clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => {
          setGestureCombo([]);
        }, 2000);
        
        handleGesture(gesture);
        
        // Update user preferences
        updateUserPreferences(gesture);
      } else {
        setAiState('ready');
      }
    }
    
    touchStartRef.current = null;
    touchPathRef.current = [];
  };

  // Update user preferences based on gesture usage
  const updateUserPreferences = (gesture) => {
    setUserPreferences(prev => {
      const history = [...prev.gestureHistory, {
        type: gesture.type,
        context: context,
        timestamp: Date.now()
      }].slice(-100); // Keep last 100 gestures
      
      // Analyze gesture style
      const recentGestures = history.slice(-20);
      const tapCount = recentGestures.filter(g => g.type.includes('tap')).length;
      const swipeCount = recentGestures.filter(g => g.type.includes('swipe')).length;
      
      let gestureStyle = 'balanced';
      if (tapCount > swipeCount * 2) gestureStyle = 'tap-heavy';
      if (swipeCount > tapCount * 2) gestureStyle = 'swipe-heavy';
      
      return {
        ...prev,
        gestureHistory: history,
        gestureStyle
      };
    });
  };

  // Handle gesture and generate AI response
  const handleGesture = (gesture) => {
    setAiState('responding');
    
    const gestureMsg = { 
      type: 'user', 
      gesture: gesture.type, 
      intent: gesture.intent, 
      time: new Date().toLocaleTimeString(),
      context: context,
      pressure: gesture.pressure,
      velocity: gesture.velocity,
      fingers: gesture.fingers
    };
    
    setMessages(prev => [...prev, gestureMsg]);
    hapticFeedback.thinking();

    // Simulate AI processing
    setTimeout(() => {
      setAiState('confirming');
      const aiResponse = generateAIResponse(gesture, context);
      const aiMsg = { 
        type: 'ai', 
        text: aiResponse.text, 
        emotion: aiResponse.emotion,
        options: aiResponse.options,
        time: new Date().toLocaleTimeString() 
      };
      
      setMessages(prev => [...prev, aiMsg]);
      
      // Emotion-based haptic feedback
      if (aiResponse.emotion === 'excited') {
        hapticFeedback.excited();
      } else if (aiResponse.emotion === 'joyful') {
        hapticFeedback.joyful();
      } else {
        hapticFeedback.success();
      }
      
      setTimeout(() => setAiState('ready'), 500);
    }, 800);
  };

  // Generate context-aware AI responses
  const generateAIResponse = (gesture, currentContext) => {
    const responses = {
      [CONTEXTS.WRITING]: {
        'swipe-right-medium': { 
          text: '📝 "The concept evolved naturally, building upon the foundation we established..."',
          emotion: 'helpful',
          options: ['Continue', 'Rephrase', 'Expand']
        },
        'swipe-left-medium': { 
          text: '↶ Undid last edit. Previous version restored.',
          emotion: 'neutral',
          options: []
        },
        'circle-clockwise': { 
          text: '💡 Here are 3 ways to expand this:\n1. Add examples\n2. Include data\n3. Show contrasts',
          emotion: 'creative',
          options: ['Option 1', 'Option 2', 'Option 3']
        }
      },
      [CONTEXTS.BRAINSTORMING]: {
        'circle-clockwise': { 
          text: '🌟 Generated 5 variations of your idea! Swipe to explore each one.',
          emotion: 'excited',
          options: ['Variation 1', 'Variation 2', 'Variation 3', 'Variation 4', 'Variation 5']
        },
        'tap-heavy': { 
          text: '❤️ Added to favorites! This idea has great potential!',
          emotion: 'joyful',
          options: []
        }
      },
      [CONTEXTS.LEARNING]: {
        'swipe-up-medium': { 
          text: '🎓 Going deeper: This concept connects to advanced principles in...',
          emotion: 'educational',
          options: ['Show details', 'Examples', 'Quiz me']
        },
        'swipe-down-medium': { 
          text: '🌱 Simplified: Think of it like making a sandwich - each layer adds to the whole!',
          emotion: 'friendly',
          options: ['Good analogy!', 'More examples', 'I get it']
        }
      },
      [CONTEXTS.DECISION]: {
        'swipe-left-medium': { 
          text: '✅ Pros:\n• Cost effective\n• Quick implementation\n• Low risk',
          emotion: 'analytical',
          options: ['Show cons', 'Compare', 'Decide']
        },
        'double-tap-medium': { 
          text: '🎯 Decision recorded! Based on analysis, this is a strong choice.',
          emotion: 'confident',
          options: []
        }
      }
    };

    // Get context-specific response or generate default
    const contextResponses = responses[currentContext] || {};
    const specificResponse = contextResponses[gesture.type];
    
    if (specificResponse) {
      return specificResponse;
    }

    // Default responses
    const defaultResponses = {
      'tap-medium': { text: '✓ Acknowledged', emotion: 'neutral', options: [] },
      'tap-heavy': { text: '💪 Strong agreement!', emotion: 'joyful', options: [] },
      'double-tap-medium': { text: '✗ Cancelled', emotion: 'neutral', options: [] },
      'long-press-medium': { text: '🎤 Listening...', emotion: 'attentive', options: [] },
      'swipe-right-medium': { text: '→ Moving forward', emotion: 'neutral', options: ['Continue', 'Stop'] },
      'swipe-left-medium': { text: '← Going back', emotion: 'neutral', options: [] },
      'swipe-up-medium': { text: '↑ Showing more details', emotion: 'helpful', options: [] },
      'swipe-down-medium': { text: '↓ Showing summary', emotion: 'helpful', options: [] },
      'circle-clockwise': { text: '⭕ Exploring options...', emotion: 'curious', options: ['Option A', 'Option B', 'Option C'] },
      'circle-counter-clockwise': { text: '🔄 Cycling through contexts', emotion: 'neutral', options: [] }
    };

    return defaultResponses[gesture.type] || { 
      text: `Gesture "${gesture.type}" detected in ${currentContext} mode`, 
      emotion: 'neutral',
      options: []
    };
  };

  // Change context
  const changeContext = (newContext) => {
    setContext(newContext);
    hapticFeedback.success();
    const msg = {
      type: 'system',
      text: `Context switched to ${newContext} mode`,
      time: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, msg]);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setLastGesture(null);
    setGestureCombo([]);
    hapticFeedback.success();
  };

  // Get state indicator
  const getStateIndicator = () => {
    const indicators = {
      ready: { icon: '🟢', text: 'Ready', color: '#4ade80' },
      listening: { icon: '👂', text: 'Listening', color: '#60a5fa' },
      interpreting: { icon: '🤔', text: 'Interpreting', color: '#fbbf24' },
      responding: { icon: '💭', text: 'Responding', color: '#a78bfa' },
      confirming: { icon: '✅', text: 'Confirmed', color: '#34d399' }
    };
    return indicators[aiState] || indicators.ready;
  };

  const stateIndicator = getStateIndicator();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #581c87, #312e81, #1e3a8a)', color: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⚡</div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>TouchLanguage AI</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0.25rem 0 0 0' }}>Advanced gesture interaction</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowDictionary(!showDictionary)} style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: 'white', fontSize: '1.25rem' }} title="Gesture Dictionary">📖</button>
          <button onClick={() => setShowHelp(!showHelp)} style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: 'white', fontSize: '1.25rem' }} title="Help">ℹ️</button>
          <button onClick={clearConversation} style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: 'white', fontSize: '1.25rem' }} title="Clear">🔄</button>
        </div>
      </div>

      {/* Context Selector */}
      <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {Object.values(CONTEXTS).map(ctx => (
          <button
            key={ctx}
            onClick={() => changeContext(ctx)}
            style={{
              padding: '0.5rem 1rem',
              background: context === ctx ? 'linear-gradient(to right, #a855f7, #ec4899)' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: context === ctx ? '600' : '400',
              whiteSpace: 'nowrap',
              textTransform: 'capitalize'
            }}
          >
            {ctx}
          </button>
        ))}
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div style={{ background: 'rgba(37, 99, 235, 0.3)', backdropFilter: 'blur(4px)', padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontWeight: '600', margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>👆 Context: {context.toUpperCase()} Mode</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
            {context === CONTEXTS.WRITING && (
              <>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe →:</b> Suggest next</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe ←:</b> Undo</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Circle ⭕:</b> Expand idea</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>2-Finger Tap:</b> Options</div>
              </>
            )}
            {context === CONTEXTS.BRAINSTORMING && (
              <>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Circle ⭕:</b> Variations</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Tap (heavy):</b> Love it!</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Double Tap:</b> Favorite</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Long Press:</b> Deep dive</div>
              </>
            )}
            {context === CONTEXTS.LEARNING && (
              <>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe ↑:</b> Go deeper</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe ↓:</b> Simplify</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Circle ⭕:</b> Related</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Long Press:</b> Quiz me</div>
              </>
            )}
            {context === CONTEXTS.DECISION && (
              <>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe ←:</b> Show pros</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe →:</b> Show cons</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Double Tap:</b> Decide</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Circle ⭕:</b> Alternatives</div>
              </>
            )}
            {context === CONTEXTS.GENERAL && (
              <>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Tap:</b> Yes</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Double Tap:</b> No</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Long Press:</b> Listen</div>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}><b>Swipe:</b> Navigate</div>
              </>
            )}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
            💡 Tip: Gesture speed and pressure affect the response. Try light vs heavy taps!
          </div>
        </div>
      )}

      {/* Gesture Dictionary */}
      {showDictionary && (
        <div style={{ background: 'rgba(139, 92, 246, 0.3)', backdropFilter: 'blur(4px)', padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', maxHeight: '300px', overflowY: 'auto' }}>
          <h3 style={{ fontWeight: '600', margin: '0 0 0.75rem 0' }}>📖 Complete Gesture Dictionary</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#a78bfa' }}>Basic Gestures</div>
              <div style={{ fontSize: '0.75rem', display: 'grid', gap: '0.25rem' }}>
                <div>• <b>Tap (light/medium/heavy):</b> Acknowledgment with intensity</div>
                <div>• <b>Double Tap:</b> Reject or cancel action</div>
                <div>• <b>Long Press:</b> Activate listening or focus mode</div>
                <div>• <b>Swipe (slow/medium/fast):</b> Navigate with velocity</div>
              </div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#ec4899' }}>Advanced Gestures</div>
              <div style={{ fontSize: '0.75rem', display: 'grid', gap: '0.25rem' }}>
                <div>• <b>Circle Clockwise:</b> Expand options, generate variations</div>
                <div>• <b>Circle Counter-Clockwise:</b> Cycle contexts, merge ideas</div>
                <div>• <b>2-Finger Tap:</b> Open menu or options</div>
                <div>• <b>3-Finger Tap:</b> Open settings</div>
                <div>• <b>Multi-Finger Swipe:</b> Context-specific actions</div>
              </div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#fbbf24' }}>Gesture Combos</div>
              <div style={{ fontSize: '0.75rem', display: 'grid', gap: '0.25rem' }}>
                <div>• <b>Tap + Swipe:</b> Confirm and navigate</div>
                <div>• <b>Circle + Tap:</b> Select from variations</div>
                <div>• Perform gestures within 2 seconds to combo</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Indicator */}
      <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <span>Profile: </span>
        <span style={{ color: '#a78bfa', fontWeight: '600' }}>{userPreferences.gestureStyle}</span>
        <span> • </span>
        <span>{userPreferences.gestureHistory.length} gestures tracked</span>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '3rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
            <p style={{ fontSize: '1.125rem', margin: 0 }}>Touch to begin your journey</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.2)', margin: 0 }}>Current mode: {context}</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : msg.type === 'system' ? 'center' : 'flex-start', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ 
              maxWidth: msg.type === 'system' ? '90%' : '80%', 
              borderRadius: '1rem', 
              padding: '1rem', 
              background: msg.type === 'user' ? 'linear-gradient(to right, #a855f7, #ec4899)' : 
                          msg.type === 'system' ? 'rgba(59, 130, 246, 0.3)' :
                          'rgba(255, 255, 255, 0.1)',
              border: msg.type === 'system' ? '1px solid rgba(59, 130, 246, 0.5)' : 'none'
            }}>
              {msg.type === 'user' ? (
                <>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {msg.gesture}
                    {msg.fingers > 1 && <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>({msg.fingers} fingers)</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>{msg.intent}</div>
                  {msg.pressure && (
                    <div style={{ fontSize: '0.625rem', opacity: 0.5, marginTop: '0.25rem' }}>
                      Pressure: {msg.pressure} • Velocity: {typeof msg.velocity === 'number' ? msg.velocity.toFixed(2) : 'N/A'}
                    </div>
                  )}
                </>
              ) : msg.type === 'system' ? (
                <div style={{ fontSize: '0.875rem', textAlign: 'center' }}>{msg.text}</div>
              ) : (
                <>
                  <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-line' }}>{msg.text}</div>
                  {msg.options && msg.options.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {msg.options.map((option, i) => (
                        <button
                          key={i}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: 'rgba(139, 92, 246, 0.3)',
                            border: '1px solid rgba(139, 92, 246, 0.5)',
                            borderRadius: '0.5rem',
                            color: 'white',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            hapticFeedback.light();
                            const msg = {
                              type: 'system',
                              text: `Selected: ${option}`,
                              time: new Date().toLocaleTimeString()
                            };
                            setMessages(prev => [...prev, msg]);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div style={{ fontSize: '0.625rem', opacity: 0.5, marginTop: '0.5rem' }}>{msg.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Touch Area */}
      <div style={{ position: 'relative' }}>
        <div 
          ref={touchAreaRef} 
          onTouchStart={handleTouchStart} 
          onTouchMove={handleTouchMove} 
          onTouchEnd={handleTouchEnd} 
          style={{ 
            height: '16rem', 
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent)', 
            borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
            position: 'relative', 
            overflow: 'hidden', 
            touchAction: 'none' 
          }}
        >
          {/* Gesture trail visualization */}
          {gestureTrail.length > 1 && (() => {
            const validPoints = gestureTrail.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
            if (validPoints.length >= 2) {
              return (
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
                  <path
                    d={`M ${validPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
                    stroke="rgba(167, 139, 250, 0.6)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              );
            }
            return null;
          })()}
          
          {touchPoints.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👆</div>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Touch here to interact</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
                  Try circular motions, swipes, taps
                </p>
              </div>
            </div>
          )}
          
          {/* Touch points with ripple effect */}
          {touchPoints.map(point => (
            <div key={point.id} style={{ position: 'absolute', width: '5rem', height: '5rem', left: point.x - 40, top: point.y - 40, pointerEvents: 'none' }}>
              <div style={{ width: '100%', height: '100%', background: 'rgba(167, 139, 250, 0.4)', borderRadius: '9999px', animation: 'ping 1s infinite' }} />
              <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'rgba(236, 72, 153, 0.6)', borderRadius: '9999px' }} />
            </div>
          ))}

          {/* Gesture combo indicator */}
          {gestureCombo.length > 0 && (
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
              Combo: {gestureCombo.map(g => g.type).join(' → ')}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: stateIndicator.color }} />
          <span style={{ color: stateIndicator.color }}>{stateIndicator.text}</span>
          <span style={{ marginLeft: '0.5rem' }}>{stateIndicator.icon}</span>
        </div>
        <div>{messages.filter(m => m.type === 'user').length} gestures</div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
