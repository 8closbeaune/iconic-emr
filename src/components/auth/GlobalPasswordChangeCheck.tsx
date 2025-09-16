import { useEffect, useState } from 'react';
import { useMe } from '@/hooks/useMe';
import { PasswordChangeModal } from './PasswordChangeModal';

export function GlobalPasswordChangeCheck() {
  const { profile } = useMe();
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if ((profile as any)?.must_change_password) {
      setShowPasswordChange(true);
    }
  }, [profile]);

  if (!(profile as any)?.must_change_password) {
    return null;
  }

  return (
    <PasswordChangeModal
      open={showPasswordChange}
      onOpenChange={setShowPasswordChange}
      required={true}
    />
  );
}