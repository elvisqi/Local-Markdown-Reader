import { selectActiveHeadingId } from './activeHeading';

describe('selectActiveHeadingId', () => {
  it('selects the last heading above the reading threshold', () => {
    const headings = [
      { id: 'intro', top: -80 },
      { id: 'usage', top: 24 },
      { id: 'api', top: 220 },
    ];

    expect(selectActiveHeadingId(headings, 96)).toBe('usage');
  });

  it('falls back to the first heading before any heading reaches the threshold', () => {
    const headings = [
      { id: 'intro', top: 180 },
      { id: 'usage', top: 360 },
    ];

    expect(selectActiveHeadingId(headings, 96)).toBe('intro');
  });
});
