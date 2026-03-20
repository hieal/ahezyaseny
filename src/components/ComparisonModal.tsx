import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ScannedAdmin } from '../types';

interface ComparisonModalProps {
  admin: ScannedAdmin;
  onClose: () => void;
  onUpdate: (action: string) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ admin, onClose, onUpdate }) => {
  if (!admin.existingUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card w-full max-w-lg p-8 space-y-6 shadow-2xl border-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-text-main">השוואת נתונים: {admin.full_name}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="font-bold">שדה</div>
          <div className="font-bold">קיים במערכת</div>
          <div className="font-bold">חדש מהקובץ</div>
          
          <div>שם</div>
          <div>{admin.existingUser.full_name}</div>
          <div className={admin.full_name !== admin.existingUser.full_name ? 'text-red-600' : ''}>{admin.full_name}</div>
          
          <div>אימייל</div>
          <div>{admin.existingUser.email}</div>
          <div className={admin.email !== admin.existingUser.email ? 'text-red-600' : ''}>{admin.email}</div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          <button onClick={() => onUpdate('update_details')} className="btn-secondary">עדכן פרטים</button>
          <button onClick={() => onUpdate('update_all')} className="btn-primary">עדכן הכל</button>
          <button onClick={() => onUpdate('create_new')} className="btn-primary bg-amber-600">צור מנהל חדש</button>
          <button onClick={onClose} className="btn-secondary">ביטול</button>
        </div>
      </motion.div>
    </div>
  );
};
