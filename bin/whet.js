#!/usr/bin/env node
// Thin CJS wrapper — redirects to the compiled CLI bundle.
// When the package is installed globally, this file lands on the
// user's PATH. We keep the wrapper separate because TS compiles
// the whole `dist/` tree, and pointing the bin straight at
// `dist/cli/index.js` would mean a versioned executable in the
// repo, which is more awkward for linter checks.
require("../dist/cli/index.js");
