export function validateCitationIds(answer: string, allowedIds: string[]) {
 const citedNumbers=[...answer.matchAll(/\[SOURCE\s+(\d+)\]/g)].map(m=>Number(m[1]));
 return citedNumbers.every(n=>Number.isInteger(n)&&n>=1&&n<=allowedIds.length);
}
