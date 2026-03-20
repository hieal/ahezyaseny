export const getAvatarUrl = (path: string | null | undefined, userId?: string): string | null => {
  // 1. If path exists and is a Supabase URL, return it as is
  if (path && path.includes('supabase')) {
    return path;
  }

  // 2. Block Airtable URLs or empty paths
  if (!path || path.includes('airtable') || path.includes('dl.airtable.com')) {
    // 3. Fallback to [userId].png
    if (userId) {
      return `https://bdxddmsdkebxpfuirkmh.supabase.co/storage/v1/object/public/avatars/${userId}.png`;
    }
    return null;
  }

  // 4. If it's already a full URL, return it
  if (path.startsWith('http')) {
    return path;
  }

  // Construct Supabase Storage URL
  const filename = path.includes('/') ? path.split('/').pop() : path;
  return `https://bdxddmsdkebxpfuirkmh.supabase.co/storage/v1/object/public/avatars/${filename}`;
};

export const getAvatarFallback = (name: string): string => {
  return name ? name.charAt(0) : '?';
};
