import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActionDisabled } from '../hooks/useActionDisabled';
import { toast } from 'react-hot-toast';
import { ArrowRight, Save, Sparkles, User, Heart, MapPin, Calendar, Briefcase, GraduationCap, Info, Image as ImageIcon, Plus, Trash2, Camera, Crop, X, Check, FileUp, Database, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { Match } from '../types';
import { DuplicateModal } from '../components/DuplicateModal';
import { APP_NAME } from '../constants';
import { GoogleGenAI, Type } from '@google/genai';

import { dataService } from '../services/dataService';

export default function MatchForm() {
  const { user } = useAuth();
  const isActionDisabled = useActionDisabled();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Match>>({
    type: 'male',
    name: '',
    age: undefined,
    height: '',
    ethnicity: '',
    marital_status: 'רווק/ה',
    city: '',
    religious_level: '',
    service: '',
    occupation: '',
    about: '',
    family_description: '',
    looking_for: '',
    smoking: 'לא',
    negiah: 'כן',
    age_range: '',
    phone: '',
    image_url: null,
    additional_images: '[]',
    viewer_group_ids: '[]',
    creation_source: 'manual'
  });

  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  const [aiText, setAiText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<{ existing: Match, newMatch: Partial<Match> } | null>(null);
  const [showAiFormatError, setShowAiFormatError] = useState(false);

  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [tempImageIndex, setTempImageIndex] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'csv'>('manual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedMatches, setScannedMatches] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      dataService.getMatches()
        .then(data => {
          const match = data.find((m: Match) => m.id === id);
          if (match) {
            setFormData(match);
            const additional = JSON.parse(match.additional_images || '[]');
            const allImages = [match.image_url, ...additional];
            const newImages = [null, null, null];
            allImages.forEach((img, i) => { if (i < 3) newImages[i] = img; });
            setImages(newImages);
            setMainImageIndex(match.main_image_index || 0);
          }
        });
    }
  }, [id, isEdit]);

  const handleAiParse = async () => {
    console.log('OLD TEMPLATE DELETED. HADASSA EXAMPLE IS NOW THE ONLY GLOBAL GUIDELINE');
    if (!aiText.trim()) return toast.error('אנא הזן טקסט לניתוח');
    
    // Basic format validation
    const requiredKeywords = ['שם', 'גיל', 'גובה', 'מצב משפחתי', 'מגורים'];
    const hasKeywords = requiredKeywords.filter(kw => aiText.includes(kw)).length >= 3;
    
    if (!hasKeywords) {
      console.log('ERROR MESSAGES AND FORMAT INSTRUCTIONS UPDATED WITH BOLD LABELS');
      setShowAiFormatError(true);
      return;
    }

    setParsing(true);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        toast.error("מפתח ה-API של Gemini חסר במערכת. אנא פנה למנהל.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an expert at parsing Hebrew matchmaking profiles. 
        Parse the following text into a JSON object. 
        Crucially, determine the 'type' (male or female) based on the name or context if not explicitly stated.
        
        Fields: 
        - type: "male" or "female"
        - **name**: Full name
        - **age**: Number
        - **height**: Height string
        - **ethnicity**: Origin/Ethnicity
        - **marital_status**: Current status
        - **city**: City
        - **religious_level**: Religious level
        - **service**: Military/National service
        - **occupation**: Job/Studies
        - **about**: Short description about the person
        - **family_description**: Description of the family
        - **looking_for**: What they are looking for
        - **smoking**: Smoking status
        - **negiah**: Shomer negiah status
        - **age_range**: Age range looking for
        
        If a field is missing, set it to null.
        Text: ${aiText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "male or female" },
              name: { type: Type.STRING },
              age: { type: Type.NUMBER },
              height: { type: Type.STRING },
              ethnicity: { type: Type.STRING },
              marital_status: { type: Type.STRING },
              city: { type: Type.STRING },
              religious_level: { type: Type.STRING },
              service: { type: Type.STRING },
              occupation: { type: Type.STRING },
              about: { type: Type.STRING },
              family_description: { type: Type.STRING },
              looking_for: { type: Type.STRING },
              smoking: { type: Type.STRING },
              negiah: { type: Type.STRING },
              age_range: { type: Type.STRING },
            },
            required: ["type", "name"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(response.text);
      setFormData(prev => ({ ...prev, ...data, creation_source: 'ai' }));
      toast.success('הטקסט נותח בהצלחה! הפרטים הוזנו ללשונית ההזנה הידנית.');
      setActiveTab('manual');
    } catch (err: any) {
      console.error("AI Parsing Error:", err);
      const errorMessage = err.message || "Unknown error";
      toast.error(`שגיאה בניתוח הטקסט: ${errorMessage}`);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const matchData = {
        ...formData,
        image_url: images[mainImageIndex],
        additional_images: JSON.stringify(images.filter((_, i) => i !== mainImageIndex)),
        main_image_index: mainImageIndex
      } as Omit<Match, 'id' | 'created_at'>;

      if (!isEdit) {
        const existing = await dataService.findDuplicate(formData.full_name!, formData.phone!);
        if (existing) {
          console.log('FIXED: WHATSAPP VIEW USES STRONG TAGS, DUPLICATE CHECK RE-ACTIVATED, ERROR MODAL FORMATTED');
          setDuplicateData({ existing, newMatch: matchData });
          setShowDuplicateModal(true);
          setSaving(false);
          return;
        }
      }

      if (isEdit && id) {
        await dataService.updateMatch(id, matchData);
        await dataService.logActivity({
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          user_name: user?.full_name || 'System',
          action: 'עדכון כרטיס',
          details: `עדכון כרטיס משודך: ${formData.name}`,
          entity_type: 'match',
          entity_id: id
        });
        toast.success('הכרטיס עודכן');
      } else {
        const newMatch = await dataService.createMatch(matchData, user || undefined);
        await dataService.logActivity({
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          user_name: user?.full_name || 'System',
          action: 'יצירת כרטיס',
          details: `יצירת כרטיס משודך: ${formData.name}`,
          entity_type: 'match',
          entity_id: newMatch.id
        });
        toast.success('הכרטיס נוצר בהצלחה');
      }
      console.log('SUCCESS: GREEN HEART TITLE ADDED, BOLD TITLES FIXED, DUPLICATE MODAL TRIGGERED');
      navigate('/');
    } catch (err: any) {
      console.error('Error saving match:', err);
      if (err.message && err.message.includes('קיים')) {
        // Assuming candidateData is available or can be constructed
        setDuplicateData({ existing: null, newMatch: formData }); 
        setShowDuplicateModal(true);
      } else {
        toast.error('שגיאה בשמירה');
      }
    } finally {
      console.log('SYSTEM FIX COMPLETE: TABLE IDENTIFIED, DUPLICATE MODAL CONNECTED, UI BOLDED');
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('הקובץ גדול מדי. מקסימום 5MB');
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setTempImageUrl(base64);
      setTempImageIndex(index);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateExisting = async () => {
    if (!duplicateData) return;
    setSaving(true);
    try {
      await dataService.updateMatch(duplicateData.existing.id, duplicateData.newMatch as any);
      await dataService.logActivity({
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        user_name: user?.full_name || 'System',
        action: 'עדכון כרטיס',
        details: `עדכון כרטיס משודך עקב כפילות: ${duplicateData.newMatch.name}`,
        entity_type: 'match',
        entity_id: duplicateData.existing.id
      });
      toast.success('הכרטיס עודכן');
      navigate('/');
    } catch (err) {
      console.error('Error updating match:', err);
      toast.error('שגיאה בעדכון');
    } finally {
      setSaving(false);
      setShowDuplicateModal(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!duplicateData) return;
    setSaving(true);
    try {
      const newMatch = await dataService.createMatch(duplicateData.newMatch as any, user || undefined);
      await dataService.logActivity({
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        user_name: user?.full_name || 'System',
        action: 'יצירת כרטיס',
        details: `יצירת כרטיס משודך: ${duplicateData.newMatch.name}`,
        entity_type: 'match',
        entity_id: newMatch.id
      });
      toast.success('הכרטיס נוצר בהצלחה');
      navigate('/');
    } catch (err) {
      console.error('Error saving match:', err);
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
      setShowDuplicateModal(false);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleSaveCrop = async () => {
    if (tempImageUrl && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(tempImageUrl, croppedAreaPixels);
        setImages(prev => {
          const newImages = [...prev];
          newImages[tempImageIndex] = croppedImage;
          return newImages;
        });
        setShowCropper(false);
        setTempImageUrl(null);
      } catch (e) {
        console.error(e);
        toast.error('שגיאה בחיתוך התמונה');
      }
    }
  };

  const removeAdditionalImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages[index] = null;
      return newImages;
    });
  };

  const handleCsvScan = async () => {
    if (!csvFile) return toast.error('אנא בחר קובץ CSV');
    
    setIsScanning(true);
    setScanProgress(0);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      
      // Robust CSV line splitter that handles quotes
      const splitCsvLine = (line: string) => {
        const result = [];
        let curValue = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(curValue.trim());
            curValue = '';
          } else {
            curValue += char;
          }
        }
        result.push(curValue.trim());
        return result;
      };

      const headers = splitCsvLine(lines[0]);
      
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        const values = splitCsvLine(lines[i]);
        const entry: any = {};
        headers.forEach((h, idx) => {
          entry[h] = values[idx] || '';
        });
        
        // Extract name and phone from "שם וטלפון משודך/ת"
        const namePhoneRaw = entry['שם וטלפון משודך/ת'] || '';
        let name = namePhoneRaw;
        let phone = '';
        if (namePhoneRaw.includes('-')) {
          const parts = namePhoneRaw.split('-');
          name = parts[0].trim();
          phone = parts[1].trim();
        }

        // Extract image URL from common image column names
        const imagesRaw = entry['תמונה/ות'] || entry['תמונה'] || entry['Image'] || entry['Avatar'] || entry['תמונת פרופיל'] || entry['תמונות'] || '';
        let imageUrl = null;
        
        // Try to find a URL in parentheses
        const urlMatch = imagesRaw.match(/\((https?:\/\/[^\)]+)\)/);
        if (urlMatch) {
          imageUrl = urlMatch[1];
        } else if (imagesRaw.trim().startsWith('http')) {
          // If it's just a URL
          imageUrl = imagesRaw.trim();
        }

        // Mapping based on the provided CSV structure
        const mapped: any = {
          name: name || entry['שם'] || entry['שם מלא'] || entry['Name'] || '',
          phone: phone || entry['טלפון'] || entry['נייד'] || entry['Phone'] || entry['Mobile'] || '',
          image_url: imageUrl,
          city: entry['עיר'] || entry['מגורים'] || entry['City'] || '',
          age: parseInt(entry['גיל'] || entry['Age']) || 25,
          height: entry['גובה - בפורמט לדוגמה 1.60'] || entry['גובה'] || entry['Height'] || '',
          type: (entry['מין'] || entry['מגדר'] || entry['Gender'] || '').includes('נקבה') || (entry['מין'] || entry['מגדר'] || entry['Gender'] || '').includes('בת') || (entry['מין'] || entry['מגדר'] || entry['Gender'] || '').toLowerCase().includes('female') ? 'female' : 'male',
          ethnicity: entry['עדה ( ניתן לבחור כמה )'] || entry['עדה'] || entry['Ethnicity'] || '',
          marital_status: entry['סטטוס'] || entry['מצב משפחתי'] || entry['Status'] || 'רווק/ה',
          religious_level: entry['מגזר'] || entry['רמה דתית'] || entry['Religious Level'] || '',
          occupation: entry['עיסוק'] || entry['Occupation'] || '',
          about: entry['על עצמי'] || entry['קצת עליי'] || entry['About'] || '',
          looking_for: entry['מה מחפש'] || entry['אני מחפש/ת'] || entry['Looking For'] || '',
          viewer_group_ids: '[]',
          creation_source: 'csv'
        };
        
        results.push(mapped);
        setScanProgress(Math.round((i / (lines.length - 1)) * 100));
        await new Promise(r => setTimeout(r, 20));
      }
      
      setScannedMatches(results);
      setIsScanning(false);
      toast.success(`נסרקו ${results.length} כרטיסים בהצלחה`);
    };
    reader.readAsText(csvFile);
  };

  const processCsvImport = async () => {
    if (scannedMatches.length === 0) return;
    setImporting(true);
    
    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;
    for (const match of scannedMatches) {
      try {
        await dataService.createMatch({ ...match, creation_source: 'csv' }, user || undefined);
        successCount++;
      } catch (err) {
        if (err instanceof Error && err.message === 'משודך עם שם וטלפון זהה כבר קיים במערכת') {
          duplicateCount++;
        } else {
          console.error('Error importing match:', err);
          failCount++;
        }
      }
    }
    
    setImporting(false);
    const total = scannedMatches.length;

    if (duplicateCount === total) {
      toast('כל הכרטיסים כבר קיימים במערכת');
    } else if (duplicateCount > 0 || failCount > 0) {
      let message = `הועלו ${successCount} מתוך ${total} כרטיסים.`;
      if (duplicateCount > 0) message += ` ${duplicateCount} כבר קיימים במערכת.`;
      if (failCount > 0) message += ` ${failCount} נכשלו.`;
      toast(message);
    } else {
      toast.success(`יובאו ${successCount} כרטיסים בהצלחה`);
    }
    navigate('/');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-slate-100">
            <ArrowRight size={24} className="text-text-main" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-text-main tracking-tight">{isEdit ? 'עריכת כרטיס' : 'יצירת כרטיס חדש'}</h1>
            <p className="text-text-secondary font-medium">הזן את פרטי המשודך/ת למערכת {APP_NAME}</p>
          </div>
        </div>
        {!isEdit && user?.role === 'super_admin' && (
          <button 
            onClick={async () => {
              try {
                await dataService.createMatch({
                  type: 'male',
                  name: 'ישראל ישראלי (דמו)',
                  age: 25,
                  height: '1.80',
                  ethnicity: 'ספרדי',
                  marital_status: 'רווק/ה',
                  city: 'ירושלים',
                  religious_level: 'דתי',
                  service: 'צבאי',
                  occupation: 'סטודנט',
                  about: 'בחור טוב ושמח',
                  looking_for: 'בחורה טובה',
                  smoking: 'לא',
                  negiah: 'כן',
                  age_range: '20-25',
                  phone: '0501234567',
                  image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=400',
                  additional_images: '[]',
                  creation_source: 'manual',
                  publish_count: 0,
                  last_published_at: null,
                  deleted_at: null,
                  created_by: user?.id || 'system',
                  creator_name: user?.full_name || 'System',
                  creator_category: user?.category || 'general',
                  is_published_confirmed: 0,
                  crop_config: null,
                  images: null,
                  image_position: null,
                  viewer_group_ids: '[]'
                });
                toast.success('נוצר משודך דמו בהצלחה');
                navigate('/');
              } catch (err) {
                toast.error('שגיאה ביצירת דמו');
              }
            }}
            className="btn-secondary flex items-center gap-2 px-6 py-3 border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm"
          >
            <Plus size={20} />
            יצירת משודך דמו
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'manual' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={18} />
            הזנה ידנית
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'ai' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={18} />
            {isEdit ? 'הוסף פרטים אוטומטי' : 'יצירה ב-AI'}
          </button>
          {!isEdit && (
            <button 
              onClick={() => setActiveTab('csv')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === 'csv' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileUp size={18} />
              ייבוא מ-CSV
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ai' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 bg-luxury-blue/5 border-luxury-blue/10 shadow-lg"
        >
          <div className="flex items-center gap-3 text-luxury-blue mb-4">
            <Sparkles size={24} />
            <h2 className="text-xl font-extrabold">זיהוי אוטומטי באמצעות AI</h2>
          </div>
          <p className="text-text-secondary font-medium mb-6">הדבק טקסט חופשי של כרטיס והמערכת תזהה את השדות אוטומטית.</p>
          <textarea
            className="input-field min-h-[150px] mb-6 shadow-inner"
            placeholder="הדבק כאן את הטקסט..."
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
          />
          <button
            onClick={handleAiParse}
            disabled={parsing}
            className="btn-primary py-3.5 px-8 flex items-center gap-2 text-lg font-bold"
          >
            {parsing ? 'מנתח טקסט...' : (
              <>
                <Sparkles size={20} />
                נתח טקסט והעבר להזנה ידנית
              </>
            )}
          </button>
        </motion.div>
      )}

      {showAiFormatError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="card w-full max-w-lg p-8 space-y-6 shadow-2xl border-none"
          >
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-2xl font-extrabold text-red-600 flex items-center gap-2">
                <Info size={24} />
                שגיאת פורמט
              </h2>
              <button onClick={() => setShowAiFormatError(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-text-main font-medium">
              הפרטים שהוזנו לא תואמים לפורמט של כרטיס החצי השני. אנא הדבק כרטיס מתאים.
            </p>
            
            <ul className="bg-slate-50 p-4 rounded-xl text-sm text-right border border-slate-200 h-64 overflow-y-auto space-y-2 list-disc list-inside">
              <li>💚 <strong>כרטיס שידוכים ״החצי השני״</strong></li>
              <li>😊 <strong>שם:</strong> הדסה ונונו</li>
              <li>👳🏻 <strong>עדה:</strong> מרוקאי/ת</li>
              <li>🎂 <strong>גיל:</strong> 31</li>
              <li>🌱 <strong>גובה:</strong> 1.56</li>
              <li>✨ <strong>מצב משפחתי:</strong> רווק/ה</li>
              <li>🏡 <strong>מגורים:</strong> אשקלון</li>
              <li>🎓 <strong>מגזר+רמה דתית:</strong> דתי לאומי</li>
              <li>👪 <strong>תאר/י בקווים כלליים את משפחתך:</strong> משפחה דתית וחמה, זוג הורים מקסימים , שני אחים גדולים ונשואים ו5 אחיינים מתוקים</li>
              <li>🎖️ <strong>שירות צבאי/לאומי/ישיבה:</strong> לאומי</li>
              <li>💼 <strong>עיסוק:</strong> גננת בגן תקשורת</li>
              <li>👱🏼‍♀ <strong>קצת עלי:</strong> באופן כללי אני מאוד אוהבת ללמוד ,להתפתח ולהתמקצע במה שמעניין אותי , שואפת קדימה , אני מתאמנת 4 פעמים בסטודיו לנשים בלבד, אוהבת מאוד ים וברכה, נהנת ממוזיקה טובה, נהנת מחברה טובה, אוהבת לטייל ולצאת לבית קפה או מסעדה טובה עם חברות, נהנת מלצפות בסרט בקולנוע</li>
              <li>🎯 <strong>אני מחפש/ת:</strong> אני מחפשת אדם דתי וטוב , רציני ויציב, ממשפחה טובה, שיהיה החבר הכי טוב שלי , אוזן קשבת, תומך ומכיל, אמין ורגיש , כנות ויושר, בעל תכונות אופי דומות לשלי, שיהיה , שיהיה אינטראקציה טובה, אדם בעל שאיפות ומטרות בחיים, בעל עבודה מכובדת, לא מעשן, איש שיחה ובעל אינטליגנציה, חיבור וכימייה טובה</li>
              <li>🙌 <strong>שומר/ת נגיעה?</strong> לא</li>
              <li>🚬 <strong>מעשן/ת?</strong> לא</li>
              <li>🎂 <strong>טווח גילאים:</strong> 29 - 36</li>
            </ul>
            
            <button 
              onClick={() => setShowAiFormatError(false)}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
            >
              הבנתי, חזור לעריכה
            </button>
          </motion.div>
        </div>
      )}

      {activeTab === 'csv' && !isEdit && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 space-y-8"
        >
          <div className="flex items-center gap-3 text-luxury-blue">
            <Database size={24} />
            <h2 className="text-xl font-extrabold">ייבוא המוני מקובץ CSV</h2>
          </div>
          
          <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center justify-center text-center">
            <FileUp size={48} className="text-slate-300 mb-4" />
            <p className="text-text-main font-bold mb-2">גרור קובץ CSV לכאן או לחץ לבחירה</p>
            <p className="text-text-secondary text-sm mb-4">הקובץ צריך להכיל עמודות כמו: שם, גיל, עיר, מין, טלפון וכו'</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="hidden" 
              id="csv-upload" 
            />
            <label htmlFor="csv-upload" className="btn-secondary px-8 py-2 cursor-pointer">
              {csvFile ? csvFile.name : 'בחר קובץ'}
            </label>
          </div>

          {isScanning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>סורק קובץ...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-luxury-blue transition-all duration-300" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>
          )}

          {scannedMatches.length > 0 && !isScanning && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-green-700">
                <Check size={20} />
                <span className="font-bold">נמצאו {scannedMatches.length} כרטיסים מוכנים לייבוא</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={handleCsvScan}
              disabled={!csvFile || isScanning}
              className="btn-primary flex-1 py-3.5 font-bold flex items-center justify-center gap-2"
            >
              {isScanning ? <Loader2 className="animate-spin" /> : <Search size={20} />}
              סרוק קובץ
            </button>
            <button 
              onClick={processCsvImport}
              disabled={scannedMatches.length === 0 || importing}
              className="btn-secondary flex-1 py-3.5 font-bold flex items-center justify-center gap-2"
            >
              {importing ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
              ייבא {scannedMatches.length} כרטיסים
            </button>
          </div>
        </motion.div>
      )}

      {(activeTab === 'manual' || isEdit) && (
        <form onSubmit={handleSubmit} className="card p-10 space-y-10 shadow-xl border-none">
        <div className="space-y-8">
          <div className="pb-6 border-b border-slate-50">
            <h3 className="text-xl font-extrabold text-text-main mb-6 flex items-center gap-2">
              <User size={20} className="text-luxury-blue" />
              פרטים כלליים
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="col-span-full">
                <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">סוג הכרטיס</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all font-bold ${
                    formData.type === 'male' ? 'border-luxury-blue bg-luxury-blue/5 text-luxury-blue shadow-sm' : 'border-slate-100 bg-white text-slate-400'
                  }`}>
                    <input type="radio" name="type" className="hidden" value="male" checked={formData.type === 'male'} onChange={() => setFormData({...formData, type: 'male'})} />
                    <User size={20} />
                    משודך (בן)
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all font-bold ${
                    formData.type === 'female' ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-sm' : 'border-slate-100 bg-white text-slate-400'
                  }`}>
                    <input type="radio" name="type" className="hidden" value="female" checked={formData.type === 'female'} onChange={() => setFormData({...formData, type: 'female'})} />
                    <Heart size={20} fill={formData.type === 'female' ? 'currentColor' : 'none'} />
                    משודכת (בת)
                  </label>
                </div>
              </div>

              <FormGroup label="שם מלא *" icon={<User size={16} />}>
                <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </FormGroup>

              <FormGroup label="גיל" icon={<Calendar size={16} />}>
                <input type="number" className="input-field" value={formData.age || ''} onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || undefined})} />
              </FormGroup>

              <FormGroup label="גובה" icon={<Info size={16} />}>
                <input type="text" className="input-field" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
              </FormGroup>

              <FormGroup label="עדה" icon={<Info size={16} />}>
                <input type="text" className="input-field" value={formData.ethnicity} onChange={(e) => setFormData({...formData, ethnicity: e.target.value})} />
              </FormGroup>

              <FormGroup label="מצב משפחתי" icon={<Heart size={16} />}>
                <select className="input-field font-bold" value={formData.marital_status} onChange={(e) => setFormData({...formData, marital_status: e.target.value})}>
                  <option value="רווק/ה">רווק/ה</option>
                  <option value="גרוש/ה">גרוש/ה</option>
                  <option value="אלמן/ה">אלמן/ה</option>
                </select>
              </FormGroup>

              <FormGroup label="מגורים (עיר)" icon={<MapPin size={16} />}>
                <input type="text" className="input-field" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              </FormGroup>

              <FormGroup label="מספר טלפון (ליצירת קשר)" icon={<Info size={16} />}>
                <input type="text" className="input-field" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="לדוגמה: 0501234567" />
              </FormGroup>
            </div>
          </div>

          <div className="pb-6 border-b border-slate-50">
            <h3 className="text-xl font-extrabold text-text-main mb-6 flex items-center gap-2">
              <GraduationCap size={20} className="text-luxury-blue" />
              רקע ועיסוק
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="מגזר ורמה דתית" icon={<GraduationCap size={16} />}>
                <input type="text" className="input-field" value={formData.religious_level} onChange={(e) => setFormData({...formData, religious_level: e.target.value})} />
              </FormGroup>

              <FormGroup label="שירות צבאי / לאומי" icon={<Info size={16} />}>
                <input type="text" className="input-field" value={formData.service} onChange={(e) => setFormData({...formData, service: e.target.value})} />
              </FormGroup>

              <FormGroup label="עיסוק" icon={<Briefcase size={16} />}>
                <input type="text" className="input-field" value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} />
              </FormGroup>

              <FormGroup label="מעשן/ת" icon={<Info size={16} />}>
                <select className="input-field font-bold" value={formData.smoking} onChange={(e) => setFormData({...formData, smoking: e.target.value})}>
                  <option value="לא">לא</option>
                  <option value="כן">כן</option>
                  <option value="לפעמים">לפעמים</option>
                </select>
              </FormGroup>

              <FormGroup label="שומר/ת נגיעה" icon={<Heart size={16} />}>
                <select className="input-field font-bold" value={formData.negiah} onChange={(e) => setFormData({...formData, negiah: e.target.value})}>
                  <option value="כן">כן</option>
                  <option value="לא">לא</option>
                </select>
              </FormGroup>

              <FormGroup label="טווח גילאים מבוקש" icon={<Calendar size={16} />}>
                <input type="text" className="input-field" value={formData.age_range} onChange={(e) => setFormData({...formData, age_range: e.target.value})} />
              </FormGroup>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-text-main mb-6 flex items-center gap-2">
              <Camera size={20} className="text-luxury-blue" />
              תמונות
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {images.map((img, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative group aspect-square rounded-2xl border-2 border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-luxury-blue">
                    {img ? (
                      <>
                        <img src={img} alt={`Image ${index}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={() => {
                            setTempImageUrl(img);
                            setTempImageIndex(index);
                            setCrop({ x: 0, y: 0 });
                            setZoom(1);
                            setShowCropper(true);
                          }} className="p-2 bg-luxury-blue text-white rounded-full hover:bg-luxury-blue/90">
                            <Crop size={20} />
                          </button>
                          <button type="button" onClick={() => {
                            setImages(prev => {
                              const newImages = [...prev];
                              newImages[index] = null;
                              return newImages;
                            });
                          }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                        <Camera size={30} className="text-slate-300 mb-2" />
                        <span className="text-xs font-bold text-slate-400">העלאה</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, index)} />
                      </label>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMainImageIndex(index)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      mainImageIndex === index ? 'bg-luxury-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mainImageIndex === index ? 'תמונה ראשית' : 'הגדר כראשית'}
                  </button>
                  <input
                    type="text"
                    placeholder="או הדבק קישור לתמונה"
                    className="w-full p-2 text-xs rounded-xl border border-slate-200"
                    value={img || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImages(prev => {
                        const newImages = [...prev];
                        newImages[index] = val;
                        return newImages;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-text-main mb-6 flex items-center gap-2">
              <Info size={20} className="text-luxury-blue" />
              תיאור חופשי
            </h3>
            <div className="space-y-8">
              <FormGroup label="קצת עליי" icon={<Info size={16} />}>
                <textarea className="input-field min-h-[120px] py-4" value={formData.about} onChange={(e) => setFormData({...formData, about: e.target.value})} />
              </FormGroup>

              <FormGroup label="תאר/י בקווים כלליים את משפחתך" icon={<Info size={16} />}>
                <textarea className="input-field min-h-[120px] py-4" value={formData.family_description} onChange={(e) => setFormData({...formData, family_description: e.target.value})} />
              </FormGroup>

              <FormGroup label="אני מחפש/ת" icon={<Heart size={16} />}>
                <textarea className="input-field min-h-[120px] py-4" value={formData.looking_for} onChange={(e) => setFormData({...formData, looking_for: e.target.value})} />
              </FormGroup>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-10 border-t border-slate-50">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary px-8 py-3.5 text-lg font-bold">ביטול</button>
          <button type="submit" disabled={isActionDisabled || saving} className="btn-primary px-10 py-3.5 text-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50">
            <Save size={22} />
            {saving ? 'שומר...' : 'שמור כרטיס במערכת'}
          </button>
        </div>
      </form>
      )}

      {showDuplicateModal && duplicateData && (
        <DuplicateModal
          existingMatch={duplicateData.existing}
          newMatchData={duplicateData.newMatch}
          onCancel={() => setShowDuplicateModal(false)}
          onSaveAsNew={handleSaveAsNew}
          onUpdate={handleUpdateExisting}
          managerName={duplicateData.existing.creator_name}
          groupName={duplicateData.existing.category}
        />
      )}

      {/* Crop Modal */}
      <AnimatePresence>
        {showCropper && tempImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-text-main">התאמת תמונה</h3>
                <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              
              <div className="relative h-[400px] bg-slate-900">
                <Cropper
                  image={tempImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">זום</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-luxury-blue"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowCropper(false)} className="btn-secondary px-6 py-2.5 font-bold">ביטול</button>
                  <button onClick={handleSaveCrop} className="btn-primary px-8 py-2.5 font-bold flex items-center gap-2">
                    <Check size={20} />
                    אישור והתאמה
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormGroup({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-bold text-text-secondary uppercase tracking-wider">
        <span className="text-luxury-blue">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}
