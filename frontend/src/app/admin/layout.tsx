import type { ReactNode } from 'react';
import AccountAreaLayout from '@/app/_components/AccountAreaLayout';
import AdminAccess from '@/domains/admin/components/AdminAccess/AdminAccess';
import '@/domains/admin/components/admin.css';

export default function AdminRouteLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAccess>
      <AccountAreaLayout showAdminMenu>{children}</AccountAreaLayout>
    </AdminAccess>
  );
}
