import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { Clock, FileUp } from 'lucide-react';
import { CandidateCard } from '../components/CandidateCard';
import { parseCandidatePDF } from '../utils/pdfParser';

const InitialContactPage = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [parsedCandidates, setParsedCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCandidates();
    fetchAdmins();
  }, []);

  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*, profiles(full_name)');
    if (error) toast.error('שגיאה בטעינת מועמדים');
    else setCandidates(data || []);
  };

  const fetchAdmins = async () => {
    const { data } = await supabase.from('profiles').select('id, affiliation_group, full_name');
    setAdmins(data || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    const newParsedCandidates: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseCandidatePDF(file);
        newParsedCandidates.push(parsed);
      } catch (err) {
        console.error(`Error parsing PDF ${file.name}:`, err);
      }
    }

    setParsedCandidates(newParsedCandidates);
    toast.success(`זוהו ${newParsedCandidates.length} מנהלים בתוך ה-PDF`);
    console.log('PDF IMPORT SYNCED WITH CARDS PREVIEW IN CONTACT TABS');
    setLoading(false);
    e.target.value = '';
  };

  const handleFinalImport = async () => {
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const parsed of parsedCandidates) {
      let affiliation_group = parsed.affiliation_group;
      if (!affiliation_group && parsed.age) {
        if (parsed.age >= 20 && parsed.age <= 35) {
          affiliation_group = 'פרויקט שח"ם 20-35';
        } else if (parsed.age >= 36) {
          affiliation_group = 'פרויקט שח"ם 36-50';
        }
      }
      
      const candidateData: any = {
        full_name: parsed.full_name || 'ללא שם',
        phone: parsed.phone || null,
        affiliation_group: affiliation_group || null
      };

      const { error } = await supabase.from('candidates').insert(candidateData);
      
      if (error) {
        failCount++;
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} מועמדים נוספו בהצלחה`);
      fetchCandidates();
    }
    if (failCount > 0) {
      toast.error(`שגיאה בייבוא ${failCount} מועמדים`);
    }
    
    setParsedCandidates([]);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">מעקב קשר ראשוני</h1>
      
      <div className="mb-6 flex gap-4">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${loading ? 'bg-slate-400' : 'bg-luxury-blue hover:bg-luxury-blue/90'} text-white`}>
          <FileUp size={20} />
          <span>{loading ? 'מעבד PDF...' : 'העלה PDF מועמד'}</span>
          <input type="file" accept=".pdf" multiple className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
        {parsedCandidates.length > 0 && (
          <button onClick={handleFinalImport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            בצע ייבוא רשמי
          </button>
        )}
      </div>

      <div className="mb-8 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-2">חילוץ ידני (Smart Extract)</h2>
        <p className="text-sm text-slate-600 mb-2">הדבק כאן טקסט לחילוץ:</p>
        <textarea 
          className="w-full h-40 p-3 border rounded-lg text-sm"
          placeholder={`כרטיס שידוכים ״החצי השני״
😊 שם: הדסה ונונו
👳🏻 עדה: מרוקאי/ת
🎂 גיל: 31
🌱 גובה: 1.56
✨ מצב משפחתי: רווק/ה
🏡 מגורים: אשקלון
🙏 מגזר+רמה דתית: דתי לאומי
👪 תאר/י בקווים כלליים את משפחתך: משפחה דתית וחמה...
🇮🇱 שירות צבאי/לאומי/ישיבה: לאומי
🎓 עיסוק: גננת בגן תקשורת
👱🏼♀ קצת עלי: אוהבת ללמוד, להתפתח...
🎯 אני מחפש/ת: אדם דתי וטוב, רציני ויציב...
🙌 שומר/ת נגיעה? לא
🚬 מעשן/ת? לא
🎚 טווח גילאים: 29 - 36`}
        />
      </div>

      {parsedCandidates.length > 0 && (
        <div className="mb-8 p-4 bg-slate-100 rounded-lg">
          <h2 className="text-xl font-bold mb-4">תצוגה מקדימה ({parsedCandidates.length} מנהלים)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parsedCandidates.map((c, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow border">
                <p className={!c.full_name ? 'text-red-500 font-bold' : ''}>{c.full_name || 'חסר נתון!'}</p>
                <p className={!c.phone ? 'text-red-500 font-bold' : ''}>{c.phone || 'חסר נתון!'}</p>
                {!c.image_url && <p className="text-red-500 font-bold">חסרה תמונה</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map(c => (
          <CandidateCard 
            key={c.id} 
            candidate={{
              id: c.id,
              full_name: c.full_name,
              phone: c.phone,
              age: c.age,
              city: c.city,
              ethnicity: c.ethnicity,
              marital_status: c.marital_status,
              occupation: c.occupation,
              about: c.about,
              looking_for: c.looking_for,
              image_url: c.image_url,
              admin_name: c.profiles?.full_name,
              height: c.height || '',
              family_description: c.family_description || '',
              shomer_negia: c.negiah || '',
              is_smoking: c.smoking || ''
            }} 
          />
        ))}
      </div>
    </div>
  );
};

export default InitialContactPage;
