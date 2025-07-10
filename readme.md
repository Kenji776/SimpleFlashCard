# 🎴 Simple Flashcard Client

The **Simple Flashcard Client** is a fun, interactive front-end application for studying flashcards hosted on a server. With a lighthearted user interface, silly mascot companions, and gamified learning features, this app makes studying less tedious and a bit more entertaining.

## ✨ Features

- 📚 **Deck Selection**: Connect to a flashcard server and choose from various decks and categories.
- 🤖 **Silly Mascots**: Animated mascots provide encouragement, banter, and the occasional roast depending on your performance.
- 🎮 **Gamification**:
  - Score tracking with grades and streaks
  - High score system
  - Confetti animations for achievements
- ❓ **Dynamic Question Types**:
  - Standard flashcard mode
  - Multiple-choice quiz mode (generated dynamically)
  - Hints and mnemonics
- ⏱️ **Timers & History Tracking**: Track how long you've been studying and review your answer history.
- 🎙️ **Speech Support** (optional): Uses ElevenLabs API (via the server) to voice the mascot or read the cards aloud.

## 🛠️ Tech Stack

- HTML5 / CSS3
- Vanilla JavaScript
- Integrates with an Express/Node.js server ([Simple Flashcard Server](https://github.com/Kenji776/SimpleFlashcardServer))
- External API integrations via the backend (OpenAI & ElevenLabs)

## 🚀 Getting Started

### Option 1. Connect Directly 

Just open the hosted version of this repo at: ([https://kenji776.github.io/SimpleFlashCard/](https://kenji776.github.io/SimpleFlashCard/)) 

### Option 2. Run Directly

```bash
git clone https://github.com/Kenji776/SimpleFlashCard.git
cd SimpleFlashCard
```

You can open `index.html` directly in your browser, but it is recommended to serve it via a local dev server:

### 3. Connect to the Flashcard Server

On first load, you'll be prompted to enter your **name** and the **server URL**.  
Example server URL:

```
http://localhost:3000
```

Once connected, you'll be able to select from available deck categories and card decks hosted by the server.

---

## 🎴 Decks & Cards

Deck and category information is loaded from the server's `cardLibrary.json`, which provides:

- **Categories:** High-level topics (e.g., "Intro To Pharmacy & Health 1")
- **Decks:** Collections of flashcards grouped by topic
- **Slugs:** File names used to load the actual flashcard data from the server

Example category/deck structure from the server:

```json
{
  "Intro To Pharmacy & Health 1": [
    {
      "drugs_group_a": {
        "name": "Drugs Group A",
        "description": "Collection of drug generic names and brand names",
        "deck_slug": "IntroToPharmacy1/groupA.cards"
      }
    }
  ]
}
```

---

## 🧸 Mascots

Mascots provide voice lines, encouragement, jokes, and sarcastic remarks, drawn from `mascotWords.json`. Their responses adapt based on your performance (correct/incorrect streaks) and user interactions (e.g., if you keep clicking them).

Example mascot reactions:
- ✅ Correct Answer: `"Nice Job!"`, `"Woo hoo!"`, `"Your killing it!"`
- ❌ Incorrect Answer: `"You'll get it next time"`, `"It's tough. I know. You're studying for a reason"`
- 🤦 Fail Streak: `"I'm not angry. Just disappointed"`, `"Honestly, I'm embarrassed for you"`
- 🐾 Idle Chat: `"What if birds aren't real?"`, `"Is cereal a soup?"`, `"I have to poop"`

---

## 🏆 High Scores & Progress Tracking

- Scores are tracked per deck and player.
- High scores are displayed in a modal and tracked on the server.
- Your session score is graded (A-F) based on your performance.

---

## ⚙️ Customization Options

You can toggle features from the UI:
- Randomize card order
- Auto-advance to the next card
- Show/hide mascots, timer, history panel, and score
- Change the mascot character or prompt type

---

## 🌐 API Server Requirements

This client expects to connect to the [Simple Flashcard Server](https://github.com/Kenji776/SimpleFlashcardServer) that provides:
- Deck listings (`/decks`)
- Flashcard content (`/decks/:slug`)
- Mascot image hosting (`/mascots`)
- High score tracking (`/scores`)
- OpenAI/ElevenLabs integrations (`/generate`, `/speak`)

## 🤝 Contributions

Open to pull requests for new mascots, UI enhancements, deck formats, or additional features.

---

## 📜 License

MIT License
