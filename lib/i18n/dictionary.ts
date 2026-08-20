import en from "./dictionaries/en";
import id from "./dictionaries/id";

export type Locale = "en" | "id";

const dictionaries = { en, id };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
