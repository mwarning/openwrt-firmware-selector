
var current_model = {};

function $(query) {
  if (typeof query === 'string') {
    return document.querySelector(query);
  } else {
    return query;
  }
}

function show(query) {
  $(query).style.display = 'block';
}

function hide(query) {
  $(query).style.display = 'none';
}

function split(str) {
  return str.match(/[^\s,]+/g) || [];
}

function get_model_titles(titles) {
  return titles.map(e => {
    if (e.title) {
      return e.title;
    } else {
      return ((e.vendor || '') + ' ' + (e.model || '') + ' ' + (e.variant || '')).trim();
    }
  }).join(' / ');
}

function build_asu_request() {
  if (!current_model || !current_model.id) {
    alert('bad profile');
    return;
  }

  function showStatus(message, url) {
    show('#buildstatus');
    var tr = message.startsWith('tr-') ? message : '';
    if (url) {
      $('#buildstatus').innerHTML = '<a href="' + url + '" class="' + tr + '">' + message + '</a>';
    } else {
      $('#buildstatus').innerHTML = '<span class="' + tr + '"></span>';
    }
    translate();
  }

  // hide image view
  updateImages();

  show('#buildspinner');
  showStatus('tr-request-image');

  var request_data = {
    'target': current_model.target,
    'profile': current_model.id,
    'packages': split($('#packages').value),
    'version': $('#versions').value
  }

  fetch(config.asu_url + '/api/build', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(request_data)
  })
  .then(response => {
    switch (response.status) {
      case 200:
        hide('#buildspinner');
        showStatus('tr-build-successful');

        response.json()
        .then(mobj => {
          var download_url = config.asu_url + '/store/' + mobj.bin_dir;
          showStatus('tr-build-successful', download_url + '/buildlog.txt');
          updateImages(
            mobj.version_number,
            mobj.version_code,
            mobj.build_at,
            get_model_titles(mobj.titles),
            download_url, mobj, true
          );
        });
        break;
      case 202:
        showStatus('tr-check-again');
        setTimeout(_ => { build_asu_request() }, 5000);
        break;
      case 400: // bad request
      case 422: // bad package
      case 500: // build failed
        hide('#buildspinner');
        response.json()
        .then(mobj => {
          var message = mobj['message'] || 'tr-build-failed';
          var url = mobj.buildlog ? (config.asu_url + '/store/' + mobj.bin_dir + '/buildlog.txt') : undefined;
          showStatus(message, url);
        })
        break;
    }
  })
  .catch(err => {
    hide('#buildspinner');
    showStatus(err);
  })
}

function setupSelectList(select, items, onselection) {
  for (var i = 0; i < items.length; i += 1) {
    var option = document.createElement('OPTION');
    option.innerHTML = items[i];
    select.appendChild(option);
  }

  select.addEventListener('change', e => {
    onselection(items[select.selectedIndex]);
  });

  if (select.selectedIndex >= 0) {
    onselection(items[select.selectedIndex]);
  }
}

// Change the translation of the entire document
function translate() {
  var mapping = translations[config.language];
  for (var tr in mapping) {
    Array.from(document.getElementsByClassName(tr))
      .forEach(e => { e.innerText = mapping[tr]; })
  }
}

