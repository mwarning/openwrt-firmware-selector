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

for path in paths:
  with open(path, "r") as file:
    try:
      obj = json.load(file)
    except json.decoder.JSONDecodeError as e:
        print("Skip " + str(path))
        print("  " + str(e))

    if obj['metadata_version'] != SUPPORTED_METADATA_VERSION:
      print(path + ' has unsupported metadata version: ' + obj['metadata_version'] + ' => skip')
      continue

    version = obj['version_number']
    if not version in output:
      output[version] = {}

    for title in obj['titles']:
      name = (title['vendor'] + ' ' + title['model'] + ' ' + title.get('variant', '')).strip()
      output[version][name] = { 'target': obj['target'], 'images': obj['images'] }

with open("map.json", "w") as file:
  json.dump(output, file, sort_keys=True, indent="  ")
