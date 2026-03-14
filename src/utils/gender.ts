export const getGenderedText = (
  gender: 'male' | 'female' | null | undefined,
  maleText: string,
  femaleText: string
): string => {
  return gender === 'female' ? femaleText : maleText;
};
