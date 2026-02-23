import type React from "react";
import { createContext, useContext } from "react";
import type { Rosetta } from "rosetta";
import { i18n } from "./index.ts";
import type { TranslationDictionary } from "./types.ts";

interface I18nContextValue {
	t: Rosetta<TranslationDictionary>["t"];
	locale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
	children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
	const value: I18nContextValue = {
		t: i18n.t.bind(i18n),
		locale: i18n.locale(),
	};

	return <I18nContext value={value}>{children}</I18nContext>;
}

export function useTranslation(): I18nContextValue {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		throw new Error("useTranslation must be used within an I18nProvider");
	}
	return ctx;
}
