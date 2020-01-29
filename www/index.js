
function loadFile(url, callback) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      callback(xmlhttp.responseText, url);
    }
  };
  xmlhttp.open('GET', url, true);
  xmlhttp.send();
}

function setupSelectList(select, items, onselection) {
  for (var i = 0; i < items.length; i += 1) {
    var option = document.createElement("OPTION");
    option.innerHTML = items[i];
    select.appendChild(option);
  }

  select.addEventListener("change", function(e) {
    onselection(items[select.selectedIndex]);
  });

  if (select.selectedIndex >= 0) {
    onselection(items[select.selectedIndex]);
  }
}

// Change the translation of the entire document
function changeLanguage(language) {
  var mapping = translations[language];
  if (mapping) {
    for (var id in mapping) {
      var elements = document.getElementsByClassName(id);
      for (var i in elements) {
        if (elements.hasOwnProperty(i)) {
          elements[i].innerHTML = mapping[id];
        }
      }
    }
  }
}

function setupAutocompleteList(input, items, onselection) {
  // the setupAutocompleteList function takes two arguments,
  // the text field element and an array of possible autocompleted values:
  var currentFocus = -1;

  items.sort();

  // execute a function when someone writes in the text field:
  input.oninput = function(e) {
    // clear images
    updateImages();

    var value = this.value;
    // close any already open lists of autocompleted values
    closeAllLists();
    if (!value) { return false; }

    // create a DIV element that will contain the items (values):
    var list = document.createElement("DIV");
    list.setAttribute("id", this.id + "-autocomplete-list");
    list.setAttribute("class", "autocomplete-items");
    // append the DIV element as a child of the autocomplete container:
    this.parentNode.appendChild(list);

    // for each item in the array...
    var c = 0;
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];

      // match
      var j = item.toUpperCase().indexOf(value.toUpperCase());
      if (j < 0) {
        continue;
      }

      c += 1;
      if (c >= 10) {
        var div = document.createElement("DIV");
        div.innerHTML = "...";
        list.appendChild(div);
        break;
      } else {
        var div = document.createElement("DIV");
        // make the matching letters bold:
        div.innerHTML = item.substr(0, j)
          + "<strong>" + item.substr(j, value.length) + "</strong>"
          + item.substr(j + value.length)
          + "<input type='hidden' value='" + item + "'>";

        div.addEventListener("click", function(e) {
          // set text field to selected value
          input.value = this.getElementsByTagName("input")[0].value;
          // close the list of autocompleted values,
          // (or any other open lists of autocompleted values:
          closeAllLists();
          // callback
          onselection(input.value);
        });

        list.appendChild(div);
      }
    }
  };

  input.onkeydown = function(e) {
      var x = document.getElementById(this.id + "-autocomplete-list");
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
          // and simulate a click on the "active" item:
          if (x) x[currentFocus].click();
        }
      }
  };

  input.onfocus = function() {
    onselection(input.value);
  }

  function setActive(x) {
    // a function to classify an item as "active":
    if (!x) return false;
    // start by removing the "active" class on all items:
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    // add class "autocomplete-active":
    x[currentFocus].classList.add("autocomplete-active");
  }

  function closeAllLists(elmnt) {
    // close all autocomplete lists in the document,
    // except the one passed as an argument:
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != input) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }

  // execute a function when someone clicks in the document:
  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
  });
}

function $(id) {
  return document.getElementById(id);
}

function extractImageType(name) {
  var m = /-(sysupgrade|factory|rootfs|kernel|tftp)[-.]/.exec(name);
  return m ? m[1] : 'factory';
}

function updateImages(dllink, model, target, release, commit, images) {
  var types = ['sysupgrade', 'factory', 'rootfs', 'kernel', 'tftp'];

  function hideLinks() {
    types.forEach(function(type) {
      $(type + '-image').style.display = 'none';
    });
  }

  function hideHelps() {
    types.forEach(function(type) {
      $(type + '-help').style.display = 'none';
    });
  }

  function showLink(type, path) {
    var e = $(type + '-image');
    e.href = path;
    e.style.display = 'inline-flex';
    if (config.showHelp) {
      e.onmouseover = function() {
        hideHelps();
        $(type + '-help').style.display = 'block';
      };
    }
  }

  hideLinks();
  hideHelps();

  if (model && target && release && commit && images) {
    // fill out build info
    $('image-model').innerText = model;
    $('image-target').innerText = target;
    $('image-release').innerText = release;
    $('image-commit').innerText = commit;

    // show links to images
    for(var i in images) {
      var file = images[i];
      var path = (dllink ? dllink : config.downloadLink)
        .replace('%target', target)
        .replace('%release', release)
        .replace('%file', file)
        .replace('%commit', commit);
      var type = extractImageType(file);

      if (types.includes(type)) {
        showLink(type, path);
      }
    }

    $('images').style.display = 'block';
  } else {
    $('images').style.display = 'none';
  }
}

// hide fields
updateImages();
changeLanguage(config.language);

function parseData(data) {
  var obj = JSON.parse(data);
  var out = {};
  for (var release in obj) {
    var link = obj[release]['link'];
    var commit  = obj[release]['commit']
    var entries = obj[release]['models'];
    var models = {};
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      var name = (entry[0] + " " + entry[1] + " " + entry[2]).trim();
      var target = entry[3];
      var images = entry[4];
      models[name] = {'link': link, 'name': name, 'target': target, 'commit': commit, 'images': images};
    }
    out[release] = models;
  }
  return out;
}

loadFile(config.data, function(data) {
    var obj = parseData(data);
    setupSelectList($("releases"), Object.keys(obj), function(release) {
      setupAutocompleteList($("models"), Object.keys(obj[release]), function(model) {
        if (model in obj[release]) {
          var dllink = obj[release][model].link;
          var target = obj[release][model].target;
          var commit = obj[release][model].commit;
          var images = obj[release][model].images;
          updateImages(dllink, model, target, release, commit, images);
        } else {
          updateImages();
        }
      });

      // trigger model update when selected release changes
      $("models").onfocus();
    });
})