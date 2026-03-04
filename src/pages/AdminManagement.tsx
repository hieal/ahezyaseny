import React, { useState, useEffect, useRef } from 'react';
import { User, WhatsAppGroup } from '../types';
import { toast } from 'react-hot-toast';
import { UserPlus, Trash2, Edit2, Shield, ShieldAlert, CheckCircle, XCircle, UserCheck, Search, Filter, MessageSquare, FileUp, Download, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME, CATEGORIES } from '../constants';

export default function AdminManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [expandedGroupsUserId, setExpandedGroupsUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvCategory, setCsvCategory] = useState('');
  const [importing, setImporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedAdmins, setScannedAdmins] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'admin',
    status: 'active',
    category: '',
    gender: '' as 'male' | 'female' | '',
    phone: '',
    google_login_allowed: 'true',
    avatar_url: ''
  });

  const fetchUsers = async () => {
    try {
      const [usersRes, groupsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/whatsapp/groups')
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (groupsRes.ok) setWhatsappGroups(await groupsRes.json());
    } catch (err) {
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success(editingUser ? 'המנהל עודכן' : 'מנהל חדש נוצר');
        setShowModal(false);
        setEditingUser(null);
        setFormData({ name: '', username: '', email: '', password: '', role: 'admin', status: 'active', category: '', gender: '', phone: '', google_login_allowed: 'true', avatar_url: '' });
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'שגיאה בשמירה');
      }
    } catch (err) {
      toast.error('שגיאה בחיבור לשרת');
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return toast.error('אנא בחר קובץ CSV');
    if (!csvCategory) return toast.error('אנא בחר קבוצה לשיוך המנהלים');

    setIsScanning(true);
    setScanProgress(0);
    setScannedAdmins([]);

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const totalLines = lines.length - 1;
        const admins: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = line.split(',').map(v => v.trim());
          const admin: any = {
            category: csvCategory,
            password: '12345678',
            is_from_file: 1,
            role: 'admin',
            status: 'active',
            google_login_allowed: 'true'
          };
          headers.forEach((header, j) => {
            const val = values[j];
            if (!val) return;

            if (header === 'שם' || header === 'name' || header.includes('שם וטלפון')) {
              if (val.includes(' - ')) {
                const parts = val.split(' - ');
                admin.phone = parts[0].trim();
                admin.name = parts[1].trim();
                admin.username = parts[0].trim();
              } else {
                admin.name = val;
              }
            }
            if (header === 'שם משתמש' || header === 'username') admin.username = val;
            if (header === 'אימייל' || header === 'email' || header.includes('אימייל')) admin.email = val;
            if (header === 'טלפון' || header === 'phone') admin.phone = val;
            if (header === 'עיר' || header.includes('עיר')) admin.city = val;
            if (header === 'מין' || header === 'gender' || header.includes('מין')) admin.gender = val === 'בת' || val === 'נקבה' || val.toLowerCase() === 'female' ? 'female' : 'male';
            if (header === 'תמונה' || header === 'avatar' || header === 'image' || header.includes('תמונה')) {
              const match = val.match(/\((https?:\/\/[^\)]+)\)/);
              if (match) {
                admin.avatar_url = match[1];
              } else if (val.trim().startsWith('http')) {
                admin.avatar_url = val.trim();
              }
            }
          });
          if (!admin.username && admin.phone) admin.username = admin.phone;
          admins.push(admin);

          // Simulate scan progress
          if (i % 5 === 0 || i === totalLines) {
            setScanProgress(Math.round((i / totalLines) * 100));
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }

        setScannedAdmins(admins);
        setIsScanning(false);
        toast.success(`סריקה הושלמה! נמצאו ${admins.length} מנהלים.`);
      } catch (err) {
        setIsScanning(false);
        toast.error('שגיאה בסריקת הקובץ');
      }
    };

    reader.readAsText(csvFile);
  };

  const processImport = async () => {
    if (scannedAdmins.length === 0) return;
    
    setImporting(true);
    const processingToast = toast.loading(`מייבא ${scannedAdmins.length} מנהלים...`);
    let successCount = 0;
    
    for (const admin of scannedAdmins) {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(admin),
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error('Failed to import admin', admin);
      }
    }

    toast.dismiss(processingToast);
    setImporting(false);
    setShowCsvModal(false);
    setCsvFile(null);
    setScannedAdmins([]);
    fetchUsers();
    toast.success(`${successCount} מנהלים יובאו בהצלחה למערכת!`);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המנהל ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('המנהל נמחק');
        fetchUsers();
      }
    } catch (err) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      category: user.category || '',
      gender: user.gender || '',
      phone: user.phone || '',
      google_login_allowed: user.google_login_allowed || 'true',
      avatar_url: user.avatar_url || ''
    });
    setShowModal(true);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('התמונה גדולה מדי (מקסימום 2MB)');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, avatar_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="p-8 text-center font-bold text-luxury-blue">טוען מנהלים...</div>;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.username.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || u.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-text-main tracking-tight">ניהול מנהלים</h1>
          <p className="text-text-secondary mt-1 font-medium">ניהול הרשאות וגישה למערכת {APP_NAME}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowCsvModal(true)}
            className="btn-secondary flex items-center gap-2 px-6 py-3 shadow-md"
          >
            <FileUp size={20} />
            ייבוא מ-CSV
          </button>
          <button 
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', username: '', email: '', password: '', role: 'admin', status: 'active', category: '', gender: '', phone: '', google_login_allowed: 'true', avatar_url: '' });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg"
          >
            <UserPlus size={20} />
            מנהל חדש
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input 
            type="text" 
            placeholder="חיפוש לפי שם או שם משתמש..." 
            className="input-field pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <select 
            className="input-field pr-10 font-bold"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">כל הקבוצות</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden border-none shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מנהל</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">נוצר ע"י</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מקור</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מין</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">טלפון</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">שם משתמש</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">אימייל</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">קבוצה</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">גוגל</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">תפקיד</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">סטטוס</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img 
                          src={u.avatar_url} 
                          alt={u.name} 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 ${u.avatar_url ? 'hidden' : ''}`}>
                        <UserCheck size={20} />
                      </div>
                      <span className="font-bold text-text-main">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-medium text-text-secondary">{u.creator_name || 'מערכת'}</span>
                  </td>
                  <td className="px-6 py-5">
                    {u.is_from_file ? (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100">קובץ</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-md border border-slate-100">ידני</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-text-secondary font-medium">
                    {u.gender === 'male' ? 'בן' : u.gender === 'female' ? 'בת' : '---'}
                  </td>
                  <td className="px-6 py-5 text-text-secondary font-medium">
                    <div className="flex items-center gap-2">
                      {u.phone || '---'}
                      {u.phone && (
                        <a 
                          href={`https://wa.me/${u.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                          title="שלח הודעת וואטסאפ"
                        >
                          <MessageSquare size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-text-main font-medium">{u.username}</td>
                  <td className="px-6 py-5 text-text-secondary font-medium">{u.email}</td>
                  <td className="px-6 py-5">
                    <div className="relative">
                      <button 
                        onClick={() => setExpandedGroupsUserId(expandedGroupsUserId === u.id ? null : u.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                          expandedGroupsUserId === u.id 
                            ? 'bg-luxury-blue text-white border-luxury-blue shadow-md' 
                            : 'bg-white text-text-main border-slate-200 hover:border-luxury-blue'
                        }`}
                      >
                        <span className="text-xs font-bold">{u.category || 'ללא קטגוריה'}</span>
                        <ChevronDown size={14} className={`transition-transform ${expandedGroupsUserId === u.id ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {expandedGroupsUserId === u.id && u.category && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute z-50 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 space-y-3 right-0"
                          >
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">קבוצות משוייכות:</p>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                              {whatsappGroups
                                .filter(g => g.category === u.category)
                                .map(group => (
                                  <div key={group.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-luxury-blue transition-colors">
                                    <span className="text-xs font-bold text-text-main">{group.name}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${group.type === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                      {group.type === 'male' ? 'בנים' : 'בנות'}
                                    </span>
                                  </div>
                                ))
                              }
                              {whatsappGroups.filter(g => g.category === u.category).length === 0 && (
                                <p className="text-xs text-slate-400 italic py-2">לא נמצאו קבוצות בקטגוריה זו</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      u.google_login_allowed === 'true' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.google_login_allowed === 'true' ? 'מאופשר' : 'חסום'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role === 'super_admin' ? <ShieldAlert size={14} /> : <Shield size={14} />}
                      {u.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {u.status === 'active' ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-left">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(u)} className="p-2.5 text-luxury-blue hover:bg-blue-50 rounded-xl transition-all">
                        <Edit2 size={18} />
                      </button>
                      {u.role !== 'super_admin' && (
                        <button onClick={() => handleDelete(u)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {showCsvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-md p-8 space-y-6 shadow-2xl border-none"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-text-main">ייבוא מנהלים מקובץ</h2>
                <button onClick={() => setShowCsvModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCsvUpload} className="space-y-6">
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center gap-4">
                  <FileUp size={40} className="text-slate-300" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-text-main">בחר קובץ CSV</p>
                    <p className="text-xs text-text-secondary mt-1">עמודות נדרשות: שם, שם משתמש, אימייל, טלפון, מין</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => {
                      setCsvFile(e.target.files?.[0] || null);
                      setScannedAdmins([]);
                    }}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-luxury-blue file:text-white hover:file:bg-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שיוך לקבוצה</label>
                  <select 
                    required
                    className="input-field font-bold" 
                    value={csvCategory} 
                    onChange={(e) => setCsvCategory(e.target.value)}
                  >
                    <option value="">בחר קבוצה...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {(isScanning || scannedAdmins.length > 0) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-text-secondary uppercase tracking-wider">
                      <span>{isScanning ? 'סורק קובץ...' : 'סריקה הושלמה'}</span>
                      <span>{isScanning ? `${scanProgress}%` : `${scannedAdmins.length} מנהלים נמצאו`}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${isScanning ? scanProgress : 100}%` }}
                        className={`h-full ${isScanning ? 'bg-luxury-blue' : 'bg-green-500'}`}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-700 font-bold leading-relaxed">
                    * סיסמת ברירת המחדל לכל המנהלים תהיה: <span className="underline">12345678</span>
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowCsvModal(false)} className="btn-secondary px-6 py-3 font-bold">ביטול</button>
                  {scannedAdmins.length > 0 ? (
                    <button 
                      type="button"
                      onClick={processImport}
                      disabled={importing}
                      className="btn-primary bg-green-600 hover:bg-green-700 px-8 py-3 font-bold shadow-md flex items-center justify-center gap-2"
                    >
                      {importing ? 'מייבא...' : `הוסף ${scannedAdmins.length} מנהלים`}
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      disabled={isScanning || !csvFile}
                      className="btn-primary px-8 py-3 font-bold shadow-md flex items-center justify-center gap-2"
                    >
                      {isScanning ? 'סורק...' : 'סרוק קובץ'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Admin Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-md shadow-2xl border-none flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-3xl font-extrabold text-text-main tracking-tight">{editingUser ? 'עריכת מנהל' : 'מנהל חדש'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex justify-center mb-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {formData.avatar_url ? (
                          <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck size={32} className="text-slate-300" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
                        <Edit2 size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שם מלא *</label>
                    <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שם משתמש *</label>
                    <input type="text" required className="input-field" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">אימייל (גוגל) *</label>
                    <input type="email" required className="input-field" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">
                      סיסמה {editingUser && '(השאר ריק כדי לא לשנות)'}
                    </label>
                    <input type="password" required={!editingUser} className="input-field" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שיוך לקבוצת גיל / פרויקט</label>
                    <select className="input-field font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                      <option value="">ללא שיוך</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">מין המנהל/ת</label>
                    <select className="input-field font-bold" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as 'male' | 'female'})}>
                      <option value="">בחר מין...</option>
                      <option value="male">בן</option>
                      <option value="female">בת</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">מספר טלפון</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      placeholder="לדוגמה: 0501234567"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-text-main">התחברות עם גוגל</p>
                      <p className="text-[10px] text-text-secondary font-medium">אפשר למנהל זה להתחבר באמצעות חשבון גוגל</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, google_login_allowed: formData.google_login_allowed === 'true' ? 'false' : 'true'})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.google_login_allowed === 'true' ? 'bg-luxury-blue' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.google_login_allowed === 'true' ? '-translate-x-6' : '-translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">תפקיד</label>
                      <select className="input-field font-bold" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                        <option value="admin">מנהל רגיל</option>
                        <option value="super_admin">מנהל ראשי</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">סטטוס</label>
                      <select className="input-field font-bold" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                        <option value="active">פעיל</option>
                        <option value="inactive">לא פעיל</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6 pb-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-6 py-3 font-bold">ביטול</button>
                    <button type="submit" className="btn-primary px-8 py-3 font-bold shadow-md">שמור מנהל</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
