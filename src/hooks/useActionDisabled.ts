import { useAuth } from '../contexts/AuthContext';

export const useActionDisabled = () => {
  const { isReadOnly, user } = useAuth();
  return isReadOnly || user?.role === 'super_observer';
};
