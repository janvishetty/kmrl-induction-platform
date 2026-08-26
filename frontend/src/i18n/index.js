import { en } from "./en";
import { ml } from "./ml";

export const dictionaries = { en, ml };

export function translate(key, lang) {
  const dict = dictionaries[lang] || dictionaries.en;
  if (dict[key] != null) return dict[key];
  // fall back to English rather than inventing a translation
  if (en[key] != null) return en[key];
  return key;
}
