"""Fetch public model assets. No credentials, private data or inference API."""
import csv
import hashlib
import io
import json
from pathlib import Path
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MODEL_URL = "https://www.kaggle.com/api/v1/models/google/yamnet/tfJs/tfjs/1/download"
RAW_ROOT = "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/"

def download(url):
    request=urllib.request.Request(url, headers={"User-Agent":"ListeningLoop/0.1 (https://kanishq.dev; public contest demo)"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()

def main():
    model_dir = ROOT / "model"
    model_dir.mkdir(exist_ok=True)
    archive = ROOT / "yamnet-download.tar.gz"
    if not archive.exists():
        archive.write_bytes(download(MODEL_URL))
    with tarfile.open(archive) as source:
        allowed = {"model.json", *[f"group1-shard{i}of4.bin" for i in range(1, 5)]}
        for member in source.getmembers():
            if member.name not in allowed or not member.isfile():
                raise ValueError(f"Unexpected model archive member: {member.name}")
            (model_dir / member.name).write_bytes(source.extractfile(member).read())
    rows = list(csv.DictReader(io.StringIO(download(RAW_ROOT + "yamnet_class_map.csv").decode())))
    assert len(rows) == 521 and all(int(row["index"]) == i for i, row in enumerate(rows))
    (model_dir / "labels.json").write_text(json.dumps([r["display_name"] for r in rows]), encoding="utf-8")
    manifest = {
        "model": "Google YAMNet TFJS v1",
        "source": MODEL_URL,
        "class_map_source": RAW_ROOT + "yamnet_class_map.csv",
        "files": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                  for p in sorted(model_dir.iterdir()) if p.name != "provenance.json"},
    }
    (model_dir / "provenance.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (ROOT / "vendor").mkdir(exist_ok=True)
    (ROOT / "vendor" / "LICENSE-Apache-2.0.txt").write_bytes(download("https://www.apache.org/licenses/LICENSE-2.0.txt"))
    (ROOT / "samples").mkdir(exist_ok=True)
    bird_url="https://upload.wikimedia.org/wikipedia/commons/f/f9/Fringilla_coelebs.ogg"
    (ROOT / "samples" / "birdsong.ogg").write_bytes(download(bird_url))
    print(json.dumps({"model_files": len(manifest["files"]), "bytes": sum(f["bytes"] for f in manifest["files"].values())}))

if __name__ == "__main__":
    main()
