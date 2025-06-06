
import React from 'react';
import { TargetLanguage } from '../types'; // Corrected import
import { supportedLanguages } from '../constants';
import { GlobeAltIcon } from './Icons';

interface LanguageSelectorProps {
  selectedLanguage: TargetLanguage;
  onSelectLanguage: (language: TargetLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLanguage, onSelectLanguage }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const langCode = event.target.value;
    const language = supportedLanguages.find(lang => lang.code === langCode);
    if (language) {
      onSelectLanguage(language);
    }
  };

  return (
    <div className="flex items-center space-x-2 w-full sm:w-auto">
      <GlobeAltIcon className="w-6 h-6 text-slate-400" />
      <label htmlFor="language-select" className="sr-only">Target Language</label>
      <select
        id="language-select"
        value={selectedLanguage.code}
        onChange={handleChange}
        className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 shadow"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};
