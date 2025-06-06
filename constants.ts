import { TargetLanguage } from './types';

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

export const supportedLanguages: TargetLanguage[] = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'uz-UZ', name: 'Uzbek' }, // TTS support for Uzbek might be limited with some vendors
  { code: 'ne-NP', name: 'Nepali' }, // TTS support for Nepali might be limited
  { code: 'id-ID', name: 'Indonesian' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'my-MM', name: 'Burmese (Myanmar)' }, // TTS might be limited
  { code: 'km-KH', name: 'Khmer (Cambodian)' }, // TTS might be limited
];

// Simulated "law data" / knowledge base for construction terms
// In a real application, this would come from open.law.go.kr or similar.
export const KOREAN_CONSTRUCTION_TERMS: { [key: string]: string } = {
  "안전모": "safety helmet",
  "안전화": "safety shoes",
  "안전벨트": "safety harness / safety belt",
  "작업계획서": "work plan / method statement",
  "위험성 평가": "risk assessment",
  "안전수칙": "safety rules / safety regulations",
  "개인보호구": "Personal Protective Equipment (PPE)",
  "비계": "scaffolding",
  "추락 방지망": "fall arrest net / safety net",
  "안전 난간": "safety railing / guardrail",
  "작업 발판": "work platform / footing",
  "밀폐 공간": "confined space",
  "유해물질": "hazardous substance",
  "응급처치": "first aid",
  "소화기": "fire extinguisher",
  "대피로": "evacuation route / emergency exit",
  "지게차": "forklift",
  "크레인": "crane",
  "TBM": "Toolbox Meeting (TBM)",
  "작업중지권": "right to stop work (if unsafe)",
  "안전관리자": "safety manager",
  "산업안전보건법": "Occupational Safety and Health Act"
};