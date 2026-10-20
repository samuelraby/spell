import {
  Action,
  ActionPanel,
  Cache,
  environment,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
} from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { useEffect, useState } from "react";

interface SpellResult {
  correct: boolean;
  correction: string | null;
  guesses: string[];
  completions: string[];
  definitions: Record<string, string>;
}

const asset = (name: string) => join(environment.assetsPath, name);
const swiftSource = asset("spell-helper.swift");
const fastHelper = join(environment.supportPath, "spell-helper");
const fastHelperStamp = `${fastHelper}.source-hash`;
const typingPause = 40;

// Each compiler runs directly with its own SDK, so neither xcode-select nor xcrun is consulted.
const toolchains = [
  ["/Library/Developer/CommandLineTools/usr/bin/swiftc", "/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk"],
  [
    "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc",
    "/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk",
  ],
];

// Compiles, renames and stamps in one step, so it finishes even if the window closes first.
const buildScript = 't="$4.building"; "$1" -sdk "$2" -O "$3" -o "$t" && mv -f "$t" "$4" && printf %s "$5" > "$4.source-hash"';

const cache = new Cache({ namespace: "words" });
let sourceHash: string | undefined;
let fastHelperReady = false;
let fastHelperBroken = false;
let buildStarted = false;

function run(file: string, args: string[], timeout = 5000): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(file, args, { timeout }, (error, stdout, stderr) =>
      error ? reject(new Error(String(stderr ?? "").trim() || error.message)) : resolve(String(stdout)),
    ),
  );
}

function osascript(script: string, ...args: string[]) {
  return run("/usr/bin/osascript", ["-l", "JavaScript", asset(script), ...args], 10000);
}

function currentSourceHash(): string {
  sourceHash ??= createHash("sha256").update(readFileSync(swiftSource)).digest("hex");
  return sourceHash;
}

// True once the compiled helper exists and was built from the Swift source that ships now.
function isFastHelperReady(): boolean {
  if (!fastHelperReady && !fastHelperBroken) {
    try {
      fastHelperReady = existsSync(fastHelper) && readFileSync(fastHelperStamp, "utf8") === currentSourceHash();
    } catch {
      return false;
    }
  }
  return fastHelperReady;
}

// Builds the faster helper where Apple's developer tools exist; lookups use the script helper meanwhile.
function buildFastHelper() {
  if (buildStarted || isFastHelperReady()) return;
  buildStarted = true;
  const toolchain = toolchains.find((paths) => paths.every((path) => existsSync(path)));
  if (!toolchain) return;
  try {
    if (Date.now() - statSync(`${fastHelper}.building`).mtimeMs < 120000) return;
  } catch {
    // No build in progress.
  }
  mkdirSync(environment.supportPath, { recursive: true });
  spawn("/bin/sh", ["-c", buildScript, "build", ...toolchain, swiftSource, fastHelper, currentSourceHash()], {
    detached: true,
    stdio: "ignore",
  });
}

async function lookUp(word: string, cacheKey: string, withDefinitions: boolean): Promise<SpellResult> {
  buildFastHelper();
  const args = withDefinitions ? [word] : ["--no-definitions", word];
  let output: string | undefined;
  if (isFastHelperReady()) {
    output = await run(fastHelper, args).catch(() => {
      fastHelperBroken = true;
      fastHelperReady = false;
      return undefined;
    });
  }
  output ??= await osascript("spell-helper.js", ...args);
  const result = JSON.parse(output) as SpellResult;
  // Cache only the trimmed meanings, not the full entries, so the cache stays small.
  const meanings = Object.entries(result.definitions).map(([key, entry]) => [key, definitionStart(entry)]);
  result.definitions = Object.fromEntries(meanings.filter(([, meaning]) => meaning));
  cache.set(cacheKey, JSON.stringify(result));
  return result;
}

function readCache(cacheKey: string): SpellResult | null {
  try {
    const stored = cache.get(cacheKey);
    return stored ? (JSON.parse(stored) as SpellResult) : null;
  } catch {
    return null;
  }
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  return letters.length > 1 && letters === letters.toUpperCase();
}

function matchCasing(word: string, typed: string): string {
  if (isAllCaps(typed)) return word.toUpperCase();
  if (typed[0] !== typed[0].toLowerCase()) return word.charAt(0).toUpperCase() + word.slice(1);
  return word;
}

