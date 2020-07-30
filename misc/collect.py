#!/usr/bin/env python3

from pathlib import Path
import argparse
import json
import sys
import os

parser = argparse.ArgumentParser()
parser.add_argument('input_path', nargs='+',
  help='Input folder that is traversed for OpenWrt JSON device files.')
parser.add_argument('--download-url', action='store', default='',
  help='Link to get the image from. May contain {target}, {version} and {commit}')
parser.add_argument('--formatted', action='store_true',
  help='Output formatted JSON data.')
parser.add_argument('--change-prefix',
  help='Change the openwrt- file name prefix.')

args = parser.parse_args()

SUPPORTED_METADATA_VERSION = 1

def change_prefix(images, old_prefix, new_prefix):
    for image in images:
        if image['name'].startswith(old_prefix):
            image['name'] = new_prefix + image['name'][len(old_prefix):]

# OpenWrt JSON device files
paths = []

# json output data
output = {}

for path in args.input_path:
  if os.path.isdir(path):
    for file in Path(path).rglob('*.json'):
      paths.append(file)
  else:
    if not path.endswith('.json'):
      sys.stderr.write(f'Folder does not exists: {path}\n')
      exit(1)
    paths.append(path)

def get_title_name(title):
  if 'title' in title:
    return title['title']
  else:
    return "{} {} {}".format(title.get('vendor', ''), title['model'], title.get('variant', '')).strip()

def add_profile(id, target, profile):
  images = []
  for image in profile['images']:
      images.append({'name': image['name'], 'type': image['type']})

  if target is None:
    target = profile['target']

  if args.change_prefix:
      change_prefix(images, 'openwrt-', args.change_prefix)

  for title in profile['titles']:
    name = get_title_name(title)

    if len(name) == 0:
      sys.stderr.write(f'Empty title. Skip title in {path}\n')
      continue

    output['models'][name] = {'id': id, 'target': target, 'images': images}

for path in paths:
  with open(path, "r") as file:
    obj = json.load(file)

    if obj['metadata_version'] != SUPPORTED_METADATA_VERSION:
      sys.stderr.write(f'{path} has unsupported metadata version: {obj["metadata_version"]} => skip\n')
      continue

    code = obj.get('version_code', obj.get('version_commit'))

    if not 'version_code' in output:
      output = {
        'version_code': code,
        'download_url': args.download_url,
        'models' : {}
      }

    # only support a version_number with images of a single version_commit
    if output['version_code'] != code:
      sys.stderr.write('mixed revisions for a release ({output["version_code"]} and {code}) => abort\n')
      exit(1)

    try:
      if 'profiles' in obj:
        for id in obj['profiles']:
          add_profile(id, obj.get('target'), obj['profiles'][id])
      else:
        add_profile(obj['id'], obj['target'], obj)
    except json.decoder.JSONDecodeError as e:
      sys.stderr.write(f'Skip {path}\n   {e}\n')
    except KeyError as e:
      sys.stderr.write(f'Abort on {path}\n   Missing key {e}\n')
      exit(1)

if args.formatted:
  json.dump(output, sys.stdout, indent="  ", sort_keys=True)
else:
  json.dump(output, sys.stdout, sort_keys=True)
