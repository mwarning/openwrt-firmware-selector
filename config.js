
var config = {
  // Default language, see i18n.js
  language: 'en',
  // Show help text for images
  showHelp: true,
  // Files to get data from
  versions: {
  //'SNAPSHOT': '/api/names/SNAPSHOT', // when using sasu backend
    'SNAPSHOT': 'misc/names-SNAPSHOT.json',
    '19.07.1': 'misc/names-19.07.1.json',
    '18.06.7': 'misc/names-18.06.7.json'
  },
  // Build custom images
  // See https://github.com/aparcar/asu
  //asu_url: 'https://chef.libremesh.org'
};
