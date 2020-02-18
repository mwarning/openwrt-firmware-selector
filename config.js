
var config = {
  // Default language, see i18n.js
  language: 'en',
  // Show help text for images
  showHelp: true,
  // Files to get data from
  versions: {
  //'SNAPSHOT': '/api/names/SNAPSHOT' // when using asu backend
    'SNAPSHOT': 'names-SNAPSHOT.json',
    '19.07.1': 'names-19.07.1.json',
    '18.06.7': 'names-18.06.7.json'
  },
  // Build custom images (Attented Sysupgrade server)
  asu_url: '/api/build'
};
