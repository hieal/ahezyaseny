import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Stats, Match, WhatsAppGroup } from '../types';
import { Users, Heart, Send, Clock, Plus, Search, Filter, ExternalLink, UserCheck, Globe, MessageSquare, Image as ImageIcon, RefreshCw, CheckCircle, ShieldAlert, Trash2, AlertCircle, Edit, History, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { formatMatchMessage, WHATSAPP_GROUPS, APP_NAME, CATEGORIES } from '../constants';
import MatchCard from '../components/MatchCard';
import { WhatsAppWidget } from '../components/WhatsAppWidget';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { type } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [template, setTemplate] = useState('');
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customGroup, setCustomGroup] = useState('');
  const [customGroupLink, setCustomGroupLink] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showAdminBreakdown, setShowAdminBreakdown] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showPersonalTemplateModal, setShowPersonalTemplateModal] = useState(false);
  const [personalTemplate, setPersonalTemplate] = useState(user?.daily_message_template || '');
  const [personalTemplateMale, setPersonalTemplateMale] = useState(user?.daily_message_template_male || '');
  const [personalTemplateFemale, setPersonalTemplateFemale] = useState(user?.daily_message_template_female || '');

  useEffect(() => {
    if (user) {
      setPersonalTemplate(user.daily_message_template || '');
      setPersonalTemplateMale(user.daily_message_template_male || '');
      setPersonalTemplateFemale(user.daily_message_template_female || '');
    }
  }, [user]);
  const [templateGender, setTemplateGender] = useState<'all' | 'male' | 'female'>('all');
  const [publishText, setPublishText] = useState(true);
  const [isInitialMarkedSent, setIsInitialMarkedSent] = useState(false);
  const [displaySize, setDisplaySize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showMinimal, setShowMinimal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualPublishConfirmed, setManualPublishConfirmed] = useState(false);
  const [viewingMatch, setViewingMatch] = useState<Match | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<number[]>([]);
  const [selectedGroupType, setSelectedGroupType] = useState<string>('all');
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showWhatsAppFloating, setShowWhatsAppFloating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const generateDesignedImage = async (match: Match) => {
    setIsGenerating(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 2800; // Increased height significantly
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGenerating(false);
      return;
    }

    const margin = 80;
    const accentColor = match.type === 'male' ? '#2563eb' : '#db2777';
    const lightAccent = match.type === 'male' ? '#eff6ff' : '#fdf2f8';
    const greenColor = '#16a34a'; 
    const loveBg = '#fff5f5';

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, 2800);
    gradient.addColorStop(0, loveBg);
    gradient.addColorStop(1, lightAccent);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1400, 2800);

    // Decorative Frame with Glow
    ctx.save();
    ctx.shadowBlur = 40;
    ctx.shadowColor = accentColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(margin, margin, 1400 - margin*2, 2800 - margin*2);
    ctx.restore();
    
    // Header Section
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(margin + 20, margin + 20, 1400 - margin*2 - 40, 260, 30);
    ctx.fill();
    
    // Logo and Title Side-by-Side
    const headerCenterY = margin + 150;
    
    // Logo
    ctx.save();
    ctx.translate(120, margin + 50);
    const logoSize = 180;
    ctx.strokeStyle = greenColor;
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // Draw H shape
    ctx.beginPath();
    ctx.moveTo(logoSize * 0.2, logoSize * 0.2);
    ctx.lineTo(logoSize * 0.2, logoSize * 0.8);
    ctx.moveTo(logoSize * 0.8, logoSize * 0.2);
    ctx.lineTo(logoSize * 0.8, logoSize * 0.8);
    ctx.moveTo(logoSize * 0.2, logoSize * 0.5);
    ctx.lineTo(logoSize * 0.8, logoSize * 0.5);
    ctx.stroke();

    // Draw Heart
    ctx.beginPath();
    ctx.moveTo(logoSize * 0.5, logoSize * 0.4);
    ctx.bezierCurveTo(logoSize * 0.3, logoSize * 0.2, logoSize * 0.1, logoSize * 0.5, logoSize * 0.5, logoSize * 0.8);
    ctx.bezierCurveTo(logoSize * 0.9, logoSize * 0.5, logoSize * 0.7, logoSize * 0.2, logoSize * 0.5, logoSize * 0.4);
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.restore();

    // Title
    ctx.textAlign = 'right';
    ctx.fillStyle = greenColor;
    ctx.font = 'bold 75px sans-serif';
    ctx.fillText('כרטיס היכרויות של החצי השני', 1300, headerCenterY - 20);
    
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('אנשים פוגשים אנשים', 1300, headerCenterY + 45);

    // Image Section
    const imgX = 200;
    const imgY = 380; // Moved down to avoid header
    const imgW = 1000;
    const imgH = 1000; // Larger image

    if (match.image_url) {
      try {
        const img = new Image();
        const isBase64 = match.image_url.startsWith('data:');
        const imageUrl = isBase64 ? match.image_url : (match.image_url.includes('?') ? `${match.image_url}&t=${Date.now()}` : `${match.image_url}?t=${Date.now()}`);
        
        await new Promise((resolve, reject) => {
          if (!isBase64) img.crossOrigin = "anonymous";
          img.onload = resolve;
          img.onerror = reject;
          img.referrerPolicy = "no-referrer";
          img.src = imageUrl;
        });
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 60);
        ctx.clip();
        
        if (match.crop_config) {
          const config = JSON.parse(match.crop_config);
          const { croppedAreaPixels, crop, zoom } = config;
          if (croppedAreaPixels) {
            ctx.drawImage(
              img, 
              croppedAreaPixels.x, croppedAreaPixels.y, 
              croppedAreaPixels.width, croppedAreaPixels.height, 
              imgX, imgY, imgW, imgH
            );
          } else if (crop && zoom) {
            const scale = Math.max(imgW / img.width, imgH / img.height) * zoom;
            const x = imgX + (imgW - img.width * scale) / 2 + (crop.x * scale);
            const y = imgY + (imgH - img.height * scale) / 2 + (crop.y * scale);
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          } else {
            ctx.drawImage(img, imgX, imgY, imgW, imgH);
          }
        } else {
          const imgRatio = img.width / img.height;
          const targetRatio = imgW / imgH;
          let sw, sh, sx, sy;
          if (imgRatio > targetRatio) {
            sh = img.height;
            sw = sh * targetRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
          } else {
            sw = img.width;
            sh = sw / targetRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
        }
        ctx.restore();

        // Elegant border for image
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.roundRect(imgX - 8, imgY - 8, imgW + 16, imgH + 16, 68);
        ctx.stroke();
      } catch (e) {
        console.error("Failed to load image for canvas", e);
        ctx.fillStyle = '#f1f5f9';
        ctx.roundRect(imgX, imgY, imgW, imgH, 60);
        ctx.fill();
      }
    }

    // "הכירו את" + Name
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText('הכירו את', 700, 1450);
    
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 150px sans-serif';
    ctx.fillText(match.name, 700, 1600);

    // Details Grid
    const details = [
      { label: 'גיל', value: `${match.age} שנים` },
      { label: 'גובה', value: match.height || '---' },
      { label: 'עדה', value: match.ethnicity || '---' },
      { label: 'מצב משפחתי', value: match.marital_status || '---' },
      { label: 'עיר', value: match.city || '---' },
      { label: 'מגזר', value: match.religious_level || '---' },
      { label: 'שירות', value: match.service || '---' },
      { label: 'עיסוק', value: match.occupation || '---' },
      { label: 'מעשן/ת', value: match.smoking || '---' },
      { label: 'שומר/ת נגיעה', value: match.negiah || '---' },
      { label: 'טווח גילאים', value: match.age_range || '---' }
    ];

    ctx.textAlign = 'right';
    details.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 1250 - (col * 600);
      const y = 1750 + (row * 85);
      
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 42px sans-serif';
      // Fix colon position for Hebrew - logical order
      ctx.fillText(':' + item.label, x, y);
      
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 44px sans-serif';
      
      // Handle wrapping for occupation if too long
      if (item.label === 'עיסוק' && ctx.measureText(item.value).width > 300) {
        const words = item.value.split(' ');
        let line1 = '';
        let line2 = '';
        for (let n = 0; n < words.length; n++) {
          if (ctx.measureText(line1 + words[n]).width < 300) {
            line1 += words[n] + ' ';
          } else {
            line2 += words[n] + ' ';
          }
        }
        ctx.fillText(line1, x - 300, y);
        ctx.fillText(line2, x - 300, y + 45);
      } else {
        // Truncate value if too long to prevent overflow
        let value = item.value;
        const maxValWidth = 300;
        if (ctx.measureText(value).width > maxValWidth) {
          while (ctx.measureText(value + '...').width > maxValWidth && value.length > 0) {
            value = value.slice(0, -1);
          }
          value += '...';
        }
        ctx.fillText(value, x - 300, y);
      }
    });

    // About & Looking For sections
    let currentY = 1750 + (Math.ceil(details.length / 2) * 85) + 120;
    
    const drawWrappedText = (title: string, text: string, y: number, maxLines: number) => {
      const lineHeight = 65;
      const maxWidth = 1400 - margin*2 - 120;
      
      ctx.font = '42px sans-serif';
      const words = text.split(' ');
      let lines: string[] = [];
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(currentLine);
          currentLine = words[n] + ' ';
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
      lines = lines.slice(0, maxLines);

      const boxHeight = (lines.length * lineHeight) + 160;
      
      // Box
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(margin + 30, y - 60, 1400 - margin*2 - 60, boxHeight, 40);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Title
      ctx.textAlign = 'right';
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(':' + title.replace(':', ''), 1250, y);
      
      // Text
      ctx.fillStyle = '#1e293b';
      ctx.font = '42px sans-serif';
      lines.forEach((line, i) => {
        ctx.fillText(line, 1250, y + 80 + (i * lineHeight));
      });

      return boxHeight;
    };

    if (match.about) {
      const height = drawWrappedText('קצת עליי', match.about, currentY, 10);
      currentY += height + 80;
    }

    if (match.looking_for) {
      drawWrappedText('מה אני מחפש/ת', match.looking_for, currentY, 10);
    }

    // Corner Hearts & Side Hearts (Drawn last to be on top)
    const drawHeart = (x: number, y: number, size: number, color: string, alpha: number = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size/2, -size/2, -size, size/3, 0, size);
      ctx.bezierCurveTo(size, size/3, size/2, -size/2, 0, 0);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    // Corners
    drawHeart(margin + 30, margin + 30, 50, accentColor);
    drawHeart(1400 - margin - 30, margin + 30, 50, accentColor);
    drawHeart(margin + 30, 2800 - margin - 30, 50, accentColor);
    drawHeart(1400 - margin - 30, 2800 - margin - 30, 50, accentColor);

    // Side Hearts
    for (let i = 1; i <= 6; i++) {
      drawHeart(margin - 10, 400 + i * 400, 30, accentColor, 0.4);
      drawHeart(1400 - margin + 10, 400 + i * 400, 30, accentColor, 0.4);
    }

    // Footer / Creator Info
    const footerY = 2650;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.roundRect(250, footerY, 900, 100, 30);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    const creatorText = `נשלח על ידי ${match.creator_gender === 'female' ? 'המנהלת' : 'המנהל'}: ${match.creator_name || user?.name || 'מערכת'}`;
    ctx.fillText(creatorText, 700, footerY + 45);
    
    if (match.creator_phone || user?.phone) {
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(match.creator_phone || user?.phone || '', 700, footerY + 85);
    }

    setGeneratedImageUrl(canvas.toDataURL('image/png'));
    setIsGenerating(false);
  };

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationMatch, setValidationMatch] = useState<Match | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingMatchToPublish, setPendingMatchToPublish] = useState<Match | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyMatch, setHistoryMatch] = useState<Match | null>(null);
  const [publishHistory, setPublishHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'males' | 'females' | 'publishedToday' | 'neverPublished' | 'publishedLastMonth' | 'notPublishedLastMonth' | 'joinedLastWeek' | 'joinedLastMonth' | null>(null);
  const [filterManager, setFilterManager] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const getMissingFields = (m: Match) => {
    const missing = [];
    if (!m.about || m.about.length < 5) missing.push('על עצמי');
    if (!m.looking_for || m.looking_for.length < 5) missing.push('מה מחפש');
    if (!m.religious_level) missing.push('מגזר');
    if (!m.occupation) missing.push('עיסוק');
    if (!m.phone) missing.push('טלפון');
    if (!m.image_url) missing.push('תמונה');
    return missing;
  };

  const handleSaveInlineField = async () => {
    if (!validationMatch || !editingField) return;
    
    setIsSavingField(true);
    try {
      const fieldMap: Record<string, string> = {
        'על עצמי': 'about',
        'מה מחפש': 'looking_for',
        'מגזר': 'religious_level',
        'עיסוק': 'occupation',
        'טלפון': 'phone',
        'תמונה': 'image_url',
        'עיר': 'city'
      };
      
      const dbField = fieldMap[editingField];
      if (!dbField) return;

      const updatedMatch = { ...validationMatch, [dbField]: editValue };
      const res = await fetch(`/api/matches/${validationMatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMatch)
      });

      if (res.ok) {
        toast.success('הפרט עודכן בהצלחה');
        const newMissing = getMissingFields(updatedMatch);
        setValidationErrors(newMissing);
        setValidationMatch(updatedMatch);
        setEditingField(null);
        setEditValue('');
        fetchData(); // Refresh list
        
        if (newMissing.length === 0) {
          setShowValidationModal(false);
          handlePublish(updatedMatch);
        }
      } else {
        toast.error('שגיאה בעדכון הפרט');
      }
    } catch (err) {
      toast.error('שגיאה בתקשורת עם השרת');
    } finally {
      setIsSavingField(false);
    }
  };

  const fetchPublishHistory = async (match: Match) => {
    setIsLoadingHistory(true);
    setHistoryMatch(match);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/publish-logs`);
      if (res.ok) {
        setPublishHistory(await res.json());
      }
    } catch (err) {
      toast.error('שגיאה בטעינת היסטוריית פרסומים');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, matchesRes, settingsRes, groupsRes, usersRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/matches'),
        fetch('/api/settings'),
        fetch('/api/whatsapp/groups'),
        fetch('/api/users')
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (matchesRes.ok) setMatches(await matchesRes.json());
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setTemplate(settings.whatsapp_template || '');
        setInitialMessage(settings.whatsapp_initial_message || '');
      }
      if (groupsRes.ok) {
        setWhatsappGroups(await groupsRes.json());
      }
      if (usersRes.ok) {
        setAllUsers(await usersRes.json());
      }
    } catch (err) {
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/matches/${deleteConfirmId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('הכרטיס נמחק');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'שגיאה במחיקה');
      }
    } catch (err) {
      toast.error('שגיאה בתקשורת עם השרת');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handlePublish = async (match: Match) => {
    // 1. Validation Check
    const missing = getMissingFields(match);
    if (missing.length > 0) {
      setValidationErrors(missing);
      setValidationMatch(match);
      setShowValidationModal(true);
      return;
    }

    // 2. Duplicate Check (Last 30 days)
    if (match.last_published_at) {
      const lastPublished = new Date(match.last_published_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastPublished > thirtyDaysAgo) {
        setPendingMatchToPublish(match);
        setShowDuplicateConfirm(true);
        return;
      }
    }

    proceedToPublish(match);
  };

  const proceedToPublish = (match: Match) => {
    setSelectedMatch(match);
    let effectiveTemplate = user?.daily_message_template || template;
    
    // Use gender specific template if available
    if (match.type === 'male' && user?.daily_message_template_male) {
      effectiveTemplate = user.daily_message_template_male;
    } else if (match.type === 'female' && user?.daily_message_template_female) {
      effectiveTemplate = user.daily_message_template_female;
    }

    setCustomMessage(formatMatchMessage(match, effectiveTemplate));
    setGeneratedImageUrl(null);
    setIsInitialMarkedSent(false);
    generateDesignedImage(match);
    
    // Find default group for this user and match type
    // Match is male -> Published in Female group
    // Match is female -> Published in Male group
    const targetType = match.type === 'male' ? 'female' : 'male';
    const defaultGroup = whatsappGroups.find(g => 
      g.category?.trim() === user?.category?.trim() && 
      g.type === targetType
    );
    
    setCustomGroup(defaultGroup?.name || '');
    setCustomGroupLink(defaultGroup?.link || '');
    setSelectedGroupId(defaultGroup?.id || null);

    if (!defaultGroup) {
      toast.error(`לא נמצאה קבוצת וואטסאפ משוייכת לקטגוריה ${user?.category || 'שלך'} עבור ${match.type === 'male' ? 'בנות' : 'בנים'}. אנא פנה למנהל הראשי.`);
    }

    setShowPublishModal(true);
  };

  const confirmPublish = async (isImageOnly: boolean = false) => {
    if (!selectedMatch || !selectedGroupId) return;

    const group = whatsappGroups.find(g => g.id === selectedGroupId);
    if (!group) return;

    const messageToCopy = isImageOnly ? 'כרטיס שידוכים חדש' : customMessage;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(messageToCopy);
      toast.success(isImageOnly ? 'התמונה מוכנה לפרסום (הטקסט הועתק)' : 'ההודעה הועתקה ללוח');
    } catch (err) {
      toast.error('שגיאה בהעתקה ללוח');
    }

    // Open WhatsApp link
    if (group.link && group.link.startsWith('http')) {
      window.open(group.link, '_blank');
    } else {
      const whatsappUrl = `https://wa.me/${group.link.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(messageToCopy)}`;
      window.open(whatsappUrl, '_blank');
    }

    // Reset manual confirmation state
    setManualPublishConfirmed(false);
  };

  const handleManualConfirm = async () => {
    if (!selectedMatch || !selectedGroupId) return;
    
    const group = whatsappGroups.find(g => g.id === selectedGroupId);
    if (!group) return;

    try {
      const res = await fetch(`/api/matches/${selectedMatch.id}/publish`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName: group.name })
      });

      if (res.ok) {
        toast.success('הפרסום אושר ונרשם במערכת');
        setManualPublishConfirmed(true);
        setShowPublishModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('שגיאה באישור הפרסום');
    }
  };

  const sendInitialMessage = async () => {
    if (!selectedMatch || !selectedGroupId) return;
    
    const effectiveInitialMessage = user?.daily_message_template || initialMessage;
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(effectiveInitialMessage);
      toast.success('הודעת הפתיחה הועתקה ללוח');
    } catch (err) {
      toast.error('שגיאה בהעתקה ללוח');
    }

    await fetch(`/api/whatsapp/initial-sent`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: selectedGroupId })
    });
    
    // Open WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(effectiveInitialMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    if (customGroupLink && customGroupLink.startsWith('http')) {
      setTimeout(() => {
        window.open(customGroupLink, '_blank');
      }, 1000);
    }
    
    fetchData();
  };

  const markInitialAsSent = async () => {
    if (!selectedGroupId) return;
    try {
      await fetch(`/api/whatsapp/initial-sent`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId })
      });
      setIsInitialMarkedSent(true);
      fetchData();
      toast.success('סומן כנשלח');
    } catch (err) {
      toast.error('שגיאה בעדכון');
    }
  };

  const savePersonalTemplate = async () => {
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          daily_message_template_male: personalTemplateMale,
          daily_message_template_female: personalTemplateFemale
        })
      });
      if (res.ok) {
        toast.success('הודעות הפתיחה האישיות עודכנו');
        setShowPersonalTemplateModal(false);
        await refreshUser();
        fetchData();
      }
    } catch (err) {
      toast.error('שגיאה בעדכון ההודעה');
    }
  };

  const isInitialSentToday = () => {
    if (!selectedMatch || !selectedGroupId) return true;
    const group = whatsappGroups.find(g => g.id === selectedGroupId);
    if (!group?.last_initial_sent) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return group.last_initial_sent.startsWith(today);
  };

  useEffect(() => {
    setSelectedManagerIds([]);
  }, [selectedGroupType]);

  const handleBulkDelete = async () => {
    if (selectedMatchIds.length === 0) return;
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const results = await Promise.all(
        selectedMatchIds.map(id => fetch(`/api/matches/${id}`, { method: 'DELETE' }))
      );
      
      const allOk = results.every(r => r.ok);
      if (allOk) {
        toast.success('הכרטיסים נמחקו בהצלחה');
      } else {
        toast.error('חלק מהכרטיסים לא נמחקו. ייתכן שאין לך הרשאות מתאימות.');
      }
      
      setSelectedMatchIds([]);
      fetchData();
    } catch (err) {
      toast.error('שגיאה במחיקה המונית');
    } finally {
      setBulkDeleteConfirm(false);
    }
  };

  const filteredMatches = matches.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                         m.city?.toLowerCase().includes(search.toLowerCase());
    
    const typeFilter = type === 'males' ? m.type === 'male' : type === 'females' ? m.type === 'female' : true;
    if (!typeFilter) return false;

    const matchesType = filter === 'all' || 
                       (filter === 'male' && m.type === 'male') || 
                       (filter === 'female' && m.type === 'female') ||
                       (filter === 'not_published' && !m.last_published_at) ||
                       (filter === 'published_today' && m.last_published_at && new Date(m.last_published_at).toDateString() === new Date().toDateString());
    
    // Multi-filtering
    const matchesGroupType = filterGroup === 'all' || m.creator_category === filterGroup;
    const matchesManager = filterManager === 'all' || m.created_by === parseInt(filterManager);
    
    return matchesSearch && matchesType && matchesGroupType && matchesManager;
  });

  const handleSelectMatch = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedMatchIds(prev => [...prev, id]);
    } else {
      setSelectedMatchIds(prev => prev.filter(mid => mid !== id));
    }
  };

  const toggleSelectAll = () => {
    if (selectedMatchIds.length === filteredMatches.length) {
      setSelectedMatchIds([]);
    } else {
      setSelectedMatchIds(filteredMatches.map(m => m.id));
    }
  };

  if (loading) return <div className="p-8 text-center font-bold text-luxury-blue">טוען נתונים...</div>;

  const pageTitle = type === 'males' ? 'משודכים (בנים)' : type === 'females' ? 'משודכות (בנות)' : 'Dashboard';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-luxury-blue shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-slate-200">
              <Users size={32} />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-extrabold text-text-main tracking-tight">{pageTitle}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-text-secondary font-medium">ניהול ופרסום כרטיסים במערכת {APP_NAME}</p>
              {user?.category && (
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-luxury-blue/10 text-luxury-blue text-xs font-bold rounded-full border border-luxury-blue/20">
                    מנהל קבוצת {user.category}
                  </span>
                  {whatsappGroups
                    .filter(g => g.category === user.category)
                    .map(group => (
                      <button 
                        key={group.id} 
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setShowWhatsAppFloating(true);
                        }}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                      >
                        <MessageSquare size={10} />
                        {group.name}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'super_admin' && (
            <button 
              onClick={async () => {
                try {
                  const res = await fetch('/api/matches/demo', { method: 'POST' });
                  if (res.ok) {
                    toast.success('נוצר משודך דמו בהצלחה');
                    fetchData();
                  }
                } catch (err) {
                  toast.error('שגיאה ביצירת דמו');
                }
              }}
              className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm md:text-lg border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Plus size={20} />
              יצירת משודך דמו
            </button>
          )}
          <button 
            onClick={() => setShowPersonalTemplateModal(true)} 
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm md:text-lg"
          >
            <Clock size={20} />
            הודעת פתיחה אישית
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm md:text-lg relative"
          >
            <ShieldAlert size={20} />
            התראות
          </button>
          <button onClick={() => navigate('/matches/new')} className="btn-primary flex items-center gap-2 px-6 py-3 text-sm md:text-lg">
            <Plus size={20} />
            צור כרטיס חדש
          </button>
        </div>
      </div>

      {/* Personal Template Modal */}
      {showPersonalTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card w-full max-w-xl p-8 space-y-6 shadow-2xl border-none"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-100 text-luxury-blue">
                  <Clock size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-text-main">הודעת פתיחה אישית</h2>
                  <p className="text-sm text-text-secondary font-medium">עצב את הודעת הפתיחה היומית שלך</p>
                </div>
              </div>
              <button onClick={() => setShowPersonalTemplateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <Plus size={24} className="rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-xs text-text-secondary font-bold bg-slate-50 p-3 rounded-lg border border-slate-100">
                הודעה זו תישלח כהודעה ראשונה בקבוצה לפני פרסום הכרטיסים.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-600 flex items-center gap-2">
                  <UserCheck size={16} />
                  הודעת פתיחה לקבוצת בנים
                </label>
                <textarea 
                  className="input-field min-h-[120px] font-sans text-sm leading-relaxed border-blue-100 focus:border-blue-300" 
                  value={personalTemplateMale} 
                  onChange={(e) => setPersonalTemplateMale(e.target.value)}
                  placeholder="הכנס את הודעת הפתיחה לקבוצת הבנים כאן..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-pink-600 flex items-center gap-2">
                  <Heart size={16} />
                  הודעת פתיחה לקבוצת בנות
                </label>
                <textarea 
                  className="input-field min-h-[120px] font-sans text-sm leading-relaxed border-pink-100 focus:border-pink-300" 
                  value={personalTemplateFemale} 
                  onChange={(e) => setPersonalTemplateFemale(e.target.value)}
                  placeholder="הכנס את הודעת הפתיחה לקבוצת הבנות כאן..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={savePersonalTemplate}
                className="flex-1 py-3 bg-luxury-blue text-white rounded-xl font-bold hover:bg-luxury-blue/90 transition-all"
              >
                שמור הודעות אישיות
              </button>
              <button 
                onClick={() => setShowPersonalTemplateModal(false)}
                className="px-6 py-3 btn-secondary font-bold"
              >
                ביטול
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl border-l border-slate-100 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-luxury-blue/10 text-luxury-blue rounded-xl">
                    <ShieldAlert size={24} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">התראות וסטטיסטיקה</h2>
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <Plus size={24} className="rotate-45 text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(() => {
                  const now = new Date();
                  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                  
                  const publishedLastMonth = matches.filter(m => m.last_published_at && new Date(m.last_published_at) >= oneMonthAgo).length;
                  const notPublishedLastMonth = matches.filter(m => m.last_published_at && new Date(m.last_published_at) < oneMonthAgo).length;
                  const neverPublished = matches.filter(m => !m.last_published_at).length;
                  
                  const joinedLastWeek = matches.filter(m => new Date(m.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length;
                  const joinedLastMonth = matches.filter(m => new Date(m.created_at) >= oneMonthAgo && new Date(m.created_at) < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length;

                  return (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">סטטוס פרסומים</h3>
                        
                        <div 
                          onClick={() => { setStatsModalType('publishedLastMonth'); setShowStatsModal(true); setShowNotifications(false); }}
                          className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-green-100 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="font-bold text-green-900">פורסמו בחודש האחרון</span>
                          </div>
                          <span className="text-xl font-extrabold text-green-600">{publishedLastMonth}</span>
                        </div>
                        
                        <div 
                          onClick={() => { setStatsModalType('notPublishedLastMonth'); setShowStatsModal(true); setShowNotifications(false); }}
                          className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-orange-100 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="font-bold text-orange-900">לא פורסמו מעל חודש</span>
                          </div>
                          <span className="text-xl font-extrabold text-orange-600">{notPublishedLastMonth}</span>
                        </div>
                        
                        <div 
                          onClick={() => { setStatsModalType('neverPublished'); setShowStatsModal(true); setShowNotifications(false); }}
                          className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-red-100 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="font-bold text-red-900">לא פורסמו מעולם</span>
                          </div>
                          <span className="text-xl font-extrabold text-red-600">{neverPublished}</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">הצטרפות למערכת</h3>
                        
                        <div 
                          onClick={() => { setStatsModalType('joinedLastWeek'); setShowStatsModal(true); setShowNotifications(false); }}
                          className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Clock size={16} className="text-blue-500" />
                            <span className="font-bold text-blue-900">הצטרפו בשבוע האחרון</span>
                          </div>
                          <span className="text-xl font-extrabold text-blue-600">{joinedLastWeek}</span>
                        </div>
                        
                        <div 
                          onClick={() => { setStatsModalType('joinedLastMonth'); setShowStatsModal(true); setShowNotifications(false); }}
                          className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Clock size={16} className="text-indigo-500" />
                            <span className="font-bold text-indigo-900">הצטרפו בחודש האחרון</span>
                          </div>
                          <span className="text-xl font-extrabold text-indigo-600">{joinedLastMonth}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Stats */}
      {!type && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="cursor-pointer" onClick={() => { setStatsModalType('males'); setShowStatsModal(true); }}>
            <StatCard 
              icon={<UserCheck className="text-luxury-blue" />} 
              label="סה״כ בנים" 
              value={stats?.males || 0} 
              color="border-blue-100 bg-blue-50/30"
            />
          </div>
          <div className="cursor-pointer" onClick={() => { setStatsModalType('females'); setShowStatsModal(true); }}>
            <StatCard 
              icon={<Heart className="text-pink-600" fill="currentColor" />} 
              label="סה״כ בנות" 
              value={stats?.females || 0} 
              color="border-pink-100 bg-pink-50/30"
            />
          </div>
          <div className="cursor-pointer" onClick={() => { setStatsModalType('publishedToday'); setShowStatsModal(true); }}>
            <StatCard 
              icon={<Send className="text-green-600" />} 
              label="פורסמו היום" 
              value={stats?.publishedToday || 0} 
              color="border-green-100 bg-green-50/30"
            />
          </div>
          <div className="cursor-pointer" onClick={() => { setStatsModalType('neverPublished'); setShowStatsModal(true); }}>
            <StatCard 
              icon={<Clock className="text-orange-600" />} 
              label="טרם פורסמו" 
              value={stats?.neverPublished || 0} 
              color="border-orange-100 bg-orange-50/30"
            />
          </div>
          <div 
            className="relative cursor-pointer"
            onClick={() => setShowAdminBreakdown(!showAdminBreakdown)}
          >
            <StatCard 
              icon={<Users className="text-purple-600" />} 
              label="סה״כ מנהלים" 
              value={stats?.totalAdmins || 0} 
              color="border-purple-100 bg-purple-50/30"
            />
            {showAdminBreakdown && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-purple-100 z-50 text-center"
              >
                <div className="flex justify-around items-center gap-4">
                  <div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">בנים</p>
                    <p className="text-xl font-extrabold text-blue-600">{stats?.adminMales || 0}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">בנות</p>
                    <p className="text-xl font-extrabold text-pink-600">{stats?.adminFemales || 0}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="חיפוש לפי שם או עיר..." 
              className="input-field pr-12 py-3 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {user?.role === 'super_admin' && (
              <>
                <select 
                  className="input-field py-3 px-4 font-bold"
                  value={filterManager}
                  onChange={(e) => setFilterManager(e.target.value)}
                >
                  <option value="all">כל המנהלים</option>
                  {Array.from(new Set(matches.map(m => m.created_by))).map(id => {
                    const manager = matches.find(m => m.created_by === id);
                    return <option key={id} value={id}>{manager?.creator_name || 'מנהל לא ידוע'}</option>;
                  })}
                </select>
                <select 
                  className="input-field py-3 px-4 font-bold"
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                >
                  <option value="all">כל הקבוצות</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </>
            )}
            <select 
              className="input-field py-3 px-4 font-bold"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">כל הסטטוסים</option>
              {!type && <option value="male">בנים בלבד</option>}
              {!type && <option value="female">בנות בלבד</option>}
              <option value="not_published">טרם פורסמו</option>
              <option value="published_today">פורסמו היום</option>
            </select>
            <button 
              onClick={() => {
                setSearch('');
                setFilter('all');
                setSelectedGroupType('all');
                setSelectedManagerIds([]);
              }}
              className="p-3 text-slate-400 hover:text-luxury-blue hover:bg-slate-50 rounded-xl transition-all"
              title="נקה מסננים"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {user?.role === 'super_admin' && (
          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">סינון לפי קבוצה</label>
              <div className="flex flex-wrap gap-2">
                {['all', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedGroupType(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedGroupType === cat ? 'bg-luxury-blue text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'הכל' : cat}
                  </button>
                ))}
              </div>
            </div>

            {selectedGroupType !== 'all' && (
              <div className="space-y-2 flex-1 min-w-[250px]">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">סינון לפי מנהלים (קבוצת {selectedGroupType})</label>
                <div className="flex flex-wrap gap-2">
                  {allUsers
                    .filter(u => (u.role === 'admin' || u.role === 'super_admin') && u.category === selectedGroupType)
                    .map(admin => (
                      <button
                        key={admin.id}
                        onClick={() => {
                          if (selectedManagerIds.includes(admin.id)) {
                            setSelectedManagerIds(prev => prev.filter(id => id !== admin.id));
                          } else {
                            setSelectedManagerIds(prev => [...prev, admin.id]);
                          }
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                          selectedManagerIds.includes(admin.id) ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {admin.avatar_url ? (
                          <img src={admin.avatar_url} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <UserCheck size={14} />
                        )}
                        {admin.name}
                      </button>
                    ))}
                  {allUsers.filter(u => (u.role === 'admin' || u.role === 'super_admin') && u.category === selectedGroupType).length === 0 && (
                    <span className="text-xs text-slate-400 italic">אין מנהלים רשומים לקבוצה זו</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setDisplaySize(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  displaySize === size ? 'bg-luxury-blue text-white shadow-sm' : 'text-text-secondary hover:bg-slate-50'
                }`}
              >
                {size === 'small' ? 'קטן' : size === 'medium' ? 'בינוני' : 'גדול'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowMinimal(!showMinimal)}
            className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all ${
              showMinimal ? 'bg-luxury-blue text-white border-luxury-blue shadow-sm' : 'bg-white text-text-secondary border-slate-100 shadow-sm hover:border-luxury-blue'
            }`}
          >
            תצוגה מצומצמת
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {filteredMatches.length > 0 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSelectAll}
              className="text-sm font-bold text-luxury-blue hover:underline"
            >
              {selectedMatchIds.length === filteredMatches.length ? 'בטל בחירת הכל' : 'בחר הכל'}
            </button>
            <span className="text-sm font-medium text-text-secondary">
              {selectedMatchIds.length} כרטיסים נבחרו
            </span>
          </div>
          {selectedMatchIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="btn-secondary text-red-500 border-red-100 hover:bg-red-50 px-6 py-2 text-sm font-bold flex items-center gap-2"
            >
              <Trash2 size={18} />
              מחק {selectedMatchIds.length} כרטיסים
            </button>
          )}
        </div>
      )}

      {/* Matches Grid */}
      <div className={`grid gap-6 ${
        displaySize === 'small' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5' :
        displaySize === 'medium' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
        'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
      }`}>
        {filteredMatches.map((match) => (
          <MatchCard 
            key={match.id}
            match={match}
            minimal={showMinimal}
            onPublish={handlePublish}
            onView={(m) => setViewingMatch(m)}
            onEdit={(id) => navigate(`/matches/edit/${id}`)}
            onDelete={handleDelete}
            showCreator={user?.role === 'super_admin'}
            selected={selectedMatchIds.includes(match.id)}
            onSelect={handleSelectMatch}
          />
        ))}
        {filteredMatches.length === 0 && (
          <div className="col-span-full py-20 text-center card bg-white/50 border-dashed border-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">לא נמצאו כרטיסים</h3>
            <p className="text-slate-500 mt-1">נסה לשנות את מסנני החיפוש או ליצור כרטיס חדש</p>
          </div>
        )}
      </div>


      {/* View Match Modal */}
      <AnimatePresence>
        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-md p-8 space-y-6 shadow-2xl border-none text-center"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={40} />
              </div>
              <h2 className="text-2xl font-extrabold text-text-main">מחיקת כרטיס</h2>
              <p className="text-text-secondary font-medium">האם אתה בטוח שברצונך למחוק את כרטיסיית המשודך? פעולה זו תעביר את הכרטיס לארכיון.</p>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
                >
                  כן, מחק
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 btn-secondary font-bold"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {bulkDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-md p-8 space-y-6 shadow-2xl border-none text-center"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={40} />
              </div>
              <h2 className="text-2xl font-extrabold text-text-main">מחיקה המונית</h2>
              <p className="text-text-secondary font-medium">האם אתה בטוח שברצונך למחוק את {selectedMatchIds.length} כרטיסיות המשודכים שנבחרו?</p>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={confirmBulkDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
                >
                  כן, מחק הכל
                </button>
                <button 
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="flex-1 py-3 btn-secondary font-bold"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-2xl shadow-2xl border-none flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    viewingMatch.type === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                  }`}>
                    {viewingMatch.type === 'male' ? <UserCheck size={24} /> : <Heart size={24} fill="currentColor" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-text-main">{viewingMatch.name}</h2>
                    <p className="text-sm text-text-secondary font-medium">פרטים מלאים של {viewingMatch.type === 'male' ? 'המשודך' : 'המשודכת'}</p>
                  </div>
                </div>
                <button onClick={() => setViewingMatch(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <Plus size={24} className="rotate-45 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {viewingMatch.image_url && (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-slate-100">
                    <img 
                      src={viewingMatch.image_url} 
                      alt={viewingMatch.name} 
                      className="w-full h-full object-cover"
                      style={viewingMatch.crop_config ? {
                        transform: `scale(${JSON.parse(viewingMatch.crop_config).zoom}) translate(${JSON.parse(viewingMatch.crop_config).crop.x}px, ${JSON.parse(viewingMatch.crop_config).crop.y}px)`
                      } : {}}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <DetailItem label="גיל" value={`${viewingMatch.age} שנים`} />
                  <DetailItem label="גובה" value={viewingMatch.height} />
                  <DetailItem label="עדה" value={viewingMatch.ethnicity} />
                  <DetailItem label="מצב משפחתי" value={viewingMatch.marital_status} />
                  <DetailItem label="עיר מגורים" value={viewingMatch.city} />
                  <DetailItem label="מגזר" value={viewingMatch.religious_level} />
                  <DetailItem label="שירות" value={viewingMatch.service} />
                  <DetailItem label="עיסוק" value={viewingMatch.occupation} />
                  <DetailItem label="מעשן/ת" value={viewingMatch.smoking} />
                  <DetailItem label="שומר/ת נגיעה" value={viewingMatch.negiah} />
                  <DetailItem label="טווח גילאים" value={viewingMatch.age_range} />
                  <DetailItem label="טלפון" value={viewingMatch.phone} />
                </div>

                {viewingMatch.about && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare size={16} className="text-luxury-blue" />
                      קצת עליי
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-text-main leading-relaxed">
                      {viewingMatch.about}
                    </div>
                  </div>
                )}

                {viewingMatch.looking_for && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <Heart size={16} className="text-pink-500" />
                      מה אני מחפש/ת
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-text-main leading-relaxed">
                      {viewingMatch.looking_for}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>נוצר בתאריך: {new Date(viewingMatch.created_at).toLocaleDateString('he-IL')}</span>
                  <span>פורסם {viewingMatch.publish_count} פעמים</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => {
                    setViewingMatch(null);
                    handlePublish(viewingMatch);
                  }}
                  className="btn-whatsapp flex-1 py-3 font-bold"
                >
                  <Send size={20} />
                  פרסם עכשיו
                </button>
                <button 
                  onClick={() => navigate(`/matches/edit/${viewingMatch.id}`)}
                  className="btn-secondary px-8 py-3 font-bold"
                >
                  ערוך כרטיס
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Validation Modal */}
      <AnimatePresence>
        {showValidationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-md p-8 space-y-6 shadow-2xl border-none"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle size={32} />
                <h2 className="text-2xl font-extrabold">פרטים חסרים בכרטיס</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-text-main font-medium">
                  לא ניתן לפרסם את הכרטיס של <span className="font-bold">{validationMatch?.name}</span> מכיוון שחסרים הפרטים הבאים:
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {validationErrors.map(err => (
                    <button 
                      key={err} 
                      onClick={() => {
                        setEditingField(err);
                        const fieldMap: Record<string, string> = {
                          'על עצמי': 'about',
                          'מה מחפש': 'looking_for',
                          'מגזר': 'religious_level',
                          'עיסוק': 'occupation',
                          'טלפון': 'phone',
                          'תמונה': 'image_url',
                          'עיר': 'city'
                        };
                        setEditValue((validationMatch as any)?.[fieldMap[err]] || '');
                      }}
                      className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-colors flex items-center gap-1"
                    >
                      {err}
                      <Plus size={12} />
                    </button>
                  ))}
                </div>
                
                {editingField && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <label className="text-sm font-bold text-slate-600">השלמת {editingField}:</label>
                    {editingField === 'על עצמי' || editingField === 'מה מחפש' ? (
                      <textarea 
                        className="input-field w-full h-24 text-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={`הזן ${editingField}...`}
                      />
                    ) : (
                      <input 
                        type="text"
                        className="input-field w-full text-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={`הזן ${editingField}...`}
                      />
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveInlineField}
                        disabled={isSavingField || !editValue}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isSavingField ? 'שומר...' : <><Check size={16} /> שמור ועדכן</>}
                      </button>
                      <button 
                        onClick={() => setEditingField(null)}
                        className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-300 transition-all"
                      >
                        ביטול
                      </button>
                    </div>
                  </motion.div>
                )}

                <p className="text-sm text-text-secondary">
                  אנא השלם את הפרטים החסרים לפני הפרסום כדי להבטיח תוצאות טובות יותר.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowValidationModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  סגור
                </button>
                <button 
                  onClick={() => {
                    if (validationMatch) {
                      navigate(`/matches/edit/${validationMatch.id}`);
                    }
                  }}
                  className="flex-[2] py-3 bg-luxury-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  ערוך כרטיס מלא
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Confirmation Modal */}
      <AnimatePresence>
        {showDuplicateConfirm && pendingMatchToPublish && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-md p-8 space-y-6 shadow-2xl border-none"
            >
              <div className="flex items-center gap-3 text-orange-600">
                <AlertCircle size={32} />
                <h2 className="text-2xl font-extrabold">כרטיס זה פורסם לאחרונה</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-text-main font-medium">
                  הכרטיס של <span className="font-bold">{pendingMatchToPublish.name}</span> פורסם בתאריך <span className="font-bold">{new Date(pendingMatchToPublish.last_published_at!).toLocaleDateString('he-IL')}</span>.
                </p>
                <p className="text-sm text-text-secondary">
                  האם אתה בטוח שברצונך לפרסם כרטיס זה שוב?
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowDuplicateConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={() => {
                    setShowDuplicateConfirm(false);
                    proceedToPublish(pendingMatchToPublish);
                  }}
                  className="flex-[2] py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg"
                >
                  כן, פרסם שוב
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Publish History Modal */}
      <AnimatePresence>
        {showHistoryModal && historyMatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-2xl p-8 space-y-6 shadow-2xl border-none max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-luxury-blue">
                  <History size={32} />
                  <h2 className="text-2xl font-extrabold">היסטוריית פרסומים - {historyMatch.name}</h2>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <RefreshCw size={20} className="text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-12 h-12 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold">טוען היסטוריה...</p>
                  </div>
                ) : publishHistory.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">לא נמצאו פרסומים קודמים לכרטיס זה</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publishHistory.map((log, idx) => (
                      <div key={idx} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between hover:border-luxury-blue transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-text-main">פורסם בקבוצה: {log.group_name}</p>
                            <p className="text-xs text-text-secondary">על ידי: {log.user_name || 'מערכת'}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-luxury-blue">{new Date(log.created_at).toLocaleDateString('he-IL')}</p>
                          <p className="text-[10px] text-text-secondary">{new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  סגור
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {showStatsModal && statsModalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-4xl p-8 space-y-6 shadow-2xl border-none max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-luxury-blue">
                  {statsModalType === 'males' && <UserCheck size={32} />}
                  {statsModalType === 'females' && <Heart size={32} fill="currentColor" />}
                  {(statsModalType === 'publishedToday' || statsModalType === 'publishedLastMonth') && <Send size={32} />}
                  {(statsModalType === 'neverPublished' || statsModalType === 'notPublishedLastMonth' || statsModalType === 'joinedLastWeek' || statsModalType === 'joinedLastMonth') && <Clock size={32} />}
                  <h2 className="text-2xl font-extrabold">
                    {statsModalType === 'males' ? 'פירוט בנים' : 
                     statsModalType === 'females' ? 'פירוט בנות' : 
                     statsModalType === 'publishedToday' ? 'פורסמו היום' : 
                     statsModalType === 'publishedLastMonth' ? 'פורסמו בחודש האחרון' :
                     statsModalType === 'notPublishedLastMonth' ? 'לא פורסמו מעל חודש' :
                     statsModalType === 'neverPublished' ? 'טרם פורסמו' :
                     statsModalType === 'joinedLastWeek' ? 'הצטרפו בשבוע האחרון' : 'הצטרפו בחודש האחרון'}
                  </h2>
                </div>
                <button onClick={() => setShowStatsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold text-text-secondary text-xs">שם</th>
                      <th className="px-4 py-3 font-bold text-text-secondary text-xs">גיל</th>
                      <th className="px-4 py-3 font-bold text-text-secondary text-xs">עיר</th>
                      <th className="px-4 py-3 font-bold text-text-secondary text-xs">מגזר</th>
                      <th className="px-4 py-3 font-bold text-text-secondary text-xs">פרסום אחרון</th>
                      <th className="px-4 py-3 font-bold text-text-secondary text-xs">מנהל</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {matches
                      .filter(m => {
                        const now = new Date();
                        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                        if (statsModalType === 'males') return m.type === 'male';
                        if (statsModalType === 'females') return m.type === 'female';
                        if (statsModalType === 'publishedToday') return m.last_published_at && new Date(m.last_published_at).toDateString() === now.toDateString();
                        if (statsModalType === 'neverPublished') return !m.last_published_at;
                        if (statsModalType === 'publishedLastMonth') return m.last_published_at && new Date(m.last_published_at) >= oneMonthAgo;
                        if (statsModalType === 'notPublishedLastMonth') return m.last_published_at && new Date(m.last_published_at) < oneMonthAgo;
                        if (statsModalType === 'joinedLastWeek') return new Date(m.created_at) >= oneWeekAgo;
                        if (statsModalType === 'joinedLastMonth') return new Date(m.created_at) >= oneMonthAgo;
                        return true;
                      })
                      .map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-text-main">{m.name}</td>
                          <td className="px-4 py-3 text-sm">{m.age}</td>
                          <td className="px-4 py-3 text-sm">{m.city}</td>
                          <td className="px-4 py-3 text-sm">{m.religious_level}</td>
                          <td className="px-4 py-3 text-sm">
                            {m.last_published_at ? new Date(m.last_published_at).toLocaleDateString('he-IL') : '---'}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-500">{m.creator_name || 'מערכת'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowStatsModal(false)}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  סגור
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Publish Widget Modal */}
      <AnimatePresence>
        {showPublishModal && selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl h-[80vh] relative"
            >
              <WhatsAppWidget 
                groupId={whatsappGroups.find(g => g.id === selectedGroupId)?.whapi_id || whatsappGroups.find(g => g.id === selectedGroupId)?.name || ""}
                groupName={whatsappGroups.find(g => g.id === selectedGroupId)?.name || "קבוצה כללית"}
                groupIdNum={selectedGroupId || undefined}
                groupLink={whatsappGroups.find(g => g.id === selectedGroupId)?.link || ""}
                currentMatch={selectedMatch}
                matchMessage={customMessage}
                matchImage={generatedImageUrl}
                openingMessage={
                  (selectedMatch.type === 'male' ? user?.daily_message_template_male : user?.daily_message_template_female) 
                  || user?.daily_message_template 
                  || template
                }
                isOpeningSent={isInitialSentToday()}
                initialSentMethod={whatsappGroups.find(g => g.id === selectedGroupId)?.last_initial_sent_method as any}
                lastInitialSent={whatsappGroups.find(g => g.id === selectedGroupId)?.last_initial_sent}
                onClose={() => setShowPublishModal(false)}
                onUpdateOpening={(newTemplate) => {
                  setTemplate(newTemplate);
                }}
                onRefreshStatus={fetchData}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Widget */}
      <div className="fixed bottom-6 left-6 z-40">
        <AnimatePresence>
          {showWhatsAppFloating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 100, x: -100 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 100, x: -100 }}
              className="absolute bottom-20 left-0 w-[350px] h-[500px] shadow-2xl"
            >
              {(() => {
                const adminGroups = whatsappGroups.filter(g => g.category === user?.category);
                const primaryGroup = selectedGroupId ? whatsappGroups.find(g => g.id === selectedGroupId) : adminGroups[0];
                
                // If super admin or no group found, maybe show a general one or let them pick
                const finalGroupId = primaryGroup?.whapi_id || primaryGroup?.name || "120363210658789236@g.us";
                const finalGroupName = primaryGroup?.name || (user?.role === 'super_admin' ? "ניהול כללי" : "אין קבוצה משוייכת");

                return (
                  <WhatsAppWidget 
                    groupId={finalGroupId}
                    groupName={finalGroupName}
                    mode="chat-only"
                    onClose={() => setShowWhatsAppFloating(false)}
                  />
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setShowWhatsAppFloating(!showWhatsAppFloating)}
          className="w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-[#128C7E] transition-all hover:scale-110 active:scale-95 group"
        >
          {showWhatsAppFloating ? <Plus size={32} className="rotate-45" /> : <MessageSquare size={32} />}
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white animate-bounce">
            API
          </span>
        </button>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-text-main">{value || '---'}</p>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  return (
    <div className={`card p-8 flex items-center gap-6 border-2 ${color} hover:scale-[1.02] transition-transform cursor-default`}>
      <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-50">
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 28 })}
      </div>
      <div>
        <div className="text-sm text-text-secondary font-bold uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-extrabold text-text-main">{value}</div>
      </div>
    </div>
  );
}
