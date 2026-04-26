#!/usr/bin/env node
// Wrapper CJS fino — redireciona para o bundle compilado do CLI.
// Ao instalar o pacote globalmente, este arquivo fica no PATH do usuário.
// Separamos em dois porque o TS compila `dist/` inteiro, e ter o bin
// apontando direto pra `dist/cli/index.js` criaria um arquivo executável
// versionado no repo, o que é mais inconveniente pra checks de linter.
require("../dist/cli/index.js");
