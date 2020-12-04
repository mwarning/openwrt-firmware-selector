/* exported config */

var config = {
  // Show help text for images
  show_help: true,

  // Path to overview.json file or URL to the ASU API
  versions: {
    "18.06.9": "../misc/18.06.9/",
    "19.07.4": "../misc/19.07.4/",
    SNAPSHOT: "../misc/SNAPSHOT/",
  },

  // Pre-selected version (optional)
  default_version: "19.07.4",

  // Image download URL (optional)
  //image_url: "https://downloads.openwrt.org/releases/{version}/{target}",

  // Info link URL (optional)
  //info_url: "https://openwrt.org/start?do=search&id=toh&q={title}",

  // Build custom images (optional)
  // See https://github.com/aparcar/asu
  //asu_url: 'https://chef.libremesh.org'
};
