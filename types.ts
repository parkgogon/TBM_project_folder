
export interface TargetLanguage {
  code: string; // BCP 47 language code, e.g., 'en-US', 'ko-KR', 'vi-VN'
  name: string; // Human-readable name, e.g., 'English (US)', 'Korean', 'Vietnamese'
}

// This is a simplified representation. Real law data would be more complex.
export interface LawTerm {
  term_ko: string;
  term_en: string; // Or term_target_language
  description?: string;
}