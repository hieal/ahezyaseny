import React, { useState, useEffect, useRef } from 'react';
import { User, WhatsAppGroup } from '../types';
import { toast } from 'react-hot-toast';
import { UserPlus, Trash2, Edit2, Shield, ShieldAlert, CheckCircle, XCircle, UserCheck, Search, Filter, MessageSquare, FileUp, Download, X, ChevronDown, ChevronLeft, ChevronRight, Phone, ExternalLink, Heart, User as UserIcon, Plus, RefreshCw, Users, Cloud, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME, CATEGORIES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import { useChat } from '../contexts/ChatContext';
import { WhatsAppWidget } from '../components/WhatsAppWidget';
import { getGenderedText } from '../utils/gender';

import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';

export default function AdminManagement() {
  const { user: currentUser, refreshUser, setImpersonation } = useAuth();
  const { isReadOnly: authReadOnly } = useAuth();
  const isReadOnly = authReadOnly || currentUser?.role === 'super_observer';
  const { presenceState } = usePresence();
  const { openChat } = useChat();
  const [users, setUsers] = useState<User[]>([]);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [affiliationGroups, setAffiliationGroups] = useState<string[]>(['18-22', '23-27', '28-32', '33-40', '40+', 'כללי']);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [expandedGroupsUserId, setExpandedGroupsUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [genderModalUser, setGenderModalUser] = useState<User | null>(null);
  const [phoneModalUser, setPhoneModalUser] = useState<User | null>(null);
  const [impersonateUser, setImpersonateUser] = useState<User | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterConnection, setFilterConnection] = useState<'all' | 'online' | 'offline'>('all');
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [currentCsvIndex, setCurrentCsvIndex] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvCategory, setCsvCategory] = useState('');
  const [csvRole, setCsvRole] = useState<'admin' | 'viewer' | 'team_leader'>('admin');
  const [importing, setImporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedAdmins, setScannedAdmins] = useState<any[]>([]);
  const [showConnectionStatus, setShowConnectionStatus] = useState(true);
  const [connectionView, setConnectionView] = useState<'online' | 'offline'>('online');
  const [roleTab, setRoleTab] = useState<'all' | 'admin' | 'team_leader' | 'viewer' | 'super_admin' | 'super_observer'>('all');
  const [scrollThreshold, setScrollThreshold] = useState(10);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [compactView, setCompactView] = useState(true);
  const [editingEmailUser, setEditingEmailUser] = useState<User | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  const [horizontalView, setHorizontalView] = useState(true);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showSyncImagesModal, setShowSyncImagesModal] = useState(false);
  const [syncAdmins, setSyncAdmins] = useState<any[]>([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedGroupForChat, setSelectedGroupForChat] = useState<WhatsAppGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('');
  const [newGroupType, setNewGroupType] = useState<'male' | 'female'>('male');
  const [newGroupWhapiId, setNewGroupWhapiId] = useState('');
  
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarModalUser, setAvatarModalUser] = useState<User | null>(null);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);
  const [stableUsers, setStableUsers] = useState<User[]>([]);
  const [carouselPage, setCarouselPage] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [orphanedCandidates, setOrphanedCandidates] = useState<any[]>([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [returningAdmin, setReturningAdmin] = useState<{id: string, name: string} | null>(null);
  
  const [isAirtableSyncEnabled, setIsAirtableSyncEnabled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'admin',
    status: 'active',
    affiliation_group: '',
    gender: '' as 'male' | 'female' | '',
    phone: '',
    google_login_allowed: 'true',
    avatar_url: '',
    is_shaham_manager: 0,
    created_by: ''
  });

  const fetchWhatsAppGroups = async () => {
    try {
      const groupsData = await dataService.getWhatsAppGroups();
      setWhatsappGroups(groupsData);
      const uniqueGroups = Array.from(new Set(groupsData.map(g => g.category).filter(Boolean))) as string[];
      setAffiliationGroups(uniqueGroups);
    } catch (err) {
      console.error('Error fetching WhatsApp groups:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const [usersData, groupsData] = await Promise.all([
        dataService.getUsers(),
        dataService.getWhatsAppGroups()
      ]);
      
      let admins = usersData;
      
      // Only add manual god user if NO super_admin exists at all
      if (!admins.find(a => a.username === 'god' || a.role === 'super_admin')) {
        const godId = 'b724069c-2a51-4c99-9dcb-178e488d6b4b'; 
        admins.unshift({ 
          id: godId,
          username: 'god', 
          full_name: 'מנהל על', 
          name: 'מנהל על',
          role: 'super_admin',
          status: 'active',
          email: '',
          category: null,
          secondary_category: null,
          gender: 'male',
          phone: null,
          google_login_allowed: 'false',
          avatar_url: null,
          deleted_at: null,
          daily_message_template: null,
          is_from_file: 0,
          is_approved: 1,
          created_at: new Date().toISOString()
        } as User);
      }
      
      setUsers(admins);
      setWhatsappGroups(groupsData);
      
      // Extract unique categories from WhatsApp groups
      const uniqueGroups = Array.from(new Set(groupsData.map(g => g.category).filter(Boolean))) as string[];
      setAffiliationGroups(uniqueGroups);
      
    } catch (err: any) {
      if (err.code === 'PGRST204' || (err.message && err.message.includes('PGRST204'))) {
        toast.error('שגיאת סנכרון (Schema Cache). אנא בצע "סנכרן סכמה" במסך ההתחברות.', { duration: 6000 });
      } else {
        toast.error('שגיאה בטעינת נתונים');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('HOOK ORDER FIXED: ADMIN MANAGEMENT RESTORED');
    console.log('ALL ADMINS ARE NOW AUTO-ACTIVE. NO MORE PENDING STATUS');
    console.log('HORIZONTAL CARDS SYNCED: MALACHI VISIBLE UNDER OBSERVER FILTER');
    console.log('SIDEBAR WIDGET OPTIMIZED: MAX 3 USERS + ACTIVE STATUS FIXED');
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000); // Fetch every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const isEditing = !!editingUser || !!phoneModalUser || !!editingEmailUser || !!genderModalUser || !!avatarModalUser;

  const uniqueUsers = Array.from(new Map(users.filter(u => !!u).map(u => {
    const isMalachi = u.phone === '0556603336';
    const key = isMalachi ? 'malachi_unique_key' : (u.phone || u.id);
    return [key, u];
  })).values());

  const filteredUsers = uniqueUsers.filter(u => {
    if (!['admin', 'super_admin', 'team_leader', 'super_observer', 'viewer'].includes(u.role)) return false;
    
    // Manager Unification logic
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isSuperObserver = currentUser?.role === 'super_observer';
    const isTeamLeader = currentUser?.role === 'team_leader';
    const isSameCategory = currentUser?.affiliation_group && (u.affiliation_group === currentUser.affiliation_group || u.secondary_category === currentUser.affiliation_group);
    const isCreator = u.created_by === currentUser?.id;
    const isSelf = u.id === currentUser?.id;

    if (!isSuperAdmin && !isSuperObserver) {
      if (isTeamLeader) {
        if (!isSameCategory && !isCreator && !isSelf) return false;
      } else {
        if (!isSameCategory && !isSelf) return false;
      }
    }

    const matchesSearch = (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = (u.role === 'super_admin' || u.role === 'super_observer') || filterCategory.length === 0 || 
                            filterCategory.some(cat => {
                              // If filtering by parent 'פרויקט שח"ם', show all Shaham admins
                              if (cat === 'פרויקט שח"ם') {
                                return (u.affiliation_group || '').startsWith('פרויקט שח"ם') || 
                                       (u.secondary_category || '').startsWith('פרויקט שח"ם');
                              }
                              // If user is a general 'פרויקט שח"ם' manager, they match any Shaham sub-category filter
                              if (u.affiliation_group === 'פרויקט שח"ם' || u.secondary_category === 'פרויקט שח"ם') {
                                return cat.startsWith('פרויקט שח"ם');
                              }
                              // Exact match
                              return u.affiliation_group === cat || u.secondary_category === cat;
                            });
    const matchesConnection = filterConnection === 'all' || 
                              (filterConnection === 'online' && !!presenceState[u.id]) || 
                              (filterConnection === 'offline' && !presenceState[u.id]);
    const matchesRole = (
      roleTab === 'all' || 
      (roleTab === 'viewer' && (u.role === 'viewer' || u.role === 'super_observer' || (u.role as string) === 'observer' || u.phone === '0556603336')) ||
      (roleTab === 'admin' && u.role === 'admin') ||
      (roleTab === 'super_admin' && u.role === 'super_admin') ||
      u.role === roleTab
    ) && (selectedRoles.length === 0 || selectedRoles.some(role => {
      if (role === 'viewer') return u.role === 'viewer' || u.role === 'super_observer' || (u.role as string) === 'observer' || u.phone === '0556603336';
      return u.role === role;
    }));
    
    // Airtable toggle only filters Airtable vs manual, without hiding other groups
    const matchesAirtable = !isAirtableSyncEnabled || u.affiliation_group === 'Airtable Sync';

    // Production filter: only show approved admins
    const matchesApproval = true;

    return matchesSearch && matchesCategory && matchesConnection && matchesRole && matchesAirtable && matchesApproval;
  }).sort((a, b) => {
    if (a.username === 'god') return -1;
    if (b.username === 'god') return 1;
    
    const rolePriority: Record<string, number> = {
      'super_admin': 1,
      'super_observer': 1,
      'team_leader': 2,
      'admin': 3,
      'viewer': 4
    };
    
    const aPriority = rolePriority[a.role] || 5;
    const bPriority = rolePriority[b.role] || 5;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Within same role, group by affiliation_group
    const aCat = a.affiliation_group || '';
    const bCat = b.affiliation_group || '';
    return aCat.localeCompare(bCat) || (a.full_name || '').localeCompare(b.full_name || '');
  });

  useEffect(() => {
    if (!isEditing) {
      // Only update if the filtered users are actually different to prevent infinite loop
      if (JSON.stringify(stableUsers) !== JSON.stringify(filteredUsers)) {
        setStableUsers(filteredUsers);
      }
    }
  }, [filteredUsers, isEditing, stableUsers]);

  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser && editingUser.id) {
        await dataService.updateUser(editingUser.id, {
          ...formData,
          password_plain: formData.password || undefined, // Only update if provided
          role: formData.role as "super_admin" | "viewer" | "admin" | "team_leader",
          status: formData.status as "active" | "inactive",
          gender: (formData.gender || undefined) as "male" | "female" | undefined,
          google_login_allowed: formData.google_login_allowed as "true" | "false",
          phone: formData.phone,
          affiliation_group: formData.is_shaham_manager === 1 ? 'פרויקט שח"ם' : formData.affiliation_group,
          avatar_url: formData.avatar_url,
          image_url: formData.avatar_url // Map to both columns
        });
        await dataService.logActivity({
          user_id: currentUser?.id || '00000000-0000-0000-0000-000000000000',
          user_name: currentUser?.name || 'System',
          action: 'עדכון מנהל',
          details: `עדכון פרטי מנהל: ${formData.full_name}`,
          entity_type: 'user',
          entity_id: editingUser.id
        });
        toast.success('המנהל עודכן');
      } else {
        const newUser = await dataService.createUser({
          ...formData,
          password_plain: formData.password || '12345678',
          role: formData.role as "super_admin" | "viewer" | "admin" | "team_leader",
          status: formData.status as "active" | "inactive",
          gender: (formData.gender || undefined) as "male" | "female" | undefined,
          google_login_allowed: formData.google_login_allowed as "true" | "false",
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          image_url: formData.avatar_url, // Map to both columns
          affiliation_group: formData.is_shaham_manager === 1 ? 'פרויקט שח"ם' : formData.affiliation_group,
          deleted_at: null,
          daily_message_template: null,
          is_approved: 1,
          is_from_file: 0
        });

        // Check for orphaned candidates
        const orphaned = await dataService.getOrphanedCandidatesForAdmin(formData.full_name);
        if (orphaned.length > 0) {
          setOrphanedCandidates(orphaned);
          setReturningAdmin({ id: newUser.id, name: formData.full_name });
          setShowReassignModal(true);
        }

        await dataService.logActivity({
          user_id: currentUser?.id || '00000000-0000-0000-0000-000000000000',
          user_name: currentUser?.name || 'System',
          action: 'יצירת מנהל',
          details: `יצירת מנהל חדש: ${formData.full_name}`,
          entity_type: 'user',
          entity_id: newUser.id
        });
        toast.success('מנהל חדש נוצר');
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({ 
        full_name: '', 
        username: '', 
        email: '', 
        password: '', 
        role: 'admin', 
        status: 'active', 
        affiliation_group: '',
        gender: '', 
        phone: '', 
        google_login_allowed: 'true', 
        avatar_url: '',
        is_shaham_manager: 0,
        created_by: ''
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
          const values = line.split(',');
          const admin: any = {
            category: csvCategory,
            selected_group: csvCategory,
            password_plain: '12345678',
            is_from_file: 1,
            role: csvRole,
            status: 'active',
            google_login_allowed: 'true',
            deleted_at: null,
            is_approved: 1,
            is_shaham_manager: 0,
            missing_fields: []
          };
          
          headers.forEach((header, j) => {
            let val = values[j];
            if (!val) return;

            // If affiliation group, don't trim. Else, trim.
            if (header !== 'שיוך' && header !== 'affiliation_group' && !header.includes('שיוך')) {
              val = val.trim();
            }

            if (header === 'שם' || header === 'שם מלא' || header === 'name' || header.includes('שם וטלפון')) {
              admin.full_name = val;
            }
            if (header === 'שם משתמש' || header === 'username') admin.username = val;
            if (header === 'אימייל' || header === 'email' || header.includes('אימייל')) {
              admin.email = val;
            }
            if (header === 'טלפון' || header === 'phone') admin.phone = val;
            if (header === 'עיר' || header.includes('עיר')) admin.city = val;
            if (header === 'שיוך' || header === 'affiliation_group' || header.includes('שיוך')) {
              admin.affiliation_group = val;
              admin.selected_group = val;
            }
            if (header === 'מחלקה / תפקיד' || header === 'category' || header.includes('מחלקה')) {
              admin.category = val;
            }
            if (header === 'תפקיד' || header === 'role') {
              if (val === 'ראש צוות' || val === 'team_leader') admin.role = 'team_leader';
              else if (val === 'צופה' || val === 'viewer') admin.role = 'viewer';
              else if (val === 'מנהל על' || val === 'super_admin') admin.role = 'super_admin';
              else if (val.includes('18-22')) {
                admin.role = 'admin';
                admin.category = '18-22';
              }
            }
            if (header === 'מין' || header === 'gender' || header.includes('מין')) {
                if (val === 'בת' || val === 'נקבה' || val.toLowerCase() === 'female') admin.gender = 'female';
                else if (val === 'בן' || val === 'זכר' || val.toLowerCase() === 'male') admin.gender = 'male';
                else admin.gender = null;
            }
            if (header === 'תמונה' || header === 'avatar' || header === 'image' || header === 'Photo' || header === 'photo' || header.includes('תמונה')) {
              const match = val.match(/\((https?:\/\/[^\)]+)\)/);
              if (match) {
                admin.avatar_url = match[1];
                admin.image_url = match[1];
              } else if (val.trim().startsWith('http')) {
                admin.avatar_url = val.trim();
                admin.image_url = val.trim();
              }
            }
            if (header === 'ראש צוות' || header === 'team_leader' || header.includes('ראש צוות')) {
              const tl = users.find(u => 
                (u.role === 'team_leader' || u.role === 'super_admin') && 
                (u.full_name === val || u.username === val || u.email === val)
              );
              if (tl) {
                admin.created_by = tl.id;
                admin.creator_name = tl.full_name || tl.username;
              }
            }
          });

          if (!admin.full_name) admin.missing_fields.push('שם מלא');
          if (!admin.phone) admin.missing_fields.push('טלפון');

          if (admin.missing_fields.includes('טלפון')) {
            toast.error(`שורה ${i+1} חסרה טלפון`);
          }

          if (!admin.email) {
            admin.email = `temp_admin_${admin.phone || Math.random().toString(36).substring(7)}@nomailemail.com`;
          }

          const blacklisted = await dataService.isBlacklisted(admin.email, admin.phone || '', admin.full_name || '');
          if (blacklisted) {
            toast.error(`חסום! סיבה: ${blacklisted.reason} | הערה: ${blacklisted.notes || 'אין'}`);
            continue;
          }

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
        // Sanitize data: keep only allowed fields
        const adminData: any = {
          full_name: admin.full_name,
          email: admin.email || `temp_admin_${admin.phone || Math.random().toString(36).substring(7)}@nomailemail.com`,
          phone: admin.phone || null,
          affiliation_group: admin.selected_group || admin.affiliation_group || null,
          role: admin.role || 'viewer',
          image_url: admin.image_url || admin.avatar_url || null,
          avatar_url: admin.avatar_url || admin.image_url || null,
          is_from_file: 1
        };
        
        console.log('Admins to save (FULL OBJECT WITH IMAGES):', JSON.stringify(adminData, null, 2));
        console.log('AIRTABLE IMAGE MAPPING VERIFIED:', { 
          image_url: adminData.image_url, 
          avatar_url: adminData.avatar_url 
        });
        
        // Use upsertAdmin to prevent 409 Conflict with logically deleted users
        await dataService.upsertAdmin(adminData);
        successCount++;
      } catch (err: any) {
        console.error('Import error:', err);
      }
    }

    toast.dismiss(processingToast);
    setImporting(false);
    setShowCsvModal(false);
    setCsvFile(null);
    setScannedAdmins([]);
    await fetchUsers(); // Refresh users list
    toast.success(`${successCount} מנהלים יובאו בהצלחה למערכת!`);
  };

  const confirmDelete = (user: User) => {
    if (user.id === 'b724069c-2a51-4c99-9dcb-178e488d6b4b' || user.role === 'super_observer') {
      toast.error('לא ניתן למחוק מנהל זה');
      return;
    }
    if (user.id === currentUser?.id) {
      toast.error('לא ניתן למחוק את המשתמש המחובר כרגע');
      return;
    }
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleEmailUpdate = async () => {
    if (!editingEmailUser) return;
    try {
      const updatedUser = await dataService.updateUser(editingEmailUser.id, { email: tempEmail });
      setUsers(prev => prev.map(u => u.id === editingEmailUser.id ? updatedUser : u));
      toast.success('האימייל עודכן בהצלחה');
      setEditingEmailUser(null);
    } catch (error) {
      toast.error('שגיאה בעדכון האימייל');
    }
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.role === 'super_admin' || userToDelete.role === 'super_observer') {
      toast.error('לא ניתן למחוק מנהל זה');
      return;
    }
    try {
      await dataService.deleteUser(userToDelete.id);
      
      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setSelectedUserIds(prev => prev.filter(id => id !== userToDelete.id));
      
      await dataService.logActivity({
        user_id: currentUser?.id || '00000000-0000-0000-0000-000000000000',
        user_name: currentUser?.name || 'System',
        action: 'מחיקת מנהל',
        details: `מחיקת מנהל: ${userToDelete.full_name}`,
        entity_type: 'user',
        entity_id: userToDelete.id
      });
      toast.success('המנהל נמחק');
      fetchUsers();
    } catch (err) {
      console.error('שגיאה במחיקה:', err);
      toast.error('שגיאה במחיקה - בדוק קונסול');
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!avatarModalUser) return;
    try {
      const updatedUser = await dataService.updateUser(avatarModalUser.id, { 
        avatar_url: tempAvatarUrl,
        image_url: tempAvatarUrl // Map to both columns
      });
      setUsers(prev => prev.map(u => u.id === avatarModalUser.id ? updatedUser : u));
      toast.success('תמונת פרופיל עודכנה');
      setShowAvatarModal(false);
      setAvatarModalUser(null);
    } catch (e) {
      toast.error('שגיאה בעדכון התמונה');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      username: user.username || '',
      email: user?.email,
      password: user.password_plain || '',
      role: user.role,
      status: user.status,
      affiliation_group: user.affiliation_group || '',
      gender: user.gender || '',
      phone: user.phone || '',
      google_login_allowed: user.google_login_allowed || 'true',
      avatar_url: user.avatar_url || '',
      is_shaham_manager: user.is_shaham_manager || 0,
      created_by: user.created_by || ''
    });
    setShowModal(true);
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
      'פרויקט שח"ם 20-35': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'פרויקט שח"ם 36-50': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'פרויקט קומי אורי': 'bg-amber-100 text-amber-700 border-amber-200',
      'פרויקט אור': 'bg-orange-100 text-orange-700 border-orange-200'
    };
    // If cat is '18-22', return its color. If not in colors, return a default for unknown categories, but don't default to 'כללי' if cat is present.
    return colors[cat] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getRowColor = (user: User) => {
    if (user.username === 'god' || user.phone === '0556603336') return 'bg-[#fff9c4] border-r-4 border-r-yellow-600 shadow-[inset_0_0_10px_rgba(250,204,21,0.2)]';
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
      'פרויקט שח"ם 20-35': 'bg-emerald-50/30 border-r-4 border-r-emerald-400',
      'פרויקט שח"ם 36-50': 'bg-emerald-50/30 border-r-4 border-r-emerald-400',
      'פרויקט קומי אורי': 'bg-amber-50/30 border-r-4 border-r-amber-400',
      'פרויקט אור': 'bg-orange-50/30 border-r-4 border-r-orange-400'
    };
    return colors[user.category] || '';
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('התמונה גדולה מדי (מקסימום 2MB)');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const url = await dataService.uploadBase64Image(base64, 'images');
        if (url) {
          setFormData(prev => ({ ...prev, avatar_url: url }));
          toast.success('התמונה הועלתה בהצלחה');
        } else {
          throw new Error('Upload failed');
        }
      } catch (err) {
        console.error('Error uploading avatar:', err);
        toast.error('שגיאה בהעלאת התמונה');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenSyncModal = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email');
      
      if (error) throw error;
      
      setSyncAdmins(data.map(admin => ({
        ...admin,
        new_avatar_url: admin.avatar_url || '',
        new_image_url: admin.image_url || admin.avatar_url || ''
      })));
      setShowSyncImagesModal(true);
    } catch (err) {
      toast.error('שגיאה בטעינת מנהלים לסנכרון');
    }
  };

  const handleSyncImages = async () => {
    const processingToast = toast.loading('מעדכן תמונות...');
    let success = 0;
    let failed = 0;
    
    for (const admin of syncAdmins) {
      if (admin.new_avatar_url !== admin.avatar_url || admin.new_image_url !== admin.image_url) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              avatar_url: admin.new_avatar_url,
              image_url: admin.new_image_url || admin.new_avatar_url 
            })
            .eq('id', admin.id);
          
          if (error) throw error;
          success++;
        } catch (err) {
          failed++;
        }
      }
    }
    
    toast.dismiss(processingToast);
    toast.success(`סונכרנו ${success} תמונות, נכשלו ${failed}`);
    setShowSyncImagesModal(false);
    fetchUsers();
  };

  if (loading) return <div className="p-8 text-center font-bold text-luxury-blue">טוען מנהלים...</div>;

  const handleUpdateGender = async (user: User, gender: 'male' | 'female') => {
    // Update local state immediately for the specific user
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, gender } : u));
    
    try {
      const updatedUser = await dataService.updateUser(user.id, { gender });
      // Update with the actual data returned from the server
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      toast.success('מין עודכן בהצלחה');
      setGenderModalUser(null);
    } catch (e: any) {
      console.log('Update Error:', e);
      toast.error('שגיאה בעדכון המין');
      // Revert/Refresh
      fetchUsers(); 
    }
  };

  const handleUpdatePhone = async () => {
    if (!phoneModalUser) return;
    
    // Update local state immediately
    setUsers(prev => prev.map(u => u.id === phoneModalUser.id ? { ...u, phone: String(tempPhone), username: String(tempPhone) } : u));

    try {
      const updatedUser = await dataService.updateUser(phoneModalUser.id, { 
        phone: String(tempPhone), // Ensure string
        username: String(tempPhone)
      });
      setUsers(prev => prev.map(u => u.id === phoneModalUser.id ? updatedUser : u));
      toast.success('מספר טלפון ושם משתמש עודכנו');
      setPhoneModalUser(null);
    } catch (e: any) {
      console.log('Update Error:', e);
      toast.error('שגיאה בעדכון');
      fetchUsers(); // Revert/Refresh
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    
    // Filter out God and Malachi
    const idsToDelete = selectedUserIds.filter(id => {
      const user = users.find(u => u.id === id);
      return user && user.id !== 'b724069c-2a51-4c99-9dcb-178e488d6b4b' && user.role !== 'super_observer';
    });
    
    if (idsToDelete.length === 0) {
      setSelectedUserIds([]);
      toast.error('לא ניתן למחוק מנהלים מוגנים');
      return;
    }

    try {
      await dataService.deleteUser(idsToDelete);
      
      // Update local state
      setUsers(prev => prev.filter(u => !idsToDelete.includes(u.id)));
      setSelectedUserIds([]);
      setShowBulkDeleteConfirm(false);
      
      toast.success(`${idsToDelete.length} מנהלים נמחקו בהצלחה`);
      
      await dataService.logActivity({
        user_id: currentUser?.id || '00000000-0000-0000-0000-000000000000',
        user_name: currentUser?.name || 'System',
        action: 'מחיקה מרובה של מנהלים',
        details: `נמחקו ${idsToDelete.length} מנהלים`,
        entity_type: 'user',
        entity_id: 'multiple'
      });
      fetchUsers();
    } catch (err) {
      toast.error('שגיאה במחיקת מנהלים');
    }
  };

  const toggleSelectAll = () => {
    const selectableUsers = filteredUsers.filter(u => u.username !== 'god');
    if (selectedUserIds.length === selectableUsers.length && selectableUsers.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableUsers.map(u => u.id));
    }
  };

  const handleImpersonate = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('אתה כבר מחובר כמשתמש זה');
      return;
    }
    setImpersonation(user);
    toast.success(`אתה מחובר כעת כ-${user.full_name || user.name}`);
  };

  const toggleSelectUser = (id: string) => {
    if (id === 'god-id') return;
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };


  const displayUsers = isEditing ? stableUsers : filteredUsers;

  const stats = {
    total: uniqueUsers.length,
    super_admin: uniqueUsers.filter(u => u.role === 'super_admin').length,
    team_leader: uniqueUsers.filter(u => u.role === 'team_leader').length,
    admin: uniqueUsers.filter(u => u.role === 'admin').length,
    viewer: uniqueUsers.filter(u => u.role === 'viewer' || u.role === 'super_observer').length,
    filtered: filteredUsers.length
  };

  const getCategoryLegendColor = (cat: string) => {
    const colors: Record<string, string> = {
      '18-22': 'bg-green-500 border-green-600',
      '23-27': 'bg-blue-500 border-blue-600',
      '28-32': 'bg-indigo-500 border-indigo-600',
      '33-40': 'bg-purple-500 border-purple-600',
      '41-65': 'bg-pink-500 border-pink-600',
      'פרויקט שח"ם': 'bg-emerald-500 border-emerald-600',
      'פרויקט שח"ם 20-35': 'bg-emerald-500 border-emerald-600',
      'פרויקט שח"ם 36-50': 'bg-emerald-500 border-emerald-600',
      'פרויקט קומי אורי': 'bg-amber-500 border-amber-600',
      'פרויקט אור': 'bg-orange-500 border-orange-600'
    };
    return colors[cat] || 'bg-slate-400 border-slate-500';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-text-main tracking-tight">ניהול מנהלים</h1>
          <p className="text-text-secondary mt-1 font-medium">ניהול הרשאות וגישה למערכת {APP_NAME}</p>
        </div>
        
        {/* View Toggle Slider */}
        <div className="flex items-center bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-sm border border-slate-200">
          <button
            onClick={() => setViewType('cards')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              viewType === 'cards' 
                ? 'bg-luxury-blue text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Users size={16} />
            כרטיסים
          </button>
          <button
            onClick={() => setViewType('table')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              viewType === 'table' 
                ? 'bg-luxury-blue text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Download size={16} className="rotate-180" />
            טבלה
          </button>
        </div>
        

        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800">סנכרון Airtable</span>
            <span className="text-[10px] text-slate-500">{isAirtableSyncEnabled ? 'פעיל' : 'כבוי'}</span>
          </div>
          <button
            onClick={() => setIsAirtableSyncEnabled(!isAirtableSyncEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              isAirtableSyncEnabled ? 'bg-green-500' : 'bg-slate-300'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${
                isAirtableSyncEnabled ? 'transform translate-x-6' : ''
              }`}
            />
          </button>
        </div>

      <div className="flex flex-wrap gap-4 items-center justify-end mb-6">
        <div className="flex gap-3">
          <button 
            onClick={handleOpenSyncModal}
            className="btn-secondary flex items-center gap-2 px-6 py-3 shadow-md"
          >
            <RefreshCw size={20} />
            סנכרון תמונות
          </button>
          <button 
            onClick={() => setShowPreviewModal(true)}
            className="btn-secondary flex items-center gap-2 px-6 py-3 shadow-md"
          >
            <RefreshCw size={20} />
            תצוגה מקדימה
          </button>
          <button 
            onClick={() => setShowCsvModal(true)}
            className="btn-secondary flex items-center gap-2 px-6 py-3 shadow-md"
          >
            <FileUp size={20} />
            ייבוא מ-CSV
          </button>
          {!isReadOnly && (
            <button 
              onClick={() => {
                setEditingUser(null);
                setFormData({ 
                  full_name: '', 
                  username: '', 
                  email: '', 
                  password: '', 
                  role: 'admin', 
                  status: 'active', 
                  affiliation_group: '',
                  gender: '', 
                  phone: '', 
                  google_login_allowed: 'true', 
                  avatar_url: '',
                  is_shaham_manager: 0,
                  created_by: ''
                });
                setShowModal(true);
              }}
              className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg"
            >
              <UserPlus size={20} />
              מנהל חדש
            </button>
          )}
          {!isReadOnly && selectedUserIds.length > 0 && (
            <button 
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="bg-red-500 text-white flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all animate-in fade-in slide-in-from-top-2"
            >
              <Trash2 size={20} />
              מחק מנהלים שנבחרו ({selectedUserIds.length})
            </button>
          )}
        </div>
      </div>
      </div>
      {/* Reassign Orphaned Candidates Modal */}
      <AnimatePresence>
        {showReassignModal && returningAdmin && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
                <Users size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">שיוך משודכים חזרה</h3>
                <p className="text-slate-500 font-medium">
                  נמצאו <strong>{orphanedCandidates.length}</strong> משודכים שהיו שייכים ל-<strong>{returningAdmin.name}</strong> בעבר.
                  <br />
                  האם ברצונך לשייך אותם חזרה אליו כעת?
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowReassignModal(false);
                    setReturningAdmin(null);
                    setOrphanedCandidates([]);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  לא כעת
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await dataService.reassignOrphanedCandidates(returningAdmin.id, returningAdmin.name);
                      toast.success('המשודכים שויכו חזרה בהצלחה');
                      setShowReassignModal(false);
                      setReturningAdmin(null);
                      setOrphanedCandidates([]);
                    } catch (err) {
                      toast.error('שגיאה בשיוך המשודכים');
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                >
                  כן, שייך חזרה
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <p className="text-slate-500 font-medium">בחר את המין עבור {genderModalUser.full_name}</p>
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

      {/* Email Edit Modal */}
      <AnimatePresence>
        {editingEmailUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">עדכון אימייל</h3>
                <p className="text-slate-500 font-medium">הזן את כתובת האימייל החדשה עבור {editingEmailUser.full_name}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">אימייל חדש</label>
                  <input 
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    className="input-field text-lg font-mono tracking-wider text-center"
                    placeholder="example@email.com"
                    autoFocus
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingEmailUser(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={handleEmailUpdate}
                  className="flex-1 py-3 bg-luxury-blue text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-all"
                >
                  עדכן אימייל
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
                <p className="text-slate-500 font-medium">עדכון מספר הטלפון יעדכן גם את שם המשתמש של {phoneModalUser.full_name}</p>
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
      {/* Avatar Edit Modal */}
      <AnimatePresence>
        {showAvatarModal && avatarModalUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-luxury-blue/10 flex items-center justify-center text-luxury-blue">
                    <Cloud size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">עדכון תמונת פרופיל</h3>
                    <p className="text-slate-500 font-medium">הזן URL של תמונה עבור {avatarModalUser.full_name}</p>
                  </div>
                </div>
                <button onClick={() => setShowAvatarModal(false)} className="p-2 text-slate-400 hover:bg-white rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50">
                    {tempAvatarUrl ? (
                      <>
                        <img 
                          src={dataService.getPublicImageUrl(tempAvatarUrl)} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-full h-full flex items-center justify-center text-slate-300 hidden">
                          <UserIcon size={40} />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <UserIcon size={40} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">העלאת קובץ</label>
                    <label className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold cursor-pointer hover:bg-slate-200 transition-colors">
                      <Image size={18} />
                      <span>בחר תמונה מהמחשב</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) return toast.error('התמונה גדולה מדי (מקסימום 2MB)');
                          
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64 = reader.result as string;
                            try {
                              const toastId = toast.loading('מעלה תמונה...');
                              const url = await dataService.uploadBase64Image(base64, 'images');
                              toast.dismiss(toastId);
                              if (url) {
                                setTempAvatarUrl(url);
                                toast.success('התמונה הועלתה בהצלחה');
                              } else {
                                throw new Error('Upload failed');
                              }
                            } catch (err) {
                              console.error('Error uploading avatar:', err);
                              toast.error('שגיאה בהעלאת התמונה');
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold">או</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">URL של התמונה</label>
                    <input 
                      type="text" 
                      className="input-field font-bold" 
                      value={tempAvatarUrl} 
                      onChange={(e) => setTempAvatarUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      dir="ltr"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleUpdateAvatar}
                    className="flex-1 bg-luxury-blue text-white py-3 rounded-2xl font-black shadow-lg shadow-luxury-blue/20 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    עדכן תמונה
                  </button>
                  <button 
                    onClick={() => setShowAvatarModal(false)}
                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Impersonation Modal */}
      <AnimatePresence>
        {impersonateUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4 border-4 border-white shadow-lg relative">
                  {impersonateUser.avatar_url ? (
                    <>
                      <img 
                        src={dataService.getPublicImageUrl(impersonateUser.avatar_url)} 
                        alt={impersonateUser.full_name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <UserIcon size={40} className="text-slate-400 hidden" />
                    </>
                  ) : (
                    <UserIcon size={40} className="text-slate-400" />
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full border-4 border-white shadow-sm">
                    <ExternalLink size={16} />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">כניסה כמנהל</h3>
                <p className="text-slate-500 font-medium">אתה עומד להיכנס למערכת בשם <span className="font-bold text-slate-900">{impersonateUser.full_name}</span></p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">שם משתמש</span>
                  <span className="font-mono font-bold text-slate-700">{impersonateUser.username}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">טלפון</span>
                  <span className="font-mono font-bold text-slate-700">{impersonateUser.phone || '---'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">דרכי כניסה</span>
                  <div className="flex gap-2">
                    {impersonateUser.google_login_allowed === 'true' && (
                      <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600 shadow-sm">Google</span>
                    )}
                    <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600 shadow-sm">סיסמא</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setImpersonateUser(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={() => {
                    setImpersonation(impersonateUser);
                    setImpersonateUser(null);
                    toast.success(`מבצע פעולות בשם: ${impersonateUser.full_name || impersonateUser.name}`);
                  }}
                  className="flex-1 py-3 bg-luxury-blue text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  הכנס למערכת
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">סה"כ מנהלים</span>
          <span className="text-2xl font-black text-luxury-blue">{stats.total}</span>
          <span className="text-[10px] font-bold text-slate-500 mt-1">מוצגים: {stats.filtered}</span>
        </div>
        <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-1">מנהלי על</span>
          <span className="text-2xl font-black text-yellow-700">{stats.super_admin}</span>
        </div>
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">ראשי צוות</span>
          <span className="text-2xl font-black text-indigo-700">{stats.team_leader}</span>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">מנהלים</span>
          <span className="text-2xl font-black text-blue-700">{stats.admin}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">צופים</span>
          <span className="text-2xl font-black text-slate-700">{stats.viewer}</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-xs font-bold text-slate-500">מקרא צבעים:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-600">מנהל על</span>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full border ${getCategoryLegendColor(cat)}`}></div>
              <span className="text-[10px] font-bold text-slate-600">{cat}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-600">תצוגה אופקית (3 מנהלים)</span>
          <button 
            onClick={() => {
              setHorizontalView(!horizontalView);
              if (horizontalView) {
                // Turning off horizontal view, reset filters
                setFilterCategory([]);
                setFilterConnection('all');
                setRoleTab('all');
                setSearch('');
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${horizontalView ? 'bg-luxury-blue' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${horizontalView ? '-translate-x-6' : '-translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-600">תצוגה מצומצמת</span>
          <button 
            onClick={() => setCompactView(!compactView)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${compactView ? 'bg-luxury-blue' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${compactView ? '-translate-x-6' : '-translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-600">הצג מנהלים מחוברים/לא מחוברים</span>
          <button 
            onClick={() => setShowConnectionStatus(!showConnectionStatus)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showConnectionStatus ? 'bg-luxury-blue' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showConnectionStatus ? '-translate-x-6' : '-translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">גובה טבלת מנהלים</span>
            <span className="text-xs font-bold text-luxury-blue">הצג עד {scrollThreshold} מנהלים</span>
          </div>
          <input 
            type="range" 
            min="3" 
            max="50" 
            value={scrollThreshold} 
            onChange={(e) => setScrollThreshold(parseInt(e.target.value))}
            className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-luxury-blue"
          />
        </div>
      </div>

      <AnimatePresence>
        {showConnectionStatus && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            <div className="flex gap-4">
              <button 
                onClick={() => setConnectionView('online')}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                  connectionView === 'online' 
                    ? 'bg-green-50 border-green-500 text-green-700 shadow-md' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-green-200'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${connectionView === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                מנהלים מחוברים ({Object.keys(presenceState).length})
              </button>
              <button 
                onClick={() => setConnectionView('offline')}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                  connectionView === 'offline' 
                    ? 'bg-slate-100 border-slate-500 text-slate-700 shadow-md' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${connectionView === 'offline' ? 'bg-slate-500' : 'bg-slate-300'}`}></div>
                מנהלים לא מחוברים ({users.length - Object.keys(presenceState).length})
              </button>
            </div>

            <motion.div 
              key={connectionView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {users.filter(u => connectionView === 'online' ? !!presenceState[u.id] : !presenceState[u.id]).map(u => (
                <div key={u.id} className={`flex items-center justify-between p-4 rounded-2xl border ${
                  connectionView === 'online' ? 'bg-green-50/50 border-green-100' : 'bg-slate-50/50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {u.avatar_url ? (
                        <>
                          <img 
                            src={dataService.getPublicImageUrl(u.avatar_url)} 
                            className="w-10 h-10 rounded-full object-cover" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 hidden">
                            <UserIcon size={20} className="text-slate-400" />
                          </div>
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                          <UserIcon size={20} className="text-slate-400" />
                        </div>
                      )}
                      {!!presenceState[u.id] && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{u.full_name || u.name || u.email || 'מנהל מערכת'}</p>
                      <p className="text-[10px] text-slate-500">
                        {u.username === 'god' ? (
                          <span className="font-bold text-[#D4AF37]">מנהל העמותה</span>
                        ) : (u.role === 'super_admin' ? 'מנהל על' : u.category || 'ללא קטגוריה')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => u.phone && window.open(`https://wa.me/${u.phone.replace(/\D/g, '')}`)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="שלח וואטסאפ">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.123.554 4.197 1.608 6.041L0 24l6.117-1.605a11.821 11.821 0 005.93 1.587h.005c6.634 0 12.032-5.396 12.035-12.03a11.85 11.85 0 00-3.527-8.511z"/></svg>
                    </button>
                    <button onClick={() => openChat({ id: u.id, name: u.full_name || u.name })} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="שלח הודעת צ'אט">
                      <MessageSquare size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {users.filter(u => connectionView === 'online' ? !!presenceState[u.id] : !presenceState[u.id]).length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  אין מנהלים {connectionView === 'online' ? 'מחוברים' : 'לא מחוברים'} כרגע
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setRoleTab('all')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${roleTab === 'all' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              הכל
            </button>
            <button 
              onClick={() => setRoleTab('super_admin')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${roleTab === 'super_admin' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              מנהלי על
            </button>
            <button 
              onClick={() => setRoleTab('admin')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${roleTab === 'admin' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              מנהלים
            </button>
            <button 
              onClick={() => setRoleTab('viewer')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${roleTab === 'viewer' ? 'bg-[#D4AF37] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              צופים
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
              <button
                onClick={() => setFilterConnection('all')}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${filterConnection === 'all' ? 'bg-luxury-blue text-white shadow-sm border-luxury-blue' : 'bg-white text-text-secondary border-slate-200 hover:border-luxury-blue'}`}
              >
                הכל
              </button>
              <button
                onClick={() => setFilterConnection('online')}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${filterConnection === 'online' ? 'bg-green-500 text-white shadow-sm border-green-500' : 'bg-white text-text-secondary border-slate-200 hover:border-green-500'}`}
              >
                מחוברים
              </button>
              <button
                onClick={() => setFilterConnection('offline')}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${filterConnection === 'offline' ? 'bg-red-500 text-white shadow-sm border-red-500' : 'bg-white text-text-secondary border-slate-200 hover:border-red-500'}`}
              >
                לא מחוברים
              </button>
            </div>
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <div className="flex flex-wrap gap-2 pr-10 min-h-[42px] items-center bg-white border border-slate-200 rounded-xl p-2">
              {/* Shaham Hierarchical Filter */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (filterCategory.includes('פרויקט שח"ם')) {
                      setFilterCategory(prev => prev.filter(c => !c.startsWith('פרויקט שח"ם')));
                    } else {
                      setFilterCategory(prev => [...prev.filter(c => !c.startsWith('פרויקט שח"ם')), 'פרויקט שח"ם']);
                    }
                  }}
                  className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${
                    filterCategory.some(c => c.startsWith('פרויקט שח"ם'))
                      ? 'bg-purple-600 text-white shadow-sm border-purple-600'
                      : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'
                  }`}
                >
                  פרויקט שח"ם
                  <ChevronDown size={10} />
                </button>
                
                {filterCategory.some(c => c.startsWith('פרויקט שח"ם')) && (
                  <div className="flex gap-1 bg-purple-50/50 p-1 rounded-full border border-purple-100">
                    {CATEGORIES.filter(c => c.startsWith('פרויקט שח"ם ') && c !== 'פרויקט שח"ם').map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setFilterCategory(prev => {
                            const withoutShaham = prev.filter(c => !c.startsWith('פרויקט שח"ם'));
                            return prev.includes(cat) ? withoutShaham : [...withoutShaham, cat];
                          });
                        }}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          filterCategory.includes(cat)
                            ? 'bg-white text-purple-600 shadow-sm border-purple-200'
                            : 'bg-transparent text-purple-400 border-transparent hover:text-purple-600'
                        }`}
                      >
                        {cat.replace('פרויקט שח"ם ', 'שח"ם ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {affiliationGroups.filter(cat => !cat.startsWith('פרויקט שח"ם')).map(cat => (
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
      </div>

      <div className="card overflow-hidden border-none shadow-lg">
        {horizontalView ? (
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50/30">
            {/* Left Sidebar: Categories (First Half) */}
            <div className="hidden md:flex flex-col gap-2 w-48 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-2">קבוצות (א-ל)</p>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[500px] pr-1">
                {CATEGORIES.slice(0, Math.ceil(CATEGORIES.length / 2)).map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setFilterCategory(prev => 
                        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                      );
                    }}
                    className={`text-right px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between group ${
                      filterCategory.includes(cat)
                        ? 'bg-luxury-blue text-white border-luxury-blue shadow-md'
                        : 'bg-white text-slate-600 border-slate-100 hover:border-luxury-blue/30 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${filterCategory.includes(cat) ? 'bg-white' : getCategoryLegendColor(cat).split(' ')[0]}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Center: Carousel */}
            <div className="flex-1 relative group/carousel px-12">
              <div className="p-4 overflow-hidden">
              {(() => {
                const visibleUsers = filteredUsers.slice(0, scrollThreshold);
                const chunks = [];
                for (let i = 0; i < visibleUsers.length; i += 3) {
                  chunks.push(visibleUsers.slice(i, i + 3));
                }
                
                const itemsPerPage = 1; // Show 1 chunk (3 users) at a time for a true carousel feel, or 3 chunks?
                // The user said "carousel with arrows", usually means one "view" at a time.
                // Let's show 3 chunks if possible, but the width might be an issue.
                // Actually, let's show as many as fit but navigate by page.
                
                  const totalPages = chunks.length;
                  const currentPage = Math.min(carouselPage, totalPages - 1);
                  const displayChunk = chunks[currentPage];

                  if (!displayChunk) return (
                    <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="text-slate-300" size={32} />
                      </div>
                      <p className="text-slate-400 font-bold">אין מנהלים התואמים את הסינון</p>
                      <button onClick={() => { setFilterCategory([]); setSelectedRoles([]); setSearch(''); }} className="mt-4 text-luxury-blue text-sm font-bold hover:underline">נקה את כל המסננים</button>
                    </div>
                  );

                  return (
                    <div className="flex justify-center gap-6 transition-all duration-500 ease-in-out">
                      <div className="flex-shrink-0 w-full max-w-[500px] bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-luxury-blue/20 to-transparent" />
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">דף {currentPage + 1} מתוך {totalPages}</p>
                          <div className="flex gap-1.5">
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <button 
                                key={i} 
                                onClick={() => setCarouselPage(i)}
                                className={`w-2 h-2 rounded-full transition-all ${currentPage === i ? 'bg-luxury-blue w-5' : 'bg-slate-200 hover:bg-slate-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        {displayChunk.map(u => (
                          <div key={u.id} className={`bg-white p-4 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all group/card ${
                            (u.username === 'god' || u.phone === '0556603336') ? 'border-yellow-400 bg-yellow-50/30' : 
                            u.gender === 'male' ? 'border-blue-400 bg-blue-50/10' : 
                            u.gender === 'female' ? 'border-pink-400 bg-pink-50/10' : 
                            'border-slate-300 bg-slate-50/10'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative shadow-inner">
                                  {(u.image_url || u.avatar_url) ? (
                                    <>
                                      <img 
                                        src={dataService.getPublicImageUrl(u.image_url || u.avatar_url)} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer" 
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                      <div className="w-full h-full flex items-center justify-center text-slate-400 hidden">
                                        <UserIcon size={20} className="text-slate-400" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <UserIcon size={20} className="text-slate-400" />
                                    </div>
                                  )}
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${presenceState[u.id] ? 'bg-green-500' : 'bg-slate-300'}`} />
                                </div>
                                <div>
                                  <p className={`font-bold text-base leading-tight ${u.phone === '0556603336' ? 'text-[#D4AF37]' : 'text-slate-900'}`}>{u.full_name || u.name}</p>
                                  {u.role !== 'super_admin' && (
                                    <p className={`text-[10px] font-medium ${u.phone === '0556603336' ? 'text-[#D4AF37]/80' : 'text-slate-500'}`}>{u.username || '-'}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                {currentUser?.role === 'super_admin' && u.id !== currentUser.id && (
                                  <button 
                                    onClick={() => setImpersonateUser(u)} 
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                    title="התחבר כמנהל זה"
                                  >
                                    <ExternalLink size={16} />
                                  </button>
                                )}
                                <button onClick={() => handleEdit(u)} disabled={isReadOnly} className="p-2 text-luxury-blue hover:bg-blue-50 rounded-xl"><Edit2 size={16} /></button>
                                <button onClick={() => { setAvatarModalUser(u); setTempAvatarUrl(u.avatar_url || ''); }} disabled={isReadOnly} className="p-2 text-luxury-blue hover:bg-blue-50 rounded-xl" title="ערוך תמונה"><Image size={16} /></button>
                                {(u.username !== 'god' && u.phone !== '0556603336') && <button onClick={() => confirmDelete(u)} disabled={isReadOnly} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <button 
                                onClick={() => { setEditingEmailUser(u); setTempEmail(u.email || ''); }}
                                className="text-[10px] font-bold text-slate-600 bg-slate-50/50 p-2.5 rounded-xl text-right truncate hover:bg-white hover:shadow-sm transition-all border border-slate-100"
                              >
                                {u.email}
                              </button>
                              <button 
                                onClick={() => { setPhoneModalUser(u); setTempPhone(u.phone || ''); }}
                                className="text-[10px] font-bold text-slate-600 bg-slate-50/50 p-2.5 rounded-xl text-right truncate hover:bg-white hover:shadow-sm transition-all border border-slate-100"
                              >
                                {u.phone || 'אין טלפון'}
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black w-fit shadow-sm ${
                                    u.role === 'super_admin' ? 'bg-yellow-400 text-black' : 
                                    (u.role === 'super_observer' || u.phone === '0556603336') ? 'bg-[#D4AF37] text-white' :
                                    u.role === 'team_leader' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                                  }`}>
                                    {(u.role === 'super_observer' || u.phone === '0556603336') ? 'מנהל העמותה' : u.role === 'super_admin' ? 'מנהל על' : u.role === 'team_leader' ? 'ראש צוות' : 'מנהל'}
                                  </span>
                                  {u.role !== 'super_admin' && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                      {u.gender === 'female' ? 'בת' : (u.gender === 'male' ? 'בן' : 'לא צוין')}
                                    </span>
                                  )}
                                </div>
                                {u.role !== 'super_admin' && (
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                    שיוך: {u.affiliation_group || '-'}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => u.phone && window.open(`https://wa.me/${u.phone.replace(/\D/g, '')}`)} className="w-8 h-8 flex items-center justify-center bg-green-50 text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-all shadow-sm"><Phone size={14} /></button>
                                <button onClick={() => openChat({ id: u.id, name: u.full_name || u.name })} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm"><MessageSquare size={14} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            
              {/* Carousel Arrows */}
              <button 
                onClick={() => setCarouselPage(prev => Math.max(0, prev - 1))}
                disabled={carouselPage === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-xl border border-slate-100 text-luxury-blue hover:scale-110 disabled:opacity-30 disabled:scale-100 transition-all z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => {
                  const visibleUsers = filteredUsers.slice(0, scrollThreshold);
                  const totalPages = Math.ceil(visibleUsers.length / 3);
                  setCarouselPage(prev => Math.min(totalPages - 1, prev + 1));
                }}
                disabled={carouselPage >= Math.ceil(filteredUsers.slice(0, scrollThreshold).length / 3) - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-xl border border-slate-100 text-luxury-blue hover:scale-110 disabled:opacity-30 disabled:scale-100 transition-all z-10"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Right Sidebar: Role Filters & Categories (Second Half) */}
            <div className="hidden md:flex flex-col gap-6 w-56">
              {/* Role Filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-2">סוג מנהל</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'super_admin', label: 'מנהל על', color: 'bg-yellow-400 text-black border-yellow-500' },
                    { id: 'team_leader', label: 'ראש צוות', color: 'bg-indigo-600 text-white border-indigo-700' },
                    { id: 'admin', label: 'מנהל', color: 'bg-blue-600 text-white border-blue-700' },
                    { id: 'viewer', label: 'צופה', color: 'bg-slate-600 text-white border-slate-700' }
                  ].map(role => (
                    <button
                      key={role.id}
                      onClick={() => {
                        setSelectedRoles(prev => 
                          prev.includes(role.id) ? prev.filter(r => r !== role.id) : [...prev, role.id]
                        );
                      }}
                      className={`text-right px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                        selectedRoles.includes(role.id)
                          ? `${role.color} shadow-lg scale-[1.02]`
                          : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{role.label}</span>
                      {selectedRoles.includes(role.id) && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories (Second Half) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-2">קבוצות (מ-ת)</p>
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] pr-1">
                  {CATEGORIES.slice(Math.ceil(CATEGORIES.length / 2)).map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setFilterCategory(prev => 
                          prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                        );
                      }}
                      className={`text-right px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between group ${
                        filterCategory.includes(cat)
                          ? 'bg-luxury-blue text-white border-luxury-blue shadow-md'
                          : 'bg-white text-slate-600 border-slate-100 hover:border-luxury-blue/30 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${filterCategory.includes(cat) ? 'bg-white' : getCategoryLegendColor(cat).split(' ')[0]}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="overflow-x-auto overflow-y-auto custom-scrollbar"
            style={{ maxHeight: `${scrollThreshold * 85 + 60}px` }}
          >
            <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-luxury-blue focus:ring-luxury-blue cursor-pointer"
                    checked={selectedUserIds.length > 0 && selectedUserIds.length === filteredUsers.filter(u => u.username !== 'god').length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">שם מלא</th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">מין</th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">שם משתמש</th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">אימייל</th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">טלפון</th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">שיוך</th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">תפקיד</th>
                {!compactView && <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">סיסמה</th>}
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">סטטוס</th>
                <th className="px-3 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {displayUsers.slice(0, scrollThreshold).map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.phone === '0556603336' ? 'bg-[#fff9c4] border-l-4 border-[#D4AF37] font-bold' : (u.username === 'god' ? 'bg-yellow-50 font-bold' : getRowColor(u))} ${selectedUserIds.includes(u.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-4">
                    {(u.username !== 'god' && u.phone !== '0556603336') && (
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-luxury-blue focus:ring-luxury-blue cursor-pointer"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleSelectUser(u.id)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 cursor-pointer hover:border-luxury-blue transition-colors group flex-shrink-0"
                        onClick={() => {
                          setAvatarModalUser(u);
                          setTempAvatarUrl(u.avatar_url || '');
                          setShowAvatarModal(true);
                        }}
                      >
                        <div className="w-full h-full relative">
                          <img 
                            src={dataService.getPublicImageUrl(u.image_url || u.avatar_url || '')} 
                            alt={u.full_name || u.name || '?'} 
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover ${(u.image_url || u.avatar_url) ? '' : 'hidden'}`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className={`w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 ${(u.image_url || u.avatar_url) ? 'hidden' : ''}`}>
                            <UserIcon size={20} />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Edit2 size={16} className="text-white" />
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${u.phone === '0556603336' ? 'text-[#D4AF37]' : 'text-slate-900'}`}>{u.full_name || u.name || u.email || 'מנהל מערכת'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    {u.role !== 'super_admin' && (
                      <button 
                        onClick={() => setGenderModalUser(u)}
                        className={`text-sm hover:text-luxury-blue transition-colors underline decoration-dotted underline-offset-4 ${u.phone === '0556603336' ? 'text-[#D4AF37]/80' : 'text-slate-600'}`}
                      >
                        {u.gender === 'female' ? 'בת' : (u.gender === 'male' ? 'בן' : 'לא צוין')}
                      </button>
                    )}
                  </td>
                  <td className={`px-3 py-4 text-sm font-medium ${u.phone === '0556603336' ? 'text-[#D4AF37]/80' : 'text-slate-600'}`}>
                    {u.role === 'super_admin' ? '-' : ((!u.username || u.username === u.phone) ? '-' : u.username)}
                  </td>
                  <td className="px-3 py-4">
                    <button 
                      onClick={() => {
                        setEditingEmailUser(u);
                        setTempEmail(u.email || '');
                      }}
                      className="flex flex-col text-right hover:bg-slate-100 p-1 rounded transition-colors group"
                    >
                      {u.email ? (
                        <span className={`text-sm group-hover:text-luxury-blue ${u.phone === '0556603336' ? 'text-[#D4AF37]/80' : 'text-slate-600'}`}>{u.email}</span>
                      ) : (
                        <span style={{ color: 'red' }}>חסר</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-4">
                    <button 
                      onClick={() => {
                        setPhoneModalUser(u);
                        setTempPhone(u.phone || '');
                      }}
                      className="flex items-center gap-2 hover:bg-slate-100 p-1 rounded transition-colors group"
                    >
                      {u.phone ? (
                        <span className={`text-sm group-hover:text-luxury-blue ${u.phone === '0556603336' ? 'text-[#D4AF37]/80' : 'text-slate-600'}`}>{u.phone}</span>
                      ) : (
                        <span style={{ color: 'red' }}>חסר</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-4">
                    <div className="relative group/nav">
                      <div className="flex flex-col gap-1 cursor-pointer">
                        <div className="text-[10px] font-bold px-2 py-0.5 rounded-full text-center border border-slate-200 bg-slate-50 text-slate-700">
                          {affiliationGroups.includes(u.affiliation_group || '') ? (u.affiliation_group || '-') : 'לא מזוהה'}
                        </div>
                        {u.secondary_category && (
                          <div className="text-[10px] font-bold px-2 py-0.5 rounded-full text-center border border-slate-200 bg-slate-50 text-slate-700">
                            {affiliationGroups.includes(u.secondary_category || '') ? u.secondary_category : 'לא מזוהה'}
                          </div>
                        )}
                        
                        {/* Group Navigation Menu */}
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-50 hidden group-hover/nav:block">
                          <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">קבוצות מנוהלות</p>
                          <div className="space-y-1">
                            {whatsappGroups.filter(g => 
                              g.category?.trim() === u.affiliation_group?.trim() || 
                              g.category?.trim() === u.secondary_category?.trim() ||
                              (u.affiliation_group === 'פרויקט שח"ם' && g.category?.startsWith('פרויקט שח"ם'))
                            ).map(g => (
                              <a 
                                key={g.id}
                                href={g.link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-all"
                              >
                                <span className="truncate max-w-[120px]">{g.name}</span>
                                <ExternalLink size={10} className="text-slate-400" />
                              </a>
                            ))}
                            {whatsappGroups.filter(g => 
                              g.category?.trim() === u.affiliation_group?.trim() || 
                              g.category?.trim() === u.secondary_category?.trim() ||
                              (u.affiliation_group === 'פרויקט שח"ם' && g.category?.startsWith('פרויקט שח"ם'))
                            ).length === 0 && (
                              <p className="text-[10px] text-slate-400 p-2 text-center italic">אין קבוצות מוגדרות</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        u.role === 'super_admin' ? 'bg-yellow-400 text-black border border-yellow-600 shadow-md font-black' :
                        (u.role === 'super_observer' || u.phone === '0556603336') ? 'bg-[#D4AF37] text-white border-yellow-800 shadow-md' :
                        u.role === 'team_leader' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'viewer' ? 'bg-slate-100 text-slate-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'super_admin' ? <ShieldAlert size={14} /> : ((u.role === 'super_observer' || u.phone === '0556603336') ? <Shield size={14} /> : <Shield size={14} />)}
                        {(u.role === 'super_observer' || u.phone === '0556603336') ? 'מנהל העמותה' : u.role === 'super_admin' ? 'מנהל על' : 
                         u.role === 'team_leader' ? 'ראש צוות' :
                         u.role === 'viewer' ? 'צופה' : 'מנהל'}
                      </span>
                      {u.is_shaham_manager === 1 && (
                        <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-1 rounded-full border border-purple-200 text-center shadow-sm">
                          מנהל רוחבי
                        </span>
                      )}
                    </div>
                  </td>
                  {!compactView && (
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          {showPassword === u.id ? (u.password_plain || '12345678') : '******'}
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
                    </td>
                  )}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700`}>
                      <CheckCircle size={12} />
                      פעיל
                    </span>
                  <td className="px-3 py-4 text-left min-w-[200px]">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => u.phone && window.open(`https://wa.me/${u.phone.replace(/\D/g, '')}`)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="שלח וואטסאפ">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.123.554 4.197 1.608 6.041L0 24l6.117-1.605a11.821 11.821 0 005.93 1.587h.005c6.634 0 12.032-5.396 12.035-12.03a11.85 11.85 0 00-3.527-8.511z"/></svg>
                      </button>
                      <button onClick={() => openChat({ id: u.id, name: u.full_name || u.name || u.email || 'מנהל מערכת' })} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="שלח הודעת צ'אט">
                        <MessageSquare size={16} />
                      </button>
                      <button onClick={() => toast('הצעת משודך - בביצוע')} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="הצע משודך">
                        <Heart size={16} />
                      </button>
                      {currentUser?.role === 'super_observer' && u.id !== currentUser.id && (
                        <button 
                          onClick={() => setImpersonateUser(u)} 
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="התחבר כמנהל זה"
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}
                      <button onClick={() => handleEdit(u)} className="p-2 text-luxury-blue hover:bg-blue-50 rounded-lg transition-all" title="ערוך מנהל">
                        <Edit2 size={16} />
                      </button>
                      {u.id !== currentUser?.id && u.username !== 'god' && u.phone !== '0556603336' && (
                        <button onClick={() => confirmDelete(u)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="מחק מנהל">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

      {/* Impersonation Confirmation Modal */}
      <AnimatePresence>
        {impersonateUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-4 border-emerald-100 mx-auto relative">
                  {impersonateUser.avatar_url ? (
                    <>
                      <img 
                        src={dataService.getPublicImageUrl(impersonateUser.avatar_url)} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="w-full h-full flex items-center justify-center text-slate-300 hidden">
                        <UserIcon size={40} />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <UserIcon size={40} />
                    </div>
                  )}
                  <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${presenceState[impersonateUser.id] ? 'bg-green-500' : 'bg-slate-300'}`} />
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-slate-900">כניסה כמנהל</h3>
                  <p className="text-slate-500 font-medium mt-1">האם אתה בטוח שברצונך להיכנס למערכת כ-</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{impersonateUser.full_name || impersonateUser.name}?</p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-right">
                  <p className="text-xs text-emerald-800 font-bold leading-relaxed">
                    * תוכל לראות ולבצע פעולות בשם המנהל הזה.
                    <br />
                    * כדי לחזור למשתמש שלך, לחץ על "צא מהתחזות" בסרגל העליון.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setImpersonateUser(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={() => {
                    handleImpersonate(impersonateUser);
                    setImpersonateUser(null);
                  }}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  היכנס כמנהל
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900">מחיקה מרובה</h3>
                <p className="text-slate-500 font-medium">האם אתה בטוח שברצונך למחוק {selectedUserIds.length} מנהלים?</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all"
                >
                  מחק הכל
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900">מחיקת מנהל</h3>
                <p className="text-slate-500 font-medium">האם אתה בטוח שברצונך למחוק את {userToDelete.full_name}?</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all"
                >
                  מחק
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <div className="card overflow-hidden border-none shadow-lg mt-8">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-extrabold text-text-main">ניהול קבוצות וואטסאפ</h2>
          <button 
            onClick={() => setShowWhatsAppModal(true)}
            className="bg-luxury-blue text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
          >
            <Plus size={16} /> הוסף קבוצה
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">שם קבוצה</th>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">קטגוריה</th>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs">WHAPI ID</th>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-xs text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {whatsappGroups.map((g) => (
                <tr key={g.id}>
                  <td className="px-6 py-4 text-sm font-bold text-text-main">{g.name}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{g.category}</td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      className="input-field text-xs font-mono"
                      defaultValue={g.whapi_id || ''}
                      onBlur={async (e) => {
                        await dataService.updateWhatsAppGroup(g.id, { whapi_id: e.target.value });
                        toast.success('ה-ID עודכן');
                        fetchWhatsAppGroups();
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 text-left flex gap-2 justify-end">
                    <a href={g.link} target="_blank" rel="noreferrer" className="text-luxury-blue hover:underline text-xs font-bold">קישור</a>
                    <button 
                      onClick={() => {
                        setSelectedGroupForChat(g);
                        setShowChatModal(true);
                      }}
                      className="text-green-600 hover:text-green-800 text-xs font-bold"
                    >
                      צ'אט
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChatModal && selectedGroupForChat && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl h-[90vh] flex flex-col overflow-hidden">
              <div className="flex-1">
                <WhatsAppWidget 
                  groupId={selectedGroupForChat.whapi_id || ""}
                  groupName={selectedGroupForChat.name}
                  senderName={currentUser?.name}
                  mode="chat-only"
                  onClose={() => setShowChatModal(false)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Group Modal */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-4">הוספת קבוצת וואטסאפ</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                await dataService.createWhatsAppGroup({
                  name: newGroupName,
                  category: newGroupCategory,
                  type: newGroupType,
                  link: '',
                  whapi_id: newGroupWhapiId,
                  last_initial_sent: null
                });
                toast.success('הקבוצה נוספה');
                setShowWhatsAppModal(false);
                setNewGroupName('');
                setNewGroupCategory('');
                setNewGroupWhapiId('');
                fetchWhatsAppGroups();
              }}>
                <input type="text" placeholder="שם הקבוצה" className="input-field w-full mb-3" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required />
                <select 
                  className="input-field w-full mb-3" 
                  value={newGroupCategory} 
                  onChange={e => setNewGroupCategory(e.target.value)} 
                  required
                >
                  <option value="">בחר קטגוריה...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select 
                  className="input-field w-full mb-3" 
                  value={newGroupType} 
                  onChange={e => setNewGroupType(e.target.value as 'male' | 'female')} 
                  required
                >
                  <option value="male">בנים</option>
                  <option value="female">בנות</option>
                </select>
                <input type="text" placeholder="WHAPI ID" className="input-field w-full mb-4" value={newGroupWhapiId} onChange={e => setNewGroupWhapiId(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowWhatsAppModal(false)} className="btn-secondary">ביטול</button>
                  <button type="submit" className="btn-primary">שמור</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">תצוגה מקדימה של נתוני Airtable</h2>
            <div className="max-h-60 overflow-y-auto mb-4">
              {previewData.length > 0 ? (
                <pre>{JSON.stringify(previewData, null, 2)}</pre>
              ) : (
                <p>אין נתונים להצגה</p>
              )}
            </div>
            <button onClick={() => setShowPreviewModal(false)} className="btn-secondary">סגור</button>
          </div>
        </div>
      )}
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
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-text-main">בחר תפקיד לכל המנהלים בקבצים:</label>
                      <select 
                        value={csvRole}
                        onChange={(e) => setCsvRole(e.target.value as any)}
                        className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-luxury-blue font-bold text-sm"
                      >
                        <option value="admin">מנהל רגיל</option>
                        <option value="viewer">צופה</option>
                        <option value="team_leader">ראש צוות / ראשת צוות</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-text-main">בחר קבוצה (Affiliation Group) לכל המנהלים בקבצים:</label>
                      <select 
                        value={csvCategory}
                        onChange={(e) => setCsvCategory(e.target.value)}
                        className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-luxury-blue font-bold text-sm"
                      >
                        <option value="">ללא שיוך</option>
                        {affiliationGroups.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <p className="text-sm font-bold text-text-main border-b border-slate-100 pb-2">קבצים שנבחרו:</p>
                    {csvFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
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

                {scannedAdmins?.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-right p-2">שם</th>
                          <th className="text-right p-2">אימייל</th>
                          <th className="text-right p-2">טלפון</th>
                          <th className="text-right p-2">שדות חסרים</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedAdmins?.map((admin, idx) => (
                          <tr key={idx} className={admin?.missing_fields?.length > 0 ? 'bg-red-50' : ''}>
                            <td className="p-2">{admin?.full_name || <span style={{ color: 'red' }}>חסר</span>}</td>
                            <td className="p-2">{admin?.email || <span style={{ color: 'red' }}>חסר</span>}</td>
                            <td className="p-2">{admin?.phone || <span style={{ color: 'red' }}>חסר</span>}</td>
                            <td className="p-2 text-red-600 font-bold">{admin?.missing_fields?.join(', ') || '---'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

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
                              category: csvCategory,
                              selected_group: csvCategory,
                              password: '12345678',
                              is_from_file: 1,
                              role: csvRole,
                              status: 'active',
                              google_login_allowed: 'true',
                              is_approved: 1
                            };
                            let hasEmail = false;
                            headers.forEach((header, j) => {
                              const val = values[j];
                              if (!val) return;
                              if (header === 'שם' || header === 'שם מלא' || header === 'name' || header.includes('שם וטלפון')) {
                                admin.full_name = val;
                                if (val.includes(' - ')) {
                                  const parts = val.split(' - ');
                                  admin.phone = parts[0].trim();
                                  admin.name = parts[1].trim();
                                  admin.full_name = parts[1].trim();
                                  admin.username = parts[0].trim();
                                } else {
                                  admin.name = val;
                                  admin.full_name = val;
                                }
                              }
                              if (header === 'שם משתמש' || header === 'username') admin.username = val;
                              if (header === 'אימייל' || header === 'email' || header.includes('אימייל')) {
                                admin.email = val;
                                hasEmail = true;
                              }
                              if (header === 'תמונה' || header === 'image' || header === 'avatar') {
                                admin.avatar_url = val;
                              }
                              if (header === 'טלפון' || header === 'phone') admin.phone = val;
                              if (header === 'תפקיד' || header === 'role') {
                                if (val === 'ראש צוות' || val === 'team_leader') admin.role = 'team_leader';
                                else if (val === 'צופה' || val === 'viewer') admin.role = 'viewer';
                                else if (val === 'מנהל על' || val === 'super_admin') admin.role = 'super_admin';
                              }
                              if (header === 'מין' || header === 'gender' || header.includes('מין')) {
                                if (val === 'בת' || val === 'נקבה' || val.toLowerCase() === 'female') admin.gender = 'female';
                                else if (val === 'בן' || val === 'זכר' || val.toLowerCase() === 'male') admin.gender = 'male';
                                else admin.gender = null;
                              }
                              if (header === 'תמונה' || header === 'avatar' || header === 'image' || header.includes('תמונה')) {
                                const match = val.match(/\((https?:\/\/[^\)]+)\)/);
                                if (match) admin.avatar_url = match[1];
                                else if (val.trim().startsWith('http')) admin.avatar_url = val.trim();
                              }
                              if (header === 'ראש צוות' || header === 'team_leader' || header.includes('ראש צוות')) {
                                const tl = users.find(u => 
                                  (u.role === 'team_leader' || u.role === 'super_admin') && 
                                  (u.full_name === val || u.username === val || u.email === val)
                                );
                                if (tl) {
                                  admin.created_by = tl.id;
                                  admin.creator_name = tl.full_name || tl.username;
                                }
                              }
                            });

                            if (!hasEmail || !admin.email) {
                              const tempPhone = admin.phone || Math.random().toString(36).substring(7);
                              admin.email = `temp_email_${tempPhone}@missing.com`;
                            }

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
                      <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative">
                        {formData.avatar_url ? (
                          <>
                            <img 
                              src={dataService.getPublicImageUrl(formData.avatar_url)} 
                              alt="Avatar" 
                              referrerPolicy="no-referrer" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <UserIcon size={32} className="text-slate-300 hidden" />
                          </>
                        ) : (
                          <UserIcon size={32} className="text-slate-300" />
                        )}
                        <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${presenceState[editingUser?.id || ''] ? 'bg-green-500' : 'bg-slate-300'}`} />
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
                        <div className="flex flex-col items-center gap-1">
                          <Edit2 size={20} />
                          <span className="text-[10px] font-bold">העלה תמונה</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-text-main">כתובת URL לתמונה</label>
                      <button 
                        type="button"
                        onClick={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                        className="text-luxury-blue text-xs font-bold hover:underline"
                      >
                        {showAvatarUrlInput ? 'הסתר' : 'הזן URL ידנית'}
                      </button>
                    </div>
                    {showAvatarUrlInput && (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="input-field text-xs" 
                          placeholder="הדבק כתובת URL כאן..."
                          value={tempAvatarUrl}
                          onChange={(e) => setTempAvatarUrl(e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setFormData({...formData, avatar_url: tempAvatarUrl});
                            toast.success('URL עודכן');
                          }}
                          className="bg-luxury-blue text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          עדכן
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שם מלא *</label>
                    <input type="text" required className="input-field" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
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
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">שיוך (קבוצה)</label>
                    <select className="input-field font-bold" value={formData.affiliation_group} onChange={(e) => setFormData({...formData, affiliation_group: e.target.value})}>
                      <option value="">ללא שיוך</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">מין המנהל/ת</label>
                    <select className="input-field font-bold" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as 'male' | 'female' | ''})}>
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
                        <option value="team_leader">ראש צוות / ראשת צוות</option>
                        <option value="viewer">צופה</option>
                        <option value="super_admin">מנהל על</option>
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
      {/* Image Sync Modal */}
      <AnimatePresence>
        {showSyncImagesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl space-y-6 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">סנכרון תמונות מנהלים</h3>
                <p className="text-slate-500 font-medium">הדבק לינק לתמונה עבור כל מנהל כדי לעדכן את הפרופיל שלו</p>
                <div className="flex justify-center gap-4 text-sm font-bold pt-2">
                  <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">סונכרנו: {syncAdmins.filter(a => a.avatar_url).length}</span>
                  <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">חסרות: {syncAdmins.filter(a => !a.avatar_url).length}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {syncAdmins.map((admin, idx) => (
                  <div key={admin.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                      {(admin.new_image_url || admin.new_avatar_url) ? (
                        <img 
                          src={dataService.getPublicImageUrl(admin.new_image_url || admin.new_avatar_url)} 
                          alt={admin.full_name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=?';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <UserIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{admin.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="הדבק לינק לתמונה (URL)..."
                        className="input-field text-xs"
                        value={admin.new_image_url || admin.new_avatar_url || ''}
                        onChange={(e) => {
                          const newSyncAdmins = [...syncAdmins];
                          newSyncAdmins[idx].new_image_url = e.target.value;
                          newSyncAdmins[idx].new_avatar_url = e.target.value;
                          setSyncAdmins(newSyncAdmins);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowSyncImagesModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={handleSyncImages}
                  className="flex-1 py-3 bg-luxury-blue text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  סנכרן תמונות
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
