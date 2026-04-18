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
  writeBatch,
  getDocs,
  query,
  orderBy
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
  Loader2,
  Heart
} from 'lucide-react';

// --- Firebase Configuration ---
// Prioritizes environment variables for secure Git deployments
const firebaseConfig = (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) 
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
  : (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {});

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'piano-climber-production';

const CHUNK_SIZE = 800000; 

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
  const [pins, setPins] = useState({ girl: '1111', parent: '9999', girlName: 'Little Pianist' });
  const [goal, setGoal] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [effect, setEffect] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [catMood, setCatMood] = useState('normal'); 
  const [isMuted, setIsMuted] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [fullAudioData, setFullAudioData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  
  const [editGoalName, setEditGoalName] = useState('');
  const [editWeeks, setEditWeeks] = useState(4);
  const [editScore, setEditScore] = useState(100);
  const [editPenalty, setEditPenalty] = useState(5);
  const [editGirlName, setEditGirlName] = useState('');
  const [editGirlPin, setEditGirlPin] = useState('');
  const [editParentPin, setEditParentPin] = useState('');

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
    const pinsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'auth');
    const unsubPins = onSnapshot(pinsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPins({ ...data, girlName: data.girlName || 'Little Pianist' });
      } else {
        setDoc(pinsRef, { girl: '1111', parent: '9999', girlName: 'Little Pianist' });
      }
    });

    const goalRef = collection(db, 'artifacts', appId, 'public', 'data', 'goals');
    const unsubGoal = onSnapshot(goalRef, (snap) => {
      if (!snap.empty) {
        const goalData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setGoal(goalData);
        setEditGoalName(goalData.songName);
        setEditWeeks(goalData.targetWeeks);
        setEditScore(goalData.originalScore);
        setEditPenalty(goalData.latePenalty || 5);
        
        const daysRef = collection(db, 'artifacts', appId, 'public', 'data', 'days');
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

  useEffect(() => {
    if (showSettings) {
      setEditGirlName(pins.girlName);
      setEditGirlPin(pins.girl);
      setEditParentPin(pins.parent);
    }
  }, [showSettings, pins]);

  const fetchFullAudio = async (dayId) => {
    if (!user) return null;
    const chunksRef = collection(db, 'artifacts', appId, 'public', 'data', 'days', dayId, 'audioChunks');
    const snap = await getDocs(chunksRef);
    const chunks = snap.docs.map(d => d.data()).sort((a, b) => a.index - b.index).map(d => d.data);
    return chunks.join('');
  };

  useEffect(() => {
    const triggerAutoPlay = async () => {
      if (!loading && role && days.length > 0 && !isMuted) {
        const sortedDays = [...days].sort((a, b) => b.timestamp - a.timestamp);
        const latestWithAudio = sortedDays.find(d => d.hasAudio);
        if (latestWithAudio) {
          try {
            const audioData = await fetchFullAudio(latestWithAudio.id);
            if (audioData) {
              audioPlayer.current.src = audioData;
              audioPlayer.current.loop = true;
              await audioPlayer.current.play();
            }
          } catch (err) {}
        }
      } else {
        audioPlayer.current.pause();
      }
    };
    triggerAutoPlay();
  }, [loading, days, isMuted, role]);

  useEffect(() => {
    if (selectedDay?.hasAudio) {
      setIsAssembling(true);
      fetchFullAudio(selectedDay.id).then(data => {
        setFullAudioData(data);
        setIsAssembling(false);
      });
    } else {
      setFullAudioData(null);
    }
  }, [selectedDay]);

  useEffect(() => {
    if (!goal || loading || !user || goal.completed) return;
    const checkAutoMissed = async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const startDate = new Date(goal.startDate); startDate.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      let currentCheck = new Date(startDate);
      const batch = writeBatch(db);
      let updatesNeeded = false;
      while (currentCheck <= yesterday) {
        const dateStr = currentCheck.toLocaleDateString();
        const exists = days.find(d => d.dateString === dateStr);
        if (!exists) {
          const newDayRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'days'));
          batch.set(newDayRef, {
            goalId: goal.id, status: 'missed', timestamp: currentCheck.getTime(),
            dateString: dateStr, autoMarked: true, hasAudio: false
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
    setRole(null); setPinInput(''); setCatMood('normal');
    audioPlayer.current.pause();
  };

  const saveConfig = async () => {
    if (!user || role !== 'parent') return;
    try {
      const pinsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'auth');
      await updateDoc(pinsRef, { girl: editGirlPin, parent: editParentPin, girlName: editGirlName });
      if (goal) {
        const goalRef = doc(db, 'artifacts', appId, 'public', 'data', 'goals', goal.id);
        await updateDoc(goalRef, { songName: editGoalName, targetWeeks: parseInt(editWeeks), originalScore: parseInt(editScore), latePenalty: parseInt(editPenalty) });
      }
      playSoundEffect('success'); setShowSettings(false);
    } catch (err) { playSoundEffect('fail'); }
  };

  const setRating = async (dayId, rating) => {
    if (role !== 'parent') return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'days', dayId), { rating });
      playSoundEffect('success');
      if (selectedDay?.id === dayId) {
        setSelectedDay({ ...selectedDay, rating });
      }
    } catch (err) { console.error(err); }
  };

  const logPractice = async (status) => {
    if (!user || !goal || goal.completed) return;
    const todayStr = new Date().toLocaleDateString();
    setEffect(status === 'completed' ? 'sparkle' : 'rain');
    setCatMood(status === 'completed' ? 'happy' : 'sad');
    playSoundEffect(status === 'completed' ? 'success' : 'fail');
    if (status === 'completed') {
      setTimeout(() => { setEffect(null); setCatMood('normal'); }, 4000);
    } else {
      setTimeout(() => setEffect(null), 3000);
    }
    try {
      const existingEntry = days.find(d => d.dateString === todayStr);
      if (existingEntry) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'days', existingEntry.id), { status, timestamp: Date.now() });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'days'), { goalId: goal.id, status, timestamp: Date.now(), dateString: todayStr, hasAudio: false });
      }
    } catch (err) {}
  };

  const chunkAndUploadAudio = async (dayId, base64) => {
    if (!base64) return;
    const chunks = [];
    for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
      chunks.push(base64.substring(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "days",
          dayId,
          "audioChunks",
        ),
        { data: chunks[i], index: i, timestamp: Date.now() },
      );
    }
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "days", dayId),
      { hasAudio: true },
    );
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
        const oldChunks = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'days', dayId, 'audioChunks'));
        const deleteBatch = writeBatch(db);
        oldChunks.forEach(chunkDoc => deleteBatch.delete(chunkDoc.ref));
        await deleteBatch.commit();
        await chunkAndUploadAudio(dayId, base64);
        setFullAudioData(base64); playSoundEffect('success');
      } catch (err) { console.error(err); } finally { setIsUploading(false); }
    };
  };

  const removeAudio = async (dayId) => {
    if (role !== 'parent') return;
    try {
      const chunks = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'days', dayId, 'audioChunks'));
      const batch = writeBatch(db);
      chunks.forEach(c => batch.delete(c.ref));
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'days', dayId), { hasAudio: false });
      await batch.commit(); setFullAudioData(null); playSoundEffect('success');
    } catch (err) {}
  };

  const exportData = () => {
    const data = { goal, days, pins, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `piano_backup_${goal?.songName || 'practice'}.json`;
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
        setLoading(true);
        const batch = writeBatch(db);
        if (goal) {
          batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'goals', goal.id));
          days.forEach(d => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'days', d.id)));
        }
        if (data.pins) batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'auth'), data.pins);
        const { id: oldGoalId, ...goalToImport } = data.goal;
        const newGoalRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'goals'));
        batch.set(newGoalRef, goalToImport);
        await batch.commit();
        for (const day of data.days) {
          const { id: oldDayId, audioData: oldAudioData, ...dayToImport } = day;
          const dayRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'days'), { ...dayToImport, goalId: newGoalRef.id, hasAudio: !!oldAudioData });
          if (oldAudioData) {
            const chunks = [];
            for (let i = 0; i < oldAudioData.length; i += CHUNK_SIZE) { chunks.push(oldAudioData.substring(i, i + CHUNK_SIZE)); }
            for (let i = 0; i < chunks.length; i++) {
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'days', dayRef.id, 'audioChunks'), { data: chunks[i], index: i, timestamp: Date.now() });
            }
          }
        }
        playSoundEffect('success'); setRole(null);
      } catch (err) { playSoundEffect('fail'); } finally { setLoading(false); }
    };
    reader.readAsText(file);
  };

  const resetEverything = async () => {
    if (!user || role !== 'parent' || !goal) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'goals', goal.id));
      days.forEach(day => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'days', day.id)));
      await batch.commit();
      setGoal(null); setDays([]); setConfirmState(null); setCatMood('normal'); audioPlayer.current.pause(); playSoundEffect('success');
    } catch (err) { playSoundEffect('fail'); }
  };

  const resetToday = async () => {
    if (!user || role !== 'parent') return;
    const todayStr = new Date().toLocaleDateString();
    const todayDoc = days.find(d => d.dateString === todayStr);
    if (todayDoc) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'days', todayDoc.id));
      setCatMood('normal'); playSoundEffect('success');
    }
  };

  const finalizeGoal = async () => {
    if (!user || !goal || role !== 'parent') return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'goals', goal.id), { completed: true, completedAt: Date.now(), finalScore: currentPotentialScore });
      setEffect('sparkle'); setConfirmState(null); playSoundEffect('success');
    } catch (err) { playSoundEffect('fail'); }
  };

  const { path, missedCount, daysRemaining, currentPotentialScore, daysToDeadline, todayStatus, todayStr } = useMemo(() => {
    let level = 0; let missed = 0;
    const target = goal ? goal.targetWeeks * 7 : 0;
    const tStr = new Date().toLocaleDateString();
    let currentStatus = null;
    const rawPath = days.map((d, i) => {
      if (d.dateString === tStr) currentStatus = d.status;
      if (d.status === "completed") level++;
      else missed++;
      return { ...d, type: "recorded" };
    });
    const futureDays = []; const futureCount = Math.max(0, target - level);
    for (let i = 1; i <= futureCount; i++) {
      futureDays.push({ id: `future-${i}`, level: level + i, xOffset: 0, type: 'future' });
    }
    const combined = [...rawPath, ...futureDays];
    const finalPath = combined.map((item, idx) => {
      const baseOffset = Math.sin(idx * 0.7) * 45;
      const missedShift =
        item.status === "missed" ? (idx % 2 === 0 ? 50 : -50) : 0;
      return { ...item, xOffset: baseOffset + missedShift };
    });
    const deadline = goal ? goal.startDate + (target * 24 * 60 * 60 * 1000) : 0;
    const dLeft = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    const score = goal ? Math.max(0, goal.originalScore - (Math.max(0, -dLeft) * (goal.latePenalty || 0))) : 0;
    return {
      path: finalPath,
      missedCount: missed,
      daysRemaining: futureCount,
      currentPotentialScore: Math.round(score),
      daysToDeadline: dLeft,
      todayStatus: currentStatus,
      todayStr: tStr,
    };
  }, [days, goal]);

  const backgroundItems = useMemo(() => {
    const items = []; const colors = ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea', '#dec3ff', '#fff4bd'];
    for (let i = 0; i < 60; i++) {
      items.push({ id: i, type: Math.random() > 0.4 ? 'star' : 'note', left: `${Math.random() * 100}%`, delay: `${Math.random() * 10}s`, duration: `${4 + Math.random() * 8}s`, size: 14 + Math.random() * 22, color: colors[Math.floor(Math.random() * colors.length)], twinkleDuration: `${1 + Math.random() * 2}s` });
    }
    return items;
  }, []);

  const isTodayOrYesterday = (dateStr) => {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    return d.getTime() === today.getTime() || d.getTime() === yesterday.getTime();
  };

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
          <h1 className="text-2xl font-black text-pink-600 mb-6 italic text-balance leading-tight">{pins.girlName}'s Secret Box</h1>
          <input type="password" placeholder="****" className="w-full p-4 text-center text-4xl font-black rounded-2xl bg-pink-50 border-4 border-pink-100 outline-none mb-4"
            value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-pink-600 transition-all active:scale-95 uppercase tracking-wide">Open {pins.girlName}'s Sky</button>
        </div>
      </div>
    );
  }

  if (loading && goal) return <div className="h-screen flex flex-col items-center justify-center bg-pink-50"><Loader2 className="animate-spin text-pink-400 mb-2" size={48} /><p className="font-bold text-pink-300">Summoning Clouds...</p></div>;

  return (
    <div className="min-h-screen bg-[#f0f9ff] font-sans text-slate-800 overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        {backgroundItems.map((item) => (
          <div
            key={item.id}
            className={`absolute opacity-25 ${item.type === "star" ? "twinkle" : "float-up"}`}
            style={{
              left: item.left,
              animationDelay: item.delay,
              animationDuration: item.duration,
              color: item.color,
              bottom: "-100px",
              "--twinkle-dur": item.twinkleDuration,
            }}
          >
            {item.type === "star" ? (
              <Star size={item.size} fill="currentColor" />
            ) : (
              <Music size={item.size} />
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      {goal && (
        <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-white/90 backdrop-blur-md border-b-2 border-pink-100 flex justify-between items-center shadow-md gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <div className="bg-pink-400 p-2 rounded-lg text-white flex-shrink-0">
              <Music size={18} />
            </div>
            <div className="leading-tight flex-1 overflow-hidden relative group">
              <div className="whitespace-nowrap marquee inline-block">
                <h1 className="text-sm font-black text-pink-600 inline-block pr-8">
                  {goal.songName}
                </h1>
                <h1 className="text-sm font-black text-pink-600 inline-block pr-8">
                  {goal.songName}
                </h1>
              </div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">
                {pins.girlName}'s Sky Path
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-pink-500 p-2 bg-slate-100 rounded-full transition-colors"
            >
              {isMuted ? (
                <VolumeX size={18} />
              ) : (
                <Volume2 size={18} className="animate-pulse" />
              )}
            </button>
            <div
              className={`px-3 py-1 rounded-full text-white font-black text-xs flex items-center gap-1 shadow-sm ${daysToDeadline < 0 ? "bg-rose-400" : "bg-emerald-400"}`}
            >
              <TrophyIcon size={14} />{" "}
              {goal.completed ? goal.finalScore : currentPotentialScore}
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-300 hover:text-pink-400 transition-colors p-1"
            >
              <Lock size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[40px] p-8 w-full max-md shadow-2xl border-8 border-blue-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-blue-600 italic">
                Global Config
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-300 hover:text-rose-500"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">
                  Personal Info
                </h3>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                    Girl's Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-xl bg-slate-50 border-2"
                    value={editGirlName}
                    onChange={(e) => setEditGirlName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                      Girl PIN
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 rounded-xl bg-slate-50 border-2"
                      value={editGirlPin}
                      onChange={(e) => setEditGirlPin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                      Parent PIN
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 rounded-xl bg-slate-50 border-2"
                      value={editParentPin}
                      onChange={(e) => setEditParentPin(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {goal && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">
                    Active Mission
                  </h3>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                      Song Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 rounded-xl bg-pink-50 border-2 border-pink-100 font-bold"
                      value={editGoalName}
                      onChange={(e) => setEditGoalName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                        Target Weeks
                      </label>
                      <input
                        type="number"
                        className="w-full p-4 rounded-xl bg-slate-50 border-2"
                        value={editWeeks}
                        onChange={(e) => setEditWeeks(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                        Max Score
                      </label>
                      <input
                        type="number"
                        className="w-full p-4 rounded-xl bg-slate-50 border-2"
                        value={editScore}
                        onChange={(e) => setEditScore(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                      Late Penalty / Day
                    </label>
                    <input
                      type="number"
                      className="w-full p-4 rounded-xl bg-slate-50 border-2"
                      value={editPenalty}
                      onChange={(e) => setEditPenalty(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConfig}
                  className="flex-2 bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase text-xs px-6"
                >
                  <Save size={18} /> Update Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Path */}
      <div className="pt-32 pb-64 px-6 flex flex-col-reverse items-center relative max-w-lg mx-auto z-10">
        <div className="w-full text-center py-6 opacity-30">
          <div className="h-1 bg-green-300 rounded-full w-full mb-1"></div>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
            Ground
          </p>
        </div>

        {!goal ? (
          role === "parent" && (
            <div className="bg-white/90 backdrop-blur p-8 rounded-[40px] shadow-2xl border-8 border-pink-100 w-full mb-20 animate-in zoom-in">
              <h2 className="text-xl font-black text-pink-500 mb-6 text-center italic">
                New Goal for {pins.girlName}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Song Name"
                  className="w-full p-4 rounded-xl bg-pink-50 border-2 border-pink-100 font-bold"
                  value={editGoalName}
                  onChange={(e) => setEditGoalName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Weeks"
                    className="p-4 rounded-xl bg-pink-50 border-2 border-pink-100"
                    value={editWeeks}
                    onChange={(e) => setEditWeeks(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Max Score"
                    className="p-4 rounded-xl bg-pink-50 border-2 border-pink-100"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!editGoalName) return;
                    const g = {
                      songName: editGoalName,
                      targetWeeks: parseInt(editWeeks),
                      originalScore: parseInt(editScore),
                      latePenalty: parseInt(editPenalty),
                      startDate: Date.now(),
                      status: "active",
                      completed: false,
                    };
                    await addDoc(
                      collection(
                        db,
                        "artifacts",
                        appId,
                        "public",
                        "data",
                        "goals",
                      ),
                      g,
                    );
                  }}
                  className="w-full bg-pink-400 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-pink-500 transition-all active:scale-95 uppercase tracking-wide"
                >
                  Start the Journey
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex-1 text-slate-400 text-[10px] font-bold uppercase py-3 bg-slate-50 rounded-xl flex items-center justify-center gap-1"
                  >
                    <Settings size={12} /> Edit PINs
                  </button>
                  <label className="flex-1 text-blue-500 text-[10px] font-bold uppercase py-3 bg-blue-50 rounded-xl text-center cursor-pointer flex items-center justify-center gap-1">
                    <Upload size={12} /> Import Data{" "}
                    <input
                      type="file"
                      className="hidden"
                      accept=".json"
                      onChange={importData}
                    />
                  </label>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col-reverse items-center w-full gap-24">
            {path.map((item, idx) => {
              const isCurrent = idx === days.length - 1;
              const isFuture = item.type === "future";
              const isMissed = item.status === "missed";
              const hasAudio = item.hasAudio;
              const dateObj = new Date(
                goal.startDate + idx * 24 * 60 * 60 * 1000,
              );
              const dateStrCompare = dateObj.toLocaleDateString();
              const dateStrDisplay = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const isToday = dateStrCompare === todayStr;
              const isTodayHighlight = isToday && !todayStatus;

              return (
                <div
                  key={item.id}
                  ref={isCurrent ? currentCloudRef : null}
                  style={{ transform: `translateX(${item.xOffset}px)` }}
                  className={`relative transition-all duration-700 flex flex-col items-center ${isFuture && !isTodayHighlight ? "opacity-20" : "opacity-100"}`}
                >
                  {isCurrent && !goal.completed && (
                    <div
                      className={`absolute -top-12 left-[75%] -translate-x-1/2 z-10 ${catMood === "happy" ? "cat-fly-happy" : catMood === "sad" ? "cat-quiver-sad" : "animate-bounce"}`}
                    >
                      <div className="bg-white p-2 rounded-full shadow-2xl border-4 border-pink-300 relative">
                        {catMood === "sad" ? (
                          <>
                            <Frown size={56} className="text-slate-400" />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-blue-400">
                              <CloudRain size={24} className="animate-pulse" />
                            </div>
                          </>
                        ) : (
                          <Cat size={56} className="text-pink-500" />
                        )}
                      </div>
                      <div className="absolute left-20 top-0 w-32 space-y-1 pointer-events-none">
                        <div className="bg-blue-500 text-white px-3 py-1 rounded-xl flex items-center gap-2 text-[10px] font-black shadow-lg">
                          <Cloud size={14} fill="white" /> {daysRemaining} days
                          left
                        </div>
                        <div
                          className={`px-3 py-1 rounded-xl flex items-center gap-2 text-[10px] font-black shadow-lg ${missedCount > 0 ? "bg-amber-500 text-white" : "bg-green-500 text-white"}`}
                        >
                          <CloudLightning size={14} fill="white" />{" "}
                          {missedCount} missed
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    onClick={() => !isFuture && setSelectedDay(item)}
                    className={`relative cursor-pointer hover:scale-105 transition-transform ${isMissed ? "text-slate-400" : isTodayHighlight ? "text-yellow-400 animate-pulse" : isFuture ? "text-blue-200" : "text-pink-300"}`}
                  >
                    <Cloud
                      size={100}
                      fill="currentColor"
                      className="drop-shadow-xl"
                    />
                    {isTodayHighlight && (
                      <div className="absolute -top-4 bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-yellow-300 left-1/2 -translate-x-1/2 shadow-sm whitespace-nowrap">
                        TODAY!
                      </div>
                    )}
                    {!isFuture && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {hasAudio ? (
                          <Mic
                            size={24}
                            className="text-white drop-shadow-md animate-pulse"
                          />
                        ) : isMissed ? (
                          <CloudLightning
                            size={24}
                            className="text-yellow-400"
                          />
                        ) : (
                          <Music size={24} className="text-white opacity-80" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rating display under the cloud, right on the date */}
                  <div className="flex flex-col items-center mt-1">
                    <div
                      className={`text-[10px] font-black uppercase text-center leading-tight ${isTodayHighlight ? "text-yellow-600" : "text-slate-500 opacity-40"}`}
                    >
                      {dateStrDisplay}
                      <br />
                      Day {idx + 1}
                    </div>
                    {item.rating && (
                      <div className="mt-1 flex gap-0.5 justify-center">
                        {item.rating === "sad" ? (
                          <CloudRain
                            size={14}
                            className="text-blue-400 animate-bounce"
                          />
                        ) : (
                          [...Array(parseInt(item.rating))].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill="#facc15"
                              className="text-yellow-500 drop-shadow-sm animate-pulse"
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col items-center py-20">
              <div className="relative">
                <Star
                  size={140}
                  fill={goal.completed ? "#fbbf24" : "#e2e8f0"}
                  className={`${goal.completed ? "animate-pulse text-yellow-400" : "text-slate-200"} drop-shadow-2xl`}
                />
                <div className="absolute inset-0 flex items-center justify-center flex-col pt-2">
                  <span className="text-white font-black text-3xl drop-shadow-md uppercase">
                    Goal
                  </span>
                </div>
              </div>
              {goal.completed && (
                <div className="mt-8 bg-white px-10 py-8 rounded-[50px] shadow-2xl border-8 border-yellow-200 text-center animate-in zoom-in">
                  <p className="text-sm font-black text-amber-600 uppercase mb-1 tracking-widest">
                    Mastery Achieved!
                  </p>
                  <p className="text-5xl font-black text-amber-500">
                    {goal.finalScore} PTS
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-2 italic uppercase">
                    Great job, {pins.girlName}!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      {goal && !goal.completed && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
          {role === "girl" ? (
            <div className="flex flex-col gap-4 items-end">
              <button
                onClick={() => logPractice("completed")}
                className={`w-20 h-20 bg-pink-400 text-white rounded-full shadow-[0_10px_0_0_#be185d] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all ${todayStatus === "completed" ? "ring-4 ring-pink-200" : "opacity-90"}`}
              >
                <CheckCircle2 size={44} />
              </button>
              <button
                onClick={() => logPractice("missed")}
                className={`w-16 h-16 bg-slate-400 text-white rounded-full shadow-[0_8px_0_0_#475569] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all ${todayStatus === "missed" ? "ring-4 ring-slate-200" : "opacity-90"}`}
              >
                <XCircle size={36} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 items-end">
              <button
                onClick={() =>
                  confirmState === "finalize"
                    ? finalizeGoal()
                    : setConfirmState("finalize")
                }
                className={`w-16 h-16 ${confirmState === "finalize" ? "bg-green-500 animate-pulse" : "bg-yellow-400"} text-white rounded-full shadow-lg flex items-center justify-center transition-all`}
              >
                {confirmState === "finalize" ? (
                  <Check size={32} />
                ) : (
                  <TrophyIcon size={32} />
                )}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all"
                title="Configuration"
              >
                <Settings size={24} />
              </button>
              <button
                onClick={exportData}
                className="w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all"
                title="Backup"
              >
                <Download size={24} />
              </button>
              <button
                onClick={() =>
                  confirmState === "reset"
                    ? resetEverything()
                    : setConfirmState("reset")
                }
                className={`w-14 h-14 ${confirmState === "reset" ? "bg-red-700" : "bg-red-500"} text-white rounded-full shadow-lg flex items-center justify-center transition-all`}
                title="Reset Everything"
              >
                {confirmState === "reset" ? (
                  <AlertTriangle size={24} />
                ) : (
                  <Trash2 size={24} />
                )}
              </button>
              <button
                onClick={resetToday}
                className="w-14 h-14 bg-blue-400 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all"
                title="Reset Today's Record"
              >
                <RotateCcw size={24} />
              </button>
              <label
                className="w-14 h-14 bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all cursor-pointer"
                title="Import Data"
              >
                <Upload size={24} />{" "}
                <input
                  type="file"
                  className="hidden"
                  accept=".json"
                  onChange={importData}
                />
              </label>
              {confirmState && (
                <button
                  onClick={() => setConfirmState(null)}
                  className="bg-white/90 text-slate-500 text-[10px] font-black p-2 px-4 rounded-full shadow-sm border border-slate-200"
                >
                  CANCEL
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl border-8 border-pink-100 relative text-center max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedDay(null)}
              className="absolute top-4 right-4 text-slate-300 hover:text-pink-500"
            >
              <X size={24} />
            </button>
            <h3 className="text-xl font-black text-pink-600 mb-2 italic leading-tight">
              Practice Memories
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest leading-none">
              {selectedDay.dateString}
            </p>

            {role === "parent" &&
              isTodayOrYesterday(selectedDay.dateString) && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-3xl border-2 border-yellow-100">
                  <p className="text-[10px] font-black text-yellow-600 uppercase mb-3 tracking-widest leading-none">
                    Rate Practice
                  </p>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() =>
                          setRating(selectedDay.id, num.toString())
                        }
                        className={`p-2 rounded-xl transition-all ${selectedDay.rating === num.toString() ? "bg-yellow-400 text-white scale-110 shadow-md" : "bg-white text-yellow-400 hover:bg-yellow-100"}`}
                      >
                        <div className="flex gap-0.5">
                          {[...Array(num)].map((_, i) => (
                            <Star key={i} size={16} fill="currentColor" />
                          ))}
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => setRating(selectedDay.id, "sad")}
                      className={`p-2 rounded-xl transition-all ${selectedDay.rating === "sad" ? "bg-blue-400 text-white scale-110 shadow-md" : "bg-white text-blue-400 hover:bg-blue-100"}`}
                    >
                      <CloudRain size={20} />
                    </button>
                    {selectedDay.rating && (
                      <button
                        onClick={() => setRating(selectedDay.id, null)}
                        className="p-2 text-slate-300 hover:text-rose-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}

            {isAssembling ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 size={40} className="animate-spin text-pink-400" />
                <p className="text-xs font-bold text-slate-400 italic">
                  Finding the melody...
                </p>
              </div>
            ) : fullAudioData ? (
              <div className="space-y-6">
                <div className="bg-pink-50 p-6 rounded-[32px] border-2 border-pink-100">
                  <audio controls src={fullAudioData} className="w-full" />
                </div>
                {role === "parent" && (
                  <button
                    onClick={() => {
                      removeAudio(selectedDay.id);
                      setSelectedDay(null);
                    }}
                    className="w-full py-3 bg-rose-50 text-rose-500 rounded-2xl font-black text-xs hover:bg-rose-100 flex items-center justify-center gap-2 uppercase tracking-tight"
                  >
                    <Trash2 size={14} /> Clear Recording
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 p-10 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                <Music size={48} className="text-slate-200" />
                <p className="text-sm font-bold text-slate-400 italic">
                  No recording found yet!
                </p>
              </div>
            )}

            {role === "girl" && (
              <div className="mt-6">
                <label
                  className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg ${isUploading ? "bg-slate-100 text-slate-400" : "bg-pink-500 text-white hover:bg-pink-600 active:scale-95"}`}
                >
                  {isUploading ? (
                    <RotateCcw className="animate-spin" size={20} />
                  ) : (
                    <Mic size={20} />
                  )}
                  {fullAudioData ? "UPDATE YOUR MUSIC" : "SHARE YOUR PRACTICE"}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, selectedDay.id)}
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {effect === "sparkle" && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <Sparkles
            size={400}
            className="text-yellow-400 animate-spin opacity-40"
          />
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .zoom-in { animation-name: zoom-in; }
        @keyframes float-up { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 5% { opacity: 0.3; } 95% { opacity: 0.3; } 100% { transform: translateY(-130vh) rotate(360deg); opacity: 0; } }
        @keyframes twinkle { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
        
        @keyframes jump-happy { 
          0% { transform: translateY(0) scale(1); } 
          15% { transform: translateY(15px) scale(1.3, 0.7); } 
          45% { transform: translateY(-640px) scale(2.2) rotate(15deg); } 
          60% { transform: translateY(-640px) scale(2.2) rotate(-15deg); } 
          85% { transform: translateY(0) scale(1.3, 0.7); } 
          100% { transform: translateY(0) scale(1); } 
        }
        
        @keyframes cry-sad { 
          0%, 100% { transform: translateX(0) rotate(0); } 
          20% { transform: translateX(-4px) rotate(-2deg); } 
          40% { transform: translateX(4px) rotate(2deg); } 
          60% { transform: translateX(-4px) rotate(-2deg); } 
          80% { transform: translateX(4px) rotate(2deg); } 
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .marquee {
          display: inline-block;
          animation: marquee 12s linear infinite;
        }
        
        .float-up { animation: float-up linear infinite; }
        .twinkle { animation: twinkle ease-in-out infinite; animation-duration: var(--twinkle-dur, 2s); }
        .cat-fly-happy { animation: jump-happy 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .cat-quiver-sad { animation: cry-sad 0.2s linear infinite; }
        
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
