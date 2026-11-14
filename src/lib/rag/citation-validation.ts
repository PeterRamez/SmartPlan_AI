export function extractCitationNumbers(answer: string): number[] {
  return [...answer.matchAll(/\[SOURCE\s+(\d+)\]/g)].map((match) => Number(match[1]));
}

/** True when every source marker points to an item in the supplied source list. */
export function validateCitationIds(answer: string, allowedIds: string[]): boolean {
  return extractCitationNumbers(answer).every(
    (number) => Number.isInteger(number) && number >= 1 && number <= allowedIds.length
  );
}

export function getInvalidCitationNumbers(answer: string, allowedIds: string[]): number[] {
  return [...new Set(extractCitationNumbers(answer).filter(
    (number) => !Number.isInteger(number) || number < 1 || number > allowedIds.length
  ))];
}
