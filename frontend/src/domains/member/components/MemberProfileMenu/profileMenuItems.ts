export type ProfileMenuAudience = 'guest' | 'member' | 'admin';

type ProfileMenuItem = {
  label: string;
  href: string;
  visibleTo: readonly ProfileMenuAudience[];
};

export const profileMenuItems: readonly ProfileMenuItem[] = [
  { label: '로그인', href: '/login/', visibleTo: ['guest'] },
  { label: '마이페이지', href: '/mypage/', visibleTo: ['member', 'admin'] },
  { label: '관리자 화면', href: '/admin/', visibleTo: ['admin'] },
];
