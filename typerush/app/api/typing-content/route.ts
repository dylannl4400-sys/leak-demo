import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type TestMode = "common_words" | "punctuation" | "numbers_and_symbols" | "code_snippets"

const WORD_LIST = ["the", "world", "quick", "about", "people", "after", "first", "think", "right", "could", "every", "little", "great", "where", "their", "there", "which", "would", "these", "other", "never", "still", "again", "before", "house", "place", "through", "while", "three", "thing", "good", "make", "work", "know", "want", "look", "come", "back", "time", "into", "just", "more", "over", "than", "with", "from", "your", "have", "this", "that", "what", "when", "around", "under", "small", "water", "sound", "light", "story", "might", "long", "best"]

const CODE_SNIPPETS = [
  'const total = items.reduce((sum, item) => sum + item.price, 0);',
  'function greet(name) { return "Hello, " + name; }',
  'const isReady = status === "active";',
  'for (const user of users) { console.log(user.name); }',
  'const names = users.map((user) => user.name);',
  'if (count > 0) { console.log(count); }',
  'const first = items[0] ?? null;',
  'const label = isOpen ? "Close" : "Open";',
]

const PRO_MODES = new Set<TestMode>(["punctuation", "numbers_and_symbols", "code_snippets"])

function randomWord() {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]
}

function createCommonWordsText() {
  return Array.from({ length: 30 }, randomWord).join(" ")
}

function createPunctuationText() {
  return createCommonWordsText().split(" ").map((word, index) => {
    if (index % 15 === 0) return `"${word}`
    if (index % 15 === 3) return `${word},"`
    if (index % 6 === 4) return `${word},`
    if (index % 10 === 8) return `${word}.`
    return word
  }).join(" ")
}

function createNumbersAndSymbolsText() {
  return Array.from({ length: 12 }, (_, index) => {
    const word = randomWord()
    const number = Math.floor(Math.random() * 90) + 10
    if (index % 3 === 0) return `${word} ${number}%`
    if (index % 3 === 1) return `${word} #${number}`
    return `${word} @${word}${number}`
  }).join(" ")
}

function createCodeSnippetText() {
  const selectedSnippets = new Set<string>()
  while (selectedSnippets.size < 5) {
    selectedSnippets.add(CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)])
  }
  return Array.from(selectedSnippets).join("\n")
}

function createTestText(mode: TestMode) {
  switch (mode) {
    case "punctuation":
      return createPunctuationText()
    case "numbers_and_symbols":
      return createNumbersAndSymbolsText()
    case "code_snippets":
      return createCodeSnippetText()
    default:
      return createCommonWordsText()
  }
}

function isTestMode(value: string | null): value is TestMode {
  return value === "common_words" || PRO_MODES.has(value as TestMode)
}

export async function GET(request: Request) {
  const requestedMode = new URL(request.url).searchParams.get("mode")
  const mode = isTestMode(requestedMode) ? requestedMode : "common_words"
  let allowed = mode === "common_words"

  if (!allowed) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle()

      allowed = !error && subscription?.status === "active"
    }
  }

  const effectiveMode = allowed ? mode : "common_words"

  return NextResponse.json({
    mode: effectiveMode,
    content: createTestText(effectiveMode),
    proRequired: !allowed && mode !== "common_words",
  })
}
