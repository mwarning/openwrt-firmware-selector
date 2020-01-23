
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

function setupImageList(select, items, onselection) {
  
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
/*
<div id="currentLanguages">
    <span onclick="firmwarewizard.changeLanguage('en')">en</span> |
    <span onclick="firmwarewizard.changeLanguage('de')">de</span> |
    <span onclick="firmwarewizard.changeLanguage('pl')">pl</span>
  </div>
  */

// Change the translation of the entire document
function updateI18n() {
  var mapping = translations[config.language];
  for (var id in mapping) {
    var elements = document.getElementsByClassName(id);
    for (var i in elements) {
      if (elements.hasOwnProperty(i)) {
        elements[i].innerHTML = mapping[id];
      }
    }
  }
}

function setupAutocompleteList(input, items, onselection) {
  // the setupAutocompleteList function takes two arguments,
  // the text field element and an array of possible autocompleted values:
  var currentFocus = -1;

  // execute a function when someone writes in the text field:
  input.addEventListener("input", function(e) {
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
  });

  // execute a function presses a key on the keyboard:
  input.addEventListener("keydown", function(e) {
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
  });

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

function updateImages(target, images) {
  if (target && images) {
    for(var i in images) {
      var image = images[i];
      if (image.type == "sysupgrade") {
        $("sysupgrade-image").href = "https://" + target + "/" + image.name;
        $("sysupgrade-image").style.display = "inline";
      }
      if (image.type == "factory") {
        $("factory-image").href = "https://" + target + "/" + image.name;
        $("factory-image").style.display = "inline";
      }
    }
  } else {
    $("sysupgrade-image").style.display = "none";
    $("factory-image").style.display = "none";
  }
}

//hide fields
updateImages();
updateI18n();

loadFile(config.data, function(data) {
    var obj = JSON.parse(data);
    setupSelectList($("releases"), Object.keys(obj), function(release) {
      setupAutocompleteList($("models"), Object.keys(obj[release]), function(model) {
        console.log("clicked " + model);
        var target = obj[release][model].target;
        var images = obj[release][model].images
        updateImages(target, images);
      });
    });
})
