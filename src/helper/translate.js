const i18n = require('i18n');
function translate(key, lang) {
  if (lang) i18n.setLocale(lang);
  return i18n.__(key);
}

module.exports = translate;
