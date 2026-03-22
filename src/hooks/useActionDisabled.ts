import { useAuth } from '../contexts/AuthContext';

export const useActionDisabled = () => {
  const { isReadOnly } = useAuth();
  return isReadOnly;
};
