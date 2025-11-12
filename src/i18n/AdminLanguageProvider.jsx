import React, { createContext, useContext, useState, useEffect } from "react";
import en from "./en.json";
import vi from "./vi.json";

const LanguageContext = createContext();

const translations = {
  en,
  vi
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const AdminLanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first, then fall back to Vietnamese
    const savedLanguage = localStorage.getItem("admin_language");
    return savedLanguage || "vi";
  });

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem("admin_language", language);
  }, [language]);

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split(".");
    let translation = translations[language];

    // Navigate through nested keys
    for (const k of keys) {
      if (translation && typeof translation === "object" && k in translation) {
        translation = translation[k];
      } else {
        // Fallback to English if key not found in current language
        translation = translations.en;
        for (const k of keys) {
          if (
            translation &&
            typeof translation === "object" &&
            k in translation
          ) {
            translation = translation[k];
          } else {
            // Return key if not found in any language
            console.warn(`Translation key not found: ${key}`);
            return key;
          }
        }
        break;
      }
    }

    // Handle parameter substitution
    if (typeof translation === "string" && params) {
      return translation.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] || match;
      });
    }

    return typeof translation === "string" ? translation : key;
  };

  const contextValue = {
    language,
    changeLanguage,
    t,
    isVietnamese: language === "vi",
    isEnglish: language === "en"
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export default AdminLanguageProvider;
