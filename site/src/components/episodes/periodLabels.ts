export function calendarYearFromPeriod(period: string): string {
  const [year] = period.split("-");
  return year ?? period;
}

export function yearLabelBeforeEpisode(
  index: number,
  periods: string[],
): string | null {
  const current = periods[index];
  if (!current) {
    return null;
  }
  const currentYear = calendarYearFromPeriod(current);
  if (index === 0) {
    return currentYear;
  }
  const previous = periods[index - 1];
  if (!previous) {
    return null;
  }
  if (calendarYearFromPeriod(previous) !== currentYear) {
    return currentYear;
  }
  return null;
}
