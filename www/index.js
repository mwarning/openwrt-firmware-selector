/* global translations, config */
/* exported buildAsuRequest, init */

let current_device = {};
let url_params = undefined;

function $(query) {
  if (typeof query === "string") {
    return document.querySelector(query);
  } else {
    return query;
  }
}

function show(query) {
  $(query).style.display = "block";
}

function hide(query) {
  $(query).style.display = "none";
}

function split(str) {
  return str.match(/[^\s,]+/g) || [];
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
            updateImages(mobj, image_url, true);
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
  const mapping = translations[config.language];
  for (const tr in mapping) {
    Array.from(document.getElementsByClassName(tr)).forEach((e) => {
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

    if (!value) {
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

  // focus lost
  input.onblur = function () {
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
    const xs = document.getElementsByClassName("autocomplete-items");
    for (const x of xs) {
      if (elmnt != x && elmnt != input) {
        x.parentNode.removeChild(x);
      }
    }
  }

  // execute a function when someone clicks in the document:
  document.addEventListener("click", (e) => {
    closeAllLists(e.target);
  });
}

// for attended sysupgrade
function updatePackageList(version, target) {
  // set available packages
  fetch(
    config.asu_url +
      "/" +
      config.versions[version] +
      "/" +
      target +
      "/index.json"
  )
    .then((response) => response.json())
    .then((all_packages) => {
      setupAutocompleteList(
        $("#packages"),
        all_packages,
        true,
        () => {},
        (textarea) => {
          textarea.value = split(textarea.value)
            // make list unique, ignore minus
            .filter((value, index, self) => {
              const i = self.indexOf(value.replace(/^-/, ""));
              return i === index || i < 0;
            })
            // limit to available packages, ignore minus
            .filter(
              (value) => all_packages.indexOf(value.replace(/^-/, "")) !== -1
            )
            .join(" ");
        }
      );
    });
}

function updateImages(mobj, image_url, is_custom) {
  // add download button for image
  function addLink(type, file) {
    const a = document.createElement("A");
    a.classList.add("download-link");
    a.href =
      image_url
        .replace("{target}", mobj.target)
        .replace("{version}", mobj.version_number) +
      "/" +
      file;
    const span = document.createElement("SPAN");
    span.appendChild(document.createTextNode(""));
    a.appendChild(span);
    a.appendChild(document.createTextNode(type.toUpperCase()));

    if (config.showHelp) {
      a.onmouseover = function () {
        // hide all help texts
        Array.from(document.getElementsByClassName("download-help")).forEach(
          (e) => (e.style.display = "none")
        );
        const lc = type.toLowerCase();
        if (lc.includes("sysupgrade")) {
          show("#sysupgrade-help");
        } else if (lc.includes("factory") || lc == "trx" || lc == "chk") {
          show("#factory-help");
        } else if (
          lc.includes("kernel") ||
          lc.includes("zimage") ||
          lc.includes("uimage")
        ) {
          show("#kernel-help");
        } else if (lc.includes("root")) {
          show("#rootfs-help");
        } else if (lc.includes("sdcard")) {
          show("#sdcard-help");
        } else if (lc.includes("tftp")) {
          show("#tftp-help");
        } else {
          show("#other-help");
        }
      };
    }

    $("#download-links").appendChild(a);
  }

  function switchClass(query, from_class, to_class) {
    $(query).classList.remove(from_class);
    $(query).classList.add(to_class);
  }

  // remove all download links
  Array.from(document.getElementsByClassName("download-link")).forEach((e) =>
    e.remove()
  );

  // hide all help texts
  Array.from(document.getElementsByClassName("download-help")).forEach(
    (e) => (e.style.display = "none")
  );

  if (image_url && mobj) {
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
    $("#image-model").innerText = getModelTitles(mobj.titles).join(" / ");
    $("#image-target").innerText = mobj.target;
    $("#image-version").innerText = mobj.version_number;
    $("#image-code").innerText = mobj.version_code;
    $("#image-date").innerText = mobj.build_at;

    images.sort((a, b) => a.name.localeCompare(b.name));

    for (const i in images) {
      addLink(images[i].type, images[i].name);
    }

    if (config.asu_url) {
      updatePackageList(mobj.version_number, mobj.target);
    }

    // set current selection in URL
    history.pushState(
      null,
      null,
      document.location.href.split("?")[0] +
        "?version=" +
        encodeURIComponent(mobj.version_number) +
        "&id=" +
        encodeURIComponent(mobj.id)
    );

    show("#images");
  } else {
    hide("#images");
  }
}

// Update model title in search box.
// Device id and model title might change between releases.
function setModel(obj, id, title) {
  if (id) {
    for (const mobj of Object.values(obj["models"])) {
      if (mobj["id"] == id) {
        for (const title1 of getModelTitles(mobj["titles"])) {
          $("#models").value = title1;
          return;
        }
      }
    }
  }

  if (title) {
    for (const mobj of Object.values(obj["models"])) {
      for (const title1 of getModelTitles(mobj["titles"])) {
        if (title1.toLowerCase() == title.toLowerCase()) {
          $("#models").value = title1;
          return;
        }
      }
    }
  }
}

function changeModel(version, overview, model) {
  if (model in overview["models"]) {
    let build_date = "unknown";
    const id = overview["models"][model]["id"];
    const target = overview["models"][model]["target"];
    const profiles_url = "data/" + version + "/" + target + "/" + id + ".json";

    fetch(profiles_url)
      .then((obj) => {
        return obj.json();
      })
      .then((mobj) => {
        updateImages(mobj, overview.image_url, false);
        current_device = { version: version, id: id, target: target };
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
    let overview_url = config.versions[version];
    if (config.asu_url) {
      overview_url = config.asu_url + "/" + overview_url + "/profiles.json";
    }

    fetch(overview_url)
      .then((obj) => {
        return obj.json();
      })
      .then((obj) => {
        // change models format
        let models = {};
        for (const [id, value] of Object.entries(obj["models"])) {
          for (const title of getModelTitles(value["titles"])) {
            value["id"] = id;
            models[title] = value;
          }
        }
        return { models: models, image_url: obj["image_url"] };
      })
      .then((obj) => {
        setupAutocompleteList(
          $("#models"),
          Object.keys(obj["models"]),
          false,
          updateImages,
          (selectList) => {
            changeModel(version, obj, selectList.value);
          }
        );

        // set model when selected version changes
        setModel(
          obj,
          current_device["id"] || url_params.get("id"),
          current_device["title"] || url_params.get("title")
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
  const user_lang = (navigator.language || navigator.userLanguage).split(
    "-"
  )[0];
  if (user_lang in translations) {
    config.language = user_lang;
    $("#language-selection").value = user_lang;
  }

  translate();

  $("#language-selection").onclick = function () {
    config.language = this.children[this.selectedIndex].value;
    translate();
  };
}
