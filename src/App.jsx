/* global __firebase_config, __app_id */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  getDocs,
  setDoc,
} from "firebase/firestore";

import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
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
  MessageCircleHeart,
  SendHorizontal,
  Heart,
  Guitar,
  Ghost,
  MoreHorizontal,
  Undo2,
  Users,
  UserPlus,
  ShieldCheck,
} from "lucide-react";

import ALLOWED_USERS from "./config/users.json";
import THEMES, { CHARACTERS } from "./config/themes";

// --- Firebase Configuration ---
// Prioritizes environment variables for secure Git deployments
const firebaseConfig =
  import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY
    ? {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      }
    : typeof __firebase_config !== "undefined"
      ? JSON.parse(__firebase_config)
      : {};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId =
  typeof __app_id !== "undefined" ? __app_id : "piano-climber-production";

const CHUNK_SIZE = 800000;

const playSoundEffect = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "fail") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // ignore
  }
};

const AdminModal = ({ allUsers, onClose, onSave }) => {
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("parent");
  const [selectedKids, setSelectedKids] = useState([]);
  const [newTheme, setNewTheme] = useState("pinky-girl");
  const [newCharacter, setNewCharacter] = useState("cat");

  const kidOptions = useMemo(() => {
    const list = [];
    if (!allUsers) return list;
    for (const email in allUsers) {
      if (allUsers[email]?.role === "girl") {
        list.push({ email, name: allUsers[email].name });
      }
    }
    return list;
  }, [allUsers]);

  const handleSave = () => {
    if (!newEmail || !newName) return;
    onSave(newEmail.toLowerCase(), {
      name: newName,
      role: newRole,
      kids: newRole === "parent" ? selectedKids : [],
      theme: newRole === "girl" ? newTheme : null,
      character: newRole === "girl" ? newCharacter : null,
    });

    setNewEmail("");
    setNewName("");
    setSelectedKids([]);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[40px] p-8 w-full max-w-2xl shadow-2xl border-8 border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 italic flex items-center gap-2">
            <ShieldCheck className="text-slate-400" /> Admin Dashboard
          </h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-rose-500"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                <UserPlus size={14} /> Add New User
              </h3>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full p-4 rounded-xl bg-white border-2 font-bold text-sm"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full p-4 rounded-xl bg-white border-2 font-bold text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <select
                  className="w-full p-4 rounded-xl bg-white border-2 font-bold text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="parent">Parent</option>
                  <option value="girl">Kid</option>
                </select>

                {newRole === "parent" && (
                  <div className="pt-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">
                      Associate Kids
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {kidOptions.map((k) => (
                        <button
                          key={k.email}
                          onClick={() => {
                            setSelectedKids((prev) =>
                              prev.includes(k.email)
                                ? prev.filter((e) => e !== k.email)
                                : [...prev, k.email],
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-2 ${selectedKids.includes(k.email) ? "bg-slate-800 text-white border-transparent shadow-md" : "bg-white text-slate-400 border-slate-100"}`}
                        >
                          {k.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {newRole === "girl" && (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">
                        Initial Theme
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(THEMES).map((t) => (
                          <button
                            key={t}
                            onClick={() => setNewTheme(t)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-2 ${newTheme === t ? `${THEMES[t].colors.btn} text-white border-transparent` : "bg-white text-slate-400 border-slate-100"}`}
                          >
                            {t.replace("-", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">
                        Initial Companion
                      </label>
                      <div className="grid grid-cols-6 gap-1">
                        {Object.entries(CHARACTERS).map(([id, char]) => {
                          const CharIcon = char.icon;
                          return (
                            <button
                              key={id}
                              onClick={() => setNewCharacter(id)}
                              className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${newCharacter === id ? "border-slate-800 bg-slate-100" : "border-slate-100 opacity-40 grayscale"}`}
                            >
                              <CharIcon
                                size={20}
                                className={
                                  newCharacter === id
                                    ? "text-slate-800"
                                    : "text-slate-400"
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSave}
                  className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all active:scale-95 mt-2"
                >
                  Register User
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Users size={14} /> Registered Users
            </h3>
            <div className="space-y-3">
              {Object.entries(allUsers).map(([email, u]) => {
                if (!u) return null;
                return (
                  <div
                    key={email}
                    className="p-4 bg-white border-2 border-slate-50 rounded-2xl flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-black text-slate-700 text-sm">
                        {u.name}
                        <span className="ml-2 text-[8px] font-bold uppercase text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">
                          {u.role}
                        </span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {email}
                      </p>
                      {u.kids?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {u.kids.map((ke) => (
                            <div
                              key={ke}
                              className="text-[8px] font-black text-pink-400 bg-pink-50 px-1 rounded"
                            >
                              {allUsers[ke]?.name || ke}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [userConfig, setUserConfig] = useState(null);
  const [role, setRole] = useState(null);
  const [goal, setGoal] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [effect, setEffect] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [catMood, setCatMood] = useState("normal");
  const [isMuted, setIsMuted] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [fullAudioData, setFullAudioData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [actingAsKid, setActingAsKid] = useState(false);
  const [showMoreButtons, setShowMoreButtons] = useState(false);
  const [customThemes, setCustomThemes] = useState({});
  const [editTheme, setEditTheme] = useState("pinky-girl");
  const [editCharacter, setEditCharacter] = useState("cat");
  const [dynamicUsers, setDynamicUsers] = useState({});
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [editGoalName, setEditGoalName] = useState("");
  const [editWeeks, setEditWeeks] = useState(4);
  const [editScore, setEditScore] = useState(100);
  const [editPenalty, setEditPenalty] = useState(5);
  const [editKidName, setEditKidName] = useState("");

  const currentCloudRef = useRef(null);
  const audioPlayer = useRef(new Audio());

  const [selectedKidEmail, setSelectedKidEmail] = useState(null);

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return email === "trdung87@gmail.com" || email === "hotrdung@gmail.com";
  }, [user]);

  const allUsers = useMemo(() => {
    return { ...ALLOWED_USERS, ...dynamicUsers };
  }, [dynamicUsers]);

  const selectedKidConfig = useMemo(() => {
    if (!selectedKidEmail) return null;
    const email = selectedKidEmail.toLowerCase();
    const base = allUsers[email] || {};
    const prefs = customThemes[email] || {};
    return {
      ...base,
      theme: prefs.theme || base?.theme || "pinky-girl",
      character: prefs.character || base?.character || "cat",
    };
  }, [selectedKidEmail, customThemes, allUsers]);

  const effectiveUserConfig = useMemo(() => {
    if (!userConfig || !user?.email) return userConfig;
    const email = user.email.toLowerCase();
    const base = allUsers[email] || userConfig;
    const prefs = customThemes[email] || {};
    return {
      ...base,
      theme: prefs.theme || base?.theme || "pinky-girl",
      character: prefs.character || base?.character || "cat",
    };
  }, [userConfig, customThemes, user, allUsers]);

  const CurrentCharacter = useMemo(() => {
    const config = role === "parent" ? selectedKidConfig : effectiveUserConfig;
    const charKey = config?.character || "cat";
    return CHARACTERS[charKey]?.icon || CHARACTERS["cat"].icon;
  }, [role, selectedKidConfig, effectiveUserConfig]);

  const currentTheme = useMemo(() => {
    const config = role === "parent" ? selectedKidConfig : effectiveUserConfig;
    return THEMES[config?.theme] || THEMES["pinky-girl"];
  }, [role, selectedKidConfig, effectiveUserConfig]);

  const storageKey = useMemo(() => {
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    const config = ALLOWED_USERS[email];
    if (config?.role === "parent") {
      return selectedKidEmail ? selectedKidEmail.replace(/[@.]/g, "_") : null;
    }
    return email.replace(/[@.]/g, "_");
  }, [user, selectedKidEmail]);

  useEffect(() => {
    const usersRef = collection(db, "artifacts", appId, "user_registry");
    const unsubUsers = onSnapshot(
      usersRef,

      (snap) => {
        const dynamic = {};
        snap.docs.forEach((d) => {
          dynamic[d.id] = d.data();
        });
        setDynamicUsers(dynamic);
      },
      (err) => console.error("Users sync failed:", err),
    );

    return () => unsubUsers();
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.email) {
        const email = u.email.toLowerCase();
        // Check both lists
        const config =
          ALLOWED_USERS[email] || dynamicUsers[email.replace(/[@.]/g, "_")];
        if (config) {
          setUserConfig(config);
          setRole(config.role);
          setEditKidName(config.name);
          if (config.role === "parent" && config.kids?.length > 0) {
            setSelectedKidEmail(config.kids[0]);
          }
        } else {
          setUserConfig(null);
          setRole(null);
          signOut(auth);
        }
      } else {
        setUserConfig(null);
        setRole(null);
      }
    });
  }, [dynamicUsers]);

  useEffect(() => {
    if (!user || !storageKey) return;
    setLoading(true);

    const email =
      role === "parent" ? selectedKidEmail : user.email.toLowerCase();
    const prefsRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      email.replace(/[@.]/g, "_"),
      "settings",
      "preferences",
    );
    const unsubPrefs = onSnapshot(prefsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomThemes((prev) => ({
          ...prev,
          [email]: { theme: data.theme, character: data.character },
        }));
      }
    });

    const goalRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      storageKey,
      "goals",
    );
    const unsubGoal = onSnapshot(goalRef, (snap) => {
      if (!snap.empty) {
        const goalData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setGoal(goalData);
        setEditGoalName(goalData.songName);
        setEditWeeks(goalData.targetWeeks);
        setEditScore(goalData.originalScore);
        setEditPenalty(goalData.latePenalty || 5);

        const daysRef = collection(
          db,
          "artifacts",
          appId,
          "users",
          storageKey,
          "days",
        );
        const unsubDays = onSnapshot(daysRef, (daySnap) => {
          const list = daySnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => d.goalId === goalData.id)
            .sort((a, b) => a.timestamp - b.timestamp);
          setDays(list);
          if (list.length > 0) {
            const lastEntry = list[list.length - 1];
            if (lastEntry.status === "missed") setCatMood("sad");
            else setCatMood("normal");
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
    return () => {
      unsubGoal();
      unsubPrefs();
    };
  }, [user, storageKey, role, selectedKidEmail]);

  useEffect(() => {
    if (showSettings) {
      const config =
        role === "parent" ? selectedKidConfig : effectiveUserConfig;
      if (config) {
        setEditTheme(config.theme || "pinky-girl");
        setEditCharacter(config.character || "cat");
        setEditGoalName(goal?.songName || "");
        setEditKidName(config.name || "");
      }
    }
  }, [showSettings, role, selectedKidConfig, effectiveUserConfig, goal]);

  const fetchFullAudio = useCallback(
    async (dayId) => {
      if (!user || !storageKey || dayId.startsWith("future")) return null;
      const chunksRef = collection(
        db,
        "artifacts",
        appId,
        "users",
        storageKey,
        "days",
        dayId,
        "audioChunks",
      );
      const snap = await getDocs(chunksRef);
      const chunks = snap.docs
        .map((d) => d.data())
        .sort((a, b) => a.index - b.index)
        .map((d) => d.data);
      return chunks.join("");
    },
    [user, storageKey],
  );

  useEffect(() => {
    const triggerAutoPlay = async () => {
      if (!loading && role && days.length > 0 && !isMuted) {
        const sortedDays = [...days].sort((a, b) => b.timestamp - a.timestamp);
        const latestWithAudio = sortedDays.find((d) => d.hasAudio);
        if (latestWithAudio) {
          try {
            const audioData = await fetchFullAudio(latestWithAudio.id);
            if (audioData) {
              audioPlayer.current.src = audioData;
              audioPlayer.current.loop = true;
              await audioPlayer.current.play();
            }
          } catch {
            // ignore
          }
        }
      } else {
        audioPlayer.current.pause();
      }
    };
    triggerAutoPlay();
  }, [loading, days, isMuted, role, fetchFullAudio]);

  useEffect(() => {
    if (selectedDay?.hasAudio) {
      setIsAssembling(true);
      fetchFullAudio(selectedDay.id).then((data) => {
        setFullAudioData(data);
        setIsAssembling(false);
      });
    } else {
      setFullAudioData(null);
    }
    if (selectedDay) {
      setCommentInput(selectedDay.comment || "");
    }
  }, [selectedDay, fetchFullAudio]);

  useEffect(() => {
    if (!goal || loading || !user || goal.completed) return;
    const checkAutoMissed = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(goal.startDate);
      startDate.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      let currentCheck = new Date(startDate);
      const batch = writeBatch(db);
      let updatesNeeded = false;
      while (currentCheck <= yesterday) {
        const dateStr = currentCheck.toLocaleDateString();
        const exists = days.find((d) => d.dateString === dateStr);
        if (!exists) {
          const newDayRef = doc(
            collection(db, "artifacts", appId, "users", storageKey, "days"),
          );
          batch.set(newDayRef, {
            goalId: goal.id,
            status: "missed",
            timestamp: currentCheck.getTime(),
            dateString: dateStr,
            autoMarked: true,
            hasAudio: false,
          });
          updatesNeeded = true;
        }
        currentCheck.setDate(currentCheck.getDate() + 1);
      }
      if (updatesNeeded) await batch.commit();
    };
    const timer = setTimeout(checkAutoMissed, 3000);
    return () => clearTimeout(timer);
  }, [goal, days, loading, user, storageKey]);

  useEffect(() => {
    if (goal && !loading) {
      const timer = setTimeout(() => {
        if (currentCloudRef.current) {
          currentCloudRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [loading, goal, days.length, role]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setRole(null);
    setSelectedKidEmail(null);
    setCatMood("normal");
    audioPlayer.current.pause();
  };

  const saveConfig = async () => {
    if (!user || !storageKey) return;
    try {
      const email =
        role === "parent" ? selectedKidEmail : user.email.toLowerCase();
      const prefsRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        email.replace(/[@.]/g, "_"),
        "settings",
        "preferences",
      );
      await updateDoc(prefsRef, {
        theme: editTheme,
        character: editCharacter,
      }).catch(async () => {
        await setDoc(prefsRef, { theme: editTheme, character: editCharacter });
      });

      if (role === "parent" && goal) {
        const goalRef = doc(
          db,
          "artifacts",
          appId,
          "users",
          storageKey,
          "goals",
          goal.id,
        );
        await updateDoc(goalRef, {
          songName: editGoalName,
          targetWeeks: parseInt(editWeeks),
          originalScore: parseInt(editScore),
          latePenalty: parseInt(editPenalty),
        });
      }
      playSoundEffect("success");
      setShowSettings(false);
    } catch {
      playSoundEffect("fail");
    }
  };

  const saveFeedback = async () => {
    if (role !== "parent" || !selectedDay || !storageKey) return;
    try {
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          storageKey,
          "days",
          selectedDay.id,
        ),
        {
          comment: commentInput,
        },
      );
      playSoundEffect("success");
      setSelectedDay({ ...selectedDay, comment: commentInput });
    } catch {
      // ignore
    }
  };

  const setRating = async (dayId, rating) => {
    if (role !== "parent" || !storageKey) return;
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "users", storageKey, "days", dayId),
        { rating },
      );
      playSoundEffect("success");
      if (selectedDay?.id === dayId) {
        setSelectedDay({ ...selectedDay, rating });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logPractice = async (status) => {
    if (!user || !goal || goal.completed) return;
    const todayStr = new Date().toLocaleDateString();
    setEffect(status === "completed" ? "sparkle" : "rain");
    setCatMood(status === "completed" ? "happy" : "sad");
    playSoundEffect(status === "completed" ? "success" : "fail");
    if (status === "completed") {
      setTimeout(() => {
        setEffect(null);
        setCatMood("normal");
      }, 4000);
    } else {
      setTimeout(() => setEffect(null), 3000);
    }
    try {
      const existingEntry = days.find((d) => d.dateString === todayStr);
      if (existingEntry) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "users",
            storageKey,
            "days",
            existingEntry.id,
          ),
          { status, timestamp: Date.now() },
        );
      } else {
        await addDoc(
          collection(db, "artifacts", appId, "users", storageKey, "days"),
          {
            goalId: goal.id,
            status,
            timestamp: Date.now(),
            dateString: todayStr,
            hasAudio: false,
          },
        );
      }
    } catch {
      // ignore
    }
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
          "users",
          storageKey,
          "days",
          dayId,
          "audioChunks",
        ),
        { data: chunks[i], index: i, timestamp: Date.now() },
      );
    }
    await updateDoc(
      doc(db, "artifacts", appId, "users", storageKey, "days", dayId),
      { hasAudio: true, status: "completed" },
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

        let targetId = dayId;
        // If clicking a placeholder today cloud, create the record first
        if (dayId.startsWith("future")) {
          const newDayRef = await addDoc(
            collection(db, "artifacts", appId, "users", storageKey, "days"),
            {
              goalId: goal.id,
              dateString: selectedDay.dateString,
              status: "completed",
              timestamp: Date.now(),
              hasAudio: false,
            },
          );
          targetId = newDayRef.id;
        }

        const oldChunks = await getDocs(
          collection(
            db,
            "artifacts",
            appId,
            "users",
            storageKey,
            "days",
            targetId,
            "audioChunks",
          ),
        );
        const deleteBatch = writeBatch(db);
        oldChunks.forEach((chunkDoc) => deleteBatch.delete(chunkDoc.ref));
        await deleteBatch.commit();

        await chunkAndUploadAudio(targetId, base64);
        setFullAudioData(base64);

        // Update local state so UI refreshes correctly
        if (selectedDay.id.startsWith("future")) {
          setSelectedDay((prev) => ({
            ...prev,
            id: targetId,
            status: "completed",
            hasAudio: true,
          }));
        }

        playSoundEffect("success");
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
  };

  const removeAudio = async (dayId) => {
    if (role !== "parent" || dayId.startsWith("future") || !storageKey) return;
    try {
      const chunks = await getDocs(
        collection(
          db,
          "artifacts",
          appId,
          "users",
          storageKey,
          "days",
          dayId,
          "audioChunks",
        ),
      );
      const batch = writeBatch(db);
      chunks.forEach((c) => batch.delete(c.ref));
      batch.update(
        doc(db, "artifacts", appId, "users", storageKey, "days", dayId),
        { hasAudio: false },
      );
      await batch.commit();
      setFullAudioData(null);
      playSoundEffect("success");
    } catch {
      // ignore
    }
  };

  const exportData = async () => {
    setIsAssembling(true);
    try {
      const daysWithAudio = await Promise.all(
        days.map(async (day) => {
          if (day.hasAudio) {
            const audioData = await fetchFullAudio(day.id);
            return { ...day, audioData };
          }
          return day;
        }),
      );
      const data = {
        goal,
        days: daysWithAudio,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `piano_backup_${goal?.songName || "practice"}.json`;
      link.click();
      playSoundEffect("success");
    } catch (err) {
      console.error(err);
      playSoundEffect("fail");
    } finally {
      setIsAssembling(false);
    }
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
          batch.delete(
            doc(db, "artifacts", appId, "users", storageKey, "goals", goal.id),
          );
          days.forEach((d) =>
            batch.delete(
              doc(db, "artifacts", appId, "users", storageKey, "days", d.id),
            ),
          );
        }
        const { ...goalToImport } = data.goal;
        const newGoalRef = doc(
          collection(db, "artifacts", appId, "users", storageKey, "goals"),
        );
        batch.set(newGoalRef, goalToImport);
        await batch.commit();
        for (const day of data.days) {
          const { audioData: oldAudioData, ...dayToImport } = day;
          const dayRef = await addDoc(
            collection(db, "artifacts", appId, "users", storageKey, "days"),
            { ...dayToImport, goalId: newGoalRef.id, hasAudio: !!oldAudioData },
          );
          if (oldAudioData) {
            const chunks = [];
            for (let i = 0; i < oldAudioData.length; i += CHUNK_SIZE) {
              chunks.push(oldAudioData.substring(i, i + CHUNK_SIZE));
            }
            for (let i = 0; i < chunks.length; i++) {
              await addDoc(
                collection(
                  db,
                  "artifacts",
                  appId,
                  "users",
                  storageKey,
                  "days",
                  dayRef.id,
                  "audioChunks",
                ),
                { data: chunks[i], index: i, timestamp: Date.now() },
              );
            }
          }
        }
        playSoundEffect("success");
        setRole(null);
      } catch {
        playSoundEffect("fail");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const resetEverything = async () => {
    if (!user || role !== "parent" || !goal || !storageKey) return;
    try {
      const batch = writeBatch(db);
      batch.delete(
        doc(db, "artifacts", appId, "users", storageKey, "goals", goal.id),
      );
      days.forEach((day) =>
        batch.delete(
          doc(db, "artifacts", appId, "users", storageKey, "days", day.id),
        ),
      );
      await batch.commit();
      setGoal(null);
      setDays([]);
      setConfirmState(null);
      setCatMood("normal");
      audioPlayer.current.pause();
      playSoundEffect("success");
    } catch {
      playSoundEffect("fail");
    }
  };

  const resetToday = async () => {
    if (!user || role !== "parent" || !storageKey) return;
    const todayStr = new Date().toLocaleDateString();
    const todayDoc = days.find((d) => d.dateString === todayStr);
    if (todayDoc) {
      await deleteDoc(
        doc(db, "artifacts", appId, "users", storageKey, "days", todayDoc.id),
      );
      setCatMood("normal");
      playSoundEffect("success");
    }
  };

  const finalizeGoal = async () => {
    if (!user || !goal || role !== "parent" || !storageKey) return;
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "users", storageKey, "goals", goal.id),
        {
          completed: true,
          completedAt: Date.now(),
          finalScore: currentPotentialScore,
        },
      );
      setEffect("sparkle");
      setConfirmState(null);
      playSoundEffect("success");
    } catch {
      playSoundEffect("fail");
    }
  };

  const {
    path,
    missedCount,
    daysRemaining,
    currentPotentialScore,
    daysToDeadline,
    todayStatus,
    todayStr,
  } = useMemo(() => {
    let level = 0;
    let missed = 0;
    const target = goal ? goal.targetWeeks * 7 : 0;
    const tStr = new Date().toLocaleDateString();
    let currentStatus = null;

    const rawPath = days.map((d) => {
      if (d.dateString === tStr) currentStatus = d.status;
      if (d.status === "completed") level++;
      else missed++;
      return { ...d, type: "recorded" };
    });

    const futureDays = [];
    const futureCount = Math.max(0, target - level);
    for (let i = 1; i <= futureCount; i++) {
      const futureDateObj = new Date(goal?.startDate || Date.now());
      futureDateObj.setDate(futureDateObj.getDate() + (level + missed + i - 1));
      futureDays.push({
        id: `future-${i}`,
        status: "future",
        type: "future",
        dateString: futureDateObj.toLocaleDateString(),
        timestamp: futureDateObj.getTime(),
      });
    }

    const combined = [...rawPath, ...futureDays];
    const finalPath = combined.map((item, idx) => {
      const baseOffset = Math.sin(idx * 0.7) * 45;
      const missedShift =
        item.status === "missed" ? (idx % 2 === 0 ? 50 : -50) : 0;
      return { ...item, xOffset: baseOffset + missedShift };
    });

    const deadline = goal ? goal.startDate + target * 24 * 60 * 60 * 1000 : 0;
    const dLeft = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    const score = goal
      ? Math.max(
          0,
          goal.originalScore - Math.max(0, -dLeft) * (goal.latePenalty || 0),
        )
      : 0;

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
    const items = [];
    const colors = [
      "#ffb7b2",
      "#ffdac1",
      "#e2f0cb",
      "#b5ead7",
      "#c7ceea",
      "#dec3ff",
      "#fff4bd",
    ];
    for (let i = 0; i < 60; i++) {
      items.push({
        id: i,
        type: Math.random() > 0.4 ? "star" : "note",
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 10}s`,
        duration: `${4 + Math.random() * 8}s`,
        size: 14 + Math.random() * 22,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkleDuration: `${1 + Math.random() * 2}s`,
      });
    }
    return items;
  }, []);

  const isTodayOrYesterday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      d.getTime() === today.getTime() || d.getTime() === yesterday.getTime()
    );
  };

  if (!role) {
    return (
      <div
        className={`h-screen flex flex-col items-center justify-center ${currentTheme.colors.bg} p-10 relative overflow-hidden`}
      >
        {backgroundItems.map((item) => (
          <div
            key={item.id}
            className={`absolute pointer-events-none opacity-25 ${item.type === "star" ? "twinkle" : "float-up"}`}
            style={{
              left: item.left,
              animationDelay: item.delay,
              animationDuration: item.duration,
              color: item.color,
              bottom: "-50px",
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
        <div
          className={`bg-white/90 backdrop-blur-sm p-10 rounded-[40px] shadow-2xl text-center w-full max-w-sm border-8 ${currentTheme.colors.modalBorder} animate-in zoom-in z-10`}
        >
          <div className="relative mb-8">
            <CurrentCharacter
              size={120}
              className={`${currentTheme.colors.text500} drop-shadow-2xl opacity-10`}
            />

            <div className="absolute -top-2 -right-2">
              <Sparkles size={24} className="text-yellow-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-6xl font-bold tracking-tight mb-4 text-rose-700 drop-shadow-[0_4px_12px_rgba(251,113,133,0.3)] animate-in fade-in zoom-in duration-700">
            Sky Path
          </h1>


          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">
            Start your journey
          </p>

          <button
            onClick={handleLogin}
            className={`w-full ${currentTheme.colors.btn} text-white font-black py-5 rounded-2xl shadow-xl ${currentTheme.colors.btnHover} transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3 group`}
          >
            <div className="bg-white p-1 rounded-full group-hover:rotate-12 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            Gmail Login
          </button>
        </div>
      </div>
    );
  }

  if (loading && role)
    return (
      <div
        className={`h-screen flex flex-col items-center justify-center ${currentTheme.colors.bg50}`}
      >
        <Loader2
          className={`animate-spin ${currentTheme.colors.text400} mb-2`}
          size={48}
        />
        <p className={`font-bold ${currentTheme.colors.text400}`}>
          Summoning Clouds...
        </p>
      </div>
    );

  return (
    <div
      className={`min-h-screen ${currentTheme.colors.bg50} font-sans text-slate-800 overflow-x-hidden relative`}
    >
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
      {!loading && role && (
        <div
          className={`fixed top-0 left-0 right-0 z-[50] bg-white/90 backdrop-blur-md border-b-2 ${currentTheme.colors.modalBorder} shadow-md transition-all duration-300`}
        >
          {role === "parent" && userConfig?.kids?.length > 1 && (
            <div className="px-3 pt-3 pb-1 flex justify-between items-center gap-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
                {userConfig?.kids?.map((kidEmail) => {
                  const kid = allUsers[kidEmail.toLowerCase()];
                  const isSelected = selectedKidEmail === kidEmail;
                  const KidIcon = kid?.theme
                    ? THEMES[kid.theme].instrument
                    : Music;

                  return (
                    <button
                      key={kidEmail}
                      onClick={() => setSelectedKidEmail(kidEmail)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-2 flex items-center gap-1.5 ${
                        isSelected
                          ? `${currentTheme.colors.btn} text-white ${currentTheme.colors.border} shadow-sm scale-105`
                          : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                      }`}
                    >
                      <div
                        className={
                          isSelected ? "text-white/80" : "text-slate-300"
                        }
                      >
                        <KidIcon size={12} />
                      </div>
                      {kid?.name || kidEmail}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`text-slate-400 hover:${currentTheme.colors.text500} p-2 bg-slate-100 rounded-full transition-colors`}
                >
                  {isMuted ? (
                    <VolumeX size={16} />
                  ) : (
                    <Volume2 size={16} className="animate-pulse" />
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className={`text-slate-300 hover:${currentTheme.colors.text400} transition-colors p-1`}
                >
                  <Lock size={18} />
                </button>
              </div>
            </div>
          )}

          <div
            className={`p-3 flex justify-between items-center gap-2 ${role === "parent" && userConfig?.kids?.length > 1 ? "border-t border-slate-50" : ""}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <div
                className={`${currentTheme.colors.btn400} p-2 rounded-lg text-white shrink-0`}
              >
                <currentTheme.instrument size={18} />
              </div>
              <div className="leading-tight flex-1 min-w-0 overflow-hidden relative">
                <div className="whitespace-nowrap marquee flex">
                  <span
                    className={`text-xs font-black ${currentTheme.colors.text} uppercase tracking-tight pr-8`}
                  >
                    {goal ? goal.songName : "Welcome!"}
                  </span>
                  {goal && (
                    <span
                      className={`text-xs font-black ${currentTheme.colors.text} uppercase tracking-tight pr-8`}
                    >
                      {goal.songName}
                    </span>
                  )}
                </div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">
                  {(role === "parent"
                    ? selectedKidConfig?.name
                    : effectiveUserConfig?.name) || "Student"}
                  's Sky Path
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {role === "girl" && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`text-slate-400 hover:${currentTheme.colors.text500} p-2 bg-slate-100 rounded-full transition-colors`}
                >
                  {isMuted ? (
                    <VolumeX size={18} />
                  ) : (
                    <Volume2 size={18} className="animate-pulse" />
                  )}
                </button>
              )}
              {goal && (
                <div
                  className={`px-3 py-1 rounded-full text-white font-black text-xs flex items-center gap-1 shadow-sm ${daysToDeadline < 0 ? "bg-rose-400" : "bg-emerald-400"}`}
                >
                  <TrophyIcon size={14} />{" "}
                  {goal.completed ? goal.finalScore : currentPotentialScore}
                </div>
              )}
              {role === "girl" && (
                <>
                  <button
                    onClick={() => setShowSettings(true)}
                    className={`text-slate-400 hover:${currentTheme.colors.text500} p-2 bg-slate-100 rounded-full transition-colors`}
                    title="Settings"
                  >
                    <Settings size={18} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`text-slate-300 hover:${currentTheme.colors.text400} transition-colors p-1`}
                  >
                    <Lock size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl border-8 border-blue-100 max-h-[90vh] overflow-y-auto">
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
                  Appearance
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase mb-2 block">
                      Choose Theme
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(THEMES).map(([id, t]) => (
                        <button
                          key={id}
                          onClick={() => setEditTheme(id)}
                          className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center gap-2 ${editTheme === id ? `${t.colors.border} ${t.colors.bg50} scale-105 shadow-md` : "border-slate-100 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full ${t.colors.btn} shadow-inner`}
                          />
                          <span
                            className={`text-[10px] font-black uppercase ${editTheme === id ? t.colors.text : "text-slate-400"}`}
                          >
                            {id.replace("-", " ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase mb-2 block">
                      Choose Companion
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(CHARACTERS).map(([id, char]) => (
                        <button
                          key={id}
                          onClick={() => setEditCharacter(id)}
                          className={`p-3 rounded-2xl border-4 transition-all flex flex-col items-center gap-1 ${editCharacter === id ? `${currentTheme.colors.border} ${currentTheme.colors.bg50} scale-105 shadow-md` : "border-slate-100 opacity-40 hover:opacity-100 grayscale"}`}
                        >
                          <char.icon
                            size={24}
                            className={
                              editCharacter === id
                                ? currentTheme.colors.text500
                                : "text-slate-300"
                            }
                          />
                          <span
                            className={`text-[8px] font-black uppercase ${editCharacter === id ? currentTheme.colors.text : "text-slate-400"}`}
                          >
                            {char.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {(role === "parent" || actingAsKid) && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">
                      Personal Info
                    </h3>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                        Kid's Name
                      </label>
                      <input
                        type="text"
                        className="w-full p-4 rounded-xl bg-slate-50 border-2 font-bold"
                        value={editKidName}
                        disabled={role !== "parent"}
                        onChange={(e) => setEditKidName(e.target.value)}
                      />
                    </div>
                  </div>
                  {goal && (
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">
                        Active Mission
                      </h3>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">
                          Goal Name (Activity or Song)
                        </label>
                        <input
                          type="text"
                          className={`w-full p-4 rounded-xl ${currentTheme.colors.bg50} border-2 ${currentTheme.colors.modalBorder} font-bold`}
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
                </>
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
              {(role === "parent" || actingAsKid) && (
                <div className="pt-6 border-t space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-rose-400 tracking-widest leading-none">
                    Danger Zone
                  </h3>
                  <button
                    onClick={() =>
                      confirmState === "reset"
                        ? resetEverything()
                        : setConfirmState("reset")
                    }
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${confirmState === "reset" ? "bg-rose-600 text-white animate-pulse" : "bg-rose-50 text-rose-500 hover:bg-rose-100"}`}
                  >
                    {confirmState === "reset" ? (
                      <>
                        <AlertTriangle size={18} /> CONFIRM DELETE ALL DATA
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} /> Delete All Progress Data
                      </>
                    )}
                  </button>
                  {confirmState === "reset" && (
                    <button
                      onClick={() => setConfirmState(null)}
                      className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                      Cancel Reset
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Path */}
      <div
        className={`pb-64 px-6 flex flex-col-reverse items-center relative max-w-lg mx-auto z-10 transition-all duration-300 ${role === "parent" && userConfig.kids?.length > 1 ? "pt-44" : "pt-32"}`}
      >
        <div className="w-full text-center py-6 opacity-30">
          <div className="h-1 bg-green-300 rounded-full w-full mb-1"></div>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
            Ground
          </p>
        </div>

        {!goal ? (
          role === "parent" ? (
            <div
              className={`bg-white/90 backdrop-blur p-8 rounded-[40px] shadow-2xl border-8 ${currentTheme.colors.modalBorder} w-full mb-20 animate-in zoom-in`}
            >
              <h2
                className={`text-xl font-black ${currentTheme.colors.text500} mb-6 text-center italic`}
              >
                New Goal for {selectedKidConfig?.name}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Goal Name (e.g. Play Piano, Read Book)"
                  className={`w-full p-4 rounded-xl ${currentTheme.colors.bg50} border-2 ${currentTheme.colors.modalBorder} font-bold`}
                  value={editGoalName}
                  onChange={(e) => setEditGoalName(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Weeks"
                    className={`p-4 rounded-xl ${currentTheme.colors.bg50} border-2 ${currentTheme.colors.modalBorder}`}
                    value={editWeeks}
                    onChange={(e) => setEditWeeks(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Max Score"
                    className={`p-4 rounded-xl ${currentTheme.colors.bg50} border-2 ${currentTheme.colors.modalBorder}`}
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!editGoalName || !storageKey) return;
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
                        "users",
                        storageKey,
                        "goals",
                      ),
                      g,
                    );
                  }}
                  className={`w-full ${currentTheme.colors.btn400} text-white font-black py-4 rounded-2xl shadow-xl ${currentTheme.colors.btn400Hover} transition-all active:scale-95 uppercase tracking-wide`}
                >
                  Start the Journey
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex-1 text-slate-400 text-[10px] font-bold uppercase py-3 bg-slate-50 rounded-xl flex items-center justify-center gap-1"
                  >
                    <Settings size={12} /> Global Config
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
          ) : (
            <div className="bg-white/90 backdrop-blur p-12 rounded-[50px] shadow-2xl border-8 border-pink-100 text-center animate-in zoom-in max-w-sm mx-auto mb-20">
              <div className="mb-6 relative">
                <CurrentCharacter
                  size={120}
                  className={`${currentTheme.colors.text500} drop-shadow-2xl opacity-10`}
                />

                <Cloud
                  size={30}
                  className="absolute -top-4 -right-4 text-blue-200 animate-pulse"
                />
              </div>
              <h2
                className={`text-2xl font-black ${currentTheme.colors.text} mb-2 italic`}
              >
                Almost There!
              </h2>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-8">
                Waiting for your parent to set your mission...
              </p>
              <div className="flex flex-col gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                    Signed in as
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className={`w-full py-4 rounded-2xl bg-slate-100 text-slate-400 font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2`}
                >
                  <Lock size={18} /> Switch Account
                </button>
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
              const hasComment = !!item.comment;

              const dateObj = new Date(item.timestamp);
              const dateStrCompare = item.dateString;
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
                  {/* Parent Encouragement Bubble - Offset to the Left */}
                  {hasComment && !isFuture && (
                    <div className="absolute right-[85%] top-[-12px] z-20 animate-in slide-in-from-right-2 fade-in zoom-in group">
                      <div
                        className={`relative bg-white px-4 py-2 rounded-2xl shadow-lg border-2 ${currentTheme.colors.border} min-w-[100px] max-w-[140px]`}
                      >
                        <p
                          className={`handwriting text-xs ${currentTheme.colors.text} leading-tight italic text-balance`}
                        >
                          {item.comment}
                        </p>
                        <div
                          className={`absolute bottom-2 -right-2 w-3 h-3 bg-white border-t-2 border-r-2 ${currentTheme.colors.border} rotate-45`}
                        ></div>
                      </div>
                    </div>
                  )}

                  {isCurrent && !goal.completed && (
                    <div
                      className={`absolute -top-14 left-[50%] -translate-x-1/2 z-10 ${catMood === "happy" ? "cat-fly-happy" : catMood === "sad" ? "cat-quiver-sad" : "animate-bounce"}`}
                    >
                      <div
                        className={`bg-white p-2 rounded-full shadow-2xl border-4 ${currentTheme.colors.border} relative`}
                      >
                        {catMood === "sad" ? (
                          <>
                            <Frown size={56} className="text-slate-400" />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-blue-400">
                              <CloudRain size={24} className="animate-pulse" />
                            </div>
                          </>
                        ) : (
                          <CurrentCharacter
                            size={56}
                            className={`${currentTheme.colors.text500}`}
                          />
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
                    onClick={() =>
                      (!isFuture || isTodayHighlight) && setSelectedDay(item)
                    }
                    className={`relative cursor-pointer hover:scale-105 transition-transform ${isMissed ? "text-slate-400" : isTodayHighlight ? "text-yellow-400 animate-pulse" : isFuture ? "text-blue-200" : currentTheme.colors.cloud}`}
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
                          <currentTheme.instrument
                            size={24}
                            className="text-white opacity-80"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center mt-1">
                    <div
                      className={`text-[10px] font-black uppercase text-center leading-tight ${isTodayHighlight ? "text-yellow-600" : "text-slate-500 opacity-40"}`}
                    >
                      {dateStrDisplay}
                      <br />
                      Day {idx + 1}
                    </div>
                    {item.rating && !isFuture && (
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
                    Great job,{" "}
                    {role === "parent"
                      ? selectedKidConfig?.name
                      : userConfig?.name}
                    !
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
          {role === "girl" || (role === "parent" && actingAsKid) ? (
            <div className="flex flex-col gap-4 items-end">
              {role === "parent" && actingAsKid && (
                <button
                  onClick={() => setActingAsKid(false)}
                  className="w-12 h-12 bg-white/90 text-slate-500 rounded-full shadow-md border border-slate-200 flex items-center justify-center mb-2 hover:bg-slate-50 transition-all active:scale-95"
                  title="Back to Parent View"
                >
                  <Undo2 size={24} />
                </button>
              )}

              <button
                onClick={() => logPractice("completed")}
                className={`w-20 h-20 ${currentTheme.colors.btn400} text-white rounded-full shadow-[0_10px_0_0_#be185d] flex items-center justify-center active:translate-y-1 active:shadow-none transition-all ${todayStatus === "completed" ? currentTheme.colors.ring + " ring-4" : "opacity-90"}`}
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
              {showMoreButtons && (
                <div className="flex flex-row-reverse gap-3 mb-2 animate-in slide-in-from-right fade-in">
                  <button
                    onClick={() =>
                      confirmState === "finalize"
                        ? finalizeGoal()
                        : setConfirmState("finalize")
                    }
                    className={`w-14 h-14 ${confirmState === "finalize" ? "bg-green-500 animate-pulse" : "bg-yellow-400"} text-white rounded-full shadow-lg flex items-center justify-center transition-all`}
                    title="Finalize Goal"
                  >
                    {confirmState === "finalize" ? (
                      <Check size={28} />
                    ) : (
                      <TrophyIcon size={28} />
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
                  <label
                    className="w-14 h-14 bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all cursor-pointer"
                    title="Import Data"
                  >
                    <Upload size={24} />
                    <input
                      type="file"
                      className="hidden"
                      accept=".json"
                      onChange={importData}
                    />
                  </label>
                </div>
              )}

              <button
                onClick={() => setShowMoreButtons(!showMoreButtons)}
                className={`w-14 h-14 ${showMoreButtons ? "bg-slate-600" : "bg-slate-400"} text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95`}
                title="More Options"
              >
                <MoreHorizontal
                  size={28}
                  className={
                    showMoreButtons
                      ? "rotate-90 transition-transform"
                      : "transition-transform"
                  }
                />
              </button>

              <button
                onClick={resetToday}
                className="w-14 h-14 bg-blue-400 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all"
                title="Reset Today's Record"
              >
                <RotateCcw size={24} />
              </button>

              <button
                onClick={() => setActingAsKid(true)}
                className="w-16 h-16 bg-pink-500 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all active:scale-95"
                title="Log as Kid"
              >
                <Cat size={32} />
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="w-14 h-14 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center active:translate-y-1 transition-all"
                  title="Admin Panel"
                >
                  <ShieldCheck size={24} />
                </button>
              )}

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

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl border-8 ${currentTheme.colors.modalBorder} relative text-center max-h-[90vh] overflow-y-auto`}
          >
            <button
              onClick={() => setSelectedDay(null)}
              className={`absolute top-4 right-4 text-slate-300 hover:${currentTheme.colors.text500}`}
            >
              <X size={24} />
            </button>
            <h3
              className={`text-xl font-black ${currentTheme.colors.text} mb-2 italic leading-tight`}
            >
              Practice Memories
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest leading-none">
              {selectedDay.dateString}
            </p>

            {role === "parent" && (
              <div className="space-y-4 mb-6">
                {isTodayOrYesterday(selectedDay.dateString) &&
                  !selectedDay.id.startsWith("future") && (
                    <div className="p-4 bg-yellow-50 rounded-3xl border-2 border-yellow-100">
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
                      </div>
                    </div>
                  )}

                {!selectedDay.id.startsWith("future") && (
                  <div
                    className={`p-4 ${currentTheme.colors.bg50} rounded-3xl border-2 ${currentTheme.colors.modalBorder}`}
                  >
                    <p
                      className={`text-[10px] font-black ${currentTheme.colors.text500} uppercase mb-3 tracking-widest leading-none flex items-center justify-center gap-2`}
                    >
                      <MessageCircleHeart size={14} /> Parent Cheer
                    </p>
                    <div className="relative">
                      <textarea
                        className={`w-full p-3 pr-10 rounded-2xl bg-white border-2 ${currentTheme.colors.modalBorder} handwriting text-sm outline-none focus:border-${currentTheme.primary}-300 resize-none h-20`}
                        placeholder="Great job today! Love you!"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                      />
                      <button
                        onClick={saveFeedback}
                        className={`absolute bottom-2 right-2 p-2 ${currentTheme.colors.btn400} text-white rounded-xl shadow-md ${currentTheme.colors.btn400Hover} transition-all`}
                      >
                        <SendHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {role === "girl" && selectedDay.comment && (
              <div
                className={`mb-6 p-5 ${currentTheme.colors.bg50} rounded-[32px] border-2 ${currentTheme.colors.modalBorder} italic`}
              >
                <p
                  className={`handwriting ${currentTheme.colors.text} text-lg leading-relaxed`}
                >
                  "{selectedDay.comment}"
                </p>
                <div
                  className={`flex justify-center mt-2 ${currentTheme.colors.text400}`}
                >
                  <Heart size={20} fill="currentColor" />
                </div>
              </div>
            )}

            {isAssembling ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2
                  size={40}
                  className={`animate-spin ${currentTheme.colors.text400}`}
                />
                <p className="text-xs font-bold text-slate-400 italic">
                  Finding the melody...
                </p>
              </div>
            ) : fullAudioData ? (
              <div className="space-y-6">
                <div
                  className={`${currentTheme.colors.bg50} p-6 rounded-[32px] border-2 ${currentTheme.colors.modalBorder}`}
                >
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
                <p className="text-sm font-bold text-slate-400 italic text-balance">
                  No recording yet!
                </p>
              </div>
            )}

            {role === "girl" && !goal?.completed && (
              <div className="mt-6">
                <label
                  className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg ${isUploading ? "bg-slate-100 text-slate-400" : `${currentTheme.colors.btn} text-white ${currentTheme.colors.btnHover} active:scale-95`}`}
                >
                  {isUploading ? (
                    <RotateCcw className="animate-spin" size={20} />
                  ) : (
                    <Mic size={20} />
                  )}
                  {fullAudioData ? "CHANGE PERFORMANCE" : "SHARE PERFORMANCE"}
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

      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <AdminModal
          allUsers={allUsers}
          onClose={() => setShowAdminPanel(false)}
          onSave={async (userEmail, userData) => {
            try {
              const userRef = doc(
                db,
                "artifacts",
                appId,
                "user_registry",
                userEmail.replace(/[@.]/g, "_"),
              );

              await updateDoc(userRef, userData).catch(async () => {
                await setDoc(userRef, userData);
              });
              playSoundEffect("success");
            } catch {
              playSoundEffect("fail");
            }
          }}
        />
      )}

      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
        .handwriting { font-family: 'Caveat', cursive; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .zoom-in { animation-name: zoom-in; }
        @keyframes float-up { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 5% { opacity: 0.3; } 95% { opacity: 0.3; } 100% { transform: translateY(-130vh) rotate(360deg); opacity: 0; } }
        @keyframes twinkle { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
        
        @keyframes jump-happy { 
          0% { transform: translateY(0) scale(1); } 
          15% { transform: translateY(15px) scale(1.3, 0.7); } 
          45% { transform: translateY(-400px) scale(2.5) rotate(15deg); } 
          60% { transform: translateY(-400px) scale(2.5) rotate(-15deg); } 
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

        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee { display: inline-block; animation: marquee 12s linear infinite; }
        
        .float-up { animation: float-up linear infinite; }
        .twinkle { animation: twinkle ease-in-out infinite; animation-duration: var(--twinkle-dur, 2s); }
        .cat-fly-happy { animation: jump-happy 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .cat-quiver-sad { animation: cry-sad 0.2s linear infinite; }
        
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .min-h-screen { min-height: 100vh; }
        .bg-pink-100 { background-color: ${currentTheme.accent}; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
