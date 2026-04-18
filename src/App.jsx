import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  addDoc,
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Music, 
  Cloud, 
  CloudLightning, 
  Star, 
  Trophy, 
  Play,
  Cat,
  CloudRain,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lock,
  Settings,
  Trophy as TrophyIcon,
  Trash2,
  Save,
  Download,
  Upload,
  AlertTriangle,
  Check,
  Frown,
  Volume2,
  VolumeX,
  X,
  Mic,
  PlayCircle
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'piano-climber-production';

const playSoundEffect = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
};

const App = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [pinInput, setPinInput] = useState('');
  const [pins, setPins] = useState({ girl: '1111', parent: '9999' });
  const [goal, setGoal] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [effect, setEffect] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [catMood, setCatMood] = useState('normal'); 
  const [isMuted, setIsMuted] = useState(false);
  const [selectedDayAudio, setSelectedDayAudio] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [songName, setSongName] = useState('');
  const [targetWeeks, setTargetWeeks] = useState(4);
  const [targetScore, setTargetScore] = useState(100);
  const [latePenalty, setLatePenalty] = useState(5);

  const currentCloudRef = useRef(null);
  const audioPlayer = useRef(new Audio());

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    const pinsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    const unsubPins = onSnapshot(pinsRef, (docSnap) => {
      if (docSnap.exists()) setPins(docSnap.data());
      else setDoc(pinsRef, { girl: '1111', parent: '9999' });
    });

    const goalRef = collection(db, 'artifacts', appId, 'users', user.uid, 'goals');
    const unsubGoal = onSnapshot(goalRef, (snap) => {
      if (!snap.empty) {
        const goalData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setGoal(goalData);
        
        const daysRef = collection(db, 'artifacts', appId, 'users', user.uid, 'days');
        const unsubDays = onSnapshot(daysRef, (daySnap) => {
          const list = daySnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => d.goalId === goalData.id)
            .sort((a, b) => a.timestamp - b.timestamp);
          setDays(list);
          
          if (list.length > 0) {
            const lastEntry = list[list.length - 1];
            if (lastEntry.status === 'missed') setCatMood('sad');
            else setCatMood('normal');
          }
          setLoading(false);
        });
        return () => unsubDays();
      } else {
        setGoal(null);
        setDays([]);
        setLoading(false);
      }
    });

    return () => { unsubPins(); unsubGoal(); };
  }, [user]);

  // Handle Autoplay for latest recording - triggered by role change (login) or days update
  useEffect(() => {
    const triggerAutoPlay = async () => {
      if (!loading && role && days.length > 0 && !isMuted) {
        const sortedDays = [...days].sort((a, b) => b.timestamp - a.timestamp);
        const latestWithAudio = sortedDays.find(d => d.audioData);
        
        if (latestWithAudio) {
          if (audioPlayer.current.src !== latestWithAudio.audioData) {
            audioPlayer.current.src = latestWithAudio.audioData;
            audioPlayer.current.loop = true;
          }
          try {
            await audioPlayer.current.play();
          } catch (err) {
            console.log("Play blocked, waiting for more interaction...");
          }
        }
      } else {
        audioPlayer.current.pause();
      }
    };
    triggerAutoPlay();
  }, [loading, days, isMuted, role]);

  useEffect(() => {
    if (!goal || loading || !user || goal.completed) return;

    const checkAutoMissed = async () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const startDate = new Date(goal.startDate);
      startDate.setHours(0,0,0,0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let currentCheck = new Date(startDate);
      const batch = writeBatch(db);
      let updatesNeeded = false;

      while (currentCheck <= yesterday) {
        const dateStr = currentCheck.toLocaleDateString();
        const exists = days.find(d => d.dateString === dateStr);
        if (!exists) {
          const newDayRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'days'));
          batch.set(newDayRef, {
            goalId: goal.id,
            status: 'missed',
            timestamp: currentCheck.getTime(),
            dateString: dateStr,
            autoMarked: true
          });
          updatesNeeded = true;
        }
        currentCheck.setDate(currentCheck.getDate() + 1);
      }

      if (updatesNeeded) await batch.commit();
    };

    const timer = setTimeout(checkAutoMissed, 3000); 
    return () => clearTimeout(timer);
  }, [goal, days, loading, user]);

  useEffect(() => {
    if (goal && !loading) {
      const timer = setTimeout(() => {
        if (currentCloudRef.current) {
          currentCloudRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [loading, goal, days.length, role]);

  const handleLogin = () => {
    const currentInput = pinInput;
    setPinInput('');
    if (currentInput === pins.girl || currentInput === pins.parent) {
      setRole(currentInput === pins.girl ? 'girl' : 'parent');
    } else {
      playSoundEffect('fail');
    }
  };

  const handleLogout = () => {
    setRole(null);
    setPinInput('');
    setCatMood('normal');
    audioPlayer.current.pause();
  };

  const updatePins = async (newGirl, newParent) => {
    if (!user || role !== 'parent') return;
    const pinsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    await updateDoc(pinsRef, { girl: newGirl, parent: newParent });
    playSoundEffect('success');
    setShowSettings(false);
  };

  const logPractice = async (status) => {
    if (!user || !goal || goal.completed) return;
    const todayStr = new Date().toLocaleDateString();
    
    setEffect(status === 'completed' ? 'sparkle' : 'rain');
    setCatMood(status === 'completed' ? 'happy' : 'sad');
    playSoundEffect(status === 'completed' ? 'success' : 'fail');
    
    if (status === 'completed') {
      setTimeout(() => {
        setEffect(null);
        setCatMood('normal');
      }, 4000);
    } else {
      setTimeout(() => setEffect(null), 3000);
    }

    try {
      const existingEntry = days.find(d => d.dateString === todayStr);
      if (existingEntry) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', existingEntry.id), {
          status,
          timestamp: Date.now()
        });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'days'), {
          goalId: goal.id,
          status,
          timestamp: Date.now(),
          dateString: todayStr
        });
      }
    } catch (err) {
      console.error("Log error:", err);
    }
  };

  const handleFileUpload = async (e, dayId) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = reader.result;
        if (base64.length > 1300000) {
          alert("Recording too long! Please use a shorter file.");
          setIsUploading(false);
          return;
        }
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', dayId), {
          audioData: base64
        });
        playSoundEffect('success');
      } catch (err) {
        console.error("Upload error", err);
      } finally {
        setIsUploading(false);
      }
    };
  };

  const removeAudio = async (dayId) => {
    if (role !== 'parent') return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', dayId), {
      audioData: null
    });
    playSoundEffect('success');
  };

  const exportData = () => {
    const data = { goal, days, pins, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `piano_backup_${goal?.songName || 'practice'}.json`;
    link.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.goal || !data.days) throw new Error("Invalid Format");
        const batch = writeBatch(db);
        if (data.pins) batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth'), data.pins);
        const newGoalRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'));
        batch.set(newGoalRef, { ...data.goal, id: undefined });
        data.days.forEach(day => {
          const dayRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'days'));
          batch.set(dayRef, { ...day, goalId: newGoalRef.id, id: undefined });
        });
        await batch.commit();
        playSoundEffect('success');
        setRole(null);
      } catch (err) {
        playSoundEffect('fail');
      }
    };
    reader.readAsText(file);
  };

  const resetEverything = async () => {
    if (!user || role !== 'parent' || !goal) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', goal.id));
      days.forEach(day => batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'days', day.id)));
      await batch.commit();
      setGoal(null);
      setDays([]);
      setConfirmState(null);
      setCatMood('normal');
      audioPlayer.current.pause();
      playSoundEffect('success');
    } catch (err) {
      playSoundEffect('fail');
    }
  };

  const resetToday = async () => {
    if (!user || role !== 'parent') return;
    const todayStr = new Date().toLocaleDateString();
    const todayDoc = days.find(d => d.dateString === todayStr);
    if (todayDoc) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', todayDoc.id));
      setCatMood('normal');
      playSoundEffect('success');
    }
  };

  const finalizeGoal = async () => {
    if (!user || !goal || role !== 'parent') return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', goal.id), {
        completed: true,
        completedAt: Date.now(),
        finalScore: currentPotentialScore
      });
      setEffect('sparkle');
      setConfirmState(null);
      playSoundEffect('success');
    } catch (err) {
      playSoundEffect('fail');
    }
  };

  const { path, missedCount, daysRemaining, currentPotentialScore, daysToDeadline, todayStatus } = useMemo(() => {
    let level = 0;
    let missed = 0;
    const target = goal ? goal.targetWeeks * 7 : 0;
    const todayStr = new Date().toLocaleDateString();
    let currentStatus = null;
    
    const processedDays = days.map((d, i) => {
      if (d.dateString === todayStr) currentStatus = d.status;
      if (d.status === 'completed') level++;
      else missed++;
      return { ...d, level, xOffset: d.status === 'missed' ? (i % 2 === 0 ? 40 : -40) : 0, type: 'recorded' };
    });

    const futureCount = Math.max(0, target - level);
    const futureDays = [];
    for (let i = 1; i <= futureCount; i++) {
      futureDays.push({ id: `future-${i}`, level: level + i, xOffset: 0, type: 'future' });
    }

    const deadline = goal ? goal.startDate + (target * 24 * 60 * 60 * 1000) : 0;
    const now = Date.now();
    const dLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    const score = goal ? Math.max(0, goal.originalScore - (Math.max(0, -dLeft) * (goal.latePenalty || 0))) : 0;

    return { 
      path: [...processedDays, ...futureDays], 
      missedCount: missed,
      daysRemaining: futureCount,
      currentPotentialScore: Math.round(score),
      daysToDeadline: dLeft,
      todayStatus: currentStatus
    };
  }, [days, goal]);

  const backgroundItems = useMemo(() => {
    const items = [];
    const colors = ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea', '#dec3ff', '#fff4bd'];
    for (let i = 0; i < 60; i++) {
      items.push({
        id: i,
        type: Math.random() > 0.4 ? 'star' : 'note',
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 10}s`,
        duration: `${4 + Math.random() * 8}s`,
        size: 14 + Math.random() * 22,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkleDuration: `${1 + Math.random() * 2}s`
      });
    }
    return items;
  }, []);

  if (!role) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pink-100 p-10 relative overflow-hidden">
        {backgroundItems.map(item => (
          <div key={item.id} className={`absolute pointer-events-none opacity-25 ${item.type === 'star' ? 'twinkle' : 'float-up'}`}
            style={{ left: item.left, animationDelay: item.delay, animationDuration: item.duration, color: item.color, bottom: '-50px', '--twinkle-dur': item.twinkleDuration }}>
            {item.type === 'star' ? <Star size={item.size} fill="currentColor" /> : <Music size={item.size} />}
          </div>
        ))}
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[40px] shadow-2xl text-center w-full max-w-xs border-8 border-pink-200 animate-in zoom-in z-10">
          <Cat size={64} className="mx-auto text-pink-400 mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-pink-600 mb-6 italic">Piano Secret Box</h1>
          <input type="password" placeholder="****" className="w-full p-4 text-center text-4xl font-black rounded-2xl bg-pink-50 border-4 border-pink-100 outline-none mb-4"
            value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-pink-600 transition-all active:scale-95">OPEN SKY</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f9ff] font-sans text-slate-800 overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        {backgroundItems.map(item => (
          <div key={item.id} className={`absolute opacity-25 ${item.type === 'star' ? 'twinkle' : 'float-up'}`}
            style={{ left: item.left, animationDelay: item.delay, animationDuration: item.duration, color: item.color, bottom: '-100px', '--twinkle-dur': item.twinkleDuration }}>
            {item.type === 'star' ? <Star size={item.size} fill="currentColor" /> : <Music size={item.size} />}
          </div>
        ))}
      </div>

      {/* Header */}
      {goal && (
        <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-white/90 backdrop-blur-md border-b-2 border-pink-100 flex justify-between items-center shadow-md gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="bg-pink-400 p-2 rounded-lg text-white flex-shrink-0"><Music size={18} /></div>
            <div className="leading-tight min-w-0">
              <h1 className="text-sm font-black text-pink-600 truncate whitespace-nowrap overflow-hidden">{goal.songName}</h1>
              <p className="text-[9px] uppercase font-bold text-slate-400">Piano Sky Path</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-pink-500 p-2 bg-slate-100 rounded-full transition-colors">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="animate-pulse" />}
            </button>
            <div className={`px-3 py-1 rounded-full text-white font-black text-xs flex items-center gap-1 shadow-sm ${daysToDeadline < 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}>
               <TrophyIcon size={14} /> {goal.completed ? goal.finalScore : currentPotentialScore}
            </div>
            <button onClick={handleLogout} className="text-slate-300 hover:text-pink-400 transition-colors p-1"><Lock size={18} /></button>
          </div>
        </div>
      )}

      {/* Main Sky Climb Area */}
      <div className="pt-32 pb-64 px-6 flex flex-col-reverse items-center relative max-w-lg mx-auto z-10">
        <div className="w-full text-center py-6 opacity-30"><div className="h-1 bg-green-300 rounded-full w-full mb-1"></div><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ground</p></div>

        {!goal ? (
           role === 'parent' && !showSettings ? (
            <div className="bg-white/90 backdrop-blur p-8 rounded-[40px] shadow-2xl border-8 border-pink-100 w-full mb-20 animate-in zoom-in">
               <h2 className="text-xl font-black text-pink-500 mb-6 text-center italic">New Goal</h2>
               <div className="space-y-4">
                 <input type="text" placeholder="Song Name" className="w-full p-4 rounded-xl bg-pink-50 border-2 border-pink-100 font-bold" value={songName} onChange={e => setSongName(e.target.value)} />
                 <div className="grid grid-cols-2 gap-4">
                   <input type="number" placeholder="Weeks" className="p-4 rounded-xl bg-pink-50 border-2 border-pink-100" value={targetWeeks} onChange={e => setTargetWeeks(e.target.value)} />
                   <input type="number" placeholder="Max Score" className="p-4 rounded-xl bg-pink-50 border-2 border-pink-100" value={targetScore} onChange={e => setTargetScore(e.target.value)} />
                 </div>
                 <button onClick={async () => {
                     if(!songName) return;
                     const g = { songName, targetWeeks: parseInt(targetWeeks), originalScore: parseInt(targetScore), latePenalty: parseInt(latePenalty), startDate: Date.now(), status: 'active', completed: false };
                     await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'), g);
                   }} className="w-full bg-pink-400 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-pink-500 transition-all active:scale-95">CREATE CHALLENGE</button>
                 <div className="flex gap-2">
                    <button onClick={() => setShowSettings(true)} className="flex-1 text-slate-400 text-[10px] font-bold uppercase py-3 bg-slate-50 rounded-xl">PINs</button>
                    <label className="flex-1 text-blue-500 text-[10px] font-bold uppercase py-3 bg-blue-50 rounded-xl text-center cursor-pointer flex items-center justify-center gap-1"><Upload size={12}/> Import <input type="file" className="hidden" accept=".json" onChange={importData} /></label>
                 </div>
               </div>
            </div>
          ) : (
            <div className="text-center p-20 opacity-40 animate-pulse"><Cat size={64} className="mx-auto mb-4 text-slate-400" /><p className="font-bold italic text-slate-400">Wait for Parent!</p></div>
          )
        ) : (
          <div className="flex flex-col-reverse items-center w-full gap-24">
            {path.map((item, idx) => {
              const isCurrent = idx === days.length - 1;
              const isFuture = item.type === 'future';
              const isMissed = item.status === 'missed';
              const hasAudio = !!item.audioData;
              const dateObj = new Date(goal.startDate + (idx * 24 * 60 * 60 * 1000));
              const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={item.id} ref={isCurrent ? currentCloudRef : null} style={{ transform: `translateX(${item.xOffset}px)` }} className={`relative transition-all duration-700 flex flex-col items-center ${isFuture ? 'opacity-20' : 'opacity-100'}`}>
                  {isCurrent && !goal.completed && (
                    <div className={`absolute -top-24 left-1/2 -translate-x-1/2 z-10 ${catMood === "happy" ? "cat-fly-happy" : catMood === "sad" ? "cat-cry-sad" : "animate-bounce"}`}>
                      <div className="bg-white p-2 rounded-full shadow-2xl border-4 border-pink-300 relative">
                         {catMood === 'sad' ? (
                           <>
                             <Frown size={56} className="text-slate-400" />
                             <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-blue-400"><CloudRain size={24} className="animate-pulse" /></div>
                           </>
                         ) : (
                           <Cat size={56} className="text-pink-500" />
                         )}
                      </div>
                      <div className="absolute left-20 top-0 w-32 space-y-1 pointer-events-none">
                         <div className="bg-blue-500 text-white px-3 py-1 rounded-xl flex items-center gap-2 text-[10px] font-black shadow-lg">
                            <Cloud size={14} fill="white" /> {daysRemaining} days left
                         </div>
                         <div className="bg-amber-500 text-white px-3 py-1 rounded-xl flex items-center gap-2 text-[10px] font-black shadow-lg">
                            <CloudLightning size={14} fill="white" /> {missedCount} missed
                         </div>
                      </div>
                    </div>
                  )}
                  
                  <div onClick={() => !isFuture && setSelectedDayAudio(item)}
                    className={`relative cursor-pointer hover:scale-105 transition-transform ${isMissed ? 'text-slate-400' : (isFuture ? 'text-blue-200' : 'text-pink-300')}`}>
                    <Cloud size={100} fill="currentColor" className="drop-shadow-xl" />
                    {!isFuture && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {hasAudio ? <Mic size={24} className="text-white drop-shadow-md animate-pulse" /> : 
                        (isMissed ? <CloudLightning size={24} className="text-yellow-400" /> : <Music size={24} className="text-white opacity-80" />)}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-black opacity-40 mt-1 uppercase text-center leading-tight text-slate-500">{dateStr}<br/>Day {idx + 1}</div>
                </div>
              );
            })}
            <div className="flex flex-col items-center py-20">
               <div className="relative"><Star size={140} fill={goal.completed ? "#fbbf24" : "#e2e8f0"} className={`${goal.completed ? 'animate-pulse text-yellow-400' : 'text-slate-200'} drop-shadow-2xl`} /><div className="absolute inset-0 flex items-center justify-center flex-col pt-2"><span className="text-white font-black text-3xl drop-shadow-md uppercase">Goal</span></div></div>
               {goal.completed && (
                 <div className="mt-8 bg-white px-10 py-8 rounded-[50px] shadow-2xl border-8 border-yellow-200 text-center animate-in zoom-in">
                    <p className="text-sm font-black text-amber-600 uppercase mb-1">Mastery Achieved!</p>
                    <p className="text-5xl font-black text-amber-500">{goal.finalScore} PTS</p>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {goal && !goal.completed && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
           {role === 'girl' ? (
             <div className="flex flex-col gap-4 items-end">
               <button onClick={() => logPractice('completed')} className={`w-20 h-20 bg-pink-400 text-white rounded-full shadow-[0_10px_0_0_#be185d] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all ${todayStatus === 'completed' ? 'ring-4 ring-pink-200' : 'opacity-90'}`}><CheckCircle2 size={44} /></button>
               <button onClick={() => logPractice('missed')} className={`w-16 h-16 bg-slate-400 text-white rounded-full shadow-[0_8px_0_0_#475569] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all ${todayStatus === 'missed' ? 'ring-4 ring-slate-200' : 'opacity-90'}`}><XCircle size={36} /></button>
             </div>
           ) : (
             <div className="flex flex-col gap-3 items-end">
               <button onClick={() => confirmState === 'finalize' ? finalizeGoal() : setConfirmState('finalize')} className={`w-16 h-16 ${confirmState === 'finalize' ? 'bg-green-500 animate-pulse' : 'bg-yellow-400'} text-white rounded-full shadow-lg flex items-center justify-center transition-all`}>{confirmState === 'finalize' ? <Check size={32}/> : <TrophyIcon size={32} />}</button>
               <button onClick={exportData} className="w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all" title="Backup"><Download size={24} /></button>
               <button onClick={() => confirmState === 'reset' ? resetEverything() : setConfirmState('reset')} className={`w-14 h-14 ${confirmState === 'reset' ? 'bg-red-700' : 'bg-red-500'} text-white rounded-full shadow-lg flex items-center justify-center transition-all`} title="Reset Everything">{confirmState === 'reset' ? <AlertTriangle size={24}/> : <Trash2 size={24} />}</button>
               <button onClick={resetToday} className="w-14 h-14 bg-blue-400 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all" title="Reset Today"><RotateCcw size={24} /></button>
               {confirmState && <button onClick={() => setConfirmState(null)} className="bg-white/90 text-slate-500 text-[10px] font-black p-2 px-4 rounded-full shadow-sm border border-slate-200">CANCEL</button>}
             </div>
           )}
        </div>
      )}

      {/* Audio Vault Modal */}
      {selectedDayAudio && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl border-8 border-pink-100 relative text-center">
            <button onClick={() => setSelectedDayAudio(null)} className="absolute top-4 right-4 text-slate-300 hover:text-pink-500"><X size={24} /></button>
            <h3 className="text-xl font-black text-pink-600 mb-2 italic text-balance">Musical Memories</h3>
            <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">{selectedDayAudio.dateString}</p>
            
            {selectedDayAudio.audioData ? (
              <div className="space-y-6">
                <div className="bg-pink-50 p-6 rounded-[32px] border-2 border-pink-100 flex flex-col items-center">
                  <audio controls src={selectedDayAudio.audioData} className="w-full mb-4" />
                  <p className="text-[10px] font-black text-pink-400 italic">"Listen to your performance!"</p>
                </div>
                {role === 'parent' && (
                  <button onClick={() => { removeAudio(selectedDayAudio.id); setSelectedDayAudio(null); }} className="w-full py-3 bg-rose-100 text-rose-500 rounded-2xl font-black text-xs hover:bg-rose-200 flex items-center justify-center gap-2 uppercase tracking-tight"><Trash2 size={14}/> Remove for Daughter</button>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 p-10 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                <Music size={48} className="text-slate-200" />
                <p className="text-sm font-bold text-slate-400 italic">Silence is golden, but practice is diamond!</p>
              </div>
            )}

            {role === 'girl' && (
              <div className="mt-6">
                <label className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg ${isUploading ? 'bg-slate-100 text-slate-400' : 'bg-pink-500 text-white hover:bg-pink-600 active:scale-95'}`}>
                  {isUploading ? <RotateCcw className="animate-spin" size={20}/> : <Mic size={20} />}
                  {selectedDayAudio.audioData ? 'UPDATE YOUR MASTERPIECE' : 'SHARE YOUR PRACTICE'}
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, selectedDayAudio.id)} disabled={isUploading} />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {effect === 'sparkle' && <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"><Sparkles size={400} className="text-yellow-400 animate-spin opacity-40" /></div>}
      
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .zoom-in { animation-name: zoom-in; }
        
        @keyframes float-up {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          5% { opacity: 0.3; }
          95% { opacity: 0.3; }
          100% { transform: translateY(-130vh) rotate(360deg); opacity: 0; }
        }
        @keyframes twinkle { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
        @keyframes jump-happy { 
          0% { transform: translateY(0) scale(1); } 
          15% { transform: translateY(15px) scale(1.15, 0.85); } 
          40% { transform: translateY(-440px) scale(1.1) rotate(15deg); } 
          60% { transform: translateY(-440px) scale(1.1) rotate(-15deg); } 
          85% { transform: translateY(0) scale(1.15, 0.85); } 
          100% { transform: translateY(0) scale(1); } 
        }
        @keyframes cry-sad { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px) rotate(-5deg); } 75% { transform: translateX(5px) rotate(5deg); } }
        
        .float-up { animation: float-up linear infinite; }
        .twinkle { animation: twinkle ease-in-out infinite; animation-duration: var(--twinkle-dur, 2s); }
        .cat-fly-happy { animation: jump-happy 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .cat-cry-sad { animation: cry-sad 0.5s ease-in-out infinite; }
        
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .min-h-screen { min-height: 100vh; }
        .bg-pink-100 { background-color: #fce4ec; }
      `}</style>
    </div>
  );
};

export default App;