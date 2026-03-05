import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ArrowRight, Save, Sparkles, User, Heart, MapPin, Calendar, Briefcase, GraduationCap, Info, Image as ImageIcon, Plus, Trash2, Camera, Crop, X, Check, FileUp, Database, Loader2, Search, RotateCw, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { Match } from '../types';
import { APP_NAME } from '../constants';

export default function MatchForm() {
  const { user } = useAuth();
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
    looking_for: '',
    smoking: 'לא',
    negiah: 'כן',
    age_range: '',
    phone: '',
    image_url: null,
    additional_images: '[]',
    creation_source: 'manual'
  });

  const [additionalImages, setAdditionalImages] = useState<string[]>([]);

  const [aiText, setAiText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAiFormatError, setShowAiFormatError] = useState(false);

  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'csv'>('manual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedMatches, setScannedMatches] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [rotation, setRotation] = useState(0);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/matches`)
        .then(res => res.json())
        .then(data => {
          const match = data.find((m: Match) => m.id === parseInt(id));
          if (match) {
            setFormData(match);
            try {
              const extras = JSON.parse(match.additional_images || '[]');
              const allImages = [match.image_url, ...extras].filter(Boolean);
              // Pad to 3
              const paddedImages = [...allImages, null, null, null].slice(0, 3);
              setImages(paddedImages);
              if (match.crop_config) {
                const config = JSON.parse(match.crop_config);
                setCrop(config.crop || { x: 0, y: 0 });
                setZoom(config.zoom || 1);
                setRotation(config.rotation || 0);
              }
            } catch (e) {
              setImages([match.image_url || null, null, null]);
            }
          }
        });
    }
  }, [id, isEdit]);

  const handleAiParse = async () => {
    if (!aiText.trim()) return toast.error('אנא הזן טקסט לניתוח');
    
    // Basic format validation
    const requiredKeywords = ['שם', 'גיל', 'גובה', 'מצב משפחתי', 'מגורים'];
    const hasKeywords = requiredKeywords.filter(kw => aiText.includes(kw)).length >= 3;
    
    if (!hasKeywords) {
      setShowAiFormatError(true);
      return;
    }

    setParsing(true);
    try {
      const res = await fetch('/api/parse-match-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await res.json();
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
      const url = isEdit ? `/api/matches/${id}` : '/api/matches';
      const method = isEdit ? 'PUT' : 'POST';
      
      const mainImage = images[selectedImageIndex];
      const otherImages = images.filter((_, i) => i !== selectedImageIndex && !!images[i]);
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image_url: mainImage,
          additional_images: JSON.stringify(otherImages),
          crop_config: mainImage ? JSON.stringify({ crop, zoom, rotation, croppedAreaPixels }) : null
        }),
      });
      if (res.ok) {
        toast.success(isEdit ? 'הכרטיס עודכן' : 'הכרטיס נוצר בהצלחה');
        navigate('/');
      } else {
        const data = await res.json();
        toast.error(data.error || 'שגיאה בשמירה');
      }
    } catch (err) {
      toast.error('שגיאה בחיבור לשרת');
    } finally {
      setSaving(false);
    }
  };

  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInputIndex, setUrlInputIndex] = useState<number | null>(null);
  const [tempUrl, setTempUrl] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('הקובץ גדול מדי. מקסימום 5MB');
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64 = reader.result as string;
        const newImages = [...images];
        newImages[index] = base64;
        setImages(newImages);
        if (index === selectedImageIndex) {
          setTempImageUrl(base64);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setRotation(0);
          setShowCropper(true);
        }
      } catch (err) {
        console.error('Error processing image:', err);
        toast.error('שגיאה בעיבוד התמונה');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAddClick = (index: number) => {
    setUrlInputIndex(index);
    setTempUrl('');
    setShowUrlModal(true);
  };

  const handleUrlSubmit = () => {
    if (urlInputIndex !== null && tempUrl) {
      const newImages = [...images];
      newImages[urlInputIndex] = tempUrl;
      setImages(newImages);
      setShowUrlModal(false);
      setUrlInputIndex(null);
      setTempUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages[index] = null;
    setImages(newImages);
    if (index === selectedImageIndex) {
      // If removed selected, try to select another one
      const firstAvailable = newImages.findIndex(img => img !== null);
      if (firstAvailable !== -1) setSelectedImageIndex(firstAvailable);
    }
  };

  const handleSaveCrop = () => {
    // Just close the cropper, we save the state on submit
    setShowCropper(false);
    setTempImageUrl(null);
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
    for (const match of scannedMatches) {
      try {
        const res = await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...match, creation_source: 'csv' }),
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error('Error importing match:', err);
      }
    }
    
    setImporting(false);
    toast.success(`יובאו ${successCount} כרטיסים בהצלחה`);
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
                const res = await fetch('/api/matches/demo', { method: 'POST' });
                if (res.ok) {
                  toast.success('נוצר משודך דמו בהצלחה');
                  navigate('/');
                }
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
            
            <div className="bg-slate-50 p-4 rounded-xl text-sm font-mono text-right whitespace-pre-wrap border border-slate-200 h-64 overflow-y-auto">
{` 💚כרטיס שידוכים ״החצי השני״

😊 שם: רויטל  בן עבו
👳🏻 עדה: ספרדי/ה
🎂 גיל: 40
🌱 גובה: 1.7
✨ מצב משפחתי: רווק/ה
🏡 מגורים: חולון
🙏 מגזר+רמה דתית: דתי לייט
👪 תאר/י בקווים כלליים את משפחתך: אפרט בהמשך
🇮🇱 שירות צבאי/לאומי/ישיבה: לאומי
🎓 עיסוק: מנהלת מזכירות במכבי 
👱🏼♀ קצת עלי: בחורה טובה, נעימת הליכות, אוהבת לעזור,חיובית , משתדלת לראות את הטוב
🎯 אני מחפש/ת: מחפשת להכיר להקמת בית בקרוב בע״ה
בחור טוב עם לב טוב 
להקים בית שומר שבת 
🙌 שומר/ת נגיעה? לא
🚬 מעשן/ת? לא
🎚 טווח גילאים: 39 - 47`}
            </div>
            
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
              תמונות (עד 3 תמונות)
            </h3>
            <p className="text-sm text-text-secondary mb-4">בחר את התמונה הראשית שתוצג בכרטיס המעוצב. ניתן להעלות קובץ או להזין קישור.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((index) => (
                <div key={index} className={`relative flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all ${
                  selectedImageIndex === index ? 'border-luxury-blue bg-blue-50/50 shadow-md' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="mainImage" 
                        checked={selectedImageIndex === index} 
                        onChange={() => setSelectedImageIndex(index)}
                        className="w-4 h-4 text-luxury-blue"
                      />
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {selectedImageIndex === index ? 'תמונה ראשית' : 'תמונה נוספת'}
                      </span>
                    </label>
                    {images[index] && (
                      <button type="button" onClick={() => handleRemoveImage(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="aspect-[3/4] rounded-xl bg-white border border-slate-200 overflow-hidden relative group">
                    {images[index] ? (
                      <>
                        <img src={images[index]!} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={() => {
                            setTempImageUrl(images[index]!);
                            setCrop({ x: 0, y: 0 });
                            setZoom(1);
                            setRotation(0);
                            setShowCropper(true);
                          }} className="p-2 bg-white text-luxury-blue rounded-full hover:bg-slate-100 shadow-lg" title="ערוך וחתוך">
                            <Crop size={20} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                        <ImageIcon size={32} />
                        <div className="flex gap-2">
                          <label className="p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-luxury-blue hover:text-luxury-blue transition-all" title="העלה קובץ">
                            <FileUp size={20} />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, index)} />
                          </label>
                          <button type="button" onClick={() => handleUrlAddClick(index)} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-luxury-blue hover:text-luxury-blue transition-all" title="הוסף קישור">
                            <Link size={20} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

              <FormGroup label="אני מחפש/ת" icon={<Heart size={16} />}>
                <textarea className="input-field min-h-[120px] py-4" value={formData.looking_for} onChange={(e) => setFormData({...formData, looking_for: e.target.value})} />
              </FormGroup>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-10 border-t border-slate-50">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary px-8 py-3.5 text-lg font-bold">ביטול</button>
          <button type="submit" disabled={saving} className="btn-primary px-10 py-3.5 text-lg font-bold flex items-center gap-2 shadow-lg">
            <Save size={22} />
            {saving ? 'שומר...' : 'שמור כרטיס במערכת'}
          </button>
        </div>
      </form>
      )}

      {/* URL Input Modal */}
      <AnimatePresence>
        {showUrlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">הוספת תמונה מקישור</h3>
                <p className="text-slate-500 font-medium">הדבק את הקישור לתמונה שברצונך להוסיף</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">קישור לתמונה</label>
                  <input 
                    type="text"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    className="input-field text-left ltr"
                    placeholder="https://example.com/image.jpg"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowUrlModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={handleUrlSubmit}
                  disabled={!tempUrl}
                  className="flex-1 py-3 bg-luxury-blue text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  הוסף תמונה
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              
              <div className="relative h-[500px] bg-slate-900">
                <Cropper
                  image={tempImageUrl}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={3/4} // Vertical aspect ratio for card
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                />
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <Search size={16} />
                      זום
                    </label>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-luxury-blue"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                      <RotateCw size={16} />
                      סיבוב
                    </label>
                    <input
                      type="range"
                      value={rotation}
                      min={0}
                      max={360}
                      step={1}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-luxury-blue"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowCropper(false)} className="btn-secondary px-6 py-2.5 font-bold">ביטול</button>
                  <button onClick={handleSaveCrop} className="btn-primary px-8 py-2.5 font-bold flex items-center gap-2">
                    <Check size={20} />
                    שמור הגדרות תצוגה
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
