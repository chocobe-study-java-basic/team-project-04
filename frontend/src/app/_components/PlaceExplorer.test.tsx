// @vitest-environment jsdom

import '../../../tests/setup-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PlaceExplorer from './PlaceExplorer';

describe('샘플 장소 탐색', () => {
  it('장소명으로 검색한 뒤 초기화하면 전체 장소를 다시 보여 준다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.type(screen.getByRole('textbox', { name: '장소명 검색' }), '눈마루');
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByRole('heading', { name: '눈마루 리조트' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '설원 파크' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(screen.getByRole('heading', { name: '설원 파크' })).toBeTruthy();
    expect((screen.getByRole('textbox', { name: '장소명 검색' }) as HTMLInputElement).value).toBe('');
  });

  it('서로 다른 종목의 시즌·실내외 조건을 섞어서 장소를 반환하지 않는다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.click(screen.getByRole('button', { name: '수상' }));
    fireEvent.change(screen.getByRole('combobox', { name: '시즌' }), { target: { value: '겨울' } });
    fireEvent.change(screen.getByRole('combobox', { name: '실내외' }), { target: { value: '실내' } });
    expect(screen.getByRole('heading', { name: '조건에 맞는 장소가 없어요' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '물빛 액티비티 센터' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '전체 장소 보기' }));
    expect(screen.getByRole('heading', { name: '물빛 액티비티 센터' })).toBeTruthy();
  });

  it('선택한 장소가 필터 결과에서 사라지면 이전 장소 요약을 남기지 않는다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.click(screen.getByRole('button', { name: /눈마루 리조트/ }));
    expect(screen.getByRole('heading', { level: 3, name: '눈마루 리조트' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '지역' }), { target: { value: '경기' } });
    expect(screen.queryByRole('heading', { level: 3, name: '눈마루 리조트' })).toBeNull();
    expect(screen.getByRole('heading', { name: '어디로 떠나볼까요?' })).toBeTruthy();
  });
});
