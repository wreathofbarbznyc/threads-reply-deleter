# 🧵 Threads Reply Nuker

A Chrome extension to **bulk delete all your replies on [Threads](https://www.threads.net)** — automatically, with one click.

> Built because Threads doesn't give you a way to mass-delete your own replies. Now you can nuke them all. 💣

---

## 📸 What it looks like

The extension popup shows a live count of deleted replies and errors, a scrolling log of activity, and throws a graffiti celebration when you're fully done.

---

## ⚡ Features

- **Bulk deletes all your replies** — scrolls, finds, and deletes automatically
- **Only targets your posts** — never touches anyone else's content
- **Auto-reloads** the page between batches to keep the DOM clean
- **Recovers from errors** — reloads automatically after 5 consecutive errors
- **Never loses your count** — deleted and error totals persist across reloads and restarts
- **Graffiti celebration** when Threads shows "No replies yet" 🎨💥
- **Works for anyone** — just enter your username and go

---

## 🛠 Installation

> This extension is not on the Chrome Web Store. You'll load it manually — it takes about 60 seconds.

### Step 1 — Download

Click **Releases** on the right side of this page → download the latest `threads-reply-deleter.zip` → unzip it to a permanent folder on your computer.

> ⚠️ Don't delete the folder after loading — Chrome needs it to stay there.

### Step 2 — Open Chrome Extensions

Go to this address in Chrome:
```
chrome://extensions
```

### Step 3 — Enable Developer Mode

Toggle **Developer Mode** on in the top-right corner of the page.

### Step 4 — Load the extension

Click **"Load unpacked"** → select the `threads-reply-deleter` folder you unzipped.

The 🧵 icon will appear in your Chrome toolbar. Pin it for easy access.

---

## 🚀 How to use it

1. Go to **[threads.net](https://www.threads.net)** and log in
2. Navigate to **your profile → Replies tab**
   - URL will look like: `https://www.threads.net/@yourusername/replies`
3. Click the 🧵 extension icon in your toolbar
4. **Enter your Threads username** (without the @)
5. Click **💣 Nuke My Replies**

The extension will:
- Scroll down 3 times to load replies
- Scroll back to top
- Delete every reply it finds with your username
- Reload the page and repeat until Threads shows "No replies yet"
- Throw confetti and graffiti when it's done 🎨

---

## ⚙️ Settings

| Setting | Default | Description |
|---|---|---|
| Delay | 1500ms | Time between each deletion. Lower = faster but riskier. Don't go below 1000ms. |

---

## ⚠️ Important notes

- **Deleted replies are permanent.** There is no undo.
- Keep the **Replies tab open and visible** while running.
- Don't navigate away from Threads while it's running.
- If it gets stuck, click **Stop**, then **Start** again.
- Use the **↺ Reset** button to clear stats and start fresh.

---

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| Popup shows nothing / blank | Remove and reinstall the extension |
| "Could not connect" error | Refresh the Threads tab and try again |
| Stuck on "Stopping..." | Close and reopen the popup — it will reset |
| Keeps finding 0 replies | Make sure you're on the **Replies** tab, not your main profile |
| Extension stops after reload | Open the popup — it should auto-resume. If not, click Start |

---

## 🔒 Privacy

This extension:
- **Does not collect any data**
- **Does not make any external requests**
- Only communicates between the extension popup and the Threads tab in your browser
- All your username and settings are stored locally in Chrome storage only

---

## 📋 Requirements

- Google Chrome (or any Chromium-based browser: Edge, Brave, Arc, etc.)
- A Threads account
- About 60 seconds to install

---

## 📄 License

MIT — free to use, modify, and share.

---

*Made with 💜 and a lot of frustration at Threads' lack of bulk delete.*
