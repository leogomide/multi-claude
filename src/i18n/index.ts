import rosetta from "rosetta";
import { en } from "./locales/en.ts";
import { es } from "./locales/es.ts";
import { ptBR } from "./locales/pt-BR.ts";
import type { TranslationDictionary } from "./types.ts";

export const i18n = rosetta<TranslationDictionary>();

i18n.set("en", en);
i18n.set("pt-BR", ptBR);
i18n.set("es", es);
i18n.locale("en");

export function initLocale(locale: string): void {
	i18n.locale(locale);
}

export type { TranslationDictionary };
