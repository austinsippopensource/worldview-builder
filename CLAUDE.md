# WorldviewBuilder

## GitHub
Public repo: https://austinsippopensource@github.com/austinsippopensource/worldview-builder  
Account: austinsippopensource (OSS account, not personal)

An on-device React Native app that helps users build, advocate for, and challenge their personal worldview using a locally-running LLM.

## Concept

The user builds a worldview by pasting text/conversation into the Distill screen. The AI extracts themes. Then the user can:
- **Advocate** — AI argues *for* their worldview better than they can
- **Challenge** — AI steelmans opposing arguments

The advocate→challenger flip is the core UX moment: first understand your beliefs deeply, then have them tested.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React Native 0.85 (bare workflow, no Expo) |
| On-device LLM | `llama.rn` + GGUF model file |
| Local database | `@op-engineering/op-sqlite` (SQLite) |
| Settings storage | `@react-native-async-storage/async-storage` |
| Web search | Brave Search API (called directly from device) |
| Navigation | React Navigation (bottom tabs + native stack) |

## Target Model

**Gemma 4 E4B Q4_K_M GGUF** (~5 GB) — the recommended model for final production.

To test locally with llama.cpp before running on device:
```
# Download from Hugging Face (search "gemma-4-e4b GGUF" on huggingface.co)
# Then run:
./llama-cli -m gemma-4-e4b-q4_k_m.gguf -p "Your prompt here" -n 200
# Or server mode:
./llama-server -m gemma-4-e4b-q4_k_m.gguf --port 8080
```

The context window is set to 4096 tokens in `src/llm/LlamaContext.tsx`. Gemma 4 E4B supports this comfortably on modern phones.

Alternatives (also in ModelSetupScreen):
- **Qwen3-4B Q4_K_M** — stronger reasoning, good for debate/analysis
- **Phi-4 Mini Q4_K_M** — smallest, fastest, good for lower-end devices

## File Structure

```
src/
  types/index.ts          — Shared TypeScript interfaces (Message, WorldviewTheme, etc.)
  db/
    schema.ts             — SQLite init + singleton connection
    conversations.ts      — CRUD for conversation history
    worldview.ts          — CRUD for raw inputs and worldview themes
    knowledge.ts          — CRUD for saved quotes/passages
  llm/
    LlamaContext.tsx      — React Context wrapping llama.rn for on-device inference
    prompts.ts            — System prompt builders for each AI mode
    useAgenticChat.ts     — Core chat hook: streaming, web search, theme detection
  search/
    brave.ts              — Brave Search API client
  storage/
    settings.ts           — AsyncStorage wrappers for model path + API key
  components/
    MessageBubble.tsx     — Chat bubble with long-press save/rephrase modal
    SearchResultsMessage.tsx — Collapsible web search results card
    ThemeCard.tsx         — Expandable/editable worldview theme card
  navigation/
    AppNavigator.tsx      — Bottom tabs + settings modal navigation tree
  screens/
    WorldviewScreen.tsx   — Distiller mode (builds worldview themes)
    AdvocateScreen.tsx    — Advocate mode (AI defends your worldview)
    ChallengerScreen.tsx  — Challenger mode (AI opposes your worldview)
    ThemesScreen.tsx      — View/edit extracted worldview themes
    KnowledgeScreen.tsx   — View/manage saved knowledge entries
    ModelSetupScreen.tsx  — First-run GGUF model setup
    SettingsScreen.tsx    — API keys, model change, data reset
App.tsx                   — Root: DB init, model auto-load, navigation container
```

## Database Schema

All data lives in a single SQLite file (`worldview.db`) on the device.

| Table | Purpose |
|---|---|
| `raw_inputs` | Raw text the user has pasted in (not yet distilled) |
| `worldview_themes` | AI-extracted themes: name + description paragraph |
| `conversations` | Full chat history per session; messages stored as JSON blob |
| `knowledge_entries` | Saved quotes/passages tagged as supporting or challenging the worldview |

## Agentic Loop (key concept)

`useAgenticChat` runs an agentic loop (max 3 iterations) where the AI can trigger web searches mid-response by emitting `<search>query</search>`. The hook:
1. Calls `complete()` → streams tokens
2. Detects a `<search>` tag in the response
3. Calls Brave Search API with the query
4. Injects results back into the conversation as a `search_results` message
5. Calls `complete()` again — AI now has the search results in context
6. Repeats until no more search tags (or max 3 iterations)

The distiller also emits `<theme>{"action":"upsert","theme":"...","content":"..."}` blocks which the hook parses to update the SQLite worldview_themes table automatically.

## Running Tests

```bash
cd WorldviewBuilder
yarn test        # or: npx jest
yarn test --watchAll
yarn test --coverage
```

Tests use an in-memory SQLite mock (`__mocks__/@op-engineering/op-sqlite.js`) so no native build is needed.

## Build Order (planned)

1. ✅ Local worldview document (paste text → AI distills themes)
2. ✅ Rephrasing feedback loop (long-press AI passages to save/edit)
3. ✅ Advocate mode conversations
4. ✅ Challenger mode conversations
5. ✅ Agentic web search + knowledge database
6. ⬜ Podcast transcription add-on (whisper.rn)
7. ⬜ Archive feature (Cloudflare Workers + R2, optional)
