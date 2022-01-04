#!/usr/bin/env bash
set -ex

jlpm
jlpm build
jupyter labextension install .
jlpm build
jupyter lab build

python3 -m pip install jupyter_server
python3 -m pip install -e .
jupyter serverextension enable AWSMonitor
