// Looks up one word with the macOS spell checker and dictionary, and prints the results as JSON.
// Usage: spell-helper [--no-definitions] <word>
import AppKit

struct SpellResult: Encodable {
    let correct: Bool
    let correction: String?
    let guesses: [String]
    let completions: [String]
    let definitions: [String: String]
}

var arguments = Array(CommandLine.arguments.dropFirst())
let wantsDefinitions = arguments.first != "--no-definitions"
if !wantsDefinitions { arguments.removeFirst() }
let word = arguments.joined(separator: " ")
let checker = NSSpellChecker.shared
guard checker.setLanguage("en") else {
    FileHandle.standardError.write(Data("English spelling is not available on this Mac.\n".utf8))
    exit(2)
}

let range = NSRange(location: 0, length: (word as NSString).length)
let correct = checker.checkSpelling(of: word, startingAt: 0).location == NSNotFound
let correction = checker.correction(forWordRange: range, in: word, language: "en", inSpellDocumentWithTag: 0)
let guesses = Array(
    (checker.guesses(forWordRange: range, in: word, language: "en", inSpellDocumentWithTag: 0) ?? []).prefix(12))
let completions = Array(
    (checker.completions(forPartialWordRange: range, in: word, language: "en", inSpellDocumentWithTag: 0) ?? [])
        .prefix(12))

// Dictionary entries for the first 15 distinct candidates, keyed in lowercase, cut to their opening.
var definitions: [String: String] = [:]
let candidates = [correction].compactMap { $0 } + (correct ? [word] : []) + guesses + completions
for candidate in wantsDefinitions ? candidates : [] {
    let key = candidate.lowercased()
    if definitions.count == 15 { break }
    guard definitions[key] == nil else { continue }
    let text = candidate as CFString
    let definition = DCSCopyTextDefinition(nil, text, CFRange(location: 0, length: CFStringGetLength(text)))
    definitions[key] = definition.map { String(($0.takeRetainedValue() as String).prefix(300)) } ?? ""
}

let result = SpellResult(
    correct: correct, correction: correction, guesses: guesses, completions: completions, definitions: definitions)
print(String(decoding: try JSONEncoder().encode(result), as: UTF8.self))
