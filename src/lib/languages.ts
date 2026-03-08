export const LANGUAGES = [
  { id: "en", label: "English", flag: "🇬🇧", script: "Latin" },
  { id: "hi", label: "Hindi", flag: "🇮🇳", script: "Devanagari" },
  { id: "hinglish", label: "Hinglish", flag: "🇮🇳", script: "Latin" },
  { id: "ta", label: "Tamil", flag: "🇮🇳", script: "Tamil" },
  { id: "te", label: "Telugu", flag: "🇮🇳", script: "Telugu" },
  { id: "bn", label: "Bengali", flag: "🇮🇳", script: "Bengali" },
  { id: "es", label: "Spanish", flag: "🇪🇸", script: "Latin" },
  { id: "pt", label: "Portuguese", flag: "🇧🇷", script: "Latin" },
  { id: "ar", label: "Arabic", flag: "🇦🇪", script: "Arabic" },
] as const;

export type LanguageId = typeof LANGUAGES[number]["id"];
