#!/usr/bin/env python3
"""Round-trip helper for learn/tests/run.mjs.
usage: check_names.py in.json out.json
in.json  = ["name", ...]
out.json = {"name": "<OPSIN SMILES or empty string if OPSIN cannot parse it>", ...}
OPSIN (py2opsin) is the independent check that every name the naming engine writes means the structure it came from."""
import json, sys, warnings
warnings.filterwarnings("ignore")
from py2opsin import py2opsin

names = json.load(open(sys.argv[1]))
uniq = sorted(set(names))
smiles = py2opsin(uniq, output_format="SMILES") if uniq else []
if isinstance(smiles, str):
    smiles = [smiles]
json.dump(dict(zip(uniq, smiles)), open(sys.argv[2], "w"))
