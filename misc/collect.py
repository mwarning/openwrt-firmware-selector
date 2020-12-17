#!/usr/bin/env python3
"""
Tool to create overview.json files and update the config.js.
"""

from pathlib import Path
import urllib.request
import tempfile
import datetime
import argparse
import email
import time
import json
import glob
import sys
import os
import re
from distutils.version import StrictVersion

SUPPORTED_METADATA_VERSION = 1
BUILD_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

assert sys.version_info >= (3, 5), "Python version too old. Python >=3.5.0 needed."


def write_json(path, content, formatted):
    print("write: {}".format(path))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as file:
        if formatted:
            json.dump(content, file, indent="  ", sort_keys=True)
        else:
            json.dump(content, file, sort_keys=True)


# generate an overview of all models of a build
def assemble_overview_json(release, profiles):
    overview = {"profiles": [], "release": release}
    for profile in profiles:
        obj = profile["file_content"]
        for model_id, model_obj in obj["profiles"].items():
            overview["profiles"].append(
                {"target": obj["target"], "titles": model_obj["titles"], "id": model_id}
            )

    return overview


def update_config(www_path, versions):
    config_path = os.path.join(www_path, "config.js")

    if os.path.isfile(config_path):
        content = ""
        with open(str(config_path), "r", encoding="utf-8") as file:
            content = file.read()

        latest_version = "0.0.0"
        for version in versions.keys():
            try:
                if StrictVersion(version) > StrictVersion(latest_version):
                    latest_version = version
            except ValueError:
                print("Warning: Non numeric version: {}".format(version))
                continue

        content = re.sub(
            "versions:[\\s]*{[^}]*}", "versions: {}".format(versions), content
        )
        content = re.sub(
            "default_version:.*,",
            'default_version: "{}",'.format(latest_version),
            content,
        )
        with open(str(config_path), "w+") as file:
            print("write: {}".format(config_path))
            file.write(content)
    else:
        sys.stderr.write("Warning: File not found: {}\n".format(config_path))


"""
    Replace {base} variable in download URL with the intersection
    of all profile.json paths. E.g.:
    ../tmp/releases/18.06.8/targets => base is releases/18.06.8/targets
    ../tmp/snapshots/targets => base in snapshots/targets
"""


def replace_base(releases, profiles, url):
    def get_common_path(profiles):
        paths = [profile["file_path"] for profile in profiles]
        return os.path.commonpath(paths)

    def get_common_base(releases):
        paths = []
        for release, profiles in releases.items():
            paths.append(get_common_path(profiles))
        return os.path.commonpath(paths)

    if "{base}" in url:
        common = get_common_path(profiles)
        base = get_common_base(releases)
        return url.replace("{base}", common[len(base) + 1 :])
    else:
        return url


def add_profile(releases, profile):
    release = profile["file_content"]["version_number"]
    releases.setdefault(release, []).append(profile)


def write_data(releases, args):
    versions = {}

    for release, profiles in releases.items():
        overview_json = assemble_overview_json(release, profiles)

        if args.image_url:
            image_url = replace_base(releases, profiles, args.image_url)
            overview_json["image_url"] = image_url

        if args.info_url:
            info_url = replace_base(releases, profiles, args.info_url)
            overview_json["info_url"] = info_url

        write_json(
            os.path.join(args.www_path, "data", release, "overview.json"),
            overview_json,
            args.formatted,
        )

        # write <device-id>.json files
        for profile in profiles:
            obj = profile["file_content"]
            for model_id, model_obj in obj["profiles"].items():
                combined = {**obj, **model_obj}
                combined["build_at"] = profile["last_modified"]
                combined["id"] = model_id
                del combined["profiles"]
                profiles_path = os.path.join(
                    args.www_path,
                    "data",
                    release,
                    obj["target"],
                    "{}.json".format(model_id),
                )
                write_json(profiles_path, combined, args.formatted)

        versions[release] = "data/{}".format(release)

    update_config(args.www_path, versions)


"""
Scrape profiles.json using links like https://downloads.openwrt.org/releases/19.07.3/targets/?json
Merge into overview.json files.
Update config.json.
"""


