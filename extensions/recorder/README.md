# Aksora Recorder (Chrome extension)

Records clicks, typing, dropdown changes, form submits and page loads in one tab, then sends them to Aksora. In Aksora, open **Recordings** and press **Generate test case** to turn a recording into a test case with a Midscene automation script.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome or Edge.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder (`extensions/recorder`).
4. Pin **Aksora Recorder** from the puzzle-piece menu.

## Set up

1. In Aksora, create an API key with write scope (Settings > API keys).
2. Click the extension icon, open **Settings**, enter your Aksora URL (for example `https://aksora.akusaraproject.my.id`) and the API key, then **Save settings**.

## Record

1. Go to the page where the flow starts.
2. Click the extension icon, give the recording a title, press **Start recording**.
3. Do the flow in that tab.
4. Click the icon again and press **Stop and send to Aksora**.

Password, OTP, PIN and card fields are saved as `{{password}}`, not the typed value. Other typed text is saved as entered, so avoid recording real customer data.

Only the tab where you pressed Start is recorded. Recording state survives the popup closing but not a browser restart.
