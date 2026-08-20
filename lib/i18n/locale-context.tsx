"use client";

import { createContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Locale } from "./dictionary";

type LocaleContextValue = {
  locale: Locale;
  dict: ReturnType<typeof getDictionary>;
  setLocale: (next: Locale) => void;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  initialDict,
  children,
}: {
  locale: Locale;
  initialDict?: ReturnType<typeof getDictionary>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<Locale>(locale);

  function setLocale(next: Locale) {
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setCurrent(next);
    router.refresh();
  }

  const dict = current === locale && initialDict ? initialDict : getDictionary(current);

  return (
    <LocaleContext.Provider value={{ locale: current, dict, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}
