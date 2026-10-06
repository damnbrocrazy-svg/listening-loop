# Third-party notices

Listening Loop's original application code is MIT licensed. The following
third-party assets retain their own licenses and attribution.

## Google YAMNet TFJS v1

Copyright Google LLC. Licensed under Apache License 2.0.

- Model card and license: https://www.kaggle.com/models/google/yamnet/TfJs/tfjs/1
- Public download: https://www.kaggle.com/api/v1/models/google/yamnet/tfJs/tfjs/1/download
- Architecture and class map: https://github.com/tensorflow/models/tree/master/research/audioset/yamnet
- Full license: [Apache License 2.0](./vendor/LICENSE-Apache-2.0.txt)

The four model-weight shards and graph are unmodified. `labels.json` is a JSON
representation of the official 521-row class map. File hashes and source URLs
are retained in `model/provenance.json`. This model was trained by Google;
Listening Loop does not claim to have trained it.

## TensorFlow.js 4.22.0

Copyright 2024 Google LLC. Licensed under Apache License 2.0.

- Source: https://github.com/tensorflow/tfjs
- Package: https://www.npmjs.com/package/@tensorflow/tfjs/v/4.22.0
- Full license: [Apache License 2.0](./vendor/LICENSE-Apache-2.0.txt)

`vendor/tf.min.js` is copied unchanged from the pinned npm distribution and
retains the package's copyright and Apache license notice.

## Example birdsong

`samples/birdsong.ogg`: "Fringilla coelebs.ogg", a chaffinch singing in a spruce
tree in Southern Finland, recorded by Oona Räisänen (Mysid), May 19, 2007.
The recording was released into the public domain by its copyright holder.

- Source and license: https://commons.wikimedia.org/wiki/File:Fringilla_coelebs.ogg
- Original file: https://upload.wikimedia.org/wikipedia/commons/f/f9/Fringilla_coelebs.ogg

The app analyses only its first six seconds and labels the result as an
example, never as an observation from a user's walk. The recording is unmodified.

## Test-only material

Generated sine-wave and silence fixtures in `private-fixtures/` are excluded
from publication and are never described as field recordings. `demoWave()`
also generates a synthetic tone for deterministic inference checks.
