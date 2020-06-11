#!/usr/bin/env python3

from pathlib import Path
import argparse
import json
import sys
import os

parser = argparse.ArgumentParser()
parser.add_argument("input_path", nargs='+',
  help="Input folder that is traversed for OpenWrt JSON device files.")
parser.add_argument('--url', action="store", default="",
  help="Link to get the image from. May contain {target}, {version} and {commit}")
parser.add_argument('--formatted', action="store_true",
  help="Output formatted JSON data.")
parser.add_argument('--change-prefix',
  help="Change the openwrt- file name prefix.")
parser.add_argument('--output',
  help="Write output to a file.")
parser.add_argument('--write-new-data-only', action='store_true',
  help="Only write data if the input is newer than the output file.")

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

# collect json file paths
for path in args.input_path:
  if os.path.isdir(path):
    for file in Path(path).rglob('*.json'):
      paths.append(file)
  else:
    if not path.endswith('.json'):
      sys.stderr.write("Folder does not exists: {}\n".format(path))
      exit(1)
    paths.append(path)

# do not write data if output file is never then input data
if args.write_new_data_only and os.path.exists(args.output):
  output_mtime = os.path.getmtime(args.output)
  input_mtime = os.path.getmtime(paths[0])

  # get newest path
  for path in paths[1:]:
    mtime = os.path.getmtime(path)
    if mtime > input_mtime:
      input_mtime = mtime

  if output_mtime > input_mtime:
    print('Output file is newer than input files => abort')
    exit(0)

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
      sys.stderr.write("Empty title. Skip title in {}\n".format(path))
      continue

    output['models'][name] = {'id': id, 'target': target, 'images': images}

for path in paths:
  with open(path, "r") as file:
    obj = json.load(file)

    if obj['metadata_version'] != SUPPORTED_METADATA_VERSION:
      sys.stderr.write('{} has unsupported metadata version: {} => skip\n'.format(path, obj['metadata_version']))
      continue

    code = obj.get('version_code', obj.get('version_commit'))

    if not 'version_code' in output:
      output = {
        'version_code': code,
        'url': args.url,
        'models' : {}
      }

    # only support a version_number with images of a single version_commit
    if output['version_code'] != code:
      sys.stderr.write('mixed revisions for a release ({} and {}) => abort\n'.format(output['version_code'], commit))
      exit(1)

    try:
      if 'profiles' in obj:
        for id in obj['profiles']:
          add_profile(id, obj.get('target'), obj['profiles'][id])
      else:
        add_profile(obj['id'], obj['target'], obj)
    except json.decoder.JSONDecodeError as e:
      sys.stderr.write("Skip {}\n   {}\n".format(path, e))
    except KeyError as e:
      sys.stderr.write("Abort on {}\n   Missing key {}\n".format(path, e))
      exit(1)

def write_output(data, file):
  if args.formatted:
    json.dump(data, file, indent="  ", sort_keys =  True)
  else:
    json.dump(data, file, sort_keys = True)

if args.output:
  with open(args.output, 'w+') as file:
    write_output(output, file)
else:
  write_output(output, sys.stdout)
