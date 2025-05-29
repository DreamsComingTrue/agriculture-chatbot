import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="absolute top-4 right-4">
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        value={i18n.language}
        className="bg-white border border-gray-300 rounded px-3 py-1 text-sm"
      >
        <option value="en">{i18n.t('language.en')}</option>
        <option value="zh">{i18n.t('language.zh')}</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
