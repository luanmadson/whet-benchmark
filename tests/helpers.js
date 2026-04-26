// Helpers compartilhados pelos testes unitários das regras.
// Não é arquivo *.test.* — o runner `node --test` ignora.

const { splitIntoStatements, detectLanguage } = require("../dist/core/models");

function ctxOf(text) {
  return {
    text,
    statements: splitIntoStatements(text),
    lang: detectLanguage(text),
  };
}

function run(rule, text) {
  return rule.analyze(text, ctxOf(text));
}

module.exports = { ctxOf, run };
