export const getGenderedText = (
  gender: 'male' | 'female' | null | undefined,
  maleText: string,
  femaleText: string
): string => {
  return gender === 'female' ? femaleText : maleText;
};

export const getRoleTextByGender = (u: any) => {
  const gender = u.gender || 'male';
  const isFemale = gender === 'female';

  if (u.role === 'super_admin') return isFemale ? 'מנהלת על' : 'מנהל על';
  if (u.role === 'association_admin' || (u?.phone === '0556603336' || u?.id === 'malachi-tzuriel-anchor-id-001')) return isFemale ? 'מנהלת העמותה' : 'מנהל העמותה';
  if (u.status === 'match') return isFemale ? 'משודכת' : 'משודך';
  if (u.role === 'team_leader' || u.is_team_leader) return isFemale ? 'ראשת צוות' : 'ראש צוות';
  if (u.role === 'viewer' || u.role === 'observer') return isFemale ? 'צופה (נקבה)' : 'צופה';
  if (u.role === 'admin') return isFemale ? 'מנהלת' : 'מנהל';

  return u.role || (isFemale ? 'מנהלת' : 'מנהל');
};

export const getGenderButtonLabels = (u: any) => {
  if (!u) return { male: 'זכר', female: 'נקבה' };
  if (u.status === 'match') return { male: 'משודך', female: 'משודכת' };
  if (u.role === 'team_leader' || u.is_team_leader) return { male: 'ראש צוות', female: 'ראשת צוות' };
  if (u.role === 'viewer' || u.role === 'observer') return { male: 'צופה (זכר)', female: 'צופה (נקבה)' };
  if (u.role === 'admin') return { male: 'מנהל', female: 'מנהלת' };
  return { male: 'מנהל', female: 'מנהלת' };
};
