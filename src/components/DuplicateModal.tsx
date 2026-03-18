import React from 'react';
import { CandidateCard } from './CandidateCard';
import { Match } from '../types';

interface DuplicateModalProps {
  existingMatch: Match;
  newMatchData: Partial<Match>;
  onCancel: () => void;
  onSaveAsNew: () => void;
  onUpdate: () => void;
  managerName?: string;
  groupName?: string;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  existingMatch,
  newMatchData,
  onCancel,
  onSaveAsNew,
  onUpdate,
  managerName,
  groupName
}) => {
  React.useEffect(() => {
    console.log('VALUE LABELS (YES/NO) FIXED. FAMILY DESCRIPTION VISIBLE WITH HIGHLIGHTS');
  }, []);

  const highlights = {
    full_name: String(existingMatch.name || '').trim() === String(newMatchData.name || '').trim(),
    age: String(existingMatch.age || '').trim() === String(newMatchData.age || '').trim(),
    height: String(existingMatch.height || '').trim() === String(newMatchData.height || '').trim(),
    ethnicity: String(existingMatch.ethnicity || '').trim() === String(newMatchData.ethnicity || '').trim(),
    city: String(existingMatch.city || '').trim() === String(newMatchData.city || '').trim(),
    marital_status: String(existingMatch.marital_status || '').trim() === String(newMatchData.marital_status || '').trim(),
    occupation: String(existingMatch.occupation || '').trim() === String(newMatchData.occupation || '').trim(),
    family_description: String(existingMatch.family_description || '').trim() === String(newMatchData.family_description || '').trim(),
    about: String(existingMatch.about || '').trim() === String(newMatchData.about || '').trim(),
    looking_for: String(existingMatch.looking_for || '').trim() === String(newMatchData.looking_for || '').trim(),
    shomer_negia: String(existingMatch.negiah || '').trim() === String(newMatchData.negiah || '').trim(),
    is_smoking: String(existingMatch.smoking || '').trim() === String(newMatchData.smoking || '').trim(),
  };

  // Helper to map Match to Candidate for CandidateCard
  const mapMatchToCandidate = (match: Partial<Match>): any => ({
    id: match.id || 'new',
    full_name: match.name || '',
    phone: match.phone || '',
    age: match.age || 0,
    height: match.height || '',
    city: match.city || '',
    ethnicity: match.ethnicity || '',
    marital_status: match.marital_status || '',
    occupation: match.occupation || '',
    family_description: match.family_description || '',
    about: match.about || '',
    looking_for: match.looking_for || '',
    shomer_negia: match.negiah || '',
    is_smoking: match.smoking || '',
    image_url: match.image_url || '',
    admin_name: managerName
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e11d48; border-radius: 6px; border: 3px solid #ffffff; }
      `}</style>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-center text-red-600">נראה שמשודך זה כבר קיים במערכת</h2>
          <p className="text-center text-sm mt-2 text-slate-600">💡 שים לב לנתונים המודגשים - הם זהים למידע שכבר קיים במערכת</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-4 text-center pb-2 border-b-2 border-slate-200">משודך שבמערכת</h3>
              <CandidateCard candidate={mapMatchToCandidate(existingMatch)} />
              <div className="mt-2 p-2 bg-slate-100 rounded-lg text-sm">
                <p><strong>המנהל שלו הוא:</strong> {managerName || 'לא מוגדר'}</p>
                <p><strong>קבוצה:</strong> {groupName || 'לא מוגדר'}</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-center pb-2 border-b-2 border-slate-200">המשודך שלך</h3>
              <CandidateCard candidate={mapMatchToCandidate(newMatchData)} highlights={highlights} />
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex flex-col gap-2">
          <button onClick={onSaveAsNew} className="w-full py-3 rounded-lg bg-slate-200 hover:bg-slate-300">לא, זה מישהו אחר</button>
          <button onClick={onUpdate} className="w-full py-3 rounded-lg bg-luxury-blue text-white hover:bg-blue-700">צודק, רק תעדכן את הפרטים</button>
          <button onClick={onCancel} className="w-full py-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">ביטול</button>
        </div>
      </div>
    </div>
  );
};
