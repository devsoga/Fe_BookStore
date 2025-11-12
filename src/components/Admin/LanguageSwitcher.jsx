import React from "react";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import { FaGlobe } from "react-icons/fa";

const LanguageSwitcher = ({ className = "" }) => {
  const { language, changeLanguage, t } = useLanguage();

  const languages = [
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "en", name: "English", flag: "🇺🇸" }
  ];

  const currentLanguage = languages.find((lang) => lang.code === language);

  return (
    <div className={`relative group ${className}`}>
      <button
        className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
        title={language === "vi" ? "Đổi ngôn ngữ" : "Change Language"}
      >
        <FaGlobe className="w-4 h-4 mr-2" />
        <span className="mr-1">{currentLanguage?.flag}</span>
        <span className="font-medium">{currentLanguage?.name}</span>
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-full flex items-center px-4 py-3 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
              language === lang.code
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-gray-700"
            }`}
          >
            <span className="mr-3 text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && (
              <span className="ml-auto text-blue-500">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