def scrape(args):
    def handle_release(releases, path):
        with urllib.request.urlopen("{}/?json".format(path)) as file:
            array = json.loads(file.read().decode("utf-8"))
            for profile in filter(lambda x: x.endswith("/profiles.json"), array):
                with urllib.request.urlopen("{}/{}".format(path, profile)) as file:
                    last_modified = datetime.datetime(
                        *email.utils.parsedate(file.headers.get("last-modified"))[:6]
                    ).strftime(BUILD_DATE_FORMAT)
                    add_profile(
                        releases,
                        {
                            "file_path": "{}/{}".format(path, profile),
                            "file_content": json.loads(file.read().decode("utf-8")),
                            "last_modified": last_modified,
                        },
                    )

    # fetch release URLs
    releases = {}
    with urllib.request.urlopen(args.release_src) as infile:
        for path in re.findall(r"href=[\"']?([^'\" >]+)", str(infile.read())):
            if not path.startswith("/") and path.endswith("targets/"):
                handle_release(releases, "{}/{}".format(args.release_src, path))

    write_data(releases, args)


"""
Scrape profiles.json using wget (slower but more generic).
Merge into overview.json files.
Update config.json.
"""


def scrape_wget(args):
    releases = {}

    with tempfile.TemporaryDirectory() as tmp_dir:
        # download all profiles.json files
        os.system(
            "wget -c -r -P {} -A 'profiles.json' --reject-regex 'kmods|packages' --no-parent {}".format(
                tmp_dir, args.release_src
            )
        )

        # delete empty folders
        os.system("find {}/* -type d -empty -delete".format(tmp_dir))

        # create overview.json files
        for path in glob.glob("{}".format(tmp_dir)):
            for ppath in Path(path).rglob("profiles.json"):
                with open(str(ppath), "r", encoding="utf-8") as file:
                    # we assume local timezone is UTC/GMT
                    last_modified = datetime.datetime.fromtimestamp(
                        os.path.getmtime(ppath)
                    ).strftime(BUILD_DATE_FORMAT)
                    add_profile(
                        releases,
                        {
                            "file_path": str(ppath),
                            "file_content": json.loads(file.read()),
                            "last_modified": last_modified,
                        },
                    )

    write_data(releases, args)


"""
Scan a local directory for releases with profiles.json.
Merge into overview.json files.
Update config.json.
"""


def scan(args):
    releases = {}

    for path in Path(args.release_src).rglob("profiles.json"):
        with open(str(path), "r", encoding="utf-8") as file:
            content = file.read()
            last_modified = time.strftime(
                BUILD_DATE_FORMAT, time.gmtime(os.path.getmtime(str(path)))
            )
            add_profile(
                releases,
                {
                    "file_path": str(path),
                    "file_content": json.loads(content),
                    "last_modified": last_modified,
                },
            )

    write_data(releases, args)


def main():
    parser = argparse.ArgumentParser(
        description="""
Scan for JSON files generated by OpenWrt. Create JSON files in www/data/ and update www/config.js.

Usage Examples:
    ./misc/collect.py ~/openwrt/bin 'https://downloads.openwrt.org/{base}/{target}' www/
    or
    ./misc/collect.py https://downloads.openwrt.org 'https://downloads.openwrt.org/{base}/{target}' www/
    """,
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--formatted", action="store_true", help="Output formatted JSON data."
    )
    parser.add_argument(
        "--use-wget", action="store_true", help="Use wget to scrape the site."
    )
    parser.add_argument("--info-url", help="Info URL template.")
    parser.add_argument("--image-url", help="URL template to download images.")

    parser.add_argument(
        "release_src", help="Local folder to scan or website URL to scrape."
    )
    parser.add_argument("www_path", help="Path of the config.js.")

    args = parser.parse_args()

    if not os.path.isfile("{}/config.js".format(args.www_path)):
        print("Error: {}/config.js does not exits!".format(args.www_path))
        exit(1)

    if args.release_src.startswith("http"):
        if args.use_wget:
            scrape_wget(args)
        else:
            scrape(args)
    else:
        scan(args)


if __name__ == "__main__":
    main()
