export type Language = "ar"|"en"|"de"|"fr"|"es";
export function detectLanguage(text: string): Language {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[äöüß]/i.test(text) || /\b(der|die|das|und|nicht|gesetz)\b/i.test(text)) return "de";
  if (/[àâçéèêëîïôûùüÿœ]/i.test(text) || /\b(les|des|une|bonjour|droit)\b/i.test(text)) return "fr";
  if (/[¿¡ñáéíóú]/i.test(text) || /\b(qué|derecho|empresa|trabajo)\b/i.test(text)) return "es";
  return "en";
}
export const isRtl = (lang: string) => lang === "ar";
