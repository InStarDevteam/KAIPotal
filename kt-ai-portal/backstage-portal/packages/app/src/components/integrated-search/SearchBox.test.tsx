import { act, fireEvent, render, screen } from '@testing-library/react';
import { SearchBox } from './SearchBox';
import { PortalSuggestItem } from './types';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
it('debounces fast input and avoids single-character suggestion calls', async () => {
  const suggest = jest.fn().mockResolvedValue([]);
  render(<SearchBox value="" onSearch={jest.fn()} onSuggest={suggest} />);
  const input = screen.getByLabelText('검색어');
  fireEvent.change(input, { target: { value: '군' } });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  expect(suggest).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '군수' } });
  fireEvent.change(input, { target: { value: '군수 데이터' } });
  await act(async () => {
    jest.advanceTimersByTime(250);
  });
  expect(suggest).toHaveBeenCalledTimes(1);
  expect(suggest).toHaveBeenCalledWith('군수 데이터');
});
it('a URL value reset changes the input without submitting a search', () => {
  const search = jest.fn();
  const rendered = render(<SearchBox value="기존 검색" onSearch={search} />);
  rendered.rerender(<SearchBox value="새 검색" onSearch={search} />);
  expect(screen.getByLabelText('검색어')).toHaveValue('새 검색');
  expect(search).not.toHaveBeenCalled();
});
it('cleared input never displays suggestions from an older request', async () => {
  let resolve!: (value: PortalSuggestItem[]) => void;
  const suggest = jest.fn(
    () =>
      new Promise<PortalSuggestItem[]>(done => {
        resolve = done;
      }),
  );
  render(<SearchBox value="군수" onSearch={jest.fn()} onSuggest={suggest} />);
  fireEvent.focus(screen.getByLabelText('검색어'));
  await act(async () => {
    jest.advanceTimersByTime(250);
  });
  fireEvent.change(screen.getByLabelText('검색어'), { target: { value: '' } });
  await act(async () =>
    resolve([{ id: 'old', type: 'project', title: '이전 자동완성' }]),
  );
  expect(screen.queryByText('이전 자동완성')).not.toBeInTheDocument();
});
