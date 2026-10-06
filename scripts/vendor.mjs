import {mkdir, copyFile} from 'node:fs/promises';
await mkdir(new URL('../vendor/', import.meta.url), {recursive: true});
await copyFile(new URL('../node_modules/@tensorflow/tfjs/dist/tf.min.js', import.meta.url), new URL('../vendor/tf.min.js', import.meta.url));
// The npm distribution retains its Apache notice in tf.min.js. The complete
// license is downloaded separately by prepare_assets.py and kept in the app.
console.log('Vendored TensorFlow.js 4.22.0 for offline use.');
