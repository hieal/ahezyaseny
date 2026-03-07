import React, { useState, useEffect, useRef } from 'react';
import { User, WhatsAppGroup } from '../types';
import { toast } from 'react-hot-toast';
import { UserPlus, Trash2, Edit2, Shield, ShieldAlert, CheckCircle, XCircle, UserCheck, Search, Filter, MessageSquare, FileUp, Download, X, ChevronDown, Phone, ExternalLink, Heart, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME, CATEGORIES } from '../constants';
import { useAuth } from '../contexts/AuthContext';

import { dataService } from '../services/dataService';

export default function AdminManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [expandedGroupsUserId, setExpandedGroupsUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [genderModalUser, setGenderModalUser] = useState<User | null>(null);
  const [phoneModalUser, setPhoneModalUser] = useState<User | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState<number | null>(null);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [currentCsvIndex, setCurrentCsvIndex] = useState(0);
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
    secondary_category: '',
    gender: '' as 'male' | 'female' | '',
    phone: '',
    google_login_allowed: 'true',
    avatar_url: '',
    is_shaham_manager: 0
  });

  const fetchUsers = async () => {
    try {
      const [usersData, groupsData] = await Promise.all([
        dataService.getUsers(),
        dataService.getWhatsAppGroups()
      ]);
      
      setUsers(usersData);
      setWhatsappGroups(groupsData);
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
      if (editingUser && editingUser.id) {
        await dataService.updateUser(editingUser.id, formData);
        toast.success('המנהל עודכן');
      } else {
        await dataService.createUser(formData);
        toast.success('מנהל חדש נוצר');
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({ 
        name: '', 
        username: '', 
        email: '', 
        password: '', 
        role: 'admin', 
        status: 'active', 
        category: '', 
        secondary_category: '',
        gender: '', 
        phone: '', 
        google_login_allowed: 'true', 
        avatar_url: '',
        is_shaham_manager: 0
      });
      fetchUsers();
    } catch (err) {
      toast.error('שגיאה בשמירה');
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
        await dataService.createUser(admin);
        successCount++;
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
      await dataService.deleteUser(user.id);
      toast.success('המנהל נמחק');
      fetchUsers();
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
      secondary_category: user.secondary_category || '',
      gender: user.gender || '',
      phone: user.phone || '',
      google_login_allowed: user.google_login_allowed || 'true',
      avatar_url: user.avatar_url || '',
      is_shaham_manager: user.is_shaham_manager || 0
    });
    setShowModal(true);
  };

  const handleApprove = async (userId: string) => {
    try {
      await dataService.updateUser(userId, { is_approved: 1 });
      toast.success('המנהל אושר בהצלחה');
      fetchUsers();
    } catch (err) {
      toast.error('שגיאה באישור המנהל');
    }
  };

  const getCategoryColor = (cat: string | null) => {
    if (!cat) return 'bg-slate-100 text-slate-600';
    const colors: Record<string, string> = {
      '18-22': 'bg-green-100 text-green-700 border-green-200',
      '23-27': 'bg-blue-100 text-blue-700 border-blue-200',
      '28-32': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      '33-40': 'bg-purple-100 text-purple-700 border-purple-200',
      '41-65': 'bg-pink-100 text-pink-700 border-pink-200',
      'פרויקט שח"ם': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'פרויקט קומי אורי': 'bg-amber-100 text-amber-700 border-amber-200',
      'פרויקט אור': 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return colors[cat] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getRowColor = (user: User) => {
    if (user.role === 'super_admin') return 'bg-yellow-50/50 border-r-4 border-r-yellow-400 shadow-[inset_0_0_10px_rgba(250,204,21,0.1)]';
    if (user.is_shaham_manager) return 'bg-purple-50/30 border-r-4 border-r-purple-400';
    if (!user.category) return '';
    const colors: Record<string, string> = {
      '18-22': 'bg-green-50/30 border-r-4 border-r-green-400',
      '23-27': 'bg-blue-50/30 border-r-4 border-r-blue-400',
      '28-32': 'bg-indigo-50/30 border-r-4 border-r-indigo-400',
      '33-40': 'bg-purple-50/30 border-r-4 border-r-purple-400',
      '41-65': 'bg-pink-50/30 border-r-4 border-r-pink-400',
      'פרויקט שח"ם': 'bg-emerald-50/30 border-r-4 border-r-emerald-400',
      'פרויקט קומי אורי': 'bg-amber-50/30 border-r-4 border-r-amber-400',
      'פרויקט אור': 'bg-orange-50/30 border-r-4 border-r-orange-400'
    };
    return colors[user.category] || '';
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

  const handleUpdateGender = async (user: User, gender: 'male' | 'female') => {
    try {
      await dataService.updateUser(user.id, { gender });
      toast.success('מין עודכן בהצלחה');
      setGenderModalUser(null);
      fetchUsers();
    } catch (e) {
      toast.error('שגיאה בעדכון המין');
    }
  };

  const handleUpdatePhone = async () => {
    if (!phoneModalUser) return;
    try {
      await dataService.updateUser(phoneModalUser.id, { 
        phone: tempPhone,
        username: tempPhone // Update username to match phone as requested
      });
      toast.success('מספר טלפון ושם משתמש עודכנו');
      setPhoneModalUser(null);
      fetchUsers();
    } catch (e) {
      toast.error('שגיאה בעדכון');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.username.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory.length === 0 || 
                            (u.category && filterCategory.includes(u.category)) ||
                            (u.secondary_category && filterCategory.includes(u.secondary_category));
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (a.role === 'super_admin') return -1;
    if (b.role === 'super_admin') return 1;
    return 0;
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
              setFormData({ 
                name: '', 
                username: '', 
                email: '', 
                password: '', 
                role: 'admin', 
                status: 'active', 
                category: '', 
                secondary_category: '',
                gender: '', 
                phone: '', 
                google_login_allowed: 'true', 
                avatar_url: '',
                is_shaham_manager: 0
              });
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
          <div className="flex flex-wrap gap-2 pr-10 min-h-[42px] items-center bg-white border border-slate-200 rounded-xl p-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setFilterCategory(prev => 
                    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                  );
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
                  filterCategory.includes(cat)
                    ? 'bg-luxury-blue text-white shadow-sm border-luxury-blue'
                    : `${getCategoryColor(cat)} opacity-70 hover:opacity-100`
                }`}
              >
                {cat}
              </button>
            ))}
            {filterCategory.length > 0 && (
              <button 
                onClick={() => setFilterCategory([])}
                className="text-[10px] font-bold text-red-500 hover:underline"
              >
                נקה הכל
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gender Selection Modal */}
      <AnimatePresence>
        {genderModalUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">שינוי מין מנהל</h3>
                <p className="text-slate-500 font-medium">בחר את המין עבור {genderModalUser.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleUpdateGender(genderModalUser, 'male')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    genderModalUser.gender === 'male' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <UserIcon size={32} />
                  <span className="font-bold">משודך (זכר)</span>
                </button>
                <button 
                  onClick={() => handleUpdateGender(genderModalUser, 'female')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    genderModalUser.gender === 'female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-100 hover:border-pink-200'
                  }`}
                >
                  <Heart size={32} />
                  <span className="font-bold">משודכת (נקבה)</span>
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setGenderModalUser(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phone Edit Modal */}
      <AnimatePresence>
        {phoneModalUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">עדכון מספר טלפון</h3>
                <p className="text-slate-500 font-medium">עדכון מספר הטלפון יעדכן גם את שם המשתמש של {phoneModalUser.name}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">מספר טלפון חדש</label>
                  <input 
                    type="text"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    className="input-field text-lg font-mono tracking-wider text-center"
                    placeholder="הכנס מספר טלפון..."
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPhoneModalUser(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={handleUpdatePhone}
                  className="flex-1 py-3 bg-luxury-blue text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-all"
                >
                  אישור ועדכון
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <span className="text-xs font-bold text-slate-500">מקרא צבעים:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-600">מנהל ראשי</span>
        </div>
        {CATEGORIES.map(cat => (
          <div key={cat} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full border ${getCategoryColor(cat).split(' ')[0]}`}></div>
            <span className="text-[10px] font-bold text-slate-600">{cat}</span>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden border-none shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מנהל</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">סיסמא</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">נוצר ע"י</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מקור</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מין</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">טלפון</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">שם משתמש</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">כניסה מייל כניסה גוגל</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">קבוצה</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">תפקיד</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">סטטוס</th>
                <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {filteredUsers.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${getRowColor(u)}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative">
                          {u.avatar_url ? (
                            <img 
                              src={u.avatar_url} 
                              alt={u.name} 
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-white shadow-sm ${u.avatar_url ? 'hidden' : ''}`}>
                            <UserCheck size={24} />
                          </div>
                          {u.role === 'super_admin' && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                              <ShieldAlert size={10} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {u.category || 'ללא קטגוריה'}
                          </span>
                          <span className="text-[8px] font-medium text-slate-400 uppercase">
                            {u.role === 'super_admin' ? 'מנהל ראשי' : 
                             u.role === 'team_leader' ? 'ראש צוות' :
                             u.role === 'viewer' ? 'צופה' : 'מנהל'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold ${u.role === 'super_admin' ? 'text-yellow-700' : 'text-text-main'}`}>{u.name}</span>
                        <span className="text-[10px] text-slate-400">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-slate-600">
                          {showPassword === u.id ? (u.password_plain || '******') : '******'}
                        </span>
                        {currentUser?.role === 'super_admin' && (
                          <button 
                            onClick={() => setShowPassword(showPassword === u.id ? null : u.id)}
                            className="p-1 text-slate-400 hover:text-luxury-blue transition-all"
                          >
                            {showPassword === u.id ? <X size={14} /> : <Search size={14} />}
                          </button>
                        )}
                      </div>
                      {u.password_updated_at && (
                        <span className="text-[9px] text-slate-400">הסיסמא שונתה לאחרונה ב-{new Date(u.password_updated_at).toLocaleDateString('he-IL')}</span>
                      )}
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
                    <button 
                      onClick={() => setGenderModalUser(u)}
                      className="hover:text-luxury-blue transition-colors underline decoration-dotted underline-offset-4"
                    >
                      {u.gender === 'male' ? 'בן' : u.gender === 'female' ? 'בת' : '---'}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-text-secondary font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setPhoneModalUser(u);
                          setTempPhone(u.phone || '');
                        }}
                        className="hover:text-luxury-blue transition-colors underline decoration-dotted underline-offset-4"
                      >
                        {u.phone || '---'}
                      </button>
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
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-main">{u.email}</span>
                      <span className="text-[10px] text-slate-400">גוגל: {u.google_login_allowed === 'true' ? 'מאושר' : 'חסום'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative group/nav">
                      <button 
                        onClick={() => setGenderModalUser(u)}
                        className="flex flex-col gap-1 cursor-pointer w-full"
                      >
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center border ${getCategoryColor(u.category)}`}>
                          {u.category || 'ללא שיוך'}
                        </div>
                        {u.secondary_category && (
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center border ${getCategoryColor(u.secondary_category)}`}>
                            {u.secondary_category}
                          </div>
                        )}
                      </button>
                      
                      {/* Group Navigation Menu */}
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-50 hidden group-hover/nav:block">
                        <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">קבוצות מנוהלות</p>
                        <div className="space-y-1">
                          {whatsappGroups.filter(g => g.category === u.category || g.category === u.secondary_category).map(g => (
                            <a 
                              key={g.id}
                              href={g.link}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${g.type === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
                                {g.name}
                              </div>
                              <ExternalLink size={12} className="text-slate-300" />
                            </a>
                          ))}
                          {whatsappGroups.filter(g => g.category === u.category || g.category === u.secondary_category).length === 0 && (
                            <p className="text-[10px] text-slate-400 p-2 italic">אין קבוצות משויכות</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 
                        u.role === 'team_leader' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'viewer' ? 'bg-slate-100 text-slate-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'super_admin' ? <ShieldAlert size={14} /> : <Shield size={14} />}
                        {u.role === 'super_admin' ? 'מנהל ראשי' : 
                         u.role === 'team_leader' ? 'ראש צוות' :
                         u.role === 'viewer' ? 'צופה' : 'מנהל'}
                      </span>
                      {u.is_shaham_manager === 1 && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 text-center shadow-sm">
                          קבוצת שחם בלבד
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {u.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                      {u.is_approved === 0 && (
                        <button 
                          onClick={() => handleApprove(u.id)}
                          className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 hover:bg-amber-100 transition-all"
                        >
                          אשר מנהל
                        </button>
                      )}
                    </div>
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
              className="card w-full max-w-2xl p-8 space-y-6 shadow-2xl border-none max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-text-main">ייבוא מנהלים מקבצים</h2>
                <button onClick={() => {
                  setShowCsvModal(false);
                  setCsvFiles([]);
                  setScannedAdmins([]);
                }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center gap-4">
                  <FileUp size={40} className="text-slate-300" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-text-main">בחר קבצי CSV (ניתן לבחור כמה)</p>
                    <p className="text-xs text-text-secondary mt-1">עמודות נדרשות: שם, שם משתמש, אימייל, טלפון, מין</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".csv" 
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setCsvFiles(files);
                      setScannedAdmins([]);
                    }}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-luxury-blue file:text-white hover:file:bg-blue-700"
                  />
                </div>

                {csvFiles.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-text-main border-b border-slate-100 pb-2">שיוך קבצים לקבוצות:</p>
                    {csvFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <select 
                          className="text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-luxury-blue"
                          onChange={(e) => {
                            const newFiles = [...csvFiles];
                            // We need a way to store the category per file. 
                            // I'll use a temporary state or just handle it in the scan.
                            (file as any).targetCategory = e.target.value;
                          }}
                        >
                          <option value="">בחר קבוצה...</option>
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {(isScanning || scannedAdmins.length > 0) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-text-secondary uppercase tracking-wider">
                      <span>{isScanning ? 'סורק קבצים...' : 'סריקה הושלמה'}</span>
                      <span>{isScanning ? `${scanProgress}%` : `${scannedAdmins.length} מנהלים נמצאו סה"כ`}</span>
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
                  <button type="button" onClick={() => {
                    setShowCsvModal(false);
                    setCsvFiles([]);
                    setScannedAdmins([]);
                  }} className="btn-secondary px-6 py-3 font-bold">ביטול</button>
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
                      type="button" 
                      onClick={async () => {
                        if (csvFiles.length === 0) return toast.error('אנא בחר קבצים');
                        const unassigned = csvFiles.find(f => !(f as any).targetCategory);
                        if (unassigned) return toast.error(`אנא בחר קבוצה עבור הקובץ: ${unassigned.name}`);

                        setIsScanning(true);
                        setScanProgress(0);
                        const allAdmins: any[] = [];

                        for (let fIdx = 0; fIdx < csvFiles.length; fIdx++) {
                          const file = csvFiles[fIdx];
                          const text = await file.text();
                          const lines = text.split('\n').filter(line => line.trim());
                          const headers = lines[0].split(',').map(h => h.trim());
                          
                          for (let i = 1; i < lines.length; i++) {
                            const values = lines[i].split(',').map(v => v.trim());
                            const admin: any = {
                              category: (file as any).targetCategory,
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
                              if (header === 'מין' || header === 'gender' || header.includes('מין')) admin.gender = val === 'בת' || val === 'נקבה' || val.toLowerCase() === 'female' ? 'female' : 'male';
                              if (header === 'תמונה' || header === 'avatar' || header === 'image' || header.includes('תמונה')) {
                                const match = val.match(/\((https?:\/\/[^\)]+)\)/);
                                if (match) admin.avatar_url = match[1];
                                else if (val.trim().startsWith('http')) admin.avatar_url = val.trim();
                              }
                            });
                            if (!admin.username && admin.phone) admin.username = admin.phone;
                            allAdmins.push(admin);
                          }
                          setScanProgress(Math.round(((fIdx + 1) / csvFiles.length) * 100));
                        }
                        setScannedAdmins(allAdmins);
                        setIsScanning(false);
                        toast.success(`סריקה הושלמה! נמצאו ${allAdmins.length} מנהלים.`);
                      }}
                      disabled={isScanning || csvFiles.length === 0}
                      className="btn-primary px-8 py-3 font-bold shadow-md flex items-center justify-center gap-2"
                    >
                      {isScanning ? 'סורק...' : 'סרוק קבצים'}
                    </button>
                  )}
                </div>
              </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שיוך לקבוצה 1</label>
                      <select className="input-field font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        <option value="">ללא שיוך</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שיוך לקבוצה 2 (שח"ם)</label>
                      <select className="input-field font-bold" value={formData.secondary_category} onChange={(e) => setFormData({...formData, secondary_category: e.target.value})}>
                        <option value="">ללא שיוך נוסף</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
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
                      <p className="text-sm font-bold text-text-main">מנהל קבוצת שח"ם</p>
                      <p className="text-[10px] text-text-secondary">ניהול שתי הקבוצות במקביל</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.is_shaham_manager === 1}
                        onChange={(e) => setFormData({...formData, is_shaham_manager: e.target.checked ? 1 : 0})}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-luxury-blue"></div>
                    </div>
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
                        <option value="team_leader">ראש צוות</option>
                        <option value="viewer">צופה</option>
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
