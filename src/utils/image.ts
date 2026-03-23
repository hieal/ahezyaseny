export const getAvatarUrl = (path: string | null | undefined, userId?: string): string | null => {
  if (!path) {
    if (userId) {
      return `https://bdxddmsdkebxpfuirkmh.supabase.co/storage/v1/object/public/images/${userId}.png`;
    }
    return null;
  }

  // 1. If it's already a full URL (including Airtable), return it
  if (path.startsWith('http')) {
    return path;
  }

  // 2. If path exists and is a Supabase URL, return it as is
  if (path.includes('supabase')) {
    return path;
  }

  // Construct Supabase Storage URL
  const filename = path.includes('/') ? path.split('/').pop() : path;
  // Use 'images' bucket as it seems to be the primary one in dataService
  return `https://bdxddmsdkebxpfuirkmh.supabase.co/storage/v1/object/public/images/${filename}`;
};

export const getAvatarFallback = (name: string): string => {
  return name ? name.charAt(0) : '?';
};
