import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Settings as SettingsIcon, Save, MessageSquare, Heart, Globe, ShieldCheck, Plus, Trash2, CheckCircle, XCircle, Play, AlertTriangle, Database, RefreshCw, Anchor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME, CATEGORIES } from '../constants';
import { WhatsAppWidget } from '../components/WhatsAppWidget';
import { useAuth } from '../contexts/AuthContext';

import { WhatsAppGroup } from '../types';
import { dataService } from '../services/dataService';
import { ImageSyncDashboard } from '../components/ImageSyncDashboard';
import { isAIStudio } from '../utils/env';

export default function SettingsPage() {
  const { user, isReadOnly, refreshUser } = useAuth();
  const [template, setTemplate] = useState('');
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES);
  const [initialMessage, setInitialMessage] = useState('');
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testGroup, setTestGroup] = useState<WhatsAppGroup | null>(null);
  const [showImageSync, setShowImageSync] = useState(false);
  
  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showResetHistoryModal, setShowResetHistoryModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // Generic reset modal state
  const [resetModalConfig, setResetModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    color: 'red' | 'orange' | 'blue' | 'amber';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    color: 'red'
  });

  useEffect(() => {
    dataService.getSettings().then(data => {
      setTemplate(data.whatsapp_template || '');
      setInitialMessage(data.whatsapp_initial_message || '');
      setGoogleLoginEnabled(data.google_login_enabled === 'true');
    });

    dataService.getWhatsAppGroups().then(setWhatsappGroups);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await dataService.updateSetting('whatsapp_template', template);
      await dataService.updateSetting('whatsapp_initial_message', initialMessage);
      await dataService.updateSetting('google_login_enabled', googleLoginEnabled.toString());

      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (err) {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const addGroup = async (category?: string) => {
    const targetCategory = category || CATEGORIES[0];
    const existingGroups = whatsappGroups.filter(g => g.category === targetCategory);

    if (existingGroups.length >= 2) {
      setShowLimitModal(true);
      return;
    }

    // Auto-determine type if one group exists
    let type: 'male' | 'female' = 'male';
    if (existingGroups.length === 1) {
      type = existingGroups[0].type === 'male' ? 'female' : 'male';
    }

    const newGroup = {
      name: 'קבוצה חדשה',
      link: '',
      whapi_id: '',
      category: targetCategory,
      type: type,
      last_initial_sent: null
    };
    
    try {
      const createdGroup = await dataService.createWhatsAppGroup(newGroup);
      setWhatsappGroups(prev => [...prev, createdGroup]);
      toast.success('קבוצה נוספה');
    } catch (err) {
      toast.error('שגיאה בהוספת קבוצה');
    }
  };

  const deleteGroup = async (id: string) => {
    setGroupToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;
    try {
      await dataService.deleteWhatsAppGroup(groupToDelete);
      setWhatsappGroups(prev => prev.filter(g => g.id !== groupToDelete));
      toast.success('קבוצה נמחקה');
    } catch (err) {
      toast.error('שגיאה במחיקה');
    } finally {
      setShowDeleteModal(false);
      setGroupToDelete(null);
    }
  };

  const saveGroup = async (group: WhatsAppGroup) => {
    try {
      await dataService.updateWhatsAppGroup(group.id, group);
      toast.success(`הקבוצה ${group.name} נשמרה`);
    } catch (err) {
      toast.error('שגיאה בשמירה');
    }
  };

  const updateGroup = (id: string, field: keyof WhatsAppGroup, value: string) => {
    setWhatsappGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleAllCategories = () => {
    if (selectedCategories.length === CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(CATEGORIES);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-text-main tracking-tight">הגדרות מערכת</h1>
          <p className="text-text-secondary mt-1 font-medium">ניהול תבניות והגדרות כלליות עבור {APP_NAME}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative group">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-luxury-blue hover:bg-blue-50 transition-all flex items-center gap-2 shadow-sm">
              <MessageSquare size={14} />
              קבוצות וואטזאפ
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1">
              <button 
                onClick={() => scrollToSection('section-whatsapp')}
                className="w-full text-right px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-luxury-blue rounded-lg transition-all"
              >
                כל הקבוצות
              </button>
              <div className="border-t border-slate-50 my-1"></div>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => scrollToSection(`cat-${cat}`)}
                  className="w-full text-right px-3 py-2 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-luxury-blue rounded-lg transition-all"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={() => scrollToSection('section-opening')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-luxury-blue transition-all flex items-center gap-2 shadow-sm"
          >
            <Play size={14} />
            הודעות פתיחה
          </button>
          <button 
            onClick={() => scrollToSection('section-google')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-luxury-blue transition-all flex items-center gap-2 shadow-sm"
          >
            <Globe size={14} />
            התחברות גוגל
          </button>
          <button 
            onClick={() => scrollToSection('section-advanced')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-luxury-blue transition-all flex items-center gap-2 shadow-sm"
          >
            <Database size={14} />
            פעולות מתקדמות
          </button>
        </div>
      </div>

      <div className="card p-10 space-y-10 shadow-xl border-none">
        {/* WhatsApp Groups Management Section */}
        <div id="section-whatsapp" className="space-y-6 scroll-mt-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-luxury-blue">
              <div className="p-3 bg-blue-50 rounded-2xl shadow-sm">
                <MessageSquare size={24} />
              </div>
              <h2 className="font-extrabold text-2xl tracking-tight">ניהול קבוצות WhatsApp</h2>
            </div>
            <button 
              onClick={() => addGroup()}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={18} />
              הוסף קבוצה חדשה
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">סינון קבוצות להצגה:</p>
              <button 
                onClick={toggleAllCategories}
                className="text-xs font-bold text-luxury-blue hover:underline"
              >
                {selectedCategories.length === CATEGORIES.length ? 'בטל בחירת הכל' : 'בחר הכל'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedCategories.includes(cat)
                      ? 'bg-luxury-blue text-white border-luxury-blue shadow-md'
                      : 'bg-white text-text-secondary border-slate-200 hover:border-luxury-blue'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-8">
            {CATEGORIES.filter(cat => selectedCategories.includes(cat)).map(cat => (
              <div key={cat} id={`cat-${cat}`} className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 scroll-mt-20">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-extrabold text-lg text-luxury-blue">{cat}</h3>
                    <button 
                      onClick={() => {}}
                      className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded-lg cursor-not-allowed"
                      title="סנכרון הוסר"
                    >
                      <Anchor size={12} />
                      סנכרון הוסר
                    </button>
                  </div>
                  <button 
                    onClick={() => addGroup(cat)}
                    className="flex items-center gap-1 text-xs font-bold text-luxury-blue hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    הוסף קבוצה ל{cat}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {whatsappGroups.filter(g => g.category === cat).map(group => (
                    <div key={group.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            group.type === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {group.type === 'male' ? 'קבוצת בנים (לפרסום בנות)' : 'קבוצת בנות (לפרסום בנים)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => saveGroup(group)}
                            className="p-2 text-luxury-blue hover:bg-blue-50 rounded-lg transition-all"
                            title="שמור קבוצה זו"
                          >
                            <Save size={18} />
                          </button>
                          <button 
                            onClick={() => deleteGroup(group.id)}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                            title="מחק קבוצה"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">שם הקבוצה</label>
                          <input 
                            type="text" 
                            className="input-field text-sm" 
                            value={group.name} 
                            onChange={(e) => updateGroup(group.id, 'name', e.target.value)} 
                            placeholder="שם הקבוצה..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-secondary uppercase flex items-center gap-2">
                            Whapi Chat ID (למשל 123456789@g.us)
                            {group.whapi_id && (
                              group.whapi_id.includes('@') ? (
                                <span className="flex items-center gap-0.5 text-green-600 text-[8px]">
                                  <CheckCircle size={10} />
                                  תקין
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-red-500 text-[8px]">
                                  <XCircle size={10} />
                                  לא תקין
                                </span>
                              )
                            )}
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="input-field text-sm font-mono flex-1" 
                              value={group.whapi_id || ''} 
                              onChange={(e) => updateGroup(group.id, 'whapi_id', e.target.value)} 
                              placeholder="הזן מזהה צ'אט מ-Whapi..."
                            />
                            <button
                              onClick={() => setTestGroup(group)}
                              disabled={!group.whapi_id}
                              className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-1 text-xs font-bold"
                              title="בדיקת חיבור וצ'אט חי"
                            >
                              <Play size={14} />
                              בדיקה
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">קטגוריה</label>
                          <select 
                            className="input-field text-sm font-bold"
                            value={group.category}
                            onChange={(e) => updateGroup(group.id, 'category', e.target.value)}
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">סוג</label>
                          <select 
                            className="input-field text-sm font-bold"
                            value={group.type}
                            onChange={(e) => updateGroup(group.id, 'type', e.target.value)}
                          >
                            <option value="male">קבוצת בנים (לפרסום בנות)</option>
                            <option value="female">קבוצת בנות (לפרסום בנים)</option>
                          </select>
                        </div>
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">קישור לקבוצה</label>
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              className="input-field text-sm" 
                              value={group.link} 
                              onChange={(e) => updateGroup(group.id, 'link', e.target.value)} 
                              placeholder="הזן קישור לקבוצה..."
                            />
                            {group.link && (
                              <div className="flex items-center gap-3 px-3 py-2 bg-green-50 rounded-xl border border-green-100">
                                <span className="text-xs font-bold text-green-700">קיים קישור לקבוצה:</span>
                                <a 
                                  href={group.link} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-xs font-bold text-luxury-blue hover:underline truncate flex-1"
                                >
                                  {group.name}
                                </a>
                                <span className="text-[10px] font-bold text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-200">פעיל</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div id="section-opening" className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 scroll-mt-20">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary font-bold uppercase tracking-wider">
                הודעת פתיחה יומית לקבוצה
              </p>
              <button 
                onClick={() => {}}
                className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded-lg cursor-not-allowed"
              >
                <Anchor size={12} />
                סנכרון הוסר
              </button>
            </div>
            <p className="text-sm text-text-secondary font-medium">
              הודעה זו תישלח פעם אחת ביום לפני תחילת פרסום הכרטיסים כדי להכין את חברי הקבוצה.
            </p>
            <textarea
              className="input-field min-h-[100px] font-sans text-lg leading-relaxed shadow-inner"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="בוקר טוב לכולם! מיד נתחיל בפרסום כרטיסים חדשים..."
            />
          </div>

          <div id="section-template" className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 scroll-mt-20">
            <p className="text-sm text-text-secondary font-bold uppercase tracking-wider">
              תבנית כרטיס (הודעה קבועה)
            </p>
            <p className="text-sm text-text-secondary font-medium">
              הודעה זו תופיע בראש כל כרטיס שנשלח ל-WhatsApp. מומלץ לכלול את שם המערכת ומסר קצר.
            </p>
            <textarea
              className="input-field min-h-[180px] font-sans text-lg leading-relaxed shadow-inner"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="לדוגמה: כרטיס חדש במערכת השידוכים של החצי השני..."
            />
          </div>
        </div>

        {/* Google Login Section */}
        <div id="section-google" className="space-y-6 pt-6 border-t border-slate-100 scroll-mt-20">
          <div className="flex items-center gap-3 text-soft-purple">
            <div className="p-3 bg-purple-50 rounded-2xl shadow-sm">
              <Globe size={24} />
            </div>
            <h2 className="font-extrabold text-2xl tracking-tight">התחברות באמצעות גוגל</h2>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <p className="font-bold text-text-main">אפשר התחברות עם גוגל למנהלים</p>
              <p className="text-sm text-text-secondary font-medium">כאשר אפשרות זו פעילה, מנהלים יוכלו להתחבר למערכת באמצעות חשבון הגוגל שלהם.</p>
            </div>
            <button 
              onClick={() => setGoogleLoginEnabled(!googleLoginEnabled)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${googleLoginEnabled ? 'bg-luxury-blue' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${googleLoginEnabled ? '-translate-x-8' : '-translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-10 py-4 text-lg font-bold shadow-lg"
          >
            <Save size={22} />
            {saving ? 'שומר הגדרות...' : 'שמור הגדרות מערכת'}
          </button>
        </div>
      </div>

        {/* Advanced Actions Section */}
        <div id="section-advanced" className="card p-8 bg-white space-y-8 shadow-sm border border-slate-100 scroll-mt-20">
          <div className="flex items-center gap-3 text-luxury-blue">
            <div className="p-3 bg-blue-50 rounded-2xl shadow-sm">
              <Database size={24} />
            </div>
            <h2 className="font-extrabold text-2xl tracking-tight">פעולות מתקדמות</h2>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-text-main">סנכרון תמונות חיצוניות</h3>
                <p className="text-text-secondary font-medium text-sm mt-1 max-w-xl">
                  מוריד תמונות מקישורים חיצוניים (כמו Airtable) ושומר אותן בשרת המערכת באופן קבוע. פעולה זו מונעת מצב שבו תמונות נעלמות כאשר הקישור החיצוני פג תוקף.
                </p>
              </div>
              <button 
                onClick={() => setShowImageSync(true)}
                className="px-6 py-3 bg-white border-2 border-luxury-blue text-luxury-blue hover:bg-blue-50 rounded-xl font-bold transition-all shadow-sm whitespace-nowrap"
              >
                פתח מרכז סנכרון
              </button>
            </div>
          </div>

          {user?.role === 'super_admin' || user?.role === 'association_manager' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Full System Reset */}
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-3">
                <h3 className="font-black text-red-700 flex items-center gap-2">
                  <Trash2 size={20} /> ניקוי יסודי (Deep Force Clear)
                </h3>
                <p className="text-xs text-red-600/80">מוחק את כל הנתונים במערכת: מנהלים, קבוצות וואטסאפ, לידים, כרטיסי משודכים, התאמות, היסטוריית פרסומים, מעקב פעולות והודעות פנימיות.</p>
                <p className="text-xs text-amber-600 font-bold">⚠️ שים לב: מנהל העמותה (מלאכי) הוא היחיד שלא יימחק.</p>
                <button 
                  onClick={() => setResetModalConfig({
                    isOpen: true,
                    title: 'ניקוי יסודי (Deep Force Clear)',
                    message: 'אזהרה: פעולה זו תמחק את כל הנתונים במערכת כולל מנהלים וקבוצות (למעט מלאכי). האם אתה בטוח? פעולה זו אינה ניתנת לביטול.',
                    color: 'red',
                    onConfirm: async () => {
                      await dataService.factoryReset();
                      toast.success('המערכת נוקתה לחלוטין (Deep Force Clear)');
                      await refreshUser();
                    }
                  })} 
                  className="w-full py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  בצע ניקוי יסודי
                </button>
              </div>

              {/* Option 2: History Reset (with Candidates) */}
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
                <h3 className="font-black text-orange-700 flex items-center gap-2">
                  <Trash2 size={20} /> איפוס היסטוריה (כולל כרטיסים)
                </h3>
                <p className="text-xs text-orange-600/80">מוחק כרטיסי משודכים, היסטוריית פרסומים ומעקב פעולות. לא מוחק קבוצות וואטסאפ.</p>
                <button 
                  onClick={() => setResetModalConfig({
                    isOpen: true,
                    title: 'איפוס היסטוריה וכרטיסים',
                    message: 'האם אתה בטוח שברצונך למחוק את כל כרטיסי המשודכים וכל ההיסטוריה? פעולה זו אינה ניתנת לביטול.',
                    color: 'orange',
                    onConfirm: async () => {
                      await dataService.clearCandidates();
                      await dataService.clearPublishLogs();
                      await dataService.clearActivityLogs();
                      toast.success('היסטוריה וכרטיסים נמחקו');
                    }
                  })} 
                  className="w-full py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-sm"
                >
                  איפוס היסטוריה וכרטיסים
                </button>
              </div>

              {/* Option 3: WhatsApp Groups Only */}
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
                <h3 className="font-black text-blue-700 flex items-center gap-2">
                  <Trash2 size={20} /> מחיקת קבוצות וואטסאפ בלבד
                </h3>
                <p className="text-xs text-blue-600/80">מוחק רק את הגדרות קבוצות הוואטסאפ והקישורים שהוזנו למערכת.</p>
                <button 
                  onClick={() => setResetModalConfig({
                    isOpen: true,
                    title: 'מחיקת קבוצות וואטסאפ',
                    message: 'האם אתה בטוח שברצונך למחוק את כל קבוצות הוואטסאפ? פעולה זו אינה ניתנת לביטול.',
                    color: 'blue',
                    onConfirm: async () => {
                      await dataService.clearWhatsAppGroups();
                      toast.success('קבוצות וואטסאפ נמחקו');
                    }
                  })} 
                  className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  מחק קבוצות בלבד
                </button>
              </div>

              {/* Option 4: History Only (WITHOUT Candidates) */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                <h3 className="font-black text-amber-700 flex items-center gap-2">
                  <Trash2 size={20} /> איפוס היסטוריה (ללא מחיקת כרטיסים)
                </h3>
                <p className="text-xs text-amber-600/80">מוחק מעקב פרסומים ומעקב פעולות בלבד. כרטיסי המשודכים והמנהלים יישארו.</p>
                <button 
                  onClick={() => setResetModalConfig({
                    isOpen: true,
                    title: 'איפוס היסטוריה בלבד',
                    message: 'האם אתה בטוח שברצונך למחוק את היסטוריית הפרסומים ומעקב הפעולות? (הכרטיסים לא יימחקו). פעולה זו אינה ניתנת לביטול.',
                    color: 'amber',
                    onConfirm: async () => {
                      await dataService.clearPublishLogs();
                      await dataService.clearActivityLogs();
                      toast.success('היסטוריית פעילות נמחקה');
                    }
                  })} 
                  className="w-full py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-sm"
                >
                  איפוס היסטוריה בלבד
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-100 rounded-2xl text-center text-slate-500 font-bold">
              אין לך הרשאות לבצע איפוס נתונים.
            </div>
          )}
        </div>

      {/* Generic Reset Confirmation Modal */}
      <AnimatePresence>
        {resetModalConfig.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6 text-center"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                resetModalConfig.color === 'red' ? 'bg-red-50 text-red-500' :
                resetModalConfig.color === 'orange' ? 'bg-orange-50 text-orange-500' :
                resetModalConfig.color === 'blue' ? 'bg-blue-50 text-blue-500' :
                'bg-amber-50 text-amber-500'
              }`}>
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">{resetModalConfig.title}</h3>
                <p className="text-slate-500 font-medium">{resetModalConfig.message}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setResetModalConfig(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={async () => {
                    setResetting(true);
                    try {
                      await resetModalConfig.onConfirm();
                      setResetModalConfig(prev => ({ ...prev, isOpen: false }));
                    } catch (err) {
                      toast.error('שגיאה בביצוע הפעולה');
                    } finally {
                      setResetting(false);
                    }
                  }}
                  disabled={resetting}
                  className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${
                    resetModalConfig.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                    resetModalConfig.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
                    resetModalConfig.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                    'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {resetting ? 'מבצע...' : 'אשר וביצוע'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset History Confirmation Modal */}
      <AnimatePresence>
        {showResetHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">איפוס היסטוריה</h3>
                <p className="text-slate-500 font-medium">האם אתה בטוח שברצונך למחוק את כל הכרטיסים וההיסטוריה? פעולה זו תנקה את המערכת מכל המשודכים.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowResetHistoryModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={async () => {
                    setResetting(true);
                    try {
                      await dataService.resetHistory();
                      toast.success('המערכת אופסה בהצלחה');
                      setShowResetHistoryModal(false);
                      await refreshUser();
                    } catch (err) {
                      toast.error('שגיאה באיפוס');
                    } finally {
                      setResetting(false);
                    }
                  }}
                  disabled={resetting}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg hover:bg-amber-600 transition-all"
                >
                  {resetting ? 'מאפס...' : 'אפס עכשיו'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



        {isAIStudio() && (
          <div className="card p-8 bg-white border-2 border-luxury-blue shadow-lg space-y-4">
            <h3 className="text-xl font-extrabold text-luxury-blue">אישור שינויים (Approve Changes)</h3>
            <p className="text-text-secondary font-medium">אשר את כל השינויים שבוצעו ב-AI Studio כדי שיופיעו באתר ב-Vercel.</p>
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  const result = await dataService.approveChanges();
                  if (result.success) {
                    toast.success(result.message);
                  } else {
                    toast.error(result.message);
                  }
                } catch (err) {
                  toast.error('שגיאה באישור השינויים');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-6 py-3 text-lg font-bold shadow-lg"
            >
              <CheckCircle size={20} className={saving ? 'animate-spin' : ''} />
              {saving ? 'מאשר...' : 'אשר שינויים (Approve Changes)'}
            </button>
          </div>
        )}

      <div className="card p-8 bg-white border-dashed border-2 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center">
          <Heart size={32} fill="currentColor" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-text-main tracking-tight">מיתוג המערכת</h3>
          <p className="text-text-secondary font-medium mt-1">
            המערכת ממותגת כ-"{APP_NAME}". כל ההודעות והממשקים מותאמים למותג זה.
          </p>
        </div>
      </div>

      {/* Image Sync Dashboard Modal */}
      <AnimatePresence>
        {showImageSync && (
          <ImageSyncDashboard onClose={() => setShowImageSync(false)} />
        )}
      </AnimatePresence>

      {/* Test Chat Modal */}
      {testGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[80vh] relative">
            <WhatsAppWidget 
              groupId={testGroup.whapi_id || testGroup.name}
              groupName={testGroup.name}
              senderName={user?.full_name || "מנהל ראשי"}
              onClose={() => setTestGroup(null)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">מחיקת קבוצה</h3>
                <p className="text-slate-500 font-medium">האם אתה בטוח שברצונך למחוק קבוצה זו? פעולה זו אינה הפיכה.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all"
                >
                  מחק קבוצה
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Limit Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">מגבלת קבוצות</h3>
                <p className="text-slate-500 font-medium">
                  מוגבל לשני קבוצות לכל קטגוריה:
                  <br />
                  קבוצה אחת של בנים וקבוצה אחת של בנות.
                </p>
              </div>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full py-3 bg-luxury-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
              >
                הבנתי
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
