export const getAvatarUrl = (path: string | null | undefined, userId?: string): string | null => {
  // Priority 1: If it's already a full Supabase URL, return it
  if (path && path.includes('supabase.co')) {
    return path;
  }

  // Priority 2: If we have a userId, we might have a synced image in the 'images' bucket
  // We use a predictable path based on userId
  if (userId) {
    return `https://bdxddmsdkebxpfuirkmh.supabase.co/storage/v1/object/public/images/${userId}.png`;
  }

  if (!path) return null;

  // Priority 3: If it's an external URL (Airtable, etc.), return it
  if (path.startsWith('http')) {
    return path;
  }

  // Construct Supabase Storage URL for other cases
  const filename = path.includes('/') ? path.split('/').pop() : path;
  return `https://bdxddmsdkebxpfuirkmh.supabase.co/storage/v1/object/public/images/${filename}`;
};

export const getAvatarFallback = (name: string): string => {
  return name ? name.charAt(0) : '?';
};
