'use client';

import { createContext } from 'react';
import type { Member } from '@/domains/member/api/memberApi';

export const MypageMemberContext = createContext<Member | null>(null);
