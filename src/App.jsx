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
  Check
} from 'lucide-react';

import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyGatEXfwaVNTyDCJ1RRSdhPj9Gl2sShI",
  authDomain: "piano-sky-path.firebaseapp.com",
  projectId: "piano-sky-path",
  storageBucket: "piano-sky-path.firebasestorage.app",
  messagingSenderId: "282801920513",
  appId: "1:282801920513:web:e99813f466f7af6b86fe00",
  measurementId: "G-LLECZBLP5G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'piano-climber-production';

const playSound = (type) => {
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
  } catch (e) {
    // Audio context might be blocked by browser policy until interaction
  }
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
  
  const [songName, setSongName] = useState('');
  const [targetWeeks, setTargetWeeks] = useState(4);
  const [targetScore, setTargetScore] = useState(100);
  const [latePenalty, setLatePenalty] = useState(5);

  const currentCloudRef = useRef(null);

  // 1. Auth Initializer
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2. Data Synchronization
  useEffect(() => {
    if (!user) return;

    const pinsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    const unsubPins = onSnapshot(pinsRef, (docSnap) => {
      if (docSnap.exists()) setPins(docSnap.data());
      else setDoc(pinsRef, { girl: '1111', parent: '9999' });
    }, (err) => console.error("PIN Sync Error:", err));

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
          setLoading(false);
        }, (err) => console.error("Days Sync Error:", err));
        return () => unsubDays();
      } else {
        setGoal(null);
        setDays([]);
        setLoading(false);
      }
    }, (err) => console.error("Goal Sync Error:", err));

    return () => { unsubPins(); unsubGoal(); };
  }, [user]);

  // 3. Automatic Missed Day Marking Logic
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

      if (updatesNeeded) {
        await batch.commit();
      }
    };

    const timer = setTimeout(checkAutoMissed, 3000); 
    return () => clearTimeout(timer);
  }, [goal, days, loading, user]);

  // 4. Auto-Scroll to Current Position
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
    if (pinInput === pins.girl) setRole('girl');
    else if (pinInput === pins.parent) setRole('parent');
    else {
      playSound('fail');
      setPinInput('');
    }
  };

  const updatePins = async (newGirl, newParent) => {
    if (!user || role !== 'parent') return;
    const pinsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth');
    await updateDoc(pinsRef, { girl: newGirl, parent: newParent });
    playSound('success');
    setShowSettings(false);
  };

  const logPractice = async (status) => {
    if (!user || !goal || goal.completed) return;
    const todayStr = new Date().toLocaleDateString();
    if (days.find(d => d.dateString === todayStr)) return;

    setEffect(status === 'completed' ? 'sparkle' : 'rain');
    playSound(status === 'completed' ? 'success' : 'fail');
    setTimeout(() => setEffect(null), 3000);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'days'), {
        goalId: goal.id,
        status,
        timestamp: Date.now(),
        dateString: todayStr
      });
    } catch (err) {
      console.error("Log error:", err);
    }
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
        if (data.pins) {
          batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'auth'), data.pins);
        }

        const newGoalRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'));
        batch.set(newGoalRef, { ...data.goal, id: undefined });

        data.days.forEach(day => {
          const dayRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'days'));
          batch.set(dayRef, { ...day, goalId: newGoalRef.id, id: undefined });
        });

        await batch.commit();
        playSound('success');
        setRole(null);
      } catch (err) {
        playSound('fail');
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
      playSound('success');
    } catch (err) {
      playSound('fail');
    }
  };

  const resetToday = async () => {
    if (!user || role !== 'parent') return;
    const todayStr = new Date().toLocaleDateString();
    const todayDoc = days.find(d => d.dateString === todayStr);
    if (todayDoc) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'days', todayDoc.id));
      playSound('success');
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
      playSound('success');
    } catch (err) {
      playSound('fail');
    }
  };

  // --- Calculations ---
  const { path, missedCount, daysRemaining, currentPotentialScore, daysToDeadline } = useMemo(() => {
    let level = 0;
    let missed = 0;
    const target = goal ? goal.targetWeeks * 7 : 0;
    
    const processedDays = days.map((d, i) => {
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
    const daysLate = Math.max(0, Math.floor((now - deadline) / (1000 * 60 * 60 * 24)));
    const dLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    const score = goal ? Math.max(0, goal.originalScore - (daysLate * (goal.latePenalty || 0))) : 0;

    return { 
      path: [...processedDays, ...futureDays], 
      missedCount: missed,
      daysRemaining: futureCount,
      currentPotentialScore: Math.round(score),
      daysToDeadline: dLeft
    };
  }, [days, goal]);

  if (!role) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pink-100 p-10">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl text-center w-full max-w-xs border-8 border-pink-200 animate-in zoom-in">
          <Cat size={64} className="mx-auto text-pink-400 mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-pink-600 mb-6 italic">Piano Secret Box</h1>
          <input 
            type="password" placeholder="****" 
            className="w-full p-4 text-center text-4xl font-black rounded-2xl bg-pink-50 border-4 border-pink-100 outline-none mb-4"
            value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-pink-600 transition-all active:scale-95">OPEN SKY</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f9ff] font-sans text-slate-800 overflow-x-hidden relative">
      
      {/* Header HUD */}
      {goal && (
        <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-white/90 backdrop-blur-md border-b-2 border-pink-100 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <div className="bg-pink-400 p-2 rounded-lg text-white"><Music size={18} /></div>
            <div className="leading-tight">
              <h1 className="text-sm font-black text-pink-600 truncate max-w-[150px]">{goal.songName}</h1>
              <p className="text-[9px] uppercase font-bold text-slate-400">Piano Climb</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-white font-black text-xs flex items-center gap-1 shadow-sm ${daysToDeadline < 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}>
               <TrophyIcon size={14} /> {goal.completed ? goal.finalScore : currentPotentialScore}
            </div>
            <button onClick={() => setRole(null)} className="text-slate-300 hover:text-pink-400 transition-colors p-1"><Lock size={18} /></button>
          </div>
        </div>
      )}

      {/* Encouragement Banners */}
      {goal && !goal.completed && (
        <div className="fixed top-16 left-0 right-0 z-40 px-4">
           {daysToDeadline <= 7 && daysToDeadline > 0 && (
             <div className="bg-amber-100/90 backdrop-blur-sm border-2 border-amber-300 p-2 rounded-2xl text-center shadow-md animate-pulse">
                <p className="text-[10px] font-black text-amber-800 italic flex items-center justify-center gap-2">
                   <Star size={12} fill="currentColor" /> ALMOST AT THE D-DAY! KEEP PUSHING! <Star size={12} fill="currentColor" />
                </p>
             </div>
           )}
           {daysToDeadline <= 0 && (
             <div className="bg-rose-100/90 backdrop-blur-sm border-2 border-rose-300 p-2 rounded-2xl text-center shadow-md">
                <p className="text-[10px] font-black text-rose-800 italic">
                   SCORE IS DROPPING! DON'T STOP NOW, FINISH THE SONG! 💪
                </p>
             </div>
           )}
        </div>
      )}

      {/* Sky Path */}
      <div className="pt-32 pb-64 px-6 flex flex-col-reverse items-center relative max-w-lg mx-auto">
        <div className="w-full text-center py-6 opacity-30"><div className="h-1 bg-green-300 rounded-full w-full mb-1"></div><p className="text-[8px] font-black uppercase tracking-widest">Starting Ground</p></div>

        {!goal ? (
           role === 'parent' && !showSettings ? (
             <div className="bg-white p-8 rounded-[40px] shadow-2xl border-8 border-pink-100 w-full mb-20 animate-in zoom-in">
                <h2 className="text-xl font-black text-pink-500 mb-6 text-center italic">New Mission Goal</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Song Name" className="w-full p-4 rounded-xl bg-pink-50 border-2 border-pink-100 font-bold" value={songName} onChange={e => setSongName(e.target.value)} />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Weeks" className="p-4 rounded-xl bg-pink-50 border-2 border-pink-100" value={targetWeeks} onChange={e => setTargetWeeks(e.target.value)} />
                    <input type="number" placeholder="Max Score" className="p-4 rounded-xl bg-pink-50 border-2 border-pink-100" value={targetScore} onChange={e => setTargetScore(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-pink-400 ml-2">DAILY LATE PENALTY (PTS)</label>
                    <input type="number" className="w-full p-4 rounded-xl bg-pink-50 border-4 border-pink-100 text-pink-600 font-black" value={latePenalty} onChange={e => setLatePenalty(e.target.value)} />
                  </div>
                  <button onClick={async () => {
                      if(!songName) return;
                      const g = { songName, targetWeeks: parseInt(targetWeeks), originalScore: parseInt(targetScore), latePenalty: parseInt(latePenalty), startDate: Date.now(), status: 'active', completed: false };
                      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'), g);
                    }}
                    className="w-full bg-pink-400 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-pink-500 transition-all active:scale-95"
                  >CREATE CHALLENGE</button>
                  <div className="flex gap-2">
                     <button onClick={() => setShowSettings(true)} className="flex-1 text-slate-400 text-[10px] font-bold uppercase py-3 bg-slate-50 rounded-xl">Edit PINs</button>
                     <label className="flex-1 text-blue-500 text-[10px] font-bold uppercase py-3 bg-blue-50 rounded-xl text-center cursor-pointer flex items-center justify-center gap-1">
                        <Upload size={12}/> Import <input type="file" className="hidden" accept=".json" onChange={importData} />
                     </label>
                  </div>
                </div>
             </div>
           ) : showSettings ? (
             <div className="bg-white p-8 rounded-[40px] shadow-2xl border-8 border-blue-100 w-full mb-20">
                <h2 className="text-xl font-black text-blue-500 mb-6 text-center italic">Account PINs</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Girl PIN" className="w-full p-4 rounded-xl bg-slate-50 border-2" value={pins.girl} onChange={e => setPins({...pins, girl: e.target.value})} />
                  <input type="text" placeholder="Parent PIN" className="w-full p-4 rounded-xl bg-slate-50 border-2" value={pins.parent} onChange={e => setPins({...pins, parent: e.target.value})} />
                  <div className="flex gap-2">
                    <button onClick={() => setShowSettings(false)} className="flex-1 bg-slate-100 text-slate-500 font-bold py-3 rounded-xl">CANCEL</button>
                    <button onClick={() => updatePins(pins.girl, pins.parent)} className="flex-1 bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg">SAVE</button>
                  </div>
                </div>
             </div>
           ) : (
             <div className="text-center p-20 opacity-40 animate-pulse"><Cat size={64} className="mx-auto mb-4" /><p className="font-bold italic">Wait for Parent to set a goal!</p></div>
           )
        ) : (
          <div className="flex flex-col-reverse items-center w-full gap-24">
            {path.map((item, idx) => {
              const isCurrent = idx === days.length - 1;
              const isFuture = item.type === 'future';
              const isMissed = item.status === 'missed';
              const dateObj = new Date(goal.startDate + (idx * 24 * 60 * 60 * 1000));
              const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={item.id} ref={isCurrent ? currentCloudRef : null} style={{ transform: `translateX(${item.xOffset}px)` }} className={`relative transition-all duration-700 flex flex-col items-center ${isFuture ? 'opacity-20' : 'opacity-100'}`}>
                  {isCurrent && !goal.completed && (
                    <div className="absolute -top-28 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                      <div className="bg-white p-2 rounded-full shadow-2xl border-4 border-pink-300"><Cat size={56} className="text-pink-500" /></div>
                      <div className="absolute left-20 top-0 w-32 space-y-1">
                         <div className="bg-blue-500 text-white px-3 py-1 rounded-xl flex items-center gap-2 text-[10px] font-black shadow-lg">
                            <Cloud size={14} fill="white" /> {daysRemaining} days left
                         </div>
                         <div className="bg-amber-500 text-white px-3 py-1 rounded-xl flex items-center gap-2 text-[10px] font-black shadow-lg">
                            <CloudLightning size={14} fill="white" /> {missedCount} missed
                         </div>
                      </div>
                    </div>
                  )}
                  <div className={`relative ${isMissed ? 'text-slate-400' : (isFuture ? 'text-blue-200' : 'text-pink-300')}`}>
                    <Cloud size={100} fill="currentColor" className="drop-shadow-xl" />
                    {!isFuture && <div className="absolute inset-0 flex items-center justify-center">{isMissed ? <CloudLightning size={24} className="text-yellow-400" /> : <Music size={24} className="text-white opacity-80" />}</div>}
                  </div>
                  <div className="text-[10px] font-black opacity-40 mt-1 uppercase text-center leading-tight">{dateStr}<br/>Day {idx + 1}</div>
                </div>
              );
            })}
            <div className="flex flex-col items-center py-20">
               <div className="relative"><Star size={140} fill={goal.completed ? "#fbbf24" : "#e2e8f0"} className={`${goal.completed ? 'animate-pulse text-yellow-400' : 'text-slate-200'} drop-shadow-2xl`} /><div className="absolute inset-0 flex items-center justify-center flex-col pt-2"><span className="text-white font-black text-3xl drop-shadow-md">GOAL</span></div></div>
               {goal.completed && (
                 <div className="mt-8 bg-white px-10 py-8 rounded-[50px] shadow-2xl border-8 border-yellow-200 text-center animate-in zoom-in">
                    <p className="text-sm font-black text-amber-600 uppercase mb-1">Piano Mastery Achieved!</p>
                    <p className="text-5xl font-black text-amber-500">{goal.finalScore} PTS</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">Great job climbing the sky!</p>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      {goal && !goal.completed && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
           {role === 'girl' ? (
             <>
               <button onClick={() => logPractice('completed')} className="w-20 h-20 bg-pink-400 text-white rounded-full shadow-[0_10px_0_0_#be185d] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all"><CheckCircle2 size={44} /></button>
               <button onClick={() => logPractice('missed')} className="w-16 h-16 bg-slate-400 text-white rounded-full shadow-[0_8px_0_0_#475569] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all"><XCircle size={36} /></button>
             </>
           ) : (
             <div className="flex flex-col gap-3 items-end">
               {/* Click-to-confirm pattern for safety */}
               <button onClick={() => confirmState === 'finalize' ? finalizeGoal() : setConfirmState('finalize')} className={`w-16 h-16 ${confirmState === 'finalize' ? 'bg-green-500 animate-bounce' : 'bg-yellow-400'} text-white rounded-full shadow-lg flex items-center justify-center transition-all`}>
                  {confirmState === 'finalize' ? <Check size={32}/> : <TrophyIcon size={32} />}
               </button>
               <button onClick={exportData} className="w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all" title="Backup"><Download size={24} /></button>
               <button onClick={() => confirmState === 'reset' ? resetEverything() : setConfirmState('reset')} className={`w-14 h-14 ${confirmState === 'reset' ? 'bg-red-700' : 'bg-red-500'} text-white rounded-full shadow-lg flex items-center justify-center transition-all`}>
                  {confirmState === 'reset' ? <AlertTriangle size={24}/> : <Trash2 size={24} />}
               </button>
               {confirmState && (
                 <button onClick={() => setConfirmState(null)} className="bg-white/90 text-slate-500 text-[10px] font-black p-2 px-4 rounded-full shadow-sm border border-slate-200">CANCEL</button>
               )}
             </div>
           )}
        </div>
      )}

      {/* Visual Effects Overlay */}
      {effect === 'sparkle' && <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"><Sparkles size={400} className="text-yellow-400 animate-spin opacity-40" /></div>}
      {effect === 'rain' && <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm"><CloudRain size={120} className="text-blue-300 animate-bounce mb-4" /><p className="text-white font-black text-2xl tracking-widest italic">STORM CLOUD!</p></div>}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .zoom-in { animation-name: zoom-in; }
      `}</style>
    </div>
  );
};

export default App;