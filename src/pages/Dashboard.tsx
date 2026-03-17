import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Stats, Match, WhatsAppGroup, User as UserType } from '../types';
import { Users, Heart, Send, Clock, Plus, Search, Filter, ExternalLink, UserCheck, Globe, MessageSquare, Image as ImageIcon, RefreshCw, CheckCircle, ShieldAlert, Trash2, AlertCircle, AlertTriangle, Edit, History, ChevronDown, ChevronUp, Check, X, Sparkles, User as UserIcon, Phone, Database, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Paperclip, Save, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { formatMatchMessage, WHATSAPP_GROUPS, APP_NAME, CATEGORIES } from '../constants';
import MatchCard from '../components/MatchCard';
import { MatchActions } from '../components/MatchActions';
import { MatchCarousel } from '../components/MatchCarousel';
import { WhatsAppWidget } from '../components/WhatsAppWidget';
import { MatchSuggestions } from '../components/MatchSuggestions';
import MatchesManagement from '../components/MatchesManagement';
import NewMatchesModal from '../components/NewMatchesModal';
import { getGenderedText } from '../utils/gender';

import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { useChat } from '../contexts/ChatContext';
import { usePresence } from '../contexts/PresenceContext';
import { OnlineIndicator } from '../components/OnlineIndicator';

export default function Dashboard() {
  const { user, effectiveUser, refreshUser } = useAuth();
  const activeUser = effectiveUser || user;
  const { openChat } = useChat();
  const { presenceState } = usePresence();
  const { type } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  function usePersistedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
      const storedValue = localStorage.getItem(key);
      return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
    });

    useEffect(() => {
      localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
  }

  const [filter, setFilter] = usePersistedState('dashboard_filter', 'all');
  const [search, setSearch] = useState('');
  const [template, setTemplate] = useState('');
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customGroup, setCustomGroup] = useState('');
  const [customGroupLink, setCustomGroupLink] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showAdminBreakdown, setShowAdminBreakdown] = useState(false);
  const [showMatchesManagement, setShowMatchesManagement] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showPersonalTemplateModal, setShowPersonalTemplateModal] = useState(false);
  const [personalTemplate, setPersonalTemplate] = useState('');
  const [personalTemplateMale, setPersonalTemplateMale] = useState('');
  const [personalTemplateFemale, setPersonalTemplateFemale] = useState('');

  useEffect(() => {
    if (activeUser) {
      try {
        const parsed = JSON.parse(activeUser.daily_message_template || '{}');
        setPersonalTemplate(parsed.general || activeUser.daily_message_template || '');
        setPersonalTemplateMale(parsed.male || '');
        setPersonalTemplateFemale(parsed.female || '');
      } catch (e) {
        setPersonalTemplate(activeUser.daily_message_template || '');
        setPersonalTemplateMale('');
        setPersonalTemplateFemale('');
      }
    }
  }, [activeUser]);
  const [templateGender, setTemplateGender] = useState<'all' | 'male' | 'female'>('all');
  const [publishText, setPublishText] = useState(true);
  const [publishModalTab, setPublishModalTab] = useState<'status' | 'content' | 'chat'>('status');
  const [isInitialMarkedSent, setIsInitialMarkedSent] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'carousel'>('list');
  const [displaySize, setDisplaySize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showMinimal, setShowMinimal] = useState(false);
  const [completionFilter, setCompletionFilter] = usePersistedState<'all' | 'complete' | 'incomplete'>('dashboard_completion_filter', 'all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualPublishConfirmed, setManualPublishConfirmed] = useState(false);
  const [viewingMatch, setViewingMatch] = useState<Match | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageMatch, setImageMatch] = useState<Match | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [selectedGroupType, setSelectedGroupType] = usePersistedState<string>('dashboard_group_type', 'all');
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showWhatsAppFloating, setShowWhatsAppFloating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConnectedAdminsModal, setShowConnectedAdminsModal] = useState(false);
  const [sortAlphabetically, setSortAlphabetically] = usePersistedState<boolean>('dashboard_sort_alphabetic', false);
  const [sortByDate, setSortByDate] = usePersistedState<boolean>('dashboard_sort_date', true); // Default newest first
  const [statsViewMode, setStatsViewMode] = usePersistedState<'me' | 'group' | 'all'>('dashboard_stats_view', 'me');
  const [managerFilter, setManagerFilter] = usePersistedState<'all' | 'me' | 'group'>('dashboard_manager_filter', 'all');
  const [teamManagerFilter, setTeamManagerFilter] = usePersistedState<string | null>('dashboard_team_manager_filter', null);

  const [showGlobalBreakdownModal, setShowGlobalBreakdownModal] = useState(false);
  const [showNewMatchesModal, setShowNewMatchesModal] = useState(false);
  const [globalBreakdownData, setGlobalBreakdownData] = useState<any>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loadingGlobalBreakdown, setLoadingGlobalBreakdown] = useState(false);

  const fetchGlobalBreakdown = async () => {
    setLoadingGlobalBreakdown(true);
    try {
      const data = await dataService.getGlobalStatsBreakdown();
      setGlobalBreakdownData(data);
    } catch (err) {
      console.error('Failed to fetch global breakdown:', err);
      toast.error('שגיאה בטעינת נתוני אתר');
    } finally {
      setLoadingGlobalBreakdown(false);
    }
  };

  const handleSuggest = (match: Match) => {
    setShowConnectedAdminsModal(true);
    toast(`בחר מנהל להציע לו את ${match.name}`, { icon: '💬' });
  };

  const [showTeamLeaderDashboard, setShowTeamLeaderDashboard] = useState(false);
  const [showManagersViewerModal, setShowManagersViewerModal] = useState(false);
  const [showShahamSubgroups, setShowShahamSubgroups] = useState(false);
  const [teamAdminsData, setTeamAdminsData] = useState<any[]>([]);
  const [teamActivityLogs, setTeamActivityLogs] = useState<any[]>([]);
  const [teamPublishLogs, setTeamPublishLogs] = useState<any[]>([]);
  const [loadingTeamData, setLoadingTeamData] = useState(false);
  const [showDesignedCardModal, setShowDesignedCardModal] = useState(false);
  const [viewerSelectedManagerId, setViewerSelectedManagerId] = useState<string | null>(null);
  const [viewerAffiliation, setViewerAffiliation] = useState<string>('all');
  const [viewerSearch, setViewerSearch] = useState('');
  const [viewerGenderFilter, setViewerGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [viewerCardView, setViewerCardView] = useState<'full' | 'designed'>('full');
  const [showSameGroupsAdminsModal, setShowSameGroupsAdminsModal] = useState(false);
  const [cardsPerRow, setCardsPerRow] = useState(3);
  const [rowsPerPage, setRowsPerPage] = useState(1);
  const [sliderViewEnabled, setSliderViewEnabled] = useState(false);
  const [currentSliderIndex, setCurrentSliderIndex] = useState(0);

  // Reset slider index when layout changes
  useEffect(() => {
    setCurrentSliderIndex(0);
  }, [cardsPerRow, rowsPerPage]);
  const [managerCounts, setManagerCounts] = useState<Record<string, number>>({});

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesMatch, setNotesMatch] = useState<Match | null>(null);
  const [matchNotes, setMatchNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isNoteAvailable, setIsNoteAvailable] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const adminsInSameGroups = allUsers.filter(u => {
    if (activeUser?.role === 'super_admin') return true;
    if (activeUser?.role === 'team_leader') {
      return u.affiliation_group === activeUser.affiliation_group;
    }
    if (!activeUser?.category && !activeUser?.secondary_category) return u.id === activeUser?.id;
    
    const myCategories = [activeUser.category, activeUser.secondary_category].filter(Boolean);
    const userCategories = [u.category, u.secondary_category].filter(Boolean);
    
    return userCategories.some(cat => myCategories.includes(cat));
  });

  const fetchTeamData = async () => {
    if (!activeUser || activeUser.role !== 'team_leader') return;
    setLoadingTeamData(true);
    try {
      // Get admins in the same affiliation group
      const teamAdmins = allUsers.filter(u => {
        return u.affiliation_group === activeUser.affiliation_group && u.id !== activeUser.id;
      });
      
      setTeamAdminsData(teamAdmins);
      
      const adminIds = [activeUser.id, ...teamAdmins.map(a => a.id)];
      if (adminIds.length > 0) {
        const [activity, publish] = await Promise.all([
          dataService.getTeamActivity(adminIds),
          dataService.getTeamPublishLogs(adminIds)
        ]);
        setTeamActivityLogs(activity);
        setTeamPublishLogs(publish);
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
      toast.error('שגיאה בטעינת נתוני צוות');
    } finally {
      setLoadingTeamData(false);
    }
  };

  useEffect(() => {
    if (showTeamLeaderDashboard) {
      fetchTeamData();
    }
  }, [showTeamLeaderDashboard]);
  const fetchManagerCounts = async () => {
    try {
      const counts = await dataService.getManagerCandidateCounts();
      setManagerCounts(counts);
    } catch (err) {
      console.error('Failed to fetch manager counts:', err);
    }
  };

  const fetchNotes = async (matchId: string) => {
    setLoadingNotes(true);
    try {
      const notes = await dataService.getMatchNotes(matchId);
      setMatchNotes(notes);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      toast.error('שגיאה בטעינת הערות');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!notesMatch || !newNoteText.trim() || !activeUser) return;
    
    try {
      const note = await dataService.createMatchNote({
        match_id: notesMatch.id,
        user_id: activeUser.id,
        user_name: activeUser.full_name,
        text: newNoteText,
        is_available: isNoteAvailable
      });
      
      // Update match availability in DB
      await dataService.updateMatch(notesMatch.id, { is_available: isNoteAvailable });
      
      // Update local state
      setMatches(matches.map(m => m.id === notesMatch.id ? { ...m, is_available: isNoteAvailable } : m));
      
      setMatchNotes([note, ...matchNotes]);
      setNewNoteText('');
      toast.success('הערה נוספה בהצלחה');
    } catch (err) {
      console.error('Failed to add note:', err);
      toast.error('שגיאה בהוספת הערה');
    }
  };

  const handleDeleteNote = async (noteId: string, noteUserId: string) => {
    if (activeUser?.id !== noteUserId && activeUser?.role !== 'super_admin') {
      toast.error('רק המנהל שכתב את ההערה יכול למחוק אותה');
      return;
    }

    try {
      await dataService.deleteMatchNote(noteId);
      const updatedNotes = matchNotes.filter(n => n.id !== noteId);
      setMatchNotes(updatedNotes);
      
      // Update match availability based on the most recent remaining note
      if (notesMatch) {
        const newAvailability = updatedNotes.length > 0 ? updatedNotes[0].is_available : true;
        await dataService.updateMatch(notesMatch.id, { is_available: newAvailability });
        setMatches(matches.map(m => m.id === notesMatch.id ? { ...m, is_available: newAvailability } : m));
      }
      
      toast.success('הערה נמחקה');
    } catch (err) {
      console.error('Failed to delete note:', err);
      toast.error('שגיאה במחיקת הערה');
    }
  };

  useEffect(() => {
    if (showManagersViewerModal) {
      fetchManagerCounts();
    }
  }, [showManagersViewerModal]);

  const generateDesignedImage = async (match: Match) => {
    setIsGenerating(true);
    
    // 1. Pre-calculate text heights to determine canvas height
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      setIsGenerating(false);
      return;
    }

    const margin = 80;
    const sidePadding = 150;
    const maxWidth = 1600 - margin*2 - sidePadding*2;
    const lineHeight = 55;

    const calculateTextHeight = (text: string) => {
      if (!text) return 0;
      tempCtx.font = '40px sans-serif';
      const words = String(text).split(' ');
      let lines = 0;
      let currentLine = '';
      for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n] + ' ';
        if (tempCtx.measureText(testLine).width > maxWidth && n > 0) {
          lines++;
          currentLine = words[n] + ' ';
        } else {
          currentLine = testLine;
        }
      }
      lines++;
      return (lines * lineHeight) + 150;
    };

    const aboutHeight = match.about ? calculateTextHeight(match.about) : 0;
    const lookingForHeight = match.looking_for ? calculateTextHeight(match.looking_for) : 0;
    
    // Base height: Header + Image + Name + Grid + Padding
    const baseHeight = 2800;
    const totalContentHeight = baseHeight + aboutHeight + lookingForHeight + 400; 
    const canvasHeight = Math.max(3600, totalContentHeight);

    const canvas = document.createElement('canvas');
    canvas.width = 1600; 
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGenerating(false);
      return;
    }

    const accentColor = match.type === 'male' ? '#2563eb' : '#db2777';
    const lightAccent = match.type === 'male' ? '#eff6ff' : '#fdf2f8';
    const greenColor = '#16a34a'; 
    const loveBg = '#ffffff';

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, loveBg);
    gradient.addColorStop(0.5, lightAccent);
    gradient.addColorStop(1, loveBg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1600, canvasHeight);

    // Decorative Frame with Glow
    ctx.save();
    ctx.shadowBlur = 40;
    ctx.shadowColor = accentColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(margin, margin, 1600 - margin*2, canvasHeight - margin*2 - 200); 
    ctx.restore();
    
    // Header Section
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(margin + 20, margin + 20, 1600 - margin*2 - 40, 280, 40);
    ctx.fill();
    
    // Logo and Title
    const headerCenterY = margin + 160;
    
    // Logo
    ctx.save();
    ctx.translate(140, margin + 60);
    const logoSize = 200;
    ctx.strokeStyle = greenColor;
    ctx.lineWidth = 16;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(logoSize * 0.2, logoSize * 0.2);
    ctx.lineTo(logoSize * 0.2, logoSize * 0.8);
    ctx.moveTo(logoSize * 0.8, logoSize * 0.2);
    ctx.lineTo(logoSize * 0.8, logoSize * 0.8);
    ctx.moveTo(logoSize * 0.2, logoSize * 0.5);
    ctx.lineTo(logoSize * 0.8, logoSize * 0.5);
    ctx.stroke();

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
    ctx.font = 'bold 85px sans-serif';
    ctx.fillText('כרטיס היכרויות של החצי השני', 1450, headerCenterY - 20);
    
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText('אנשים פוגשים אנשים', 1450, headerCenterY + 50);

    // Image Section
    const imgX = 200;
    const imgY = 400;
    const imgW = 1200;
    const imgH = 1200;

    if (match.image_url) {
      try {
        const img = new Image();
        const isBase64 = match.image_url.startsWith('data:');
        const baseImageUrl = dataService.getPublicImageUrl(match.image_url);
        const imageUrl = isBase64 ? baseImageUrl : (baseImageUrl.includes('?') ? `${baseImageUrl}&t=${Date.now()}` : `${baseImageUrl}?t=${Date.now()}`);
        
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
        
        if (match.image_position) {
          const { x, y, zoom } = match.image_position;
          const scale = Math.max(imgW / img.width, imgH / img.height) * (zoom || 1);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          
          // Use absolute pixel offsets from image_position
          const drawX = imgX + (imgW - drawW) / 2 + x;
          const drawY = imgY + (imgH - drawH) / 2 + y;
          
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else if (match.crop_config) {
          const config = typeof match.crop_config === 'string' ? JSON.parse(match.crop_config) : match.crop_config;
          const { x, y, zoom } = config;
          
          const scale = Math.max(imgW / img.width, imgH / img.height) * (zoom || 1);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          
          // Calculate position based on percentage (x, y are 0-100)
          const drawX = imgX + (imgW - drawW) * (x / 100);
          const drawY = imgY + (imgH - drawH) * (y / 100);
          
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
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
        ctx.roundRect(imgX - 5, imgY - 5, imgW + 10, imgH + 10, 65);
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
    ctx.fillText('הכירו את', 800, 1680);
    
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 140px sans-serif';
    ctx.fillText(match.name, 800, 1830);

    // Details Grid
    const details = [
      { label: 'גיל', value: `${match.age || '---'} שנים` },
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
    const gridStartY = 1950;
    const rowHeight = 130;
    details.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 1450 - (col * 700);
      const y = gridStartY + (row * rowHeight);
      
      // Label
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(':' + item.label, x, y);
      
      // Value
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 46px sans-serif';
      
      let value = String(item.value || '---');
      const maxValWidth = 650;
      
      if (ctx.measureText(value).width > maxValWidth) {
        while (ctx.measureText(value + '...').width > maxValWidth && value.length > 0) {
          value = value.slice(0, -1);
        }
        value += '...';
      }
      ctx.fillText(value, x, y + 60);
    });

    // Sections
    let currentY = gridStartY + (Math.ceil(details.length / 2) * rowHeight) + 80;
    
    const drawWrappedText = (title: string, text: string, y: number) => {
      const lineHeight = 55;
      const sidePadding = 150;
      const maxWidth = 1600 - margin*2 - sidePadding*2;
      
      const fontSize = 40;
      ctx.font = `${fontSize}px sans-serif`;
      const words = String(text || '').split(' ');
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

      const boxHeight = (lines.length * lineHeight) + 150;
      
      // Box
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.05)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(margin + 80, y - 60, 1600 - margin*2 - 160, boxHeight, 40);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Title
      ctx.textAlign = 'right';
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 46px sans-serif';
      ctx.fillText(':' + title, 1450 - 60, y);
      
      // Text
      ctx.fillStyle = '#1e293b';
      ctx.font = `${fontSize}px sans-serif`;
      lines.forEach((line, i) => {
        ctx.fillText(line, 1450 - 60, y + 70 + (i * lineHeight));
      });

      return boxHeight;
    };

    if (match.about) {
      const height = drawWrappedText('קצת עליי', match.about, currentY);
      currentY += height + 60;
    }

    if (match.looking_for) {
      const height = drawWrappedText('מה אני מחפש/ת', match.looking_for, currentY);
      currentY += height + 100; // Increased spacing
    }

    // Footer
    const footerY = canvasHeight - 220; 
    
    // Decorative Box for Manager Label
    const isCreatorFemale = match.creator_gender ? match.creator_gender === 'female' : activeUser?.gender === 'female';
    const labelText = `נשלח על ידי ${isCreatorFemale ? 'המנהלת' : 'המנהל'}: ${match.creator_name || activeUser?.name || 'מערכת'}`;
    ctx.font = 'bold 60px sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    const boxWidth = textWidth + 120;
    const boxHeightLabel = 120;
    const boxX = (1600 - boxWidth) / 2;
    const boxY = footerY - 80;

    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeightLabel, 30);
    ctx.fill();
    
    // Inner border for box
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Manager Name Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, 800, footerY);
    
    if (match.creator_phone || activeUser?.phone) {
      ctx.save();
      ctx.font = 'bold 54px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(`ליצירת קשר: ${match.creator_phone || activeUser?.phone}`, 800, footerY + 100);
      ctx.restore();
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
  const [statsModalType, setStatsModalType] = useState<'males' | 'females' | 'publishedToday' | 'neverPublished' | 'publishedLastMonth' | 'notPublishedLastMonth' | 'joinedLastWeek' | 'joinedLastMonth' | 'publishedThisMonthMe' | 'publishedThisMonthGroup' | null>(null);
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
    if (!m.negiah) missing.push('שומר נגיעה');
    if (!m.smoking) missing.push('מעשן');
    if (!m.age_range) missing.push('טווח גילאים');
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
        'עיר': 'city',
        'שומר נגיעה': 'negiah',
        'מעשן': 'smoking',
        'טווח גילאים': 'age_range'
      };
      
      const dbField = fieldMap[editingField];
      if (!dbField) return;

      const updates = { [dbField]: editValue };
      const updatedMatch = await dataService.updateMatch(validationMatch.id, updates);

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
    } catch (err) {
      toast.error('שגיאה בעדכון הפרט');
    } finally {
      setIsSavingField(false);
    }
  };

  const fetchPublishHistory = async (match: Match) => {
    setIsLoadingHistory(true);
    setHistoryMatch(match);
    setShowHistoryModal(true);
    try {
      const logs = await dataService.getPublishLogs(match.id);
      setPublishHistory(logs);
    } catch (err) {
      toast.error('שגיאה בטעינת היסטוריית פרסומים');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const filterUser = teamManagerFilter ? { id: teamManagerFilter, role: 'admin' } as UserType : (activeUser || undefined);
      const matchesData = await dataService.getMatches(undefined, filterUser);
      
      // Filter out trash and archived/inactive candidates for the main dashboard view
      const activeMatches = matchesData.filter(m => {
        const isNotTrash = m.name && m.name.trim().length > 1;
        const isNotDeleted = !m.is_archived && (m.status === 'active' || m.status === 'available' || !m.status);
        return isNotTrash && isNotDeleted;
      });
      
      setMatches(activeMatches);
      
      const [statsData, settingsData, groupsData, usersData] = await Promise.all([
        dataService.getStats(activeUser || undefined, teamManagerFilter || undefined),
        dataService.getSettings(),
        dataService.getWhatsAppGroups(),
        dataService.getUsers()
      ]);
      
      setStats(statsData);
      setTemplate(settingsData.whatsapp_template || '');
      setInitialMessage(settingsData.whatsapp_initial_message || '');
      setWhatsappGroups(groupsData);
      setAllUsers(usersData);
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeUser, teamManagerFilter]);

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const matchToDelete = matches.find(m => m.id === deleteConfirmId);
      await dataService.deleteMatch(deleteConfirmId);
      if (matchToDelete) {
        await dataService.logActivity({
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          user_name: user?.name || 'System',
          action: 'מחיקת כרטיס',
          details: `מחיקת כרטיס משודך: ${matchToDelete.name}`,
          entity_type: 'match',
          entity_id: deleteConfirmId
        });
      }
      toast.success('הכרטיס נמחק');
      fetchData();
    } catch (err) {
      toast.error('שגיאה בתקשורת עם השרת');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handlePublish = async (match: Match) => {
    if (match.is_available === false) {
      toast.error('כרטיס זה סומן כלא פנוי לפירסום יש לשנות את זה בהערות על מנת לפרסם');
      return;
    }

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
    let effectiveTemplate = personalTemplate || template;
    
    // Use gender specific template if available
    if (match.type === 'male' && personalTemplateMale) {
      effectiveTemplate = personalTemplateMale;
    } else if (match.type === 'female' && personalTemplateFemale) {
      effectiveTemplate = personalTemplateFemale;
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
      g.category?.trim() === match.category?.trim() && 
      g.type === targetType
    );
    
    setCustomGroup(defaultGroup?.name || '');
    setCustomGroupLink(defaultGroup?.link || '');
    setSelectedGroupId(defaultGroup?.id || null);

    if (!defaultGroup) {
      toast.error(`לא נמצאה קבוצת וואטסאפ משוייכת לקטגוריה ${match.category || 'שלך'} עבור ${match.type === 'male' ? 'בנות' : 'בנים'}. אנא פנה למנהל הראשי.`);
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
    if (!selectedMatch || !selectedGroupId || !user) return;
    
    const group = whatsappGroups.find(g => g.id === selectedGroupId);
    if (!group) return;

    try {
      await dataService.recordPublish(selectedMatch.id, group.name, user.id, user.full_name, group.id);
      toast.success('הפרסום אושר ונרשם במערכת');
      setManualPublishConfirmed(true);
      setShowPublishModal(false);
      fetchData();
    } catch (err) {
      toast.error('שגיאה באישור הפרסום');
    }
  };

  const sendInitialMessage = async () => {
    if (!selectedMatch || !selectedGroupId) return;
    
    let effectiveInitialMessage = personalTemplate || initialMessage;
    if (selectedMatch.type === 'male' && personalTemplateMale) {
      effectiveInitialMessage = personalTemplateMale;
    } else if (selectedMatch.type === 'female' && personalTemplateFemale) {
      effectiveInitialMessage = personalTemplateFemale;
    }
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(effectiveInitialMessage);
      toast.success('הודעת הפתיחה הועתקה ללוח');
    } catch (err) {
      toast.error('שגיאה בהעתקה ללוח');
    }

    await dataService.markInitialSent(selectedGroupId.toString());
    
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
      await dataService.markInitialSent(selectedGroupId.toString());
      setIsInitialMarkedSent(true);
      fetchData();
      toast.success('סומן כנשלח');
    } catch (err) {
      toast.error('שגיאה בעדכון');
    }
  };

  const savePersonalTemplate = async () => {
    if (!user) return;
    try {
      const templateData = JSON.stringify({
        general: personalTemplate,
        male: personalTemplateMale,
        female: personalTemplateFemale
      });
      await dataService.updateUser(user.id, { 
        daily_message_template: templateData
      });
      toast.success('הודעות הפתיחה האישיות עודכנו');
      setShowPersonalTemplateModal(false);
      await refreshUser();
      fetchData();
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
      await Promise.all(
        selectedMatchIds.map(async id => {
          const matchToDelete = matches.find(m => m.id === id);
          await dataService.deleteMatch(id);
          if (matchToDelete) {
            await dataService.logActivity({
              user_id: user?.id || '00000000-0000-0000-0000-000000000000',
              user_name: user?.name || 'System',
              action: 'מחיקת כרטיס',
              details: `מחיקת כרטיס משודך: ${matchToDelete.name}`,
              entity_type: 'match',
              entity_id: id
            });
          }
        })
      );
      
      toast.success('הכרטיסים נמחקו בהצלחה');
      setSelectedMatchIds([]);
      fetchData();
    } catch (err) {
      toast.error('שגיאה במחיקה המונית');
    } finally {
      setBulkDeleteConfirm(false);
    }
  };

  const handleQuickUpdate = async (id: string, updates: Partial<Match>) => {
    try {
      await dataService.updateMatch(id, updates);
      toast.success('הכרטיס עודכן בהצלחה');
      fetchData();
    } catch (err) {
      toast.error('שגיאה בתקשורת עם השרת');
    }
  };

  const filteredMatches = matches.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(search.toLowerCase()) || 
                         (m.city || '').toLowerCase().includes(search.toLowerCase());
    
    // Type filter (from URL /matches/:type or dropdown)
    const matchesType = (() => {
      if (type === 'males') return m.type === 'male';
      if (type === 'females') return m.type === 'female';
      if (type === 'all') return true;
      if (!type) {
        if (filter === 'male') return m.type === 'male';
        if (filter === 'female') return m.type === 'female';
        return true;
      }
      return true;
    })();

    // Category filter
    const matchesCategory = (filter === 'all' || filter === 'male' || filter === 'female' || 
                            filter === 'not_published' || filter === 'published_today') || 
                            m.category === filter;
    
    // Status filter
    const matchesStatus = (() => {
      if (filter === 'not_published') return !m.last_published_at;
      if (filter === 'published_today') {
        if (!m.last_published_at) return false;
        const today = new Date().toISOString().split('T')[0];
        const pubDate = new Date(m.last_published_at).toISOString().split('T')[0];
        return pubDate === today;
      }
      return true;
    })();

    // Manager & Group filters (Super Admin)
    const matchesManager = (filterManager === 'all' || m.created_by === filterManager) &&
                          (selectedManagerIds.length === 0 || selectedManagerIds.includes(m.created_by || ''));
    const matchesGroup = (filterGroup === 'all' || m.category === filterGroup) &&
                        (selectedGroupType === 'all' || 
                         (selectedGroupType === 'פרויקט שח"ם' ? m.category?.startsWith('פרויקט שח"ם') : m.category === selectedGroupType));

    // Manager View (Strict Filtering)
    const matchesManagerView = (() => {
      if (user?.role !== 'admin') return true;
      if (managerFilter === 'me') return m.created_by === activeUser?.id;
      if (managerFilter === 'group') return m.created_by !== activeUser?.id;
      return true;
    })();

    // Completion filter
    const matchesCompletion = completionFilter === 'all' || 
                             (completionFilter === 'complete' ? getMissingFields(m).length === 0 : getMissingFields(m).length > 0);
    
    // Restore "deleted" filter: only show if not archived or status is active
    const isNotDeleted = !m.is_archived && (m.status === 'active' || m.status === 'available' || !m.status);
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus && 
           matchesManager && matchesGroup && matchesCompletion && isNotDeleted && matchesManagerView;
  }).sort((a, b) => {
    if (sortAlphabetically) {
      return (a.name || '').localeCompare(b.name || '', 'he');
    }
    if (sortByDate) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  const handleSelectMatch = (id: string, selected: boolean) => {
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

  const pageTitle = type === 'males' ? 'משודכים (בנים)' : type === 'females' ? 'משודכות (בנות)' : type === 'all' ? 'כל המשודכים' : 'Dashboard';

  const isViewer = user?.role === 'viewer';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Daily Suggestions Section */}
      {!isViewer && (
        <section className="space-y-4">
          <MatchSuggestions />
        </section>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-luxury-blue shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-slate-200">
              <Users size={32} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-extrabold text-text-main tracking-tight">{pageTitle}</h1>
              {stats?.totalMatchesSite !== undefined && (
                <button 
                  onClick={() => {
                    fetchGlobalBreakdown();
                    setShowGlobalBreakdownModal(true);
                  }}
                  className="bg-white text-luxury-blue px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-lg group border border-luxury-blue"
                >
                  <Globe size={18} className="group-hover:rotate-12 transition-transform" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">סה"כ משודכים</span>
                    <span className="text-lg font-black">{stats.totalMatchesSite}</span>
                  </div>
                </button>
              )}
            </div>
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
        
        {/* Personal Stats */}
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">הכרטיסים שלי</p>
              <p className="text-xl font-black text-slate-900">{matches.filter(m => m.created_by === user?.id).length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">פורסמו היום</p>
              <p className="text-xl font-black text-slate-900">{matches.filter(m => m.created_by === user?.id && m.last_published_at && new Date(m.last_published_at).toDateString() === new Date().toDateString()).length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {user?.role === 'super_admin' && (
            <button 
              onClick={async () => {
                try {
                  const demoMatch = {
                    type: Math.random() > 0.5 ? 'male' : 'female',
                    name: 'משודך דמו',
                    age: 25,
                    height: '1.75',
                    ethnicity: 'אשכנזי',
                    marital_status: 'רווק/ה',
                    city: 'ירושלים',
                    religious_level: 'חרדי',
                    service: 'לא',
                    occupation: 'סטודנט',
                    about: 'בחור טוב',
                    looking_for: 'בחורה טובה',
                    smoking: 'לא',
                    negiah: 'כן',
                    age_range: '20-30',
                    created_by: user?.id || 'system',
                    creator_name: user?.name || 'System',
                    creator_category: user?.category || 'General',
                    creation_source: 'manual'
                  };
                  
                  await dataService.createMatch(demoMatch as any);
                  toast.success('נוצר משודך דמו בהצלחה');
                  fetchData();
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
          <button 
            onClick={() => setShowManagersViewerModal(true)} 
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm md:text-lg border-luxury-blue/30 text-luxury-blue hover:bg-luxury-blue/5"
          >
            <Eye size={20} />
            צפיית כרטיסי מנהלים
          </button>
          <button 
            onClick={() => setShowNewMatchesModal(true)} 
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm md:text-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Sparkles size={20} />
            משודכים חדשים
          </button>
          {user?.role === 'team_leader' && (
            <button 
              onClick={() => setShowTeamLeaderDashboard(true)} 
              className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm md:text-lg border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Users size={20} />
              הצוות שלי
            </button>
          )}
          <button 
            onClick={() => navigate('/matches/new')} 
            disabled={isViewer}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            צור כרטיס חדש
          </button>
        </div>
      </div>

      {/* New Matches Modal */}
      {showNewMatchesModal && (
        <NewMatchesModal 
          matches={matches} 
          onClose={() => setShowNewMatchesModal(false)} 
        />
      )}

      {/* Team Leader Dashboard Modal */}
      {showTeamLeaderDashboard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">לוח בקרה - {getGenderedText(user?.gender, 'ראש צוות', 'ראשת צוות')}</h2>
                  <p className="text-slate-500 font-medium">ניהול ומעקב אחר צוות המנהלים שלך</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTeamLeaderDashboard(false)}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
              {loadingTeamData ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-bold">טוען נתוני צוות...</p>
                </div>
              ) : (
                <>
                  {/* Team Stats Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">מנהלים בצוות</p>
                      <p className="text-3xl font-black text-purple-600">{teamAdminsData.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">סה"כ משודכים בצוות</p>
                      <p className="text-3xl font-black text-blue-600">
                        {teamAdminsData.reduce((acc, admin) => acc + (managerCounts[admin.id] || 0), 0)}
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">פעולות אחרונות</p>
                      <p className="text-3xl font-black text-amber-600">{teamActivityLogs.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">פרסומים אחרונים</p>
                      <p className="text-3xl font-black text-emerald-600">{teamPublishLogs.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Team Members List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <Users size={20} className="text-purple-600" />
                          מנהלי הצוות
                        </h3>
                      </div>
                      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-right">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-4 text-sm font-bold text-slate-500">מנהל</th>
                              <th className="px-6 py-4 text-sm font-bold text-slate-500">קטגוריה</th>
                              <th className="px-6 py-4 text-sm font-bold text-slate-500">משודכים</th>
                              <th className="px-6 py-4 text-sm font-bold text-slate-500">סטטוס</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {teamAdminsData.map(admin => (
                              <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">
                                      {admin.name?.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-700">{admin.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                  {admin.category}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                                    {managerCounts[admin.id] || 0}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${admin.is_online ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                                    <span className="text-xs font-bold text-slate-500">
                                      {admin.is_online ? 'מחובר' : 'לא מחובר'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Team Activity Feed */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Activity size={20} className="text-amber-600" />
                        פעילות אחרונה בצוות
                      </h3>
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4 max-h-[400px] overflow-y-auto">
                        {teamActivityLogs.length === 0 ? (
                          <p className="text-center py-10 text-slate-400 font-medium">אין פעילות להצגה</p>
                        ) : (
                          teamActivityLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                <Activity size={18} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-slate-800 text-sm">{log.user_name}</span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(log.created_at).toLocaleString('he-IL')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium">{log.details}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Team Publications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <MessageSquare size={20} className="text-emerald-600" />
                      פרסומים אחרונים של הצוות
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teamPublishLogs.length === 0 ? (
                        <div className="col-span-full bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center">
                          <p className="text-slate-400 font-medium">אין פרסומים להצגה</p>
                        </div>
                      ) : (
                        teamPublishLogs.map((log, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                                  {log.admin_name?.charAt(0)}
                                </div>
                                <span className="font-bold text-slate-800 text-xs">{log.admin_name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-xs font-bold text-slate-700 mb-1">פורסם בקבוצה:</p>
                              <p className="text-xs text-emerald-700 font-black">{log.group_name}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Managers Viewer Modal */}
      {showManagersViewerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-luxury-blue text-white rounded-2xl shadow-lg shadow-luxury-blue/20">
                  <Eye size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">צפיית כרטיסי מנהלים</h2>
                  <p className="text-sm text-slate-500 font-medium">חפש וצפה בכרטיסים של מנהלים אחרים במערכת</p>
                </div>
              </div>
              <button onClick={() => setShowManagersViewerModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Sidebar: Managers List */}
              <div className="w-full md:w-80 border-l border-slate-100 bg-slate-50/30 overflow-y-auto p-4 space-y-4">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-black text-slate-900 mb-3 text-center">בחר מנהל לצפייה בכרטיס</p>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="חפש מנהל..."
                        className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-luxury-blue outline-none"
                        onChange={(e) => setViewerSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">רשימת מנהלים</p>
                  <button 
                    onClick={() => setViewerSelectedManagerId(null)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${!viewerSelectedManagerId ? 'bg-luxury-blue text-white shadow-lg shadow-luxury-blue/20 ring-2 ring-luxury-blue/50' : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${!viewerSelectedManagerId ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                        <Globe size={14} />
                      </div>
                      <span className="font-bold text-sm">כל המנהלים</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${!viewerSelectedManagerId ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {matches?.length || 0}
                    </span>
                  </button>
                  {allUsers?.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 border-4 border-luxury-blue/30 border-t-luxury-blue rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-xs text-slate-400 font-medium">טוען מנהלים...</p>
                    </div>
                  ) : (
                    allUsers?.filter(u => {
                      const matchesRole = u?.role !== 'viewer';
                      const matchesAffiliation = viewerAffiliation === 'all' || u?.category === viewerAffiliation;
                      const nameToSearch = (u?.name || u?.username || '').toLowerCase();
                      const matchesSearch = nameToSearch.includes(viewerSearch.toLowerCase());
                      return matchesRole && matchesAffiliation && matchesSearch;
                    }).map(m => {
                      const displayName = m?.name?.trim() || m?.username?.trim() || 'מנהל';
                      const isSelected = viewerSelectedManagerId === m?.id;
                      
                      return (
                        <div key={m?.id} className="group relative">
                          <button 
                            onClick={() => setViewerSelectedManagerId(m?.id)}
                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 ${
                              isSelected 
                                ? 'bg-luxury-blue text-white shadow-xl shadow-luxury-blue/30 ring-2 ring-luxury-blue/50 scale-[1.02]' 
                                : m?.gender === 'female' 
                                  ? 'bg-pink-50/50 hover:bg-pink-100 text-pink-700 border border-pink-100/50 hover:scale-[1.01]' 
                                  : 'bg-blue-50/50 hover:bg-blue-100 text-blue-700 border border-blue-100/50 hover:scale-[1.01]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-transform duration-300 ${
                                isSelected 
                                  ? 'bg-white/20 rotate-12' 
                                  : m?.gender === 'female' ? 'bg-pink-200 shadow-inner' : 'bg-blue-200 shadow-inner'
                              }`}>
                                {displayName[0]}
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="font-black text-sm truncate max-w-[130px] leading-tight">{displayName}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/50 text-slate-500'
                                  }`}>
                                    {m?.category || 'מנהל'}
                                  </span>
                                  {m?.is_online && (
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-colors ${
                                isSelected 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-amber-100 text-amber-600 border border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              }`}>
                                {managerCounts?.[m?.id || ''] || 0}
                              </span>
                            </div>
                          </button>
                          
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            {m?.phone && (
                              <a 
                                href={`https://wa.me/${m.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-green-500 text-white rounded-xl hover:scale-110 transition-transform shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageSquare size={14} />
                              </a>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openChat({ id: m.id, name: displayName });
                              }}
                              className="p-2 bg-luxury-blue text-white rounded-xl hover:scale-110 transition-transform shadow-lg"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Main Content: Candidates Grid */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/20">
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">בחר קבוצה לצפייה</p>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                      <button 
                        onClick={() => setViewerAffiliation('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewerAffiliation === 'all' ? 'bg-luxury-blue text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        הכל
                      </button>
                      {CATEGORIES.map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setViewerAffiliation(cat)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewerAffiliation === cat ? 'bg-luxury-blue text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">סינון מגדר</p>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                      <button 
                        onClick={() => setViewerGenderFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewerGenderFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        הכל
                      </button>
                      <button 
                        onClick={() => setViewerGenderFilter('male')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewerGenderFilter === 'male' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        משודכים
                      </button>
                      <button 
                        onClick={() => setViewerGenderFilter('female')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewerGenderFilter === 'female' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        משודכות
                      </button>
                    </div>
                  </div>

                  <div className="relative flex-1 min-w-[200px] mt-auto">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="חפש לפי שם או עיר..."
                      className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-luxury-blue outline-none"
                      value={viewerSearch}
                      onChange={(e) => setViewerSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-8 p-6 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <MatchSuggestions />
                  </div>

                  {sliderViewEnabled ? (
                    <div className="w-full">
                      <MatchCarousel 
                        matches={matches.filter(m => {
                          const matchesManager = !viewerSelectedManagerId || m.created_by === viewerSelectedManagerId;
                          const matchesAffiliation = viewerAffiliation === 'all' || m.creator_category === viewerAffiliation;
                          const matchesGender = viewerGenderFilter === 'all' || m.type === viewerGenderFilter;
                          const matchesSearch = m.name.toLowerCase().includes(viewerSearch.toLowerCase()) || m.city?.toLowerCase().includes(viewerSearch.toLowerCase());
                          return matchesManager && matchesAffiliation && matchesGender && matchesSearch;
                        })}
                        onMatchClick={(m) => setViewingMatch(m)}
                        rows={rowsPerPage}
                        cols={cardsPerRow}
                        minimal={showMinimal}
                        displaySize={displaySize}
                        isViewer={true}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {matches
                        .filter(m => {
                          const matchesManager = !viewerSelectedManagerId || m.created_by === viewerSelectedManagerId;
                          const matchesAffiliation = viewerAffiliation === 'all' || m.creator_category === viewerAffiliation;
                          const matchesGender = viewerGenderFilter === 'all' || m.type === viewerGenderFilter;
                          const matchesSearch = m.name.toLowerCase().includes(viewerSearch.toLowerCase()) || m.city?.toLowerCase().includes(viewerSearch.toLowerCase());
                          return matchesManager && matchesAffiliation && matchesGender && matchesSearch;
                        })
                        .map(match => (
                          <div key={match.id} className="relative group flex flex-col h-full">
                            <div className="flex-1">
                              <MatchCard 
                                match={match} 
                                size={displaySize}
                                allGroups={whatsappGroups}
                                onView={(m) => {
                                  setViewingMatch(m);
                                }}
                                onNotes={(m) => {
                                  setNotesMatch(m);
                                  setIsNoteAvailable(m.is_available !== false);
                                  fetchNotes(m.id);
                                  setShowNotesModal(true);
                                }}
                                onDesignedCard={(m) => {
                                  setSelectedMatch(m);
                                  generateDesignedImage(m);
                                  setShowDesignedCardModal(true);
                                }}
                                showCreator
                                isViewer={true}
                                minimal={true}
                              />
                            </div>
                            <div className="mt-auto">
                              <MatchActions
                                match={match}
                                whatsappGroups={whatsappGroups}
                                isViewer={true}
                                onOpenChat={(userId, initialMessage) => openChat({id: userId, name: match.creator_name || 'מנהל'}, initialMessage)}
                                onPublish={(m) => handlePublish(m)}
                                onNotes={(m) => {
                                  setNotesMatch(m);
                                  setIsNoteAvailable(m.is_available !== false);
                                  fetchNotes(m.id);
                                  setShowNotesModal(true);
                                }}
                                onHistory={(m) => {
                                  setSelectedMatch(m);
                                  fetchPublishHistory(m);
                                  setShowHistoryModal(true);
                                }}
                                onEdit={(id) => {
                                  // Need to implement edit modal logic
                                  toast.error('עריכה טרם מומשה');
                                }}
                                onDelete={(id) => {
                                  handleDelete(id);
                                  confirmDelete();
                                }}
                                onDesignedCard={(m) => {
                                  setSelectedMatch(m);
                                  generateDesignedImage(m);
                                  setShowDesignedCardModal(true);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  {matches.filter(m => {
                        const matchesManager = !viewerSelectedManagerId || m.created_by === viewerSelectedManagerId;
                        const matchesAffiliation = viewerAffiliation === 'all' || m.creator_category === viewerAffiliation;
                        const matchesGender = viewerGenderFilter === 'all' || m.type === viewerGenderFilter;
                        const matchesSearch = m.name.toLowerCase().includes(viewerSearch.toLowerCase()) || m.city?.toLowerCase().includes(viewerSearch.toLowerCase());
                        return matchesManager && matchesAffiliation && matchesGender && matchesSearch;
                      }).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <Search size={40} />
                      </div>
                      <p className="font-bold">לא נמצאו כרטיסים התואמים לחיפוש</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
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
                  
                  const isOwner = (m: Match) => activeUser?.role === 'super_admin' || 
                                         activeUser?.role === 'team_leader' ||
                                         m.created_by === activeUser?.id || 
                                         (activeUser?.category && m.creator_category === activeUser.category);

                  const publishedLastMonth = matches.filter(m => m.last_published_at && new Date(m.last_published_at) >= oneMonthAgo && isOwner(m)).length;
                  const notPublishedLastMonth = matches.filter(m => m.last_published_at && new Date(m.last_published_at) < oneMonthAgo && isOwner(m)).length;
                  const neverPublished = matches.filter(m => !m.last_published_at && isOwner(m)).length;
                  
                  const joinedLastWeek = matches.filter(m => new Date(m.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) && isOwner(m)).length;
                  const joinedLastMonth = matches.filter(m => new Date(m.created_at) >= oneMonthAgo && new Date(m.created_at) < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) && isOwner(m)).length;

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
        <div className="space-y-4">
          {user?.role !== 'super_admin' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => {
                    setStatsViewMode('me');
                    setTeamManagerFilter(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statsViewMode === 'me' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                >
                  המשודכים שלי
                </button>
                <button 
                  onClick={() => {
                    setStatsViewMode('group');
                    setTeamManagerFilter(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statsViewMode === 'group' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                >
                  {user?.role === 'team_leader' ? 'המשודכים בצוות שלי' : 'המשודכים בקבוצה שלי'}
                </button>
              </div>

              {user?.role === 'team_leader' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">צפה בנתוני מנהל/ת:</span>
                  <select 
                    value={teamManagerFilter || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeamManagerFilter(val || null);
                      if (val) setStatsViewMode('me');
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-luxury-blue/20"
                  >
                    <option value="">בחר מנהל/ת...</option>
                    {teamAdminsData.map(admin => (
                      <option key={admin.id} value={admin.id}>{admin.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="cursor-pointer" onClick={() => { setStatsModalType('males'); setShowStatsModal(true); }}>
              <StatCard 
                icon={<UserCheck className="text-luxury-blue" />} 
                label="סה״כ בנים" 
                value={user?.role === 'super_admin' ? (stats?.males || 0) : (statsViewMode === 'me' ? (stats?.malesMe || 0) : (stats?.malesGroup || 0))} 
                color="border-blue-100 bg-blue-50/30"
              />
            </div>
            <div className="cursor-pointer" onClick={() => { setStatsModalType('females'); setShowStatsModal(true); }}>
              <StatCard 
                icon={<Heart className="text-pink-600" fill="currentColor" />} 
                label="סה״כ בנות" 
                value={user?.role === 'super_admin' ? (stats?.females || 0) : (statsViewMode === 'me' ? (stats?.femalesMe || 0) : (stats?.femalesGroup || 0))} 
                color="border-pink-100 bg-pink-50/30"
              />
            </div>
            <div className="cursor-pointer" onClick={() => { 
              if (user?.role === 'super_admin') {
                setStatsModalType('publishedToday'); 
                setShowStatsModal(true); 
              } else {
                setStatsModalType(statsViewMode === 'me' ? 'publishedThisMonthMe' : 'publishedThisMonthGroup');
                setShowStatsModal(true);
              }
            }}>
              <StatCard 
                icon={<Send className="text-green-600" />} 
                label="פורסמו החודש" 
                value={user?.role === 'super_admin' ? (stats?.publishedThisMonth || 0) : (statsViewMode === 'me' ? (stats?.publishedThisMonthMe || 0) : (stats?.publishedThisMonthGroup || 0))} 
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
              onClick={() => setShowSameGroupsAdminsModal(true)}
            >
              <StatCard 
                icon={<Users className="text-purple-600" />} 
                label="מנהלים בקבוצות שלי" 
                value={adminsInSameGroups.length} 
                color="border-purple-100 bg-purple-50/30"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="card p-6 space-y-6">
        {user?.role === 'admin' && (
          <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-50">
            <button
              onClick={() => setManagerFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                managerFilter === 'all' ? 'bg-luxury-blue text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Users size={16} />
              כל המועמדים בקבוצה
            </button>
            <button
              onClick={() => setManagerFilter('me')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                managerFilter === 'me' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <UserCheck size={16} />
              המועמדים שלי
            </button>
            <button
              onClick={() => setManagerFilter('group')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                managerFilter === 'group' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Users size={16} />
              מועמדי הקבוצה (אחרים)
            </button>
          </div>
        )}

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
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500">מיון א-ב</span>
              <button 
                onClick={() => {
                  setSortAlphabetically(!sortAlphabetically);
                  if (!sortAlphabetically) setSortByDate(false);
                }}
                className={`w-10 h-5 rounded-full transition-all relative ${sortAlphabetically ? 'bg-luxury-blue' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sortAlphabetically ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500">מיון תאריך</span>
              <button 
                onClick={() => {
                  setSortByDate(!sortByDate);
                  if (!sortByDate) setSortAlphabetically(false);
                }}
                className={`w-10 h-5 rounded-full transition-all relative ${sortByDate ? 'bg-luxury-blue' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sortByDate ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
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
            <select 
              className="input-field py-3 px-4 font-bold"
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value as any)}
            >
              <option value="all">כל הכרטיסים (תקינות)</option>
              <option value="complete">כרטיסים מלאים</option>
              <option value="incomplete">כרטיסים עם פרטים חסרים</option>
            </select>
            <button 
              onClick={() => {
                setSearch('');
                setFilter('all');
                setCompletionFilter('all');
                setSelectedGroupType('all');
                setSelectedManagerIds([]);
                setManagerFilter('all');
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
                <button
                  onClick={() => {
                    setSelectedGroupType('all');
                    setShowShahamSubgroups(false);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedGroupType === 'all' ? 'bg-luxury-blue text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  הכל
                </button>

                {/* Shaham Project Grouping */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedGroupType('פרויקט שח"ם');
                      setShowShahamSubgroups(!showShahamSubgroups);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                      selectedGroupType === 'פרויקט שח"ם' || selectedGroupType.startsWith('פרויקט שח"ם')
                        ? 'bg-luxury-blue text-white shadow-md'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    פרויקט שח"ם
                    <ChevronDown size={12} className={`transition-transform ${showShahamSubgroups ? 'rotate-180' : ''}`} />
                  </button>

                  {showShahamSubgroups && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex gap-1 ml-2 p-1 bg-slate-50 rounded-full border border-slate-200"
                    >
                      {CATEGORIES.filter(c => c.startsWith('פרויקט שח"ם ') && c !== 'פרויקט שח"ם').map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedGroupType(cat)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            selectedGroupType === cat
                              ? 'bg-white text-luxury-blue shadow-sm border border-luxury-blue/20'
                              : 'bg-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {cat.replace('פרויקט שח"ם ', '')}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {CATEGORIES.filter(c => !c.startsWith('פרויקט שח"ם')).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedGroupType(cat);
                      setShowShahamSubgroups(false);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedGroupType === cat ? 'bg-luxury-blue text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
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

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <label className="flex items-center gap-2 px-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={sliderViewEnabled} 
                onChange={(e) => setSliderViewEnabled(e.target.checked)}
                className="w-4 h-4 text-luxury-blue rounded focus:ring-luxury-blue"
              />
              <span className="text-xs font-bold text-text-secondary">מצב סליידר</span>
            </label>
            {sliderViewEnabled && (
              <>
                <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
                  <span className="text-xs font-bold text-text-secondary px-2">שורות:</span>
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => setRowsPerPage(count)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        rowsPerPage === count ? 'bg-luxury-blue text-white shadow-sm' : 'text-text-secondary hover:bg-slate-50'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
                  <span className="text-xs font-bold text-text-secondary px-2">כרטיסים בשורה:</span>
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => setCardsPerRow(count)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        cardsPerRow === count ? 'bg-luxury-blue text-white shadow-sm' : 'text-text-secondary hover:bg-slate-50'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </>
            )}
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
      {sliderViewEnabled ? (
        <div className="w-full py-6">
          <MatchCarousel 
            matches={filteredMatches}
            onMatchClick={(m) => setViewingMatch(m)}
            rows={rowsPerPage}
            cols={cardsPerRow}
            minimal={showMinimal}
            displaySize={displaySize}
          />
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-6 custom-scrollbar" dir="rtl">
          <div className="flex gap-6 min-w-max px-2">
            {filteredMatches.map((match) => (
              <div key={match.id} className={`${
                displaySize === 'small' ? 'w-72' :
                displaySize === 'medium' ? 'w-80' :
                'w-96'
              }`}>
                <MatchCard 
                  match={match}
                  size={displaySize}
                  allGroups={whatsappGroups}
                  minimal={showMinimal}
                  onPublish={handlePublish}
                  onView={(m) => setViewingMatch(m)}
                  onEdit={(id) => navigate(`/matches/edit/${id}`)}
                  onDelete={handleDelete}
                  onHistory={fetchPublishHistory}
                  onImageClick={(m) => {
                    setImageMatch(m);
                    setImageUrlInput(m.image_url || '');
                    setShowImageModal(true);
                  }}
                  onQuickUpdate={handleQuickUpdate}
                  onSuggest={handleSuggest}
                  onNotes={(m) => {
                    setNotesMatch(m);
                    setIsNoteAvailable(m.is_available !== false);
                    fetchNotes(m.id);
                    setShowNotesModal(true);
                  }}
                  onDesignedCard={(m) => {
                    setSelectedMatch(m);
                    generateDesignedImage(m);
                    setShowDesignedCardModal(true);
                  }}
                  showCreator={user?.role === 'super_admin'}
                  selected={selectedMatchIds.includes(match.id)}
                  onSelect={handleSelectMatch}
                />
              </div>
            ))}
          </div>
          {filteredMatches.length === 0 && (
            <div className="col-span-full py-20 text-center card bg-white/50 border-dashed border-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">המערכת לא מצאה משודכים בטבלה</h3>
              <p className="text-slate-500 mt-1">נסה לשנות את מסנני החיפוש או ליצור כרטיס חדש</p>
            </div>
          )}
        </div>
      )}


      {/* Image Manager Modal */}
      <AnimatePresence>
        {showImageModal && imageMatch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card w-full max-w-lg p-8 space-y-6 shadow-2xl border-none"
            >
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-extrabold text-text-main flex items-center gap-2">
                  <ImageIcon size={24} className="text-luxury-blue" />
                  ניהול תמונת משודך
                </h2>
                <button onClick={() => setShowImageModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Current Image Preview */}
                <div className="aspect-square w-48 mx-auto rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50 relative group">
                  {imageMatch.image_url ? (
                    <img 
                      src={dataService.getPublicImageUrl(imageMatch.image_url)} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={48} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Option 1: File Upload */}
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                      <Plus size={18} />
                      אפשרות 1: העלאת קובץ מהמחשב
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsSavingImage(true);
                        try {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64 = reader.result as string;
                            await handleQuickUpdate(imageMatch.id, { image_url: base64 });
                            setImageMatch(prev => prev ? { ...prev, image_url: base64 } : null);
                            toast.success('התמונה הועלתה בהצלחה');
                          };
                          reader.readAsDataURL(file);
                        } catch (err) {
                          toast.error('שגיאה בהעלאת התמונה');
                        } finally {
                          setIsSavingImage(false);
                        }
                      }}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-luxury-blue file:text-white hover:file:bg-blue-600 transition-all cursor-pointer"
                    />
                  </div>

                  {/* Option 2: URL */}
                  <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                    <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                      <Paperclip size={18} />
                      אפשרות 2: שימוש בקישור (URL)
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        className="input-field flex-1 text-sm"
                        placeholder="הדבק כאן כתובת URL של תמונה..."
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                      />
                      <button 
                        onClick={async () => {
                          if (!imageUrlInput.trim()) return;
                          setIsSavingImage(true);
                          try {
                            let finalUrl = imageUrlInput;
                            try {
                              const response = await fetch(imageUrlInput);
                              const blob = await response.blob();
                              const reader = new FileReader();
                              const base64 = await new Promise<string>((resolve) => {
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                              });
                              finalUrl = base64;
                            } catch (e) {
                              console.warn("Could not convert URL to base64 due to CORS, saving as URL instead", e);
                            }

                            await handleQuickUpdate(imageMatch.id, { image_url: finalUrl });
                            setImageMatch(prev => prev ? { ...prev, image_url: finalUrl } : null);
                            toast.success('התמונה נשמרה במערכת');
                          } catch (err) {
                            toast.error('שגיאה בעדכון התמונה');
                          } finally {
                            setIsSavingImage(false);
                          }
                        }}
                        disabled={isSavingImage}
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-sm"
                      >
                        {isSavingImage ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                        שמור
                      </button>
                    </div>
                    <p className="text-[10px] text-purple-400">מומלץ להשתמש בקישור ישיר לקובץ תמונה (מסתיים ב-jpg, png וכו').</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={() => setShowImageModal(false)}
                  className="btn-secondary px-8 py-2.5"
                >
                  סגור
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <MatchCard 
                match={viewingMatch} 
                size="large"
                allGroups={whatsappGroups}
                onView={() => {}} 
                onEdit={(id) => {
                  setViewingMatch(null);
                  navigate(`/matches/edit/${id}`);
                }}
                onDelete={(id) => {
                  setViewingMatch(null);
                  handleDelete(id);
                }}
                onImageClick={(m) => {
                  setImageMatch(m);
                  setImageUrlInput(m.image_url || '');
                  setShowImageModal(true);
                }}
                onPublish={(m) => {
                  setViewingMatch(null);
                  handlePublish(m);
                }}
                onHistory={fetchPublishHistory}
                onQuickUpdate={handleQuickUpdate}
                onSuggest={handleSuggest}
                onNotes={(m) => {
                  setNotesMatch(m);
                  setIsNoteAvailable(m.is_available !== false);
                  fetchNotes(m.id);
                  setShowNotesModal(true);
                }}
                onDesignedCard={(m) => {
                  setSelectedMatch(m);
                  generateDesignedImage(m);
                  setShowDesignedCardModal(true);
                }}
                showCreator={user?.role === 'super_admin'}
                isViewer={user?.role !== 'super_admin' && viewingMatch.created_by !== user?.id}
                minimal={false}
              />
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={() => setViewingMatch(null)}
                  className="px-8 py-3 bg-white text-slate-900 rounded-xl font-bold shadow-xl hover:bg-slate-50 transition-all"
                >
                  סגור
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
                          'עיר': 'city',
                          'שומר נגיעה': 'negiah',
                          'מעשן': 'smoking',
                          'טווח גילאים': 'age_range'
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

      {/* Notes Modal */}
      <AnimatePresence>
        {showNotesModal && notesMatch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl space-y-6 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                    <Paperclip size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">הערות על {notesMatch.name}</h3>
                    <p className="text-sm text-slate-500">נהל הערות וסטטוס פניות עבור המשודך</p>
                  </div>
                </div>
                <button onClick={() => setShowNotesModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <textarea 
                  placeholder="הוסף הערה חדשה..."
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-luxury-blue outline-none min-h-[100px] resize-none"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-600">פנוי לפרסום?</span>
                    <button 
                      onClick={() => setIsNoteAvailable(!isNoteAvailable)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isNoteAvailable ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isNoteAvailable ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  <button 
                    onClick={handleAddNote}
                    disabled={!newNoteText.trim()}
                    className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                  >
                    הוסף הערה
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {loadingNotes ? (
                  <div className="py-10 text-center text-slate-400 animate-pulse">טוען הערות...</div>
                ) : matchNotes.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 italic">אין הערות עדיין</div>
                ) : (
                  matchNotes.map(note => (
                    <div key={note.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-luxury-blue">{note.user_name}</span>
                          <span className="text-[10px] text-slate-400">{new Date(note.created_at).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${note.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {note.is_available ? 'פנוי לפרסום' : 'לא פנוי'}
                          </span>
                          {(user?.id === note.user_id || user?.role === 'super_admin') && (
                            <button 
                              onClick={() => handleDeleteNote(note.id, note.user_id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Designed Card Modal */}
      <AnimatePresence>
        {showDesignedCardModal && generatedImageUrl && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl flex flex-col items-center gap-8"
            >
              <div className="relative w-full aspect-[1/2.125] max-h-[85vh] bg-white rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-8 border-white/10 group">
                <img 
                  src={generatedImageUrl} 
                  alt="Designed Card" 
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                
                <button 
                  onClick={() => setShowDesignedCardModal(false)}
                  className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-2xl hover:bg-black/60 transition-all backdrop-blur-md border border-white/10 shadow-lg"
                >
                  <Plus size={28} className="rotate-45" />
                </button>
              </div>
              
              <div className="flex gap-6 w-full max-w-md">
                {selectedMatch && getMissingFields(selectedMatch).length > 0 ? (
                  <div className="flex-1 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                    <p className="text-red-600 font-bold text-sm flex items-center justify-center gap-2">
                      <AlertTriangle size={16} />
                      לא ניתן להוריד כרטיס עם פרטים חסרים
                    </p>
                    <p className="text-red-400 text-[10px] mt-1">חסר: {getMissingFields(selectedMatch).join(', ')}</p>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedImageUrl;
                      link.download = `match-${selectedMatch?.name || 'card'}.png`;
                      link.click();
                    }}
                    className="flex-1 py-4 bg-white text-luxury-blue rounded-2xl font-black shadow-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 text-lg"
                  >
                    <ImageIcon size={24} />
                    הורד תמונה למכשיר
                  </button>
                )}
                <button 
                  onClick={() => setShowDesignedCardModal(false)}
                  className="px-10 py-4 bg-white/10 text-white border-2 border-white/20 rounded-2xl font-black hover:bg-white/20 transition-all text-lg"
                >
                  סגור
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSameGroupsAdminsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">מנהלים בקבוצות שלי</h3>
                <button onClick={() => setShowSameGroupsAdminsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Team Leaders Section */}
                {adminsInSameGroups.filter(u => u.role === 'team_leader').length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-luxury-blue uppercase tracking-widest border-b border-blue-100 pb-2">ראשי צוותים</h4>
                    {adminsInSameGroups.filter(u => u.role === 'team_leader').map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${presenceState[u.id] ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <div>
                            <p className="font-bold text-slate-800">{u.full_name || u.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {getGenderedText(u.gender, 'ראש צוות', 'ראשת צוות')} | {u.category || 'ללא קטגוריה'} | {managerCounts[u.id] || 0} משודכים
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => u.phone && window.open(`https://wa.me/${u.phone.replace(/\D/g, '')}`)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="שלח וואטסאפ">
                            <Phone size={18} />
                          </button>
                          <button onClick={() => {
                            setShowSameGroupsAdminsModal(false);
                            openChat({ id: u.id, name: u.full_name || u.name });
                          }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="שלח הודעת צ'אט">
                            <MessageSquare size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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

        {/* Admins Section */}
        {user?.role === 'super_admin' && (
          <button 
            onClick={() => setShowMatchesManagement(true)}
            className="bg-luxury-blue text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all mb-4"
          >
            ניהול משודכים
          </button>
        )}
                {adminsInSameGroups.filter(u => u.role === 'admin' || u.role === 'super_admin').length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">מנהלים</h4>
                    {adminsInSameGroups.filter(u => u.role === 'admin' || u.role === 'super_admin').map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${presenceState[u.id] ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <div>
                            <p className="font-bold text-slate-800">{u.full_name || u.name}</p>
                            <p className="text-[10px] text-slate-500">
                              מנהל | {u.category || 'ללא קטגוריה'} | {managerCounts[u.id] || 0} משודכים
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => u.phone && window.open(`https://wa.me/${u.phone.replace(/\D/g, '')}`)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="שלח וואטסאפ">
                            <Phone size={18} />
                          </button>
                          <button onClick={() => {
                            setShowSameGroupsAdminsModal(false);
                            openChat({ id: u.id, name: u.full_name || u.name });
                          }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="שלח הודעת צ'אט">
                            <MessageSquare size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Viewers Section */}
                {adminsInSameGroups.filter(u => u.role === 'viewer').length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">צופים</h4>
                    {adminsInSameGroups.filter(u => u.role === 'viewer').map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${presenceState[u.id] ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <div>
                            <p className="font-bold text-slate-800">{u.full_name || u.name}</p>
                            <p className="text-[10px] text-slate-500">
                              צופה | {u.category || 'ללא קטגוריה'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => u.phone && window.open(`https://wa.me/${u.phone.replace(/\D/g, '')}`)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="שלח וואטסאפ">
                            <Phone size={18} />
                          </button>
                          <button onClick={() => {
                            setShowSameGroupsAdminsModal(false);
                            openChat({ id: u.id, name: u.full_name || u.name });
                          }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="שלח הודעת צ'אט">
                            <MessageSquare size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminsInSameGroups.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic">לא נמצאו מנהלים נוספים בקבוצות שלך</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConnectedAdminsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">מנהלים מחוברים</h3>
                <button onClick={() => setShowConnectedAdminsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {allUsers.filter(u => u.status === 'active').map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <OnlineIndicator isOnline={!!presenceState[u.id]} />
                      <div>
                        <p className="font-bold text-slate-800">{u.full_name || u.name}</p>
                        <p className="text-xs text-slate-500">{!!presenceState[u.id] ? 'מחובר' : 'לא מחובר'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => u.phone && window.open(`https://wa.me/${u.phone.replace(/\D/g, '')}`)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="שלח וואטסאפ">
                        <Phone size={18} />
                      </button>
                      <button onClick={() => {
                        setShowConnectedAdminsModal(false);
                        openChat({ id: u.id, name: u.name });
                      }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="שלח הודעת צ'אט">
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </div>
                ))}
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
                     statsModalType === 'publishedToday' ? 'פורסמו החודש' : 
                     statsModalType === 'publishedThisMonthMe' ? 'הפרסומים שלי החודש' :
                     statsModalType === 'publishedThisMonthGroup' ? 'פרסומי הקבוצה החודש' :
                     statsModalType === 'publishedLastMonth' ? 'פורסמו בחודש האחרון' :
                     statsModalType === 'notPublishedLastMonth' ? 'לא פורסמו מעל חודש' :
                     statsModalType === 'neverPublished' ? 'טרם פורסמו' :
                     statsModalType === 'joinedLastWeek' ? 'הצטרפו בשבוע האחרון' : 'הצטרפו בחודש האחרון'}
                  </h2>
                </div>
                {user?.role !== 'super_admin' && (statsModalType === 'publishedThisMonthMe' || statsModalType === 'publishedThisMonthGroup') && (
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => {
                        setStatsViewMode('me');
                        setStatsModalType('publishedThisMonthMe');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statsViewMode === 'me' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                    >
                      הפרסומים שלי ({stats?.publishedThisMonthMe || 0})
                    </button>
                    <button 
                      onClick={() => {
                        setStatsViewMode('group');
                        setStatsModalType('publishedThisMonthGroup');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statsViewMode === 'group' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                    >
                      פרסומי הקבוצה ({stats?.publishedThisMonthGroup || 0})
                    </button>
                  </div>
                )}
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

                        if (statsModalType === 'males') {
                          if (user?.role !== 'super_admin') {
                            const myCategories = [user?.category, user?.secondary_category].filter(Boolean);
                            return m.type === 'male' && m.creator_category && myCategories.includes(m.creator_category);
                          }
                          return m.type === 'male';
                        }
                        if (statsModalType === 'females') {
                          if (user?.role !== 'super_admin') {
                            const myCategories = [user?.category, user?.secondary_category].filter(Boolean);
                            return m.type === 'female' && m.creator_category && myCategories.includes(m.creator_category);
                          }
                          return m.type === 'female';
                        }
                        if (statsModalType === 'publishedToday' || statsModalType === 'publishedThisMonthMe' || statsModalType === 'publishedThisMonthGroup') {
                          const now = new Date();
                          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                          const matchesDate = m.last_published_at && new Date(m.last_published_at) >= firstDayOfMonth;
                          
                          if (!matchesDate) return false;
                          
                          if (statsModalType === 'publishedThisMonthMe') {
                            return m.created_by === user?.id;
                          }
                          
                          if (statsModalType === 'publishedThisMonthGroup') {
                            const myCategories = [user?.category, user?.secondary_category].filter(Boolean);
                            return (m.creator_category && myCategories.includes(m.creator_category));
                          }
                          
                          return true;
                        }
                        if (statsModalType === 'neverPublished') {
                          const isOwner = activeUser?.role === 'super_admin' || 
                                         activeUser?.role === 'team_leader' ||
                                         m.created_by === activeUser?.id || 
                                         (activeUser?.category && m.creator_category === activeUser.category);
                          return !m.last_published_at && isOwner;
                        }
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

      {/* Global Breakdown Modal */}
      <AnimatePresence>
        {showGlobalBreakdownModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 bg-luxury-blue text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Globe size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">סטטיסטיקת משודכים באתר</h2>
                    <p className="text-sm opacity-80 font-bold">פירוט לפי קבוצות ומנהלים</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGlobalBreakdownModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loadingGlobalBreakdown ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <RefreshCw size={40} className="text-luxury-blue animate-spin" />
                    <p className="font-black text-slate-400">טוען נתונים מהאתר...</p>
                  </div>
                ) : globalBreakdownData ? (
                  <div className="space-y-4">
                    {Object.entries(globalBreakdownData).map(([category, data]: [string, any]) => (
                      <div key={category} className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/50">
                        <button 
                          onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                          className="w-full p-5 flex items-center justify-between hover:bg-slate-100 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                              <Users size={24} className="text-luxury-blue" />
                            </div>
                            <div className="text-right">
                              <h3 className="font-black text-slate-900">{category}</h3>
                              <p className="text-xs text-slate-500 font-bold">{data.total} משודכים • {data.males} בנים • {data.females} בנות</p>
                            </div>
                          </div>
                          {expandedCategory === category ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>

                        <AnimatePresence>
                          {expandedCategory === category && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-white border-t border-slate-100"
                            >
                              <div className="p-4 space-y-2">
                                {Object.entries(data.managers).map(([managerId, mData]: [string, any]) => (
                                  <div key={managerId} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-luxury-blue/10 text-luxury-blue rounded-full flex items-center justify-center text-[10px] font-black">
                                        {mData.name[0]}
                                      </div>
                                      <span className="text-sm font-black text-slate-800">{mData.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">בנים</span>
                                        <span className="text-xs font-black text-blue-600">{mData.males}</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">בנות</span>
                                        <span className="text-xs font-black text-pink-600">{mData.females}</span>
                                      </div>
                                      <div className="flex flex-col items-center bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">סה"כ</span>
                                        <span className="text-xs font-black text-slate-900">{mData.total}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 font-bold">אין נתונים זמינים</div>
                )}
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0">
                <button 
                  onClick={() => setShowGlobalBreakdownModal(false)}
                  className="w-full py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-sm"
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
                senderName={user?.name}
                groupIdNum={selectedGroupId || undefined}
                groupLink={whatsappGroups.find(g => g.id === selectedGroupId)?.link || ""}
                currentMatch={selectedMatch}
                matchMessage={customMessage}
                matchImage={generatedImageUrl}
                defaultTab={publishModalTab}
                openingMessage={
                  (selectedMatch.type === 'male' ? personalTemplateMale : personalTemplateFemale) 
                  || personalTemplate 
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
                onAdjustImage={async (direction) => {
                  if (!selectedMatch) return;
                  const config = selectedMatch.crop_config || { x: 50, y: 50, zoom: 1 };
                  let newConfig = { ...config };
                  
                  switch(direction) {
                    case 'up': newConfig.y = Math.max(0, config.y - 5); break;
                    case 'down': newConfig.y = Math.min(100, config.y + 5); break;
                    case 'left': newConfig.x = Math.max(0, config.x - 5); break;
                    case 'right': newConfig.x = Math.min(100, config.x + 5); break;
                    case 'zoomIn': newConfig.zoom = Math.min(3, (config.zoom || 1) + 0.1); break;
                    case 'zoomOut': newConfig.zoom = Math.max(1, (config.zoom || 1) - 0.1); break;
                  }
                  
                  const updated = await dataService.updateMatch(selectedMatch.id, { crop_config: newConfig });
                  setSelectedMatch(updated);
                  generateDesignedImage(updated);
                }}
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
                    senderName={user?.name}
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

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode, label: string, value: number, color: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`card p-8 flex items-center gap-6 border-2 ${color} hover:scale-[1.02] transition-transform ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
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
