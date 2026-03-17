import React from 'react';
import { Phone, User } from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  age: number;
  city: string;
  ethnicity: string;
  marital_status: string;
  occupation: string;
  about: string;
  looking_for: string;
  image_url: string;
  admin_name?: string;
}

export const CandidateCard: React.FC<{ candidate: Candidate }> = ({ candidate }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-4">
      <div className="flex items-center gap-4">
        {candidate.image_url ? (
          <img 
            src={candidate.image_url} 
            alt={candidate.full_name} 
            className="w-16 h-16 rounded-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center ${candidate.image_url ? 'hidden' : ''}`}>
          <User size={32} className="text-slate-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{candidate.full_name}</h3>
          <p className="text-sm text-slate-600">{candidate.age} | {candidate.city}</p>
        </div>
      </div>
      <div className="mt-4 text-sm">
        <p><strong>טלפון:</strong> {candidate.phone ? candidate.phone : <span style={{ color: 'red' }}>חסר</span>}</p>
        <p><strong>אימייל:</strong> {candidate.email ? candidate.email : <span style={{ color: 'red' }}>חסר</span>}</p>
        <p><strong>עדה:</strong> {candidate.ethnicity}</p>
        <p><strong>מצב משפחתי:</strong> {candidate.marital_status}</p>
        <p><strong>עיסוק:</strong> {candidate.occupation}</p>
        <div className="mt-2">
          <p><strong>קצת עלי:</strong></p>
          <p className="text-slate-700">{candidate.about}</p>
        </div>
        <div className="mt-2">
          <p><strong>מה אני מחפש:</strong></p>
          <p className="text-slate-700">{candidate.looking_for}</p>
        </div>
        {candidate.admin_name && <p className="mt-2 text-xs text-luxury-blue">משויך ל: {candidate.admin_name}</p>}
      </div>
      <button 
        onClick={() => window.open(`https://wa.me/${candidate.phone.replace(/\D/g, '')}`)}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
      >
        <Phone size={16} /> צור קשר
      </button>
    </div>
  );
};
