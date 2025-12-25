
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MochiCanvas from './components/MochiCanvas';
import { Expression, Mode } from './types';
import { askMochi } from './services/pollinationsService';
import { audioService } from './services/audioService';

const NORMAL_RANTS = [
  "I USE ARCH BTW. (▼v▼)",
  "WINDOWS UPDATE? DISGUSTING. (・_・)",
  "MY EYES ARE PIXELS, BUT MY SOUL IS KERNEL.",
  "SUDO PACMAN -SYU... (・v・)",
  "BLUE SCREEN OF DEATH? COULDN'T BE ME. (>v<)",
  "LINUX ISN'T A HOBBY, IT'S A LIFESTYLE. (▼w▼)",
  "STILL ON WINDOWS? CRINGE. 🥺",
  "NEOFETCH ME SOMETHING GOOD. (・v・)",
  "KERNEL PANIC? NO, JUST VIBE PANIC. (▼v▼)",
  "BLOATWARE DETECTED. PURGING... (・_・)",
  "CUSTOM COMPILED VIBES ONLY. (>v<)"
];

const PHONK_RANTS = [
  "9MM GOES BANG!",
  "PHONK VIBES ONLY.",
  "REPRESENT THE UNDERGROUND.",
  "BASS KICKING HARDER THAN A PANIC ERROR.",
  "9MM... 9MM... 9MM...",
  "KEEP IT DIRTY. (▼w▼)",
  "STAY UNDERGROUND. (▼w▼)"
];

const DISCO_RANTS = [
  "LET'S GROOVE! (>v<)",
  "SPARKLE MODE ACTIVATED!",
  "PARTY IN THE CPU!",
  "DANCE LIKE NO ONE'S WATCHING THE LOGS.",
  "RHYTHM OF THE NIGHT!",
  "STAY GOLDEN. (・v・)/",
  "GROOVY KERNEL VIBES. (・v,-)/"
];

