/**
 * Registry of every available rule.
 *
 * To add a new rule: import it and include it in the array.
 * The analyzer walks this list automatically.
 */

import type { Rule } from "../models";
import { imperativeOverload } from "./imperative-overload";
import { redundantDefault } from "./redundant-default";
import { cognitiveOverload } from "./cognitive-overload";
import { vagueInstruction } from "./vague-instruction";
import { redundantRepetition } from "./redundant-repetition";
import { commandOverQuestion } from "./command-over-question";
import { threatFraming } from "./threat-framing";
import { roleInflation } from "./role-inflation";
import { conditionalReward } from "./conditional-reward";
import { toneDomainMismatch } from "./tone-domain-mismatch";
import { contradiction } from "./contradiction";
import { unresolvedReference } from "./unresolved-reference";

/*=========================================
// Rule registry
=========================================*/

export const allRules: Rule[] = [
  imperativeOverload,
  redundantDefault,
  cognitiveOverload,
  vagueInstruction,
  redundantRepetition,
  commandOverQuestion,
  threatFraming,
  roleInflation,
  conditionalReward,
  toneDomainMismatch,
  contradiction,
  unresolvedReference,
];
