/* global translations, config */
/* exported buildAsuRequest, init */

let current_device = {};
let current_language = "en";
let url_params = undefined;

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

function show(query) {
  (typeof query === "string" ? $(query) : query).classList.remove("hide");
}

function hide(query) {
  (typeof query === "string" ? $(query) : query).classList.add("hide");
}

function split(str) {
  return str.match(/[^\s,]+/g) || [];
}

/* exported toggleCustomize */
function toggleCustomize() {
  $("#custom div").classList.toggle("hide");
  $("#custom h3").classList.toggle("active");
}

function getModelTitles(titles) {
  return titles.map((e) => {
    if (e.title) {
      return e.title;
    } else {
      return (
        (e.vendor || "") +
        " " +
        (e.model || "") +
        " " +
        (e.variant || "")
      ).trim();
    }
  });
}

function buildAsuRequest() {
  if (!current_device || !current_device.id) {
    alert("bad profile");
    return;
  }

  function showStatus(message, url) {
    show("#buildstatus");
    const tr = message.startsWith("tr-") ? message : "";
    if (url) {
      $("#buildstatus").innerHTML =
        '<a href="' + url + '" class="' + tr + '">' + message + "</a>";
    } else {
      $("#buildstatus").innerHTML = '<span class="' + tr + '"></span>';
    }
    translate();
  }

  // hide image view
  updateImages();

  hide("#notfound");
  show("#buildspinner");
  showStatus("tr-request-image");

  const request_data = {
    target: current_device.target,
    profile: current_device.id,
    packages: split($("#packages").value),
    version: $("#versions").value,
  };

  fetch(config.asu_url + "/api/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request_data),
  })
    .then((response) => {
      switch (response.status) {
        case 200:
          hide("#buildspinner");
          showStatus("tr-build-successful");

          response.json().then((mobj) => {
            const image_url = config.asu_url + "/store/" + mobj.bin_dir;
            showStatus("tr-build-successful", image_url + "/buildlog.txt");
            mobj["id"] = current_device.id;
            updateImages(mobj, { image_url: image_url }, true);
          });
          break;
        case 202:
          showStatus("tr-check-again");
          setTimeout(() => {
            buildAsuRequest();
          }, 5000);
          break;
        case 400: // bad request
        case 422: // bad package
        case 500: // build failed
          hide("#buildspinner");
          response.json().then((mobj) => {
            const message = mobj["message"] || "tr-build-failed";
            const url = mobj.buildlog
              ? config.asu_url + "/store/" + mobj.bin_dir + "/buildlog.txt"
              : undefined;
            showStatus(message, url);
          });
          break;
      }
    })
    .catch((err) => {
      hide("#buildspinner");
      showStatus(err);
    });
}

function setupSelectList(select, items, onselection) {
  for (const item of items.sort().reverse()) {
    const option = document.createElement("OPTION");
    option.innerHTML = item;
    select.appendChild(option);
  }

  // pre-select version from URL or config.json
  const preselect = url_params.get("version") || config.default_version;
  if (preselect) {
    $("#versions").value = preselect;
  }

  select.addEventListener("change", () => {
    onselection(items[select.selectedIndex]);
  });

  if (select.selectedIndex >= 0) {
    onselection(items[select.selectedIndex]);
  }
}

// Change the translation of the entire document
function translate() {
  const mapping = translations[current_language];
  for (const tr in mapping) {
    $$("." + tr).forEach((e) => {
      e.innerText = mapping[tr];
    });
  }
}

