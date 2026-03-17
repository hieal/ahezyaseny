import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dataService } from "../services/dataService";
import { useNavigate } from "react-router-dom";
import {
  Match,
  GameScore,
  WhatsAppGroup,
  PortalSettings,
  PublishLog,
  User as UserType,
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  MessageSquare,
  Users,
  Trophy,
  Gamepad2,
  Zap,
  Clock,
  Send,
  ChevronLeft,
  Star,
  TrendingUp,
  User,
  Shield,
  LogOut,
  Sparkles,
  Download,
  Eye,
  Layout,
  Smartphone,
  ExternalLink,
  Info,
  MapPin,
  Plus,
  Minus,
  Swords,
} from "lucide-react";
import { toast } from "react-hot-toast";
import html2canvas from "html2canvas";
import { ViewOnlyWhatsAppChat } from "../components/ViewOnlyWhatsAppChat";
import { StrategicRPS } from "../components/StrategicRPS";
import { Navbar } from "../components/Navbar";

import { supabase } from "../services/supabase";

function CandidateDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dailySuggestion, setDailySuggestion] = useState<Match | null>(null);
  const [onlineStats, setOnlineStats] = useState({ males: 0, females: 0 });
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<{
    mostWins: { id: string, name: string, wins: number, photo: string }[],
    mostPlayed: { id: string, name: string, played: number, photo: string }[],
    pairOfTheWeek: { pair: string, games: number }[]
  } | null>(null);
  const [myMatch, setMyMatch] = useState<Match | null>(null);
  const [activeGame, setActiveGame] = useState<{
    id: string;
    opponentId: string;
    opponentName: string;
    type?: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{
    mainGroup: WhatsAppGroup | null;
    observerGroups: WhatsAppGroup[];
  }>({ mainGroup: null, observerGroups: [] });
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(
    null,
  );
  const [publishedToday, setPublishedToday] = useState<PublishLog[]>([]);
  const [manager, setManager] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<"standard" | "designed">("standard");
  const [imagePos, setImagePos] = useState({ x: 0, y: 0, zoom: 1 });
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchData = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [suggestion, stats, topScores, match, settings, leaderboardData] = await Promise.all(
        [
          dataService.getDailySuggestion(
            user.category || "",
            user.gender || "male",
          ),
          dataService.getOnlineStats(),
          dataService.getLeaderboard(),
          dataService.getMatchById(user.id),
          dataService.getPortalSettings(),
          dataService.getWeeklyLeaderboard(),
        ],
      );
      setDailySuggestion(suggestion);
      setOnlineStats(stats);
      setLeaderboard(topScores);
      setMyMatch(match);
      setPortalSettings(settings);
      setWeeklyLeaderboard(leaderboardData);

      if (match?.image_position) {
        setImagePos(match.image_position);
      }

      // Fetch manager details if assigned
      if (user.created_by) {
        const managerData = await dataService.getAdminById(user.created_by);
        setManager(managerData);
      }

      // Fetch groups based on match info
      let viewerIds: string[] = [];
      if (match?.viewer_group_ids) {
        try {
          viewerIds = JSON.parse(match.viewer_group_ids);
        } catch (e) {}
      }

      const groups = await dataService.getCandidateGroupInfo(
        user.category || "",
        user.gender || "male",
        viewerIds,
      );
      setGroupInfo(groups);

      // Fetch published today for main group
      if (groups.mainGroup) {
        const published = await dataService.getPublishedCardsForGroup(
          groups.mainGroup.id,
        );
        setPublishedToday(published);
      }

      if (isRefresh) toast.success("הנתונים עודכנו");
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      if (isRefresh) toast.error("שגיאה בעדכון הנתונים");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setSending(true);
    try {
      if (user.created_by) {
        await dataService.sendInternalMessage({
          sender_id: user.id,
          sender_name: user.full_name,
          receiver_id: user.created_by,
          content: message,
        });
        toast.success("ההודעה נשלחה למנהל האישי שלך");
        setMessage("");
      } else {
        toast.error("לא נמצא מנהל אישי משויך");
      }
    } catch (err) {
      toast.error("שגיאה בשליחת ההודעה");
    } finally {
      setSending(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;

    try {
      toast.loading("מכין את הכרטיס להורדה...", { id: "downloading" });

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2, // Higher quality
        backgroundColor: null,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.download = `profile-card-${myMatch?.name || "candidate"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("הכרטיס הורד בהצלחה!", { id: "downloading" });
    } catch (err) {
      console.error("Error generating card image:", err);
      toast.error("שגיאה ביצירת הכרטיס", { id: "downloading" });
    }
  };

  const handleSaveImagePosition = async () => {
    if (!myMatch) return;
    try {
      await dataService.updateMatch(myMatch.id, { image_position: imagePos });
      toast.success("מיקום התמונה נשמר בהצלחה!");
    } catch (err) {
      toast.error("שגיאה בשמירת מיקום התמונה");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            ברוך הבא, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-lg text-slate-500 font-medium">
            הנה מה שקורה היום במערכת השידוכים שלך
          </p>
        </section>

        {/* Personal Manager Section */}
        {manager && (
          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:scale-150" />
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-3xl overflow-hidden shadow-inner border-4 border-white">
                  {manager.avatar_url ? (
                    <img
                      src={manager.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    manager.full_name?.[0]
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                  <Shield size={16} />
                </div>
              </div>
              <div className="flex-1 text-center md:text-right">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  {manager.gender === "female"
                    ? "המנהלת האישית שלך"
                    : "המנהל האישי שלך"}
                </h2>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  {manager.full_name}
                </h3>
                <p className="text-sm text-slate-500 font-medium mb-4">
                  זמינה עבורך לכל שאלה, התייעצות או עדכון בכרטיס שלך.
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  {manager.phone && (
                    <a
                      href={`https://wa.me/972${manager.phone.replace(/\D/g, "").startsWith("0") ? manager.phone.replace(/\D/g, "").slice(1) : manager.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-2"
                    >
                      <MessageSquare size={18} />
                      דברי איתי בוואטסאפ
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Group Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Group */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                  הקבוצה שלי
                </h2>
                <p className="text-emerald-600 font-black text-lg">
                  {groupInfo.mainGroup?.name || "טוען קבוצה..."}
                </p>
              </div>
            </div>
            {groupInfo.mainGroup?.link && (
              <a
                href={groupInfo.mainGroup.link}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
              >
                <ExternalLink size={20} />
              </a>
            )}
          </div>

          {/* Observer Groups */}
          {groupInfo.observerGroups.length > 0 && (
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                קבוצות לצפייה
              </h2>
              <div className="flex flex-wrap gap-2">
                {groupInfo.observerGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold border border-slate-100"
                  >
                    <Eye size={14} className="text-slate-400" />
                    {group.name}
                    {group.link && (
                      <a
                        href={group.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-500 hover:text-emerald-600"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Published Today Feed */}
        {publishedToday.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={24} />
                פורסמו היום בקבוצה שלך
              </h2>
              <button
                onClick={() => navigate("/portal/published-today")}
                className="text-emerald-500 font-bold text-sm"
              >
                צפה בהכל
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
              {publishedToday.map((log) => (
                <motion.div
                  key={log.id}
                  whileHover={{ y: -5 }}
                  className="min-w-[280px] bg-white rounded-[2rem] overflow-hidden shadow-md border border-slate-100 snap-start"
                >
                  <div className="relative aspect-[4/5]">
                    <img
                      src={
                        log.match?.image_url ||
                        "https://picsum.photos/seed/match/400/500"
                      }
                      alt={log.match?.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 right-4 left-4 text-white">
                      <h3 className="text-xl font-black">
                        {log.match?.name}, {log.match?.age}
                      </h3>
                      <p className="text-xs font-medium opacity-80">
                        {log.match?.city}
                      </p>
                      <p className="text-[10px] mt-1 opacity-60">
                        פורסם ב-
                        {new Date(log.created_at).toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* My Profile Card Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <User className="text-emerald-500" size={24} />
              הכרטיס שלי
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("standard")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === "standard" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}
              >
                <Layout size={14} />
                רגיל
              </button>
              <button
                onClick={() => setViewMode("designed")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === "designed" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}
              >
                <Smartphone size={14} />
                מעוצב
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === "standard" ? (
              <motion.div
                key="standard"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100"
              >
                {myMatch ? (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="w-full md:w-1/3 aspect-[3/4] rounded-3xl overflow-hidden shadow-lg border border-slate-100 shrink-0">
                        <img
                          src={
                            myMatch.image_url ||
                            "https://picsum.photos/seed/profile/600/800"
                          }
                          alt={myMatch.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="bg-[#DCF8C6] p-4 rounded-2xl rounded-tr-none shadow-sm relative">
                          <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#DCF8C6] border-r-[10px] border-r-transparent" />
                          <h3 className="font-black text-slate-900 mb-2">
                            פרטי כרטיס (פורמט הודעה):
                          </h3>
                          <div className="space-y-1 text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
                            <p>✨ *כרטיס משודך חדש* ✨</p>
                            <p>👤 *שם:* {myMatch.name}</p>
                            <p>🎂 *גיל:* {myMatch.age}</p>
                            <p>📍 *עיר:* {myMatch.city}</p>
                            <p>📏 *גובה:* {myMatch.height}</p>
                            <p>💍 *מצב משפחתי:* {myMatch.marital_status}</p>
                            <p>🕍 *מגזר:* {myMatch.religious_level}</p>
                            <p>💼 *עיסוק:* {myMatch.occupation}</p>
                            <p>✡️ *עדה:* {myMatch.ethnicity}</p>
                            <p>🎖️ *שירות:* {myMatch.service}</p>
                            <p>🚬 *מעשן:* {myMatch.smoking}</p>
                            <p>👐 *שומר נגיעה:* {myMatch.negiah}</p>
                            <p>📝 *קצת עלי:* {myMatch.about || "לא צוין"}</p>
                            <p>
                              🎯 *מה מחפש:* {myMatch.looking_for || "לא צוין"}
                            </p>
                            <p className="mt-4 text-[10px] opacity-60">
                              פורסם באמצעות פורטל יוחאי
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              סטטוס פירסום
                            </p>
                            <p className="font-bold text-emerald-600">
                              {myMatch.last_published_at
                                ? "פורסם"
                                : "טרם פורסם"}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">
                                קבוצת בית
                              </p>
                              <p className="font-bold text-slate-700">
                                {groupInfo.mainGroup?.name || "לא משויך"}
                              </p>
                            </div>
                            {groupInfo.mainGroup?.link && (
                              <a
                                href={groupInfo.mainGroup.link}
                                target="_blank"
                                rel="noreferrer"
                                className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-all shadow-sm"
                                title="פתח קבוצת וואטסאפ"
                              >
                                <MessageSquare size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-12">
                    לא נמצא נתוני כרטיס
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="designed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div
                  ref={cardRef}
                  className={`p-0 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden aspect-[9/16] max-w-[320px] mx-auto border-4 ${
                    myMatch?.type === "female"
                      ? "bg-gradient-to-b from-[#831843] via-[#db2777] to-[#f472b6] border-pink-400"
                      : "bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-[#fbbf24] border-white/20"
                  }`}
                >
                  {/* WhatsApp Style Header */}
                  <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/40 to-transparent z-10" />

                  <div className="relative z-20 h-full flex flex-col">
                    {/* Profile Image - Large with rounded corners */}
                    <div className="mt-12 px-6">
                      <div className="aspect-square rounded-[2rem] overflow-hidden border-4 border-white/30 shadow-2xl relative bg-slate-800">
                        <motion.img
                          drag
                          dragMomentum={false}
                          onDragEnd={(_, info) => {
                            setImagePos((prev) => ({
                              ...prev,
                              x: prev.x + info.offset.x,
                              y: prev.y + info.offset.y,
                            }));
                          }}
                          animate={{
                            x: imagePos.x,
                            y: imagePos.y,
                            scale: imagePos.zoom,
                          }}
                          src={
                            myMatch?.image_url ||
                            "https://picsum.photos/seed/profile/600/600"
                          }
                          alt=""
                          className="w-full h-full object-cover cursor-move"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="mt-2 flex justify-center gap-2">
                        <button
                          onClick={() =>
                            setImagePos((prev) => ({
                              ...prev,
                              zoom: Math.min(prev.zoom + 0.1, 3),
                            }))
                          }
                          className="p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                          title="הגדל"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setImagePos((prev) => ({
                              ...prev,
                              zoom: Math.max(prev.zoom - 0.1, 0.5),
                            }))
                          }
                          className="p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                          title="הקטן"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          onClick={handleSaveImagePosition}
                          className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          שמור מיקום
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 px-8 pt-6 space-y-4 overflow-y-auto custom-scrollbar">
                      <div className="text-center">
                        <h3 className="text-3xl font-black mb-1 drop-shadow-lg">
                          {myMatch?.name}
                        </h3>
                        <div className="flex items-center justify-center gap-2 text-lg font-bold opacity-90">
                          <MapPin size={18} />
                          {myMatch?.age} • {myMatch?.city}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                          <TrendingUp size={18} />
                          <p className="font-bold text-base">
                            {myMatch?.height}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                          <Heart size={18} />
                          <p className="font-bold text-base">
                            {myMatch?.marital_status}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 col-span-2">
                          <Shield size={18} />
                          <p className="font-bold text-base">
                            {myMatch?.religious_level}
                          </p>
                        </div>
                      </div>

                      {myMatch?.about && (
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                          <p className="text-[10px] font-black uppercase opacity-60 mb-1">
                            קצת עליי
                          </p>
                          <p className="text-sm leading-relaxed line-clamp-3">
                            {myMatch?.about}
                          </p>
                        </div>
                      )}

                      {myMatch?.looking_for && (
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                          <p className="text-[10px] font-black uppercase opacity-60 mb-1">
                            מחפש/ת
                          </p>
                          <p className="text-sm leading-relaxed line-clamp-3">
                            {myMatch?.looking_for}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-black/20 backdrop-blur-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                          <Heart className="text-white fill-white" size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black tracking-widest uppercase opacity-60">
                            פורטל יוחאי
                          </p>
                          <p className="text-xs font-black">משודך מאומת</p>
                        </div>
                      </div>
                      <Logo size={32} className="opacity-40" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleDownloadCard}
                    className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-3"
                  >
                    <Download size={20} />
                    הורד כרטיס מעוצב
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Hall of Fame */}
        {weeklyLeaderboard && (
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Trophy className="text-amber-500" size={24} />
              היכל התהילה השבועי
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "אלוף הלבבות", data: weeklyLeaderboard.mostWins, key: "wins" },
                { title: "המתמידים", data: weeklyLeaderboard.mostPlayed, key: "played" },
              ].map((cat) => (
                <div key={cat.title} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-4 text-center">{cat.title}</h3>
                  <div className="space-y-3">
                    {cat.data.map((item, i) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-300' : 'bg-amber-700'}`}>
                          {i + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                          {item.photo && <img src={item.photo} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 font-bold text-slate-900">{item.name}</div>
                        <div className="text-emerald-600 font-black">{cat.key === 'wins' ? (item as any).wins : (item as any).played}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="text-emerald-500" size={24} />
            הצעת היום
          </h2>
          {dailySuggestion ? (
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <div className="relative aspect-[16/9] md:aspect-[21/9]">
                <img
                  src={
                    dailySuggestion.image_url ||
                    "https://picsum.photos/seed/match/800/600"
                  }
                  alt={dailySuggestion.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 right-6 left-6 text-white">
                  <div className="inline-block px-3 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-full mb-3 uppercase tracking-wider">
                    התאמה חכמה להיום
                  </div>
                  <h3 className="text-3xl font-black mb-1">
                    {dailySuggestion.name}, {dailySuggestion.age}
                  </h3>
                  <p className="text-sm font-medium opacity-90 flex items-center gap-2">
                    <TrendingUp size={14} />
                    {dailySuggestion.city} • {dailySuggestion.religious_level}
                  </p>
                </div>
              </div>
              <div className="p-6 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/match/${dailySuggestion.id}`)}
                  className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                >
                  צפייה בפרופיל המלא
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-2">
                  <button className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:text-red-500 transition-all border border-slate-100">
                    <Heart size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">
                ברוך הבא! בקרוב יופיעו כאן ההצעות שלך
              </p>
            </div>
          )}
        </section>

        {/* Our Games Club */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Gamepad2 className="text-emerald-500" size={28} />
            מרכז המשחקים והכיף
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/portal/games", { state: { initialGame: 'strategic_rps' } })}
              className="bg-gradient-to-br from-pink-50 to-blue-50 p-6 rounded-3xl border border-pink-100 hover:border-pink-300 transition-all text-right group shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-2 left-2 bg-pink-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce z-20">
                חדש!
              </div>
              <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Swords size={24} />
              </div>
              <h3 className="font-black text-slate-900 text-lg">מרוץ ללב (אסטרטגיה)</h3>
              <p className="text-sm text-slate-500">מצא שחקן וצא לדו-קרב אסטרטגי</p>
              <div className="mt-4 inline-flex items-center gap-2 text-pink-600 font-bold text-sm">
                <span>כנס למשחק</span>
                <ChevronLeft size={14} />
              </div>
            </button>
            <button
              onClick={() => navigate("/portal/games/maze")}
              className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-3xl border border-amber-100 hover:border-amber-300 transition-all text-right group shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Gamepad2 size={24} />
              </div>
              <h3 className="font-black text-slate-900 text-lg">המבוך התלת-מימדי</h3>
              <p className="text-sm text-slate-500">עובדים יחד במבוך מאתגר</p>
            </button>
            <button
              onClick={() => navigate("/portal/games/memory")}
              className="bg-gradient-to-br from-purple-50 to-fuchsia-50 p-6 rounded-3xl border border-purple-100 hover:border-purple-300 transition-all text-right group shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Sparkles size={24} />
              </div>
              <h3 className="font-black text-slate-900 text-lg">משחק הזיכרון</h3>
              <p className="text-sm text-slate-500">בודקים את הזיכרון והריכוז</p>
            </button>
          </div>
        </section>

        {/* Quick Actions & Games */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gamepad2 className="text-emerald-500" size={20} />
              משחקים פעילים
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => navigate("/portal/games")}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layout size={24} />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-slate-900">משחק הזיכרון</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      מצא את הזוגות המתאימים
                    </p>
                  </div>
                </div>
                <ChevronLeft
                  size={20}
                  className="text-slate-300 group-hover:text-emerald-500 transition-colors"
                />
              </button>

              <button
                onClick={() => navigate("/portal/games")}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap size={24} />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-slate-900">
                      מבוך שיתוף פעולה
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      עבדו יחד כדי לצאת מהמבוך
                    </p>
                  </div>
                </div>
                <ChevronLeft
                  size={20}
                  className="text-slate-300 group-hover:text-emerald-500 transition-colors"
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              פעולות מהירות
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => navigate("/portal/published-today")}
                className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[2rem] text-white text-right space-y-3 shadow-lg shadow-orange-200 relative overflow-hidden group"
              >
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl">פורסמו היום</h3>
                  <p className="text-xs opacity-80 font-bold">
                    הצעות חדשות מהשטח
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate("/portal/speed-date")}
                className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-[2rem] text-white text-right space-y-3 shadow-lg shadow-purple-200 relative overflow-hidden group"
              >
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl">ספיד-דייט</h3>
                  <p className="text-xs opacity-80 font-bold">
                    שיחה אנונימית של 7 דקות
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp View-Only Windows */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-emerald-500" size={20} />
              עדכוני קבוצות (צפייה בלבד)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Group Window */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-[450px] relative flex flex-col">
              <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">
                      {groupInfo.mainGroup?.name || "קבוצת הבית"}
                    </h3>
                    <p className="text-[10px] opacity-80">
                      קבוצת הבית שלך • צפייה בלבד
                    </p>
                  </div>
                </div>
                {groupInfo.mainGroup?.link && (
                  <a
                    href={groupInfo.mainGroup.link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              <ViewOnlyWhatsAppChat
                groupId={groupInfo.mainGroup?.whapi_id || undefined}
                isMainGroup={true}
              />
            </div>

            {/* Observer Groups Windows */}
            {groupInfo.observerGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-[450px] relative flex flex-col"
              >
                <div className="bg-slate-700 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Eye size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{group.name}</h3>
                      <p className="text-[10px] opacity-80">
                        קבוצה לצפייה • צפייה בלבד
                      </p>
                    </div>
                  </div>
                  {group.link && (
                    <a
                      href={group.link}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>

                <ViewOnlyWhatsAppChat
                  groupId={group.whapi_id || undefined}
                  isMainGroup={false}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Chat with Manager */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-emerald-500" size={20} />
            {manager?.gender === "female" ? "המנהלת שלי" : "המנהל שלי"}
          </h2>
          <form onSubmit={handleSendMessage} className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="כתוב הודעה למנהל האישי שלך..."
              className="w-full p-4 pr-4 pl-14 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 min-h-[100px] font-medium"
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="absolute bottom-4 left-4 w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </section>

        {/* Leaderboard Preview */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              טבלת המובילים
            </h2>
            <button
              onClick={() => navigate("/portal/games")}
              className="text-emerald-500 font-bold text-sm"
            >
              צפה בהכל
            </button>
          </div>
          <div className="space-y-3">
            {leaderboard.slice(0, 3).map((score, index) => (
              <div
                key={score.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-600"
                        : index === 1
                          ? "bg-slate-200 text-slate-600"
                          : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="font-bold text-slate-700">
                    {score.candidate_name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-emerald-600">
                    {score.score} נק׳
                  </span>
                  {score.candidate_id !== user?.id && (
                    <button
                      onClick={() =>
                        setActiveGame({
                          id: [user?.id, score.candidate_id].sort().join("-"),
                          opponentId: score.candidate_id,
                          opponentName: score.candidate_name,
                          type: 'strategic-rps'
                        })
                      }
                      className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors"
                      title="אתגר למשחק אסטרטגיה"
                    >
                      <Swords size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-center text-slate-400 py-4 font-medium">
                עדיין אין ניקוד. היה הראשון לשחק!
              </p>
            )}
          </div>
        </section>

      </main>

      {activeGame && user && activeGame.type !== 'strategic-rps' && (
        <StrategicRPS
          gameId={activeGame.id}
          myId={user.id}
          myName={user.name}
          opponentId={activeGame.opponentId}
          opponentName={activeGame.opponentName}
          onClose={() => setActiveGame(null)}
        />
      )}
    </div>
  );
}

function Logo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 bg-emerald-500 rounded-xl rotate-6 opacity-20"></div>
        <div className="absolute inset-0 bg-emerald-600 rounded-xl -rotate-3 flex items-center justify-center shadow-lg">
          <Heart size={size * 0.6} className="text-white fill-white" />
        </div>
      </div>
    </div>
  );
}

export default CandidateDashboard;