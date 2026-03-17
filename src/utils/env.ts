export const isVercel = () => {
  return window.location.hostname.includes('vercel.app');
};

export const isAIStudio = () => {
  return window.location.hostname.includes('run.app');
};
