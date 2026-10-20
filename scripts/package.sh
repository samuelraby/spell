#!/bin/sh
# Builds Spell and packages the installable folder as Spell.zip.
set -e
cd "$(dirname "$0")/.."
rm -rf build Spell Spell.zip
npx ray build -e dist -o build
mkdir Spell
cp -R build/spell.js build/assets Spell/
# Tinycast reads only the manifest fields; drop the build-only ones.
node -e '
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync("build/package.json", "utf8"));
for (const key of ["$schema", "dependencies", "devDependencies", "scripts"]) delete manifest[key];
fs.writeFileSync("Spell/package.json", JSON.stringify(manifest, null, 2) + "\n");
'
zip -qr Spell.zip Spell
echo "Created Spell.zip"