function setupAutocompleteList(input, items, as_list, onbegin, onend) {
  var currentFocus = -1;

  // sort numbers and other characters separately
  var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

  items.sort(collator.compare);

  input.oninput = function(e) {
    onbegin();

    var offset = 0;
    var value = this.value;
    var value_list = [];

    if (as_list) {
      // automcomplete last text item
      offset = this.value.lastIndexOf(' ') + 1;
      value = this.value.substr(offset);
      value_list = split(this.value.substr(0, offset));
    }

    // close any already open lists of autocompleted values
    closeAllLists();

    if (!value) {
      return false;
    }

    // create a DIV element that will contain the items (values):
    var list = document.createElement('DIV');
    list.setAttribute('id', this.id + '-autocomplete-list');
    list.setAttribute('class', 'autocomplete-items');
    // append the DIV element as a child of the autocomplete container:
    this.parentNode.appendChild(list);

    function normalize(s) {
      return s.toUpperCase().replace(/[-_.]/g, ' ');
    }

    var match = normalize(value);
    var c = 0;
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];

      // match
      var j = normalize(item).indexOf(match);
      if (j < 0) {
        continue;
      }

      // do not offer a duplicate item
      if (as_list && value_list.indexOf(item) != -1) {
        continue;
      }

      c += 1;
      if (c >= 15) {
        var div = document.createElement('DIV');
        div.innerHTML = '...';
        list.appendChild(div);
        break;
      } else {
        var div = document.createElement('DIV');
        // make the matching letters bold:
        div.innerHTML = item.substr(0, j)
          + '<strong>' + item.substr(j, value.length) + '</strong>'
          + item.substr(j + value.length)
          + '<input type="hidden" value="' + item + '">';

        div.addEventListener('click', function(e) {
          // include selected value
          var selected = this.getElementsByTagName('input')[0].value;
          if (as_list) {
            input.value = value_list.join(' ') + ' ' + selected;
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

  input.onkeydown = function(e) {
      var x = document.getElementById(this.id + '-autocomplete-list');
      if (x) x = x.getElementsByTagName('div');
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

  input.onfocus = function() {
    onend(input);
  }

  // focus lost
  input.onblur = function() {
    onend(input);
  }

  function setActive(x) {
    // a function to classify an item as 'active':
    if (!x) return false;
    // start by removing the 'active' class on all items:
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove('autocomplete-active');
    }
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    // add class 'autocomplete-active':
    x[currentFocus].classList.add('autocomplete-active');
  }

  function closeAllLists(elmnt) {
    // close all autocomplete lists in the document,
    // except the one passed as an argument:
    var x = document.getElementsByClassName('autocomplete-items');
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != input) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }

  // execute a function when someone clicks in the document:
  document.addEventListener('click', e => {
      closeAllLists(e.target);
  });
}

// for attended sysupgrade
function updatePackageList(version, target) {
  // set available packages
  fetch(config.asu_url + '/' + config.versions[version] + '/' + target +  '/index.json')
  .then(response => response.json())
  .then(all_packages => {
    setupAutocompleteList($('#packages'), all_packages, true, _ => {}, textarea => {
      textarea.value = split(textarea.value)
        // make list unique, ignore minus
        .filter((value, index, self) => {
          var i = self.indexOf(value.replace(/^\-/, ''));
          return (i === index) || (i < 0);
        })
        // limit to available packages, ignore minus
        .filter((value, index) => all_packages.indexOf(value.replace(/^\-/, '')) !== -1)
        .join(' ');
    });
  });
}

function updateImages(version, code, date, model, url, mobj, is_custom) {
  // add download button for image
  function addLink(type, file) {
    var a = document.createElement('A');
    a.classList.add('download-link');
    a.href = url
      .replace('{target}', mobj.target)
      .replace('{version}', version)
      + '/' + file;
    var span = document.createElement('SPAN');
    span.appendChild(document.createTextNode(''));
    a.appendChild(span);
    a.appendChild(document.createTextNode(type.toUpperCase()));

    if (config.showHelp) {
      a.onmouseover = function() {
        // hide all help texts
        Array.from(document.getElementsByClassName('download-help'))
          .forEach(e => e.style.display = 'none');
        var lc = type.toLowerCase();
        if (lc.includes('sysupgrade')) {
          show('#sysupgrade-help');
        } else if (lc.includes('factory') || lc == 'trx' || lc == 'chk') {
          show('#factory-help');
        } else if (lc.includes('kernel') || lc.includes('zimage') || lc.includes('uimage')) {
          show('#kernel-help');
        } else if (lc.includes('root')) {
          show('#rootfs-help');
        } else if (lc.includes('sdcard')) {
          show('#sdcard-help');
        } else if (lc.includes('tftp')) {
          show('#tftp-help');
        } else {
          show('#other-help');
        }
      };
    }

    $('#download-links').appendChild(a);
  }

  function switchClass(query, from_class, to_class) {
    $(query).classList.remove(from_class);
    $(query).classList.add(to_class);
  }

  // remove all download links
  Array.from(document.getElementsByClassName('download-link'))
    .forEach(e => e.remove());

  // hide all help texts
  Array.from(document.getElementsByClassName('download-help'))
    .forEach(e => e.style.display = 'none');

  if (model && url && mobj) {
    var target = mobj.target;
    var images = mobj.images;

    // change between "version" and "custom" title
    if (is_custom) {
      switchClass('#build-title', 'tr-version-build', 'tr-custom-build');
      switchClass('#downloads-title', 'tr-version-downloads', 'tr-custom-downloads');
    } else {
      switchClass('#build-title', 'tr-custom-build', 'tr-version-build');
      switchClass('#downloads-title', 'tr-custom-downloads', 'tr-version-downloads');
    }

    // update title translation
    translate();

    // fill out build info
    $('#image-model').innerText = model;
    $('#image-target').innerText = target;
    $('#image-version').innerText = version;
    $('#image-code').innerText = mobj['code'] || code;
    $('#image-date').innerText = date;

    images.sort((a, b) => a.name.localeCompare(b.name));

    for (var i in images) {
      addLink(images[i].type, images[i].name);
    }

    if (config.asu_url) {
      updatePackageList(version, target);
    }

    show('#images');
  } else {
    hide('#images');
  }
}

function init() {
  var build_date = "unknown"
  setupSelectList($('#versions'), Object.keys(config.versions), version => {
    var url = config.versions[version];
    if (config.asu_url) {
      url = config.asu_url + '/' + url + '/profiles.json';
    }
    fetch(url)
    .then(obj => {
      build_date = obj.headers.get('last-modified');
      return obj.json();
    })
    .then(obj => {
      // handle native openwrt json format
      if ('profiles' in obj) {
        obj['models'] = {}
        for (const [key, value] of Object.entries(obj['profiles'])) {
          obj['models'][get_model_titles(value.titles)] = value
          obj['models'][get_model_titles(value.titles)]['id'] = key
        }
      }
      return obj
    })
    .then(obj => {
      setupAutocompleteList($('#models'), Object.keys(obj['models']), false, updateImages, models => {
        var model = models.value;
        if (model in obj['models']) {
          var url = obj.download_url || 'unknown';
          var code = obj.version_code || 'unknown';
          var mobj = obj['models'][model];
          updateImages(version, code, build_date, model, url, mobj, false);
          current_model = mobj;
        } else {
          updateImages();
          current_model = {};
        }
      });

      // trigger model update when selected version changes
      $('#models').onfocus();
    });
  });

  if (config.asu_url) {
    show('#custom');
  }

  // hide fields
  updateImages();

  // default to browser language
  var user_lang = (navigator.language || navigator.userLanguage).split('-')[0];
  if (user_lang in translations) {
    config.language = user_lang;
    $('#language-selection').value = user_lang;
  }

  translate();

  $('#language-selection').onclick = function() {
    config.language = this.children[this.selectedIndex].value;
    translate();
  }
}
