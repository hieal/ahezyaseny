import React from 'react';
import { Shield, UserCog, Eye, Users, CheckCircle, XCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';

const roles = [
  {
    id: 'super_admin',
    name: 'אדמין (Admin)',
    description: 'גישה מלאה לכל חלקי המערכת, ניהול הגדרות גלובליות ואישור מנהלים חדשים.',
    permissions: [
      'ניהול מלא של כל המשודכים',
      'ניהול כל המנהלים (הוספה, עריכה, מחיקה)',
      'גישה להגדרות מערכת ו-API',
      'צפייה בלוגים של כל המערכת',
      'שינוי סיסמאות לכל המנהלים'
    ],
    color: 'bg-yellow-50 text-yellow-700 border-yellow-100'
  },
  {
    id: 'team_leader',
    name: 'ראש צוות (Team Leader)',
    description: 'אחראי על קבוצת מנהלים ומשודכים לפי שיוך קבוצתי.',
    permissions: [
      'ניהול מנהלים תחת הקבוצה שלו',
      'הוספת מנהלים חדשים (ממתין לאישור אדמין)',
      'צפייה בפעולות המנהלים בקבוצה',
      'ניהול משודכים המשוייכים לקבוצה'
    ],
    color: 'bg-blue-50 text-blue-700 border-blue-100'
  },
  {
    id: 'admin',
    name: 'מנהל (Admin)',
    description: 'מנהל רגיל האחראי על העלאת ופרסום משודכים.',
    permissions: [
      'הוספה ועריכה של משודכים',
      'פרסום לקבוצות וואטסאפ',
      "צ'אט עם מנהלים אחרים",
      'צפייה בסטטיסטיקות אישיות'
    ],
    color: 'bg-green-50 text-green-700 border-green-100'
  },
  {
    id: 'viewer',
    name: 'צופה (Viewer)',
    description: 'גישת צפייה בלבד לנתוני הקבוצה שלו.',
    permissions: [
      'צפייה בכרטיסי משודכים',
      'חיפוש וסינון נתונים',
      'אין אפשרות עריכה או מחיקה',
      'אין אפשרות פרסום או שליחת הודעות'
    ],
    color: 'bg-slate-50 text-slate-700 border-slate-100'
  }
];

export default function RoleManagement() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-text-main flex items-center gap-3">
          <Shield className="text-luxury-blue" size={32} />
          ניהול תפקידים והרשאות
        </h1>
        <p className="text-text-secondary font-medium">הגדרת רמות הגישה וההרשאות השונות במערכת</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role, index) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-6 rounded-3xl border-2 ${role.color} shadow-sm hover:shadow-md transition-all`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{role.name}</h2>
              {role.id === 'super_admin' ? <UserCog size={24} /> : role.id === 'viewer' ? <Eye size={24} /> : <Users size={24} />}
            </div>
            
            <p className="text-sm mb-6 opacity-90 leading-relaxed font-medium">
              {role.description}
            </p>

            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider opacity-60 flex items-center gap-2">
                <Info size={14} />
                הרשאות כלולות:
              </h3>
              <ul className="space-y-2">
                {role.permissions.map((perm, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-bold">
                    <CheckCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-start gap-4">
        <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
          <Shield size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-900 mb-1">טיפ אבטחה</h3>
          <p className="text-sm text-blue-700 font-medium leading-relaxed">
            מומלץ להעניק את הרשאת ה"אדמין" רק למנהלים בכירים ביותר. עבור מנהלים חדשים או מתנדבים, השתמש בתפקיד "מנהל" או "צופה" כדי לשמור על בטיחות הנתונים.
          </p>
        </div>
      </div>
    </div>
  );
}
