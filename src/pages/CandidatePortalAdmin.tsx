import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { PortalSettings, GameScore } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Image as ImageIcon, Zap, Trophy, 
  Save, Plus, Trash2, Layout, BarChart3,
  Users, Gamepad2, Clock, X, MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import MatchesManagement from '../components/MatchesManagement';
import { GameMonitoring } from '../components/GameMonitoring';

export default function CandidatePortalAdmin() {
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any>(null);
  const [stats, setStats] = useState({ registeredMatches: 0, totalGames: 0, speedDatesToday: 0 });
  const [loading, setLoading] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMatchesManagement, setShowMatchesManagement] = useState(false);

  const [activeTab, setActiveTab] = useState<'settings' | 'games'>('settings');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [portalSettings, scores, portalStats, weeklyLeaderboardData] = await Promise.all([
          dataService.getPortalSettings(),
          dataService.getLeaderboard(),
          dataService.getPortalStats(),
          dataService.getWeeklyLeaderboard()
        ]);
        setSettings(portalSettings);
        setLeaderboard(scores);
        setStats(portalStats);
        setWeeklyLeaderboard(weeklyLeaderboardData);
      } catch (err) {
        console.error('Error fetching portal settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await dataService.updatePortalSettings(settings);
      toast.success('הגדרות הפורטל עודכנו בהצלחה');
    } catch (err) {
      toast.error('שגיאה בעדכון ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  const addImage = () => {
    if (!newImageUrl.trim() || !settings) return;
    const images = JSON.parse(settings.memory_game_images || '[]');
    if (images.length >= 8) {
      toast.error('ניתן להוסיף עד 8 תמונות למשחק הזיכרון');
      return;
    }
    const updatedImages = [...images, newImageUrl];
    setSettings({ ...settings, memory_game_images: JSON.stringify(updatedImages) });
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    if (!settings) return;
    const images = JSON.parse(settings.memory_game_images || '[]');
    const updatedImages = images.filter((_: any, i: number) => i !== index);
    setSettings({ ...settings, memory_game_images: JSON.stringify(updatedImages) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const memoryImages = JSON.parse(settings?.memory_game_images || '[]');

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">ניהול פורטל משודכים</h1>
          <p className="text-slate-500 font-medium">ניהול הגדרות, משחקים וסטטיסטיקות של אזור המשודכים</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowMatchesManagement(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
          >
            <Users size={20} />
            ניהול משודכים
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={20} />}
            שמור שינויים
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMatchesManagement && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">ניהול משודכים</h2>
                <button onClick={() => setShowMatchesManagement(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <MatchesManagement />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            activeTab === 'settings' 
              ? 'bg-emerald-50 text-emerald-600' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          הגדרות פורטל
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            activeTab === 'games' 
              ? 'bg-purple-50 text-purple-600' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          ניטור משחקים
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Settings */}
          <div className="lg:col-span-2 space-y-8">
          {/* Speed Date Toggle */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center">
                  <Zap size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">ספיד-דייט</h2>
                  <p className="text-sm text-slate-500 font-medium">הפעל או השבת את תכונת הספיד-דייט בפורטל</p>
                </div>
              </div>
              <button
                onClick={() => setSettings(s => s ? { ...s, is_speed_date_active: !s.is_speed_date_active } : null)}
                className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                  settings?.is_speed_date_active ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 ${
                  settings?.is_speed_date_active ? 'right-9' : 'right-1'
                }`} />
              </button>
            </div>
          </section>

          {/* WhatsApp Group ID */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <MessageSquare size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">מזהה קבוצת וואטסאפ (Whapi)</h2>
                <p className="text-sm text-slate-500 font-medium">הגדר את מזהה הקבוצה המרכזית לפורטל (עבור סנכרון הודעות)</p>
              </div>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={settings?.whatsapp_group_id || ''}
                onChange={(e) => setSettings(s => s ? { ...s, whatsapp_group_id: e.target.value } : null)}
                placeholder="הכנס מזהה קבוצה (למשל: 123456789@g.us)"
                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </section>

          {/* Memory Game Images */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <ImageIcon size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">תמונות למשחק הזיכרון</h2>
                <p className="text-sm text-slate-500 font-medium">נהל את התמונות שיופיעו במשחק הזיכרון (מומלץ 4-8 תמונות)</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="הכנס כתובת URL של תמונה..."
                className="flex-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <button
                onClick={addImage}
                className="px-6 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                הוסף
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {memoryImages.map((url: string, index: number) => (
                <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-100">
                  <img src={url} className="w-full h-full object-cover" alt={`Memory ${index}`} referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removeImage(index)}
                      className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {memoryImages.length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">אין תמונות עדיין. הוסף תמונות כדי להפעיל את המשחק.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Stats & Leaderboard */}
        <div className="space-y-8">
          {/* Quick Stats */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <BarChart3 size={28} />
              </div>
              <h2 className="text-xl font-black text-slate-900">סטטיסטיקות פורטל</h2>
            </div>

              <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-500" size={20} />
                  <span className="font-bold text-slate-700">משודכים רשומים</span>
                </div>
                <span className="font-black text-slate-900">{stats.registeredMatches}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Gamepad2 className="text-purple-500" size={20} />
                  <span className="font-bold text-slate-700">משחקים ששוחקו</span>
                </div>
                <span className="font-black text-slate-900">{stats.totalGames}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Clock className="text-emerald-500" size={20} />
                  <span className="font-bold text-slate-700">ספיד-דייטים היום</span>
                </div>
                <span className="font-black text-slate-900">{stats.speedDatesToday}</span>
              </div>
            </div>
          </section>

          {/* Weekly Winners */}
          {weeklyLeaderboard && (
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Trophy size={28} />
                </div>
                <h2 className="text-xl font-black text-slate-900">זוכים שבועיים</h2>
              </div>
              <div className="space-y-4">
                {weeklyLeaderboard.mostWins.slice(0, 1).map((winner: any) => (
                  <div key={winner.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white overflow-hidden">
                        {winner.photo && <img src={winner.photo} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{winner.name}</p>
                        <p className="text-xs font-bold text-amber-600">אלוף הלבבות</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          const candidate = await dataService.getCandidateByUserId(winner.id);
                          const profile = await dataService.getProfileById(winner.id);
                          if (candidate && profile && profile.phone) {
                            await dataService.updateCandidateNotes(candidate.id, 'STAR');
                            await dataService.sendWhatsAppMessage(profile.phone, `ברכות ${winner.name}! זכית בתואר אלוף הלבבות! הפרס הוענק לך.`);
                            toast.success(`הפרס הוענק ל${winner.name}!`);
                          } else {
                            toast.error(`לא נמצא מועמד או מספר טלפון ל${winner.name}`);
                          }
                        } catch (error) {
                          toast.error(`שגיאה בהענקת הפרס: ${error}`);
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all"
                    >
                      Reward
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard Preview */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-500 flex items-center justify-center">
                <Trophy size={28} />
              </div>
              <h2 className="text-xl font-black text-slate-900">טבלת המובילים</h2>
            </div>

            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((score, index) => (
                <div key={score.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-black text-slate-400">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-700 text-sm">{score.candidate_name}</span>
                  </div>
                  <span className="font-black text-emerald-600 text-sm">{score.score} נק׳</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-center text-slate-400 py-4 font-medium">אין נתונים עדיין</p>
              )}
            </div>
          </section>
        </div>
      </div>
      ) : (
        <GameMonitoring />
      )}
    </div>
  );
}
