#!/usr/bin/env python3

from pathlib import Path
import argparse
import json
import sys
import os

parser = argparse.ArgumentParser()
parser.add_argument("input_path", nargs='?', help="Input folder that is traversed for OpenWrt JSON device files.")
parser.add_argument('--link',
            action="store", dest="link", default="",
            help="Link to get the image from. May contain %%file, %%target, %%release and %%commit")
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

      if not 'commit' in output:
        output = {
          'commit': commit,
          'link': args.link,
          'models' : {}
        }

      # only support a version_number with images of a single version_commit
      if output['commit'] != commit:
        sys.stderr.write('mixed revisions for a release ({} and {}) => abort\n'.format(output['commit'], commit))
        exit(1)

      images = []
      for image in obj['images']:
          images.append(image['name'])

      target = obj['target'].strip('/') # small fixed for stray /
      id = obj['id']
      for title in obj['titles']:
        if 'title' in title:
          name = title['title']
          output['models'][name] = {'id': id, 'target': target, 'images': images}
        else:
          name = "{} {} {}".format(title.get('vendor', ''), title['model'], title.get('variant', '')).strip()
          output['models'][name] = {'id': id, 'target': target, 'images': images}

    except json.decoder.JSONDecodeError as e:
      sys.stderr.write("Skip {}\n   {}\n".format(path, e))
      continue
    except KeyError as e:
      sys.stderr.write("Abort on {}\n   Missing key {}\n".format(path, e))
      exit(1)

if args.formatted:
  json.dump(output, sys.stdout, indent="  ")
else:
  json.dump(output, sys.stdout)