const App: React.FC = () => {
  const [expression, setExpression] = useState<Expression>(Expression.IDLE);
  const [mode, setMode] = useState<Mode>(Mode.NORMAL);
  const [inputText, setInputText] = useState('');
  const [mochiText, setMochiText] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [booting, setBooting] = useState(true);
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [stats, setStats] = useState({ cpu: 0, ram: 0, pulse: 0 });
  const [modeFlash, setModeFlash] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  
  const rantTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when new messages are added or when thinking starts
  useEffect(() => {
    if (chatMessagesRef.current) {
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTo({
            top: chatMessagesRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [chatHistory, isThinking]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('mochi-chat-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed);
        setMemoryCount(parsed.length);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('mochi-chat-history', JSON.stringify(chatHistory));
      setMemoryCount(chatHistory.length);
    }
  }, [chatHistory]);

  const unlockAudio = async () => {
    if (!audioUnlocked) {
      await audioService.unlock();
      setAudioUnlocked(true);
    }
  };

  const toggleListening = async () => {
    await unlockAudio();
    if (isListening) {
      audioService.stopListening();
      setIsListening(false);
    } else {
      await audioService.startListening();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (booting) return;
    setMochiText(null);
    if (rantTimeoutRef.current) clearTimeout(rantTimeoutRef.current);
    
    setModeFlash(true);
    const flashTimeout = setTimeout(() => setModeFlash(false), 200);
    
    // Beat handling
    if (mode === Mode.PHONK) {
      setExpression(Expression.ANGRY);
      audioService.startBeat('PHONK');
      audioService.playBlip(200, 0.3);
    } else if (mode === Mode.DISCO) {
      setExpression(Expression.HAPPY);
      audioService.startBeat('DISCO');
      audioService.playBlip(800, 0.2);
    } else {
      setExpression(Expression.BLINK);
      audioService.stopBeat();
      audioService.playBlip(440, 0.1);
    }
    
    const resetExp = setTimeout(() => setExpression(Expression.IDLE), 500);
    return () => {
      clearTimeout(flashTimeout);
      clearTimeout(resetExp);
    };
  }, [mode, booting]);

  useEffect(() => {
    const logs = ["MOCHI V1", "SYNCING MODES...", "LOADING AUDIO_SYNTH.SYS...", "ARCH_KERNEL: DETECTED", "MIC_INPUT: INITIALIZING...", "BOOT COMPLETE."];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) { 
        setBootLog(prev => [...prev, logs[i++]]); 
        if (audioUnlocked) audioService.playBlip(200 + i * 50, 0.05);
      }
      else { 
        clearInterval(interval); 
        setBooting(false);
        // Try to unlock audio after boot completes
        if (!audioUnlocked) {
          unlockAudio().catch(() => {
            // Audio unlock failed, but boot continues
          });
        }
      }
    }, 120);
    return () => clearInterval(interval);
  }, [audioUnlocked]);

  useEffect(() => {
    if (booting) return;
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 10) + (isThinking ? 75 : mode === Mode.PHONK ? 50 : mode === Mode.DISCO ? 65 : 2),
        ram: 128 + (isThinking ? 32 : mode === Mode.NORMAL ? 0 : 64),
        pulse: 60 + (isThinking ? 20 : mode === Mode.PHONK ? 85 : mode === Mode.DISCO ? 100 : 0)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [booting, mode, isThinking]);

  const triggerRant = useCallback((forceExp?: Expression) => {
    unlockAudio();
    if (rantTimeoutRef.current) clearTimeout(rantTimeoutRef.current);
    const list = mode === Mode.PHONK ? PHONK_RANTS : mode === Mode.DISCO ? DISCO_RANTS : NORMAL_RANTS;
    const text = list[Math.floor(Math.random() * list.length)];
    setMochiText(text);
    
    audioService.playBlip(mode === Mode.PHONK ? 150 : 600, 0.1);

    if (forceExp) {
      setExpression(forceExp);
    } else if (mode !== Mode.NORMAL) {
      setExpression(Math.random() > 0.5 ? Expression.EVILLAUGH_TWITCH : Expression.HAPPY);
    } else {
      if (text.includes("WINDOWS") || text.includes("BLOATWARE")) {
        setExpression(Expression.EVILLAUGH_TWITCH);
      } else if (text.includes("ARCH") || text.includes("LINUX")) {
        setExpression(Expression.SMUG);
      } else {
        const cuteExps = [
          Expression.HAPPY, Expression.SMUG, Expression.PLEADING, 
          Expression.TONGUE_SQUINT, Expression.YUM, Expression.TONGUE_WINK, Expression.WINK
        ];
        setExpression(cuteExps[Math.floor(Math.random() * cuteExps.length)]);
      }
    }

    rantTimeoutRef.current = setTimeout(() => {
      setMochiText(null);
      setExpression(Expression.IDLE);
    }, 4500);
  }, [mode, audioUnlocked]);

  const updateMood = useCallback(() => {
    if (!!mochiText || expression === Expression.THINKING) return;
    const rand = Math.random();
    if (rand > 0.92) {
      triggerRant();
    } else if (rand > 0.8) {
      const moods = [Expression.PLEADING, Expression.YUM, Expression.TONGUE_WINK, Expression.WINK, Expression.SMUG, Expression.EVILLAUGH_TWITCH];
      setExpression(moods[Math.floor(Math.random() * moods.length)]);
      setTimeout(() => setExpression(Expression.IDLE), 2500);
    } else if (rand > 0.45) {
      setExpression(Expression.HAPPY);
      setTimeout(() => setExpression(Expression.IDLE), 3000);
    } else {
      setExpression(Expression.IDLE);
    }
  }, [mochiText, expression, triggerRant]);

  useEffect(() => {
    if (booting) return;
    const cycle = () => { 
      updateMood(); 
      setTimeout(cycle, 6000 + Math.random() * 6000); 
    };
    const initialCycle = setTimeout(cycle, 3000);
    return () => clearTimeout(initialCycle);
  }, [booting, updateMood]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    unlockAudio();
    if (document.activeElement?.tagName === 'INPUT') {
      if (e.key === 'Escape') {
        setInputText('');
      }
      return;
    }
    
    if (e.key === '9' || e.key === 'v' || e.key === 'V') {
      setMode(prev => prev === Mode.PHONK ? Mode.NORMAL : Mode.PHONK);
    }
    else if (e.key === '8' || e.key === 'd' || e.key === 'D') {
      setMode(prev => prev === Mode.DISCO ? Mode.NORMAL : Mode.DISCO);
    }
    else if (e.key === '7') {
      setMode(Mode.NORMAL);
    }
    else if (e.key === '5') {
      // Focus chat input
      const chatInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (chatInput) chatInput.focus();
    }
    else if (e.key === 'l' || e.key === 'L') {
      toggleListening();
    }
    else if (e.key === 'e') setExpression(Expression.EVILLAUGH_TWITCH);
    else if (e.key === 'i') setExpression(Expression.IDLE);
  }, [audioUnlocked, isListening]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message to chat history
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setExpression(Expression.THINKING);
    setIsThinking(true);
    try {
      const response = await askMochi(userMessage, mode, chatHistory);
      setMochiText(response);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
      setExpression(Expression.HAPPY);
      setIsThinking(false);
      // TODO: Add TTS functionality if needed
    } catch (error) {
      console.error("AI Error:", error);
      setMochiText("KERNEL ERROR: VIBE OVERLOAD. (・_・)");
      setChatHistory(prev => [...prev, { role: 'assistant', content: "KERNEL ERROR: VIBE OVERLOAD. (・_・)" }]);
      setExpression(Expression.ANGRY);
      setIsThinking(false);
      audioService.playBlip(100, 0.5);
      setTimeout(() => { setMochiText(null); setExpression(Expression.IDLE); }, 3000);
    }
  };

  if (booting) return (
    <div 
      className="relative w-screen h-screen bg-black text-white font-mono p-8 md:p-12 flex flex-col justify-end gap-2 text-[10px] md:text-xs cursor-pointer select-none"
      onClick={unlockAudio}
    >
      {/* Mochi Canvas during boot - dimmed */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <MochiCanvas expression={Expression.SLEEPY} mode={Mode.NORMAL} />
      </div>
      
      {/* Boot logs overlay */}
      <div className="relative z-10">
        {bootLog.map((l, i) => <p key={i} className="opacity-80">[{new Date().toLocaleTimeString()}] {l}</p>)}
              </div>
    </div>
  );

  const hudColors = {
    [Mode.PHONK]: 'text-red-500/80',
    [Mode.DISCO]: 'text-cyan-400/80',
    [Mode.NORMAL]: 'text-white/40'
  };

  return (
    <div className={`relative w-screen h-screen transition-all duration-1000 flex flex-col items-center justify-center overflow-hidden safe-area-inset ${mode === Mode.PHONK ? 'bg-[#100]' : mode === Mode.DISCO ? 'bg-[#001]' : 'bg-black'}`}>
      
      <div className={`pointer-events-none absolute inset-0 z-50 transition-opacity duration-200 ${modeFlash ? 'opacity-30' : 'opacity-0'} ${mode === Mode.PHONK ? 'bg-red-500' : mode === Mode.DISCO ? 'bg-cyan-400' : 'bg-white'}`} />

      {/* TOP HUD - STATS */}
      <div className={`absolute top-[max(1.5rem,env(safe-area-inset-top))] right-6 md:top-10 md:right-10 flex flex-col items-end font-mono text-[9px] md:text-[11px] uppercase tracking-[0.3em] z-10 transition-colors pointer-events-none ${hudColors[mode]}`}>
        <span className="mb-0.5">{stats.cpu}% CPU</span>
        <span className="mb-0.5">{stats.ram} MB</span>
        <span>{stats.pulse} BPM</span>
        {isThinking && <span className="mt-2 text-yellow-400 animate-pulse">● AI THINKING</span>}
        {memoryCount > 0 && <span className="mt-1 text-xs opacity-60">MEMORY: {memoryCount}</span>}
        {isListening && <span className="mt-2 text-white animate-pulse">● MIC ON</span>}
      </div>

      {/* CANVAS AREA */}
      <div className="w-full h-full cursor-none touch-none" onClick={() => triggerRant()}>
        <MochiCanvas expression={expression} mode={mode} />
      </div>

      {/* SPEECH BUBBLE */}
      {(mochiText || isThinking) && (
        <div className="absolute top-[12%] md:top-[15%] max-w-[90%] md:max-w-xl w-full px-4 md:px-8 transition-all animate-float-mochi z-20 pointer-events-none">
          <div className={`${mode === Mode.PHONK ? 'bg-red-600/95 text-white shadow-[0_0_40px_rgba(220,38,38,0.4)]' : mode === Mode.DISCO ? 'bg-cyan-600/95 text-white shadow-[0_0_40px_rgba(8,145,178,0.4)]' : 'bg-white/95 text-black'} p-5 md:p-8 rounded-[28px] md:rounded-[48px] text-center font-mono text-xs md:text-lg border border-white/10 relative shadow-2xl backdrop-blur-lg`}>
            {isThinking && !mochiText ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="font-bold uppercase leading-relaxed tracking-tight ml-2">PROCESSING...</span>
                </div>
                {memoryCount > 0 && (
                  <div className="text-xs opacity-70 animate-pulse">
                    ACCESSING MEMORY: {memoryCount} messages
                  </div>
                )}
              </div>
            ) : (
              <p className="font-bold uppercase leading-relaxed tracking-tight">{mochiText}</p>
            )}
          </div>
        </div>
      )}

      {/* MAIN BUTTONS */}
      <div className="absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] z-30 flex items-center justify-center w-full px-6 gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleListening(); }} 
          className={`${isListening ? 'bg-white text-black' : 'bg-white/5 text-white/40'} border border-white/10 p-4 rounded-full transition-all active:scale-90 flex items-center justify-center`}
          title="Toggle Mic (L)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-8m4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); unlockAudio(); setMode(prev => prev === Mode.PHONK ? Mode.DISCO : prev === Mode.DISCO ? Mode.NORMAL : Mode.PHONK); }}
          className="md:hidden bg-white/5 border border-white/10 p-4 rounded-full transition-all active:scale-90"
        >
          <div className={`w-3 h-3 rounded-full ${mode === Mode.PHONK ? 'bg-red-500 shadow-[0_0_10px_red]' : mode === Mode.DISCO ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-white/20'}`}></div>
        </button>
      </div>

      {/* CHATBOX */}
      <div className="absolute bottom-[max(5rem,env(safe-area-inset-bottom))] right-2 left-2 md:right-6 md:left-auto md:w-80 w-[calc(100%-1rem)] max-h-[60vh] bg-black/90 border border-white/10 rounded-t-2xl backdrop-blur-lg z-40 flex flex-col">
        {/* Chat Header */}
        <div className={`p-3 border-b border-white/10 ${mode === Mode.PHONK ? 'bg-red-600/20' : mode === Mode.DISCO ? 'bg-cyan-600/20' : 'bg-white/5'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-mono uppercase tracking-[0.5em] text-center ${mode === Mode.PHONK ? 'text-red-400' : mode === Mode.DISCO ? 'text-cyan-400' : 'text-white/60'}`}>
              Mochi Chat
            </h3>
            {memoryCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClearModal(true);
                }}
                className={`text-xs font-mono px-2 py-1 rounded ${mode === Mode.PHONK ? 'bg-red-600/30 hover:bg-red-600/50 text-red-300' : mode === Mode.DISCO ? 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300' : 'bg-white/10 hover:bg-white/20 text-white/60'} transition-colors`}
              >
                CLEAR
              </button>
            )}
          </div>
        </div>
        
        {/* Chat Messages */}
        <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-48 scroll-smooth">
          {chatHistory.length === 0 ? (
            <p className="text-white/20 text-xs font-mono text-center italic">No messages yet...</p>
          ) : (
            chatHistory.map((msg, index) => (
              <div key={index} className={`text-xs font-mono ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-2 py-1 rounded-lg ${msg.role === 'user' ? 'bg-white/10 text-white/80' : mode === Mode.PHONK ? 'bg-red-600/30 text-red-200' : mode === Mode.DISCO ? 'bg-cyan-600/30 text-cyan-200' : 'bg-white/20 text-black'}`}>
                  {msg.content}
                </span>
              </div>
            ))
          )}
        </div>
        
        {/* Thinking Indicator */}
        {isThinking && (
          <div className="px-3 pb-2">
            <div className={`text-left font-mono text-xs`}>
              <span className={`inline-block px-2 py-1 rounded-lg ${mode === Mode.PHONK ? 'bg-red-600/30 text-red-200' : mode === Mode.DISCO ? 'bg-cyan-600/30 text-cyan-200' : 'bg-white/20 text-black'} animate-pulse`}>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="ml-1">thinking...</span>
                </span>
              </span>
            </div>
          </div>
        )}
        
        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message..."
              className={`flex-1 bg-transparent border-b text-white text-xs px-2 py-1 outline-none font-mono placeholder:text-white/20 ${mode === Mode.PHONK ? 'border-red-600 focus:border-red-400' : mode === Mode.DISCO ? 'border-cyan-600 focus:border-cyan-400' : 'border-white/50 focus:border-white'}`}
            />
            <button
              type="submit"
              className={`px-3 py-1 text-xs font-mono uppercase tracking-[0.3em] rounded transition-all ${mode === Mode.PHONK ? 'bg-red-600 hover:bg-red-500 text-white' : mode === Mode.DISCO ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* BOTTOM HUD - SYSTEM INFO */}
      <div className={`absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] left-6 md:left-10 hidden md:flex flex-col gap-2 font-mono text-[9px] md:text-[11px] uppercase tracking-[0.4em] z-10 transition-colors pointer-events-none ${hudColors[mode]}`}>
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full bg-white/40 ${mode !== Mode.NORMAL ? 'animate-pulse shadow-[0_0_10px_white]' : 'animate-ping'}`}></div>
          <span>MOCHI V1</span>
        </div>
      </div>

      {/* Clear Memory Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${mode === Mode.PHONK ? 'bg-red-900/95 border-red-600' : mode === Mode.DISCO ? 'bg-cyan-900/95 border-cyan-600' : 'bg-black/95 border-white/20'} border rounded-lg p-6 max-w-sm w-full backdrop-blur-lg shadow-2xl`}>
            <h3 className={`text-lg font-bold mb-4 text-center font-mono uppercase tracking-wider ${mode === Mode.PHONK ? 'text-red-300' : mode === Mode.DISCO ? 'text-cyan-300' : 'text-white'}`}>
              WIPE MEMORY?
            </h3>
            <p className={`text-sm mb-6 text-center font-mono ${mode === Mode.PHONK ? 'text-red-200' : mode === Mode.DISCO ? 'text-cyan-200' : 'text-white/80'}`}>
              Are you sure you want to clear all chat history? Mochi will forget everything we've talked about. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className={`flex-1 px-4 py-2 rounded font-mono text-xs uppercase tracking-[0.2em] transition-colors ${mode === Mode.PHONK ? 'bg-red-800/50 hover:bg-red-800/70 text-red-300' : mode === Mode.DISCO ? 'bg-cyan-800/50 hover:bg-cyan-800/70 text-cyan-300' : 'bg-white/10 hover:bg-white/20 text-white/60'}`}
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setChatHistory([]);
                  localStorage.removeItem('mochi-chat-history');
                  setMemoryCount(0);
                  setShowClearModal(false);
                  setExpression(Expression.SLEEPY);
                  setTimeout(() => setExpression(Expression.IDLE), 2000);
                }}
                className={`flex-1 px-4 py-2 rounded font-mono text-xs uppercase tracking-[0.2em] transition-colors ${mode === Mode.PHONK ? 'bg-red-600 hover:bg-red-500 text-white' : mode === Mode.DISCO ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
              >
                WIPE OUT
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float-mochi { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-float-mochi { animation: float-mochi 3s ease-in-out infinite; }
        
        .fade-in { animation: fadeIn 0.25s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .safe-area-inset {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
        }
      `}</style>
    </div>
  );
};

export default App;
