#!/bin/bash
# Called by semantic-release to update version in package.json and plugin.json
set -e

VERSION=$1

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '${VERSION}';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update plugin.json
node -e "
const fs = require('fs');
const plugin = JSON.parse(fs.readFileSync('.claude-plugin/plugin.json', 'utf8'));
plugin.version = '${VERSION}';
fs.writeFileSync('.claude-plugin/plugin.json', JSON.stringify(plugin, null, 2) + '\n');
"

echo "Updated version to ${VERSION} in package.json and plugin.json"
