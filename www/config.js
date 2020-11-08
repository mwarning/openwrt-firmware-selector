/* exported config */

var config = {
  // Default language, see i18n.js
  language: "en",
  // Show help text for images
  showHelp: true,
  // Image overview file or path to the ASU API
  versions: {
    '18.06.8': '../misc/18.06.8/overview.json',
    '19.07.4': '../misc/19.07.4/overview.json',
    'SNAPSHOT': '../misc/SNAPSHOT/overview.json'
  },
  // Pre-selected version
  //default_version: "19.07.4",
  // Build custom images
  // See https://github.com/aparcar/asu
  //asu_url: 'https://chef.libremesh.org'
};
