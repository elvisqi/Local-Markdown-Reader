export type HeadingPosition = {
  id: string;
  top: number;
};

export function selectActiveHeadingId(headings: HeadingPosition[], threshold: number): string | null {
  if (!headings.length) {
    return null;
  }

  let activeId = headings[0].id;

  for (const heading of headings) {
    if (heading.top <= threshold) {
      activeId = heading.id;
    } else {
      break;
    }
  }

  return activeId;
}
