/* exported config */

var config = {
  // Default language, see i18n.js
  language: "en",
  // Show help text for images
  showHelp: true,
  // Image overview file or path to the ASU API
  versions: {
    SNAPSHOT: "../misc/snapshot/overview.json",
    "19.07.1": "../misc/19.07.1/overview.json",
    "18.06.7": "../misc/18.06.7/overview.json",
  },
  // Pre-selected version
  //default_version: "19.07.1",
  // Build custom images
  // See https://github.com/aparcar/asu
  //asu_url: 'https://chef.libremesh.org'
};
