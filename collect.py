#!/usr/bin/env python3

from pathlib import Path
import json
import os
import hashlib

SUPPORTED_METADATA_VERSION = 1

paths = []
for path in Path('bin').rglob('*.json'):
  paths.append(path)

version = None
output = {}

def collect_names(images):
	names = []
	for image in images:
		names.append(image['name'])
	return names

for path in paths:
  with open(path, "r") as file:
    try:
      obj = json.load(file)
    except json.decoder.JSONDecodeError as e:
        print("Skip {}\n   {}".format(path, e))
        continue

    if obj['metadata_version'] != SUPPORTED_METADATA_VERSION:
      print('{} has unsupported metadata version: {} => skip'.format(path, obj['metadata_version']))
      continue

    version = obj['version_number']
    commit = obj['version_commit']

    if not version in output:
      output[version] = { 'models' : [], 'commit':  commit}

    # only support a version_number with images of one version_commit
    if output[version]['commit'] != commit:
      print('mixed revisions for a release ({} and {}) => abort'.format(output[version]['commit'], commit))
      break

    for title in obj['titles']:
      output[version]['models'].append([title['vendor'], title['model'], title.get('variant', ''), obj['target'], collect_names(obj['images'])])

with open("data.json", "w") as file:
  json.dump(output, file, sort_keys=True, indent="  ")
