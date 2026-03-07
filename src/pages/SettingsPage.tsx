import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Settings as SettingsIcon, Save, MessageSquare, Heart, Globe, ShieldCheck, Plus, Trash2, CheckCircle, XCircle, Play } from 'lucide-react';
import { APP_NAME, CATEGORIES } from '../constants';
import { WhatsAppWidget } from '../components/WhatsAppWidget';

import { WhatsAppGroup } from '../types';

export default function SettingsPage() {
  const [template, setTemplate] = useState('');
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES);
  const [initialMessage, setInitialMessage] = useState('');
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testGroup, setTestGroup] = useState<WhatsAppGroup | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setTemplate(data.whatsapp_template || '');
        setInitialMessage(data.whatsapp_initial_message || '');
        setGoogleLoginEnabled(data.google_login_enabled === 'true');
      });

    fetch('/api/whatsapp/groups')
      .then(res => res.json())
      .then(data => setWhatsappGroups(data));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: 'whatsapp_template', value: template },
        { key: 'whatsapp_initial_message', value: initialMessage },
        { key: 'google_login_enabled', value: googleLoginEnabled.toString() }
      ];

      for (const s of settings) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s),
        });
      }

      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (err) {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const addGroup = async () => {
    const newGroup = {
      name: 'קבוצה חדשה',
      link: '',
      whapi_id: '',
      category: CATEGORIES[0],
      type: 'male' as const
    };
    
    try {
      const res = await fetch('/api/whatsapp/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappGroups(prev => [...prev, { ...newGroup, id: data.id, last_initial_sent: null }]);
        toast.success('קבוצה נוספה');
      }
    } catch (err) {
      toast.error('שגיאה בהוספת קבוצה');
    }
  };

  const deleteGroup = async (id: number) => {
    if (!confirm('האם למחוק קבוצה זו?')) return;
    try {
      const res = await fetch(`/api/whatsapp/groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWhatsappGroups(prev => prev.filter(g => g.id !== id));
        toast.success('קבוצה נמחקה');
      }
    } catch (err) {
      toast.error('שגיאה במחיקה');
    }
  };

  const saveGroup = async (group: WhatsAppGroup) => {
    try {
      const res = await fetch(`/api/whatsapp/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      if (res.ok) {
        toast.success(`הקבוצה ${group.name} נשמרה`);
      }
    } catch (err) {
      toast.error('שגיאה בשמירה');
    }
  };

  const updateGroup = (id: number, field: keyof WhatsAppGroup, value: string) => {
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

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold text-text-main tracking-tight">הגדרות מערכת</h1>
        <p className="text-text-secondary mt-1 font-medium">ניהול תבניות והגדרות כלליות עבור {APP_NAME}</p>
      </div>

      <div className="card p-10 space-y-10 shadow-xl border-none">
        {/* WhatsApp Groups Management Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-luxury-blue">
              <div className="p-3 bg-blue-50 rounded-2xl shadow-sm">
                <MessageSquare size={24} />
              </div>
              <h2 className="font-extrabold text-2xl tracking-tight">ניהול קבוצות WhatsApp</h2>
            </div>
            <button 
              onClick={addGroup}
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
              <div key={cat} className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-extrabold text-lg text-luxury-blue border-b border-slate-200 pb-2 mb-4">{cat}</h3>
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

          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm text-text-secondary font-bold uppercase tracking-wider">
              הודעת פתיחה יומית לקבוצה
            </p>
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

          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
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
        <div className="space-y-6 pt-6 border-t border-slate-100">
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

      {/* Test Chat Modal */}
      {testGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[80vh] relative">
            <WhatsAppWidget 
              groupId={testGroup.whapi_id || testGroup.name}
              groupName={testGroup.name}
              senderName="מנהל ראשי"
              onClose={() => setTestGroup(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
