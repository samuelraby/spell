// Spell helper that runs on any Mac: osascript -l JavaScript spell-helper.js [--no-definitions] <word>
ObjC.import("AppKit");
ObjC.import("CoreServices");

function define(word) {
  try {
    const definition = $.DCSCopyTextDefinition(null, $(word), { location: 0, length: word.length });
    return definition ? String(ObjC.unwrap(ObjC.castRefToObject(definition)) ?? "").slice(0, 300) : "";
  } catch {
    return "";
  }
}

function run(argv) {
  const checker = $.NSSpellChecker.sharedSpellChecker;
  if (!checker.setLanguage("en")) throw new Error("English spelling is not available on this Mac.");
  const wantsDefinitions = argv[0] !== "--no-definitions";
  const word = (wantsDefinitions ? argv : argv.slice(1)).join(" ");
  const text = $(word);
  const range = { location: 0, length: text.length };
  const list = (words) => (words.isNil() ? [] : ObjC.deepUnwrap(words));
  const found = checker.correctionForWordRangeInStringLanguageInSpellDocumentWithTag(range, text, "en", 0);
  // Struct fields arrive here as strings ("0"), so compare as a number.
  const correct = Number(checker.checkSpellingOfStringStartingAt(text, 0).length) === 0;
  const correction = found.isNil() ? null : ObjC.unwrap(found);
  const guesses = list(checker.guessesForWordRangeInStringLanguageInSpellDocumentWithTag(range, text, "en", 0)).slice(0, 12);
  const completions = list(
    checker.completionsForPartialWordRangeInStringLanguageInSpellDocumentWithTag(range, text, "en", 0),
  ).slice(0, 12);

  const definitions = {};
  let count = 0;
  for (const candidate of wantsDefinitions ? [correction, correct ? word : null, ...guesses, ...completions] : []) {
    const key = candidate && candidate.toLowerCase();
    if (count === 15) break;
    if (!key || key in definitions) continue;
    definitions[key] = define(candidate);
    count++;
  }
  return JSON.stringify({ correct, correction, guesses, completions, definitions });
}
