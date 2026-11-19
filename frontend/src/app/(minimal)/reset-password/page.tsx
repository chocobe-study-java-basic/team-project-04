import { Suspense } from 'react';
import { ResetConfirmScreen } from '@/domains/member/components/AuthScreens';
export default function Page() { return <Suspense fallback={<p>재설정 링크를 확인하고 있습니다...</p>}><ResetConfirmScreen /></Suspense>; }
