# Spell

Spell any word with the macOS spell checker and dictionary, right from [Tinycast](https://github.com/abue-ammar/tinycast). Works offline. Nothing you type leaves your Mac.

## Features

- **Suggestions as you type.** The best correction comes first, labeled Correction.
- **Short definitions.** Each word shows the start of its meaning from the macOS dictionary.
- **Quick actions.** ↵ copies the word, ⇧↵ pastes it into the app you were using, and ⌘↵ opens it in Dictionary.
- **Matches your casing.** Type "Hello" or "HELLO" and suggestions follow.
- **Instant repeats.** Words you've looked up before appear immediately. ⇧⌫ clears the cache.

### Settings

| Setting | Default | What it does |
| --- | --- | --- |
| Completions | Off | Words that start with what you type appear before suggested corrections. |
| Definitions | On | Shows a short definition next to each word. |
| Primary Action | Off | Clicking a word or pressing ↵ opens it in Dictionary. ⌘↵ copies it. |

## Install

1. Download **Spell.zip** from the latest release and unzip it.
2. In Tinycast, open **Settings › Extensions** and choose **Add from folder**.
3. Select the **Spell** folder.
4. Open **Spell** and look up a word.
5. Quit and reopen Tinycast to load the Dictionary icon.

You can delete the zip and folder afterward. Tinycast keeps its own copy.

Upgrading? Uninstall the old version in **Settings › Extensions** first, then follow the steps above.

## How it works

Spell asks two built-in macOS services for every lookup: the spell checker (`NSSpellChecker`) for corrections, guesses, and completions, and Dictionary Services for definitions. The extension contains no word list and makes no network requests.

Two helpers do the asking:

- `assets/spell-helper.js` runs through the JavaScript for Automation engine built into every Mac, so Spell works with nothing else installed.
- `assets/spell-helper.swift` is compiled in the background on first use when Apple's Command Line Tools or Xcode are present. Once it's ready, Spell switches to it for faster lookups. It rebuilds automatically whenever its source changes.

On first open, Spell also copies the Dictionary app's icon from your Mac to use as its own, so no Apple artwork ships in this repository.

## Build

Requires Node.js.

```sh
npm install
npm run package
```

This creates `Spell/` and `Spell.zip`, ready to add to Tinycast.

## License

[MIT](LICENSE)
