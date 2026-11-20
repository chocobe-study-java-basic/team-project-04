import type { ReactNode } from 'react';
import ServiceHeader from './_components/ServiceHeader';

export default function ServiceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#16243b]">
      <ServiceHeader />
      {children}
    </div>
  );
}
