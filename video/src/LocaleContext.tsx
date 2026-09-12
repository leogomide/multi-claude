import { createContext, useContext } from "react";
import { COPY, type Copy, type Locale } from "./copy";

const LocaleContext = createContext<Locale>("en");

export const LocaleProvider: React.FC<{
	locale: Locale;
	children: React.ReactNode;
}> = ({ locale, children }) => (
	<LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
);

/** The resolved copy for the composition being rendered. */
export const useCopy = (): Copy => COPY[useContext(LocaleContext)];

export const useLocale = (): Locale => useContext(LocaleContext);