const partOfSpeech =
  /^[^:•|;]{0,40}?\b(?:plural noun|noun|verb|adjective|adverb|pronoun|preposition|conjunction|exclamation|determiner|abbreviation|prefix|suffix)\b\s*/i;
const leadingNoise = /^(?:\([^()]*\)|\[[^\]]*\]|\d+\b|[,;]|\s)+/;

// An entry reads "word | pronunciation | noun (plural …) 1 meaning: example"; keep just the meaning.
function definitionStart(entry: string): string | undefined {
  const body = entry.split(" | ").slice(2).join(" | ");
  const meaning = body.replace(leadingNoise, "").replace(partOfSpeech, "").replace(leadingNoise, "");
  return meaning.split(/:\s|;\s|\.\s|\s\|\s|\s•\s/)[0].replace(/\.$/, "").trim() || undefined;
}

function suggestionsFor(result: SpellResult, typed: string, completionsFirst: boolean) {
  const tag = (isCorrection: boolean) => (word: string) => ({
    word: matchCasing(word, typed),
    definition: result.definitions[word.toLowerCase()],
    isCorrection,
  });
  const best = [
    ...(result.correction ? [result.correction] : []).map(tag(true)),
    ...[...(result.correct ? [typed] : []), ...result.guesses].map(tag(false)),
  ];
  const completions = result.completions.map(tag(false));
  const seen = new Set<string>();
  return (completionsFirst ? [...completions, ...best] : [...best, ...completions]).filter(({ word }) => {
    const key = word.toLowerCase();
    return !seen.has(key) && Boolean(seen.add(key));
  });
}

// Return runs the first action; the other one moves to Command-Return.
const alternate: Keyboard.Shortcut = { modifiers: ["cmd"], key: "enter" };

function copy(word: string, shortcut?: Keyboard.Shortcut) {
  return <Action.CopyToClipboard key="copy" title="Copy Word" content={word} shortcut={shortcut} />;
}

function open(word: string, shortcut?: Keyboard.Shortcut) {
  const target = `dict://${encodeURIComponent(word)}`;
  return <Action.Open key="open" title="Open in Dictionary" icon={Icon.Book} target={target} shortcut={shortcut} />;
}

export default function Command() {
  const { completionsFirst, showDefinitions, openInDictionary } = getPreferenceValues<Preferences.Spell>();
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<SpellResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typed = searchText.trim();

  useEffect(() => {
    setError(null);
    // The spell checker treats all-caps words as correct, so those are checked in lowercase.
    const word = isAllCaps(typed) ? typed.toLowerCase() : typed;
    const cacheKey = showDefinitions ? word : `plain:${word}`;
    const cached = word ? readCache(cacheKey) : null;
    if (!word || cached) {
      setResult(cached);
      setIsLoading(false);
      return;
    }
    let isCurrent = true;
    setIsLoading(true);
    const timer = setTimeout(() => {
      lookUp(word, cacheKey, showDefinitions)
        .then((fresh) => isCurrent && setResult(fresh))
        .catch((failure: Error) => {
          if (isCurrent) {
            setResult(null);
            setError(failure.message);
          }
        })
        .finally(() => isCurrent && setIsLoading(false));
    }, typingPause);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [typed]);

  const suggestions = result && typed ? suggestionsFor(result, typed, completionsFirst) : [];
  const clearCache = (
    <Action
      title="Clear Cache"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["shift"], key: "delete" }}
      onAction={() => {
        cache.clear();
        showToast({ title: "Cache Cleared" });
      }}
    />
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Start typing a word…">
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Spell Checker Unavailable" description={error} />
      ) : !typed || (suggestions.length === 0 && !isLoading) ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description={typed ? "Try a different spelling." : "Suggestions appear as you type."}
          actions={<ActionPanel>{clearCache}</ActionPanel>}
        />
      ) : (
        suggestions.map(({ word, definition, isCorrection }) => (
          <List.Item
            key={word}
            title={word}
            subtitle={definition}
            accessories={isCorrection ? [{ text: "Correction" }] : undefined}
            actions={
              <ActionPanel>
                {openInDictionary ? [open(word), copy(word, alternate)] : [copy(word), open(word, alternate)]}
                <Action.Paste title="Paste Word" content={word} shortcut={{ modifiers: ["shift"], key: "enter" }} />
                {clearCache}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
