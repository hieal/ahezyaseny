import { Match } from "./types";

export const APP_NAME = "החצי השני – מערכת ניהול משודכים";

export const formatMatchMessage = (match: Match, template: string = "") => {
  const lines = [
    template,
    "",
    `😊 שם: ${match.name}`,
    `🎂 גיל: ${match.age}`,
    `🌱 גובה: ${match.height || '---'}`,
    `👳 עדה: ${match.ethnicity || '---'}`,
    `✨ מצב משפחתי: ${match.marital_status || '---'}`,
    `🏡 מגורים: ${match.city || '---'}`,
    `🙏 מגזר + רמה דתית: ${match.religious_level || '---'}`,
    `🇮🇱 שירות צבאי: ${match.service || '---'}`,
    `🎓 עיסוק: ${match.occupation || '---'}`,
    "",
    `👩🏻 קצת עליי:`,
    match.about || '---',
    "",
    `🎯 אני מחפש/ת:`,
    match.looking_for || '---',
    "",
    `🚬 מעשן/ת: ${match.smoking || '---'}`,
    `🙌 שומר/ת נגיעה: ${match.negiah || '---'}`,
    `📊 טווח גילאים: ${match.age_range || '---'}`,
  ];

  if (match.creator_name) {
    const isFemale = match.creator_gender === 'female';
    const title = isFemale ? 'נשלח על ידי המנהלת' : 'נשלח על ידי המנהל';
    let phoneStr = '';
    if (match.creator_phone) {
      const cleanPhone = match.creator_phone.replace(/\D/g, '');
      const waLink = `https://wa.me/972${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;
      phoneStr = ` (${match.creator_phone} - ${waLink})`;
    }
    lines.push("");
    lines.push(`${title} ${match.creator_name}${phoneStr}`);
  }

  return lines.join('\n');
};

export const WHATSAPP_GROUPS = {
  male: "https://chat.whatsapp.com/IlmG3qJhaSfEQcUpd42Tvi",
  female: "https://chat.whatsapp.com/HMefC31W80tEC2TNpz73y6"
};

export const CATEGORIES = [
  '18-22',
  '23-27',
  '28-32',
  '33-40',
  '41-65',
  'פרויקט שח"ם',
  'פרויקט שח"ם 20-35',
  'פרויקט שח"ם 36-50',
  'פרויקט קומי אורי',
  'פרויקט אור'
];
