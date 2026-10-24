import { en, pt } from "@blocknote/core/locales";

type Dictionary = typeof en;

// O dicionário `pt` do BlockNote não cobre todas as chaves do `en`
// (ex.: `placeholders.emptyDocument`). Mescla seção por seção para que
// qualquer chave ausente use o texto em inglês em vez de `undefined`.
export const blockNoteDictionary: Dictionary = Object.fromEntries(
  Object.entries(en).map(([section, enValues]) => {
    const ptValues = (pt as Partial<Dictionary>)[section as keyof Dictionary];
    const merged =
      enValues && typeof enValues === "object" && !Array.isArray(enValues)
        ? { ...enValues, ...(ptValues as object | undefined) }
        : ptValues ?? enValues;
    return [section, merged];
  }),
) as Dictionary;
