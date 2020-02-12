#!/usr/bin/env python3

from pathlib import Path
import argparse
import json
import sys
import os

parser = argparse.ArgumentParser()
parser.add_argument("input_path", help="Input folder that is traversed for OpenWrt JSON device files.")
parser.add_argument('--link', required = True,
            action="store", dest="link", default="",
            help="Link to get the image from. May contain %%file, %%target, %%release and %%commit")
parser.add_argument('--include', nargs='+', default=[],
            action="store", dest="include", help="Include releases from other JSON files.")
parser.add_argument('--formatted',
            action="store_true", dest="formatted", help="Output formatted JSON data.")

args = parser.parse_args()

SUPPORTED_METADATA_VERSION = 1


# OpenWrt JSON device files
paths = []

if args.input_path:
  if not os.path.isdir(args.input_path):
    sys.stderr.write("Folder does not exists: {}\n".format(args.input_path))
    exit(1)

  for path in Path(args.input_path).rglob('*.json'):
    paths.append(path)

# json output data
output = {}
for path in paths:
  with open(path, "r") as file:
    try:
      obj = json.load(file)

      if obj['metadata_version'] != SUPPORTED_METADATA_VERSION:
        sys.stderr.write('{} has unsupported metadata version: {} => skip\n'.format(path, obj['metadata_version']))
        continue

      version = obj['version_number']
      commit = obj['version_commit']

      if not version in output:
        output[version] = {
          'commit': commit,
          'link': args.link,
          'models' : {}
        }

      # only support a version_number with images of a single version_commit
      if output[version]['commit'] != commit:
        sys.stderr.write('mixed revisions for a release ({} and {}) => abort\n'.format(output[version]['commit'], commit))
        exit(1)

      images = []
      for image in obj['images']:
          images.append(image['name'])

      target = obj['target'].strip('/') # small fixed for stray /
      for title in obj['titles']:
        if 'title' in title:
          name = title['title']
          output[version]['models'][name] = [target, images]
        else:
          name = "{} {} {}".format(title.get('vendor', ''), title['model'], title.get('variant', '')).strip()
          output[version]['models'][name] = [target, images]

    except json.decoder.JSONDecodeError as e:
      sys.stderr.write("Skip {}\n   {}\n".format(path, e))
      continue
    except KeyError as e:
      sys.stderr.write("Abort on {}\n   Missing key {}\n".format(path, e))
      exit(1)


# include JSON data from other files 
for path in args.include:
    with open(path, "r") as file:
      try:
        obj = json.load(file)
        for release in obj:
          if release in output:
            sys.stderr.write("Release entry {} in {} already exists => skip\n".format(release, path))
          else:
            output[release] = obj[release]
      except json.decoder.JSONDecodeError as e:
        sys.stderr.write("{} {}\n".format(path, e))
        exit(1)

if args.formatted:
  json.dump(output, sys.stdout, sort_keys=True, indent="  ")
else:
  json.dump(output, sys.stdout, sort_keys=True)
