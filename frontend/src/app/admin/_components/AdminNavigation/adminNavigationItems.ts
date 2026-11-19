import { LayoutDashboard, MapPin, MessageSquareWarning } from 'lucide-react';

export const adminNavigationItems = [
  { label: '운영 현황', href: '/admin/', Icon: LayoutDashboard },
  { label: '장소 관리', href: '/admin/places/', Icon: MapPin },
  { label: '후기 신고', href: '/admin/review-reports/', Icon: MessageSquareWarning },
];
