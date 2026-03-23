import React from 'react';
import { motion } from 'motion/react';
import { X, RefreshCw, UserPlus, XCircle } from 'lucide-react';
import { ScannedAdmin } from '../types';

interface ComparisonModalProps {
  admin: ScannedAdmin;
  onClose: () => void;
  onUpdate: (action: 'update' | 'new' | 'skip') => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ admin, onClose, onUpdate }) => {
  if (!admin.existingUser) return null;

  const existing = admin.existingUser;
  
  const fields = [
    { label: 'שם מלא', existing: existing.full_name || '', new: admin.full_name || '' },
    { label: 'טלפון', existing: existing.phone || '', new: admin.phone || '' },
    { label: 'מייל', existing: existing.email || '', new: admin.email || '' },
    { label: 'פרויקט/קטגוריה', existing: existing.affiliation_group || (existing as any).category || '', new: admin.group || admin.category || '' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900">השוואת נתונים - מנהל קיים</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-2xl">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-slate-500">שדה</th>
                <th className="p-3 text-slate-500">קיים במערכת</th>
                <th className="p-3 text-slate-500">בנתונים החדשים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((f, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-bold text-slate-700">{f.label}</td>
                  <td className={`p-3 ${!f.existing ? 'text-red-500 font-bold bg-red-50' : 'text-slate-600'}`}>
                    {f.existing || 'חסר'}
                  </td>
                  <td className={`p-3 ${!f.new ? 'text-red-500 font-bold bg-red-50' : 'text-slate-900 font-medium'}`}>
                    {f.new || 'חסר'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => onUpdate('update')}
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all group"
          >
            <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
            <span className="font-bold text-xs">עדכן כרטיס קיים</span>
          </button>
          
          <button 
            onClick={() => {
              if (window.confirm(`שים לב, מנהל בשם זה/טלפון זה כבר קיים. האם אתה בטוח שברצונך ליצור כפילות? (למשל: ראש צוות שהוא גם מנהל)`)) {
                onUpdate('new');
              }
            }}
            className="flex flex-col items-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 hover:bg-amber-100 transition-all"
          >
            <UserPlus size={24} />
            <span className="font-bold text-xs">הוסף כמנהל חדש</span>
          </button>

          <button 
            onClick={() => onUpdate('skip')}
            className="flex flex-col items-center gap-2 p-4 bg-slate-50 text-slate-600 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all"
          >
            <XCircle size={24} />
            <span className="font-bold text-xs">ביטול הוספה</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