function setupAutocompleteList(input, items, as_list, onbegin, onend) {
  let currentFocus = -1;

  // sort numbers and other characters separately
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  items.sort(collator.compare);

  input.oninput = function () {
    onbegin();

    let offset = 0;
    let value = this.value;
    let value_list = [];

    if (as_list) {
      // automcomplete last text item
      offset = this.value.lastIndexOf(" ") + 1;
      value = this.value.substr(offset);
      value_list = split(this.value.substr(0, offset));
    }

    // close any already open lists of autocompleted values
    closeAllLists();

    if (value.length === 0) {
      return false;
    }

    if (items.includes(value)) {
      return false;
    }

    // create a DIV element that will contain the items (values):
    const list = document.createElement("DIV");
    list.setAttribute("id", this.id + "-autocomplete-list");
    list.setAttribute("class", "autocomplete-items");
    // append the DIV element as a child of the autocomplete container:
    this.parentNode.appendChild(list);

    function normalize(s) {
      return s.toUpperCase().replace(/[-_.]/g, " ");
    }

    const match = normalize(value);
    let c = 0;
    for (const item of items) {
      // match
      let j = normalize(item).indexOf(match);
      if (j < 0) {
        continue;
      }

      // do not offer a duplicate item
      if (as_list && value_list.indexOf(item) != -1) {
        continue;
      }

      c += 1;
      if (c >= 15) {
        let div = document.createElement("DIV");
        div.innerHTML = "...";
        list.appendChild(div);
        break;
      } else {
        let div = document.createElement("DIV");
        // make the matching letters bold:
        div.innerHTML =
          item.substr(0, j) +
          "<strong>" +
          item.substr(j, value.length) +
          "</strong>" +
          item.substr(j + value.length) +
          '<input type="hidden" value="' +
          item +
          '">';

        div.addEventListener("click", function () {
          // include selected value
          const selected = this.getElementsByTagName("input")[0].value;
          if (as_list) {
            input.value = value_list.join(" ") + " " + selected;
          } else {
            input.value = selected;
          }
          // close the list of autocompleted values,
          closeAllLists();
          onend(input);
        });

        list.appendChild(div);
      }
    }
  };

  input.onkeydown = function (e) {
    let x = document.getElementById(this.id + "-autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      // key down
      currentFocus += 1;
      // and and make the current item more visible:
      setActive(x);
    } else if (e.keyCode == 38) {
      // key up
      currentFocus -= 1;
      // and and make the current item more visible:
      setActive(x);
    } else if (e.keyCode == 13) {
      // If the ENTER key is pressed, prevent the form from being submitted,
      e.preventDefault();
      if (currentFocus > -1) {
        // and simulate a click on the 'active' item:
        if (x) x[currentFocus].click();
      }
    }
  };

  input.onfocus = function () {
    onend(input);
  };

  function setActive(xs) {
    // a function to classify an item as 'active':
    if (!xs) return false;
    // start by removing the 'active' class on all items:
    for (const x of xs) {
      x.classList.remove("autocomplete-active");
    }
    if (currentFocus >= xs.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = xs.length - 1;
    // add class 'autocomplete-active':
    xs[currentFocus].classList.add("autocomplete-active");
  }

  function closeAllLists(elmnt) {
    // close all autocomplete lists in the document,
    // except the one passed as an argument:
    for (const x of $$(".autocomplete-items")) {
      if (elmnt != x && elmnt != input) {
        x.parentNode.removeChild(x);
      }
    }
  }

  // close select list if focus is lost
  document.addEventListener("click", (e) => {
    closeAllLists(e.target);
  });

  // try to match if there is an input
  if (input.value.length) {
    input.oninput();
  }
}

// for attended sysupgrade
function updatePackageList(mobj) {
  // set available packages
  fetch(
    config.asu_url +
      "/" +
      config.versions[mobj.version_number] +
      "/" +
      mobj.target +
      "/index.json"
  )
    .then((response) => response.json())
    .then((packages) => {
      const all_packages = packages.concat(
        mobj.default_packages.map((e) => "-" + e),
        mobj.device_packages.map((e) => "-" + e)
      );

      setupAutocompleteList(
        $("#packages"),
        all_packages,
        true,
        () => {},
        (textarea) => {
          textarea.value = split(textarea.value)
            // make list unique, ignore minus prefix
            .filter((value, index, self) => {
              const i = self.indexOf(value.replace(/^[-]/, ""));
              return i === index || i < 0;
            })
            // limit to available packages
            .filter((value) => all_packages.indexOf(value) !== -1)
            .join(" ");
        }
      );
    });
}

function setValue(query, value) {
  const e = $(query);
  if (value !== undefined && value.length > 0) {
    if (e.tagName == "A") {
      e.href = value;
    } else {
      e.innerText = value;
    }
    show(e.parentNode);
  } else {
    hide(e.parentNode);
  }
}

function updateHelp(image) {
  // hide all help texts
  $$(".download-help").forEach((e) => hide("#" + e.id));

  const type = image.type;
  const name = image.name;

  if (type.includes("sysupgrade")) {
    show("#sysupgrade-help");
  } else if (type.includes("factory") || type == "trx" || type == "chk") {
    show("#factory-help");
  } else if (name.includes("initramfs")) {
    show("#initramfs-help");
  } else if (
    type.includes("kernel") ||
    type.includes("zimage") ||
    type.includes("uimage")
  ) {
    show("#kernel-help");
  } else if (type.includes("root")) {
    show("#rootfs-help");
  } else if (type.includes("sdcard")) {
    show("#sdcard-help");
  } else if (type.includes("tftp")) {
    show("#tftp-help");
  } else {
    show("#other-help");
  }
}

function commonPrefix(array) {
  const A = array.sort();
  const a1 = A[0];
  const a2 = A[A.length - 1];
  let i = 0;
  while (i < a1.length && a1[i] === a2[i]) i++;
  return a1.slice(0, i);
}

// get difference in image names
function getNameDifference(images, image) {
  function ar(e) {
    return e.name.split("-");
  }
  const same = images.filter((e) => e.type == image.type);
  if (same.length > 1) {
    const prefix = commonPrefix(same.map((e) => ar(e)));
    const suffix = commonPrefix(same.map((e) => ar(e).reverse()));
    const base = ar(image);
    return base.slice(prefix.length, base.length - suffix.length).join("-");
  } else {
    return "";
  }
}

// add download button for image
function createLink(mobj, image, image_url) {
  const a = document.createElement("A");
  a.classList.add("download-link");
  a.href =
    image_url
      .replace("{title}", encodeURI($("#models").value))
      .replace("{target}", mobj.target)
      .replace("{id}", mobj.id)
      .replace("{version}", mobj.version_number) +
    "/" +
    image.name;

  let label = image.type;

  // distinguish labels if neccessary
  const extra = getNameDifference(mobj.images, image);
  if (extra.length > 0) {
    label += " (" + extra + ")";
  }

  const span = document.createElement("SPAN");
  span.appendChild(document.createTextNode(""));
  a.appendChild(span);
  a.appendChild(document.createTextNode(label.toUpperCase()));
  return a;
}

function updateImages(mobj, overview, is_custom) {
  function switchClass(query, from_class, to_class) {
    $(query).classList.remove(from_class);
    $(query).classList.add(to_class);
  }

  // remove all download links
  $$(".download-link").forEach((e) => e.remove());

  hide("#help");

  if (mobj) {
    const images = mobj.images;

    // change between "version" and "custom" title
    if (is_custom) {
      switchClass("#build-title", "tr-version-build", "tr-custom-build");
      switchClass(
        "#downloads-title",
        "tr-version-downloads",
        "tr-custom-downloads"
      );
    } else {
      switchClass("#build-title", "tr-custom-build", "tr-version-build");
      switchClass(
        "#downloads-title",
        "tr-custom-downloads",
        "tr-version-downloads"
      );
    }

    // update title translation
    translate();

    // fill out build info
    setValue("#image-model", getModelTitles(mobj.titles).join(" / "));
    setValue("#image-target", mobj.target);
    setValue("#image-version", mobj.version_number);
    setValue("#image-code", mobj.version_code);
    setValue("#image-date", mobj.build_at);
    setValue("#image-sha256", undefined); // not set by default

    setValue(
      "#image-info",
      (config.info_url || overview.info_url || "")
        .replace("{title}", encodeURI($("#models").value))
        .replace("{target}", mobj.target)
        .replace("{id}", mobj.id)
        .replace("{version}", mobj.version_number)
    );

    images.sort((a, b) => a.name.localeCompare(b.name));

    const image_url = config.image_url || overview.image_url || "";

    for (const image of images) {
      const a = createLink(mobj, image, image_url);

      a.onmouseover = function () {
        // persistent highlight on a single download button
        $$(".download-link").forEach((e) =>
          e.classList.remove("download-link-hover")
        );
        a.classList.add("download-link-hover");

        setValue("#image-sha256", image.sha256);

        if (config.show_help) {
          show("#help");
          updateHelp(image);
        }
      };

      $("#download-links").appendChild(a);
    }

    if (config.asu_url) {
      updatePackageList(mobj);
    }

    // set current selection in URL
    history.pushState(
      null,
      null,
      document.location.href.split("?")[0] +
        "?version=" +
        encodeURIComponent(mobj.version_number) +
        "&target=" +
        encodeURIComponent(mobj.target) +
        "&id=" +
        encodeURIComponent(mobj.id)
    );

    hide("#notfound");
    show("#images");
  } else {
    if ($("#models").value.length > 0) {
      show("#notfound");
    } else {
      hide("#notfound");
    }
    hide("#images");
  }
}

// Update model title in search box.
// Device id might change between releases.
function setModel(overview, target, id) {
  if (target && id && $("#models").value.length == 0) {
    for (const mobj of Object.values(overview.profiles)) {
      if (mobj.id === id && mobj.target === target) {
        $("#models").value = mobj.title;
        $("#models").oninput();
        return;
      }
    }
  }
}

function changeModel(version, overview, title, base_url) {
  const entry = overview.profiles[title];
  if (entry) {
    fetch(base_url + "/" + entry.target + "/" + entry.id + ".json")
      .then((obj) => {
        return obj.json();
      })
      .then((mobj) => {
        mobj["id"] = entry.id;
        updateImages(mobj, overview, false);
        current_device = {
          version: version,
          id: entry.id,
          target: entry.target,
        };
      });
  } else {
    updateImages();
    current_device = {};
  }
}

function init() {
  url_params = new URLSearchParams(window.location.search);

  setupSelectList($("#versions"), Object.keys(config.versions), (version) => {
    // A new version was selected
    let base_url = config.versions[version];
    if (config.asu_url) {
      base_url = config.asu_url + "/" + base_url;
    }

    fetch(base_url + "/overview.json")
      .then((obj) => {
        return obj.json();
      })
      .then((obj) => {
        var dups = {};
        var profiles = [];

        // Some models exist in multiple targets when
        // a target is in the process of being renamed.
        // Appends target in brackets to make title unique.
        function resolve_duplicate(e) {
          const tu = e.title.toUpperCase();
          if (tu in dups) {
            e.title += " (" + e.target + ")";
            let o = dups[tu];
            if (o.title.toUpperCase() == tu) {
              o.title += " (" + o.target + ")";
            }
          } else {
            dups[tu] = e;
          }
        }

        for (const profile of obj.profiles) {
          for (let title of getModelTitles(profile.titles)) {
            if (title.length == 0) {
              console.warn(
                "Empty device title for device id: " +
                  profile.target +
                  ", " +
                  profile.id
              );
              continue;
            }

            const e = Object.assign({ id: profile.id, title: title }, profile);
            resolve_duplicate(e);
            profiles.push(e);
          }
        }

        // replace profiles
        obj.profiles = profiles.reduce((d, e) => ((d[e.title] = e), d), {});

        return obj;
      })
      .then((obj) => {
        setupAutocompleteList(
          $("#models"),
          Object.keys(obj.profiles),
          false,
          updateImages,
          (selectList) => {
            changeModel(version, obj, selectList.value, base_url);
          }
        );

        // set model when selected version changes
        setModel(
          obj,
          current_device["target"] || url_params.get("target"),
          current_device["id"] || url_params.get("id")
        );

        // trigger update of current selected model
        $("#models").onfocus();
      });
  });

  if (config.asu_url) {
    show("#custom");
  }

  // hide fields
  updateImages();

  // default to browser language
  const lang = (navigator.language || navigator.userLanguage).toLowerCase();
  const lang_short = lang.split("-")[0];
  if (lang in translations) {
    current_language = lang;
  } else if (lang_short in translations) {
    current_language = lang_short;
  }

  $("#languages select").value = current_language;

  translate();

  $("#languages select").onclick = function () {
    current_language = this.children[this.selectedIndex].value;
    translate();
  };
}
