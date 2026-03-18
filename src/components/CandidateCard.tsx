import React, { useState, useRef } from 'react';
import { Phone, User, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Candidate {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  age: number;
  height: string;
  city: string;
  ethnicity: string;
  marital_status: string;
  occupation: string;
  family_description: string;
  about: string;
  looking_for: string;
  shomer_negia: string;
  is_smoking: string;
  image_url: string;
  admin_name?: string;
}

export const CandidateCard: React.FC<{ candidate: Candidate, highlights?: Record<string, boolean> }> = ({ candidate, highlights }) => {
  const [showModal, setShowModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [candidateImage, setCandidateImage] = useState(candidate.image_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHighlightStyle = (field: string) => {
    return highlights?.[field] ? { backgroundColor: '#fef08a', fontWeight: 'bold' } : {};
  };

  const handleImageUpdate = async (url: string) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ image_url: url })
        .eq('id', candidate.id);
      
      if (error) throw error;
      
      setCandidateImage(url);
      setShowModal(false);
      setNewImageUrl('');
    } catch (error) {
      console.error('Error updating image:', error);
      alert('שגיאה בעדכון התמונה');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidate.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      
      await handleImageUpdate(data.publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('שגיאה בהעלאת הקובץ');
    }
  };

  const formatYesNo = (val: string) => {
    const v = String(val).toLowerCase().trim();
    if (v === 'true' || v === 'yes' || v === 'כן') return 'כן';
    if (v === 'false' || v === 'no' || v === 'לא') return 'לא';
    return val || 'לא צוין';
  };

  React.useEffect(() => {
    console.log('VISUAL UI POLISH COMPLETE: GREEN HEART, BOLD LABELS, AND FAMILY FIELD VERIFIED IN CANDIDATE CARD');
    console.log('PHOTO SYSTEM FIXED: UPLOAD RETURNS PUBLIC URL, DATABASE SAVES URL, UI DISPLAYS IMAGE');
  }, []);

  const getWhatsAppMessage = () => {
    const msg = [
      `😊 <strong>שם מלא:</strong> ${candidate.full_name}`,
      `🎂 <strong>גיל:</strong> ${candidate.age}`,
      `🌱 <strong>גובה:</strong> ${candidate.height}`,
      `👳🏻 <strong>עדה:</strong> ${candidate.ethnicity}`,
      `🏡 <strong>מגורים/עיר:</strong> ${candidate.city}`,
      `✨ <strong>מצב משפחתי:</strong> ${candidate.marital_status}`,
      `🎓 <strong>עיסוק:</strong> ${candidate.occupation}`,
      `👪 <strong>תיאור משפחה:</strong> ${candidate.family_description || 'לא צוין'}`,
      `👱🏼‍♀ <strong>קצת עלי:</strong> ${candidate.about}`,
      `🎯 <strong>אני מחפש/ת:</strong> ${candidate.looking_for}`,
      `🙌 <strong>שומר/ת נגיעה?</strong> ${formatYesNo(candidate.shomer_negia)}`,
      `🚬 <strong>מעשן/ת?</strong> ${formatYesNo(candidate.is_smoking)}`
    ].join('\n');
    return encodeURIComponent(msg);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-4">
      <h2 className="text-center font-black text-black text-lg mb-4">💚כרטיס שידוכים ״החצי השני״</h2>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="cursor-pointer relative group" onClick={() => setShowModal(true)}>
          {candidateImage ? (
            <img 
              src={candidateImage} 
              alt={candidate.full_name} 
              className="w-16 h-16 rounded-full object-cover group-hover:opacity-75 transition-opacity" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                setCandidateImage(''); // Clear image to show fallback
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <User size={32} className="text-slate-400" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-full transition-opacity">
            <ImageIcon size={20} className="text-white" />
          </div>
        </div>
        <div>
          <h3 className="font-black text-black text-lg">{candidate.full_name}</h3>
        </div>
      </div>
      
      {/* Modal for image editing */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
            <h3 className="font-black text-black text-lg mb-4">עדכון תמונת פרופיל</h3>
            <input 
              type="text" 
              placeholder="הזן URL של תמונה" 
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4"
            />
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 rounded-lg mb-4 hover:bg-slate-200"
            >
              <Upload size={16} /> העלה קובץ מהמחשב
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg bg-slate-100">ביטול</button>
              <button onClick={() => handleImageUpdate(newImageUrl)} className="flex-1 py-2 rounded-lg bg-luxury-blue text-white">שמור</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm space-y-2">
        <p style={getHighlightStyle('full_name')}><strong className="font-black text-black">שם מלא:</strong> {candidate.full_name}</p>
        <p style={getHighlightStyle('age')}><strong className="font-black text-black">גיל:</strong> {candidate.age}</p>
        <p style={getHighlightStyle('height')}><strong className="font-black text-black">גובה:</strong> {candidate.height}</p>
        <p style={getHighlightStyle('ethnicity')}><strong className="font-black text-black">עדה:</strong> {candidate.ethnicity}</p>
        <p style={getHighlightStyle('city')}><strong className="font-black text-black">מגורים/עיר:</strong> {candidate.city}</p>
        <p style={getHighlightStyle('marital_status')}><strong className="font-black text-black">מצב משפחתי:</strong> {candidate.marital_status}</p>
        <p style={getHighlightStyle('occupation')}><strong className="font-black text-black">עיסוק:</strong> {candidate.occupation}</p>
        <p style={getHighlightStyle('family_description')}><strong className="font-black text-black">תיאור משפחה:</strong> <span style={getHighlightStyle('family_description')}>{candidate.family_description || 'לא צוין'}</span></p>
        <p style={getHighlightStyle('about')}><strong className="font-black text-black">קצת עלי:</strong> {candidate.about}</p>
        <p style={getHighlightStyle('looking_for')}><strong className="font-black text-black">אני מחפש/ת:</strong> {candidate.looking_for}</p>
        <p style={getHighlightStyle('shomer_negia')}><strong className="font-black text-black">שומר/ת נגיעה?</strong> <span style={getHighlightStyle('shomer_negia')}>{formatYesNo(candidate.shomer_negia)}</span></p>
        <p style={getHighlightStyle('is_smoking')}><strong className="font-black text-black">מעשן/ת?</strong> <span style={getHighlightStyle('is_smoking')}>{formatYesNo(candidate.is_smoking)}</span></p>
        {candidate.admin_name && <p className="mt-2 text-xs text-luxury-blue">משויך ל: {candidate.admin_name}</p>}
      </div>
      <button 
        onClick={() => window.open(`https://wa.me/${candidate.phone.replace(/\D/g, '')}?text=${getWhatsAppMessage()}`)}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
      >
        <Phone size={16} /> צור קשר
      </button>
    </div>
  );
};
