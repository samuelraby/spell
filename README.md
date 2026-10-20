# Spell

> **Beta.** Spell is in active development. Expect rough edges, and features may change between releases.

Find the right spelling of any word without leaving the keyboard. Spell is a [Tinycast](https://github.com/abue-ammar/tinycast) extension that uses the spell checker and dictionary built into macOS. It works offline, and nothing you type leaves your Mac.

## What it does

Type a word, even a misspelled one, and Spell lists the closest matches as you type. The best match is marked Correction, and each word shows a short definition from the macOS dictionary.

| Shortcut | Action |
| --- | --- |
| ↵ | Copy the word |
| ⇧↵ | Paste it into the app you were using |
| ⌘↵ | Open it in Dictionary |
| ⇧⌫ | Clear recent lookups |

Spell follows your capitalization, and words you've looked up before appear instantly.

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| Completions | Off | Words that start with what you type appear before suggested corrections. |
| Definitions | On | Shows a short definition next to each word. |
| Primary Action | Off | Clicking a word or pressing ↵ opens it in Dictionary. ⌘↵ copies it. |

## Install

1. Download **Spell.zip** from Releases and unzip it.
2. In Tinycast, open **Settings › Extensions**.
3. Click **Add from folder** and choose the **Spell** folder.
4. Open **Spell** in Tinycast.
5. Quit and reopen Tinycast to show the Dictionary icon.

Tinycast keeps its own copy, so you can delete the download afterward.

To update, remove the current version in **Settings › Extensions**, then repeat these steps.

## Build from source

Requires Node.js.

```sh
npm install
npm run package
```

This creates **Spell.zip** in the project folder.

## License

[MIT](LICENSE)

Spell is an independent project and is not affiliated with, authorized, sponsored, or approved by Apple Inc., Raycast, or Tinycast. macOS is a trademark of Apple Inc., registered in the U.S. and other countries and regions.
