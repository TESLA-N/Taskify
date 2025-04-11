

// const ai = new GoogleGenAI({ apiKey: "AIzaSyCyGCSXiULz7U-4Izvxj4yfi7yWHKNtmZ0" }); // Replace with your actual key
const API_KEY = "AIzaSyCyGCSXiULz7U-4Izvxj4yfi7yWHKNtmZ0"; // 🔑 Replace with your Gemini API key

document.getElementById("submitBtn").addEventListener("click", async () => {
  const input = document.getElementById("userInput").value;
  document.getElementById("status").textContent = "⏳ Extracting...";

  const extracted = await extractBlockData(input);

  document.getElementById("status").textContent = "✅ Done! Sending to background...";

  chrome.runtime.sendMessage({
    type: "BLOCK_DATA",
    payload: extracted
  }, () => {
    loadBlockedSites(); // Refresh list after storing
  });
});
//unblocking of all websites
document.getElementById("unblockAllBtn").addEventListener("click", () => {
  chrome.declarativeNetRequest.getDynamicRules((rules) => {
    const ruleIds = rules.map(rule => rule.id);

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds
    }, () => {
      chrome.storage.local.set({ blockedSites: [] }, () => {
        console.log("🧹 All sites unblocked!");
        loadBlockedSites();      // Refresh list
        updateCountdowns();      // Refresh countdown display
        document.getElementById("status").textContent = "✅ All sites unblocked!";
      });
    });
  });
});


// Gemini extraction logic
async function extractBlockData(userPrompt) {
  const systemPrompt = `
You are an assistant that extracts data from natural language instructions.

From the user prompt, extract:
- A list of websites to be blocked, using their **correct and complete root domain names**, exactly as they appear in the browser (e.g., "www.facebook.com", "leetcode.com", "x.com", "www.youtube.com").
- The duration for which they should be blocked.

Instructions:
- Convert casual or slang names like "insta", "yt", "fb" into real domains like "instagram.com", "youtube.com", etc.
- Always extract a duration. Accept formats like "5s", "5 sec", "10 minutes", "2 hrs", etc.
- If no duration is mentioned, use the default of **30 minutes**.
- Normalize all units to readable forms like "1 second", "2 minutes", "1 hour".

Return the result as a JSON object like:
{
  "websites": ["www.youtube.com", "leetcode.com"],
  "duration": "1 hour"
}

Here is the user prompt:
"${userPrompt}"
`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${"AIzaSyCyGCSXiULz7U-4Izvxj4yfi7yWHKNtmZ0"}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          }
        ]
      })
    });

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      websites: [],
      duration: "30 minutes"
    };

    return extracted;

  } catch (err) {
    console.error("❌ Gemini extraction failed:", err);
    return { websites: [], duration: "30 minutes" };
  }
}

// Load blocked sites from chrome.storage
function loadBlockedSites() {
  chrome.storage.local.get(["blockedSites"], (result) => {
    const sites = result.blockedSites || [];
    const list = document.getElementById("blockedList");
    list.innerHTML = "";

    sites.forEach(site => {
      const li = document.createElement("li");
      li.textContent = site;
      list.appendChild(li);
    });
  });
}
function formatTimeLeft(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
// function for coundown timer
// function updateCountdowns() {
//   chrome.storage.local.get("blockedSites", ({ blockedSites }) => {
//       const container = document.getElementById("countdownContainer");
//       container.innerHTML = "";

//       if (!blockedSites || blockedSites.length === 0) {
//           container.innerHTML = "<p>No sites are currently blocked.</p>";
//           return;
//       }

//       const now = Date.now();

//       blockedSites.forEach(site => {
//           const timeLeft = site.unblockAt - now;
//           const div = document.createElement("div");
//           div.className = "countdown-item";

//           if (timeLeft > 0) {
//               div.textContent = `${site.domain} ⏳ ${formatTimeLeft(timeLeft)}`;
//           } else {
//               div.textContent = `${site.domain} ✅ Unblocked`;
//           }

//           container.appendChild(div);
//       });
//   });
// }
function updateCountdowns() {
  chrome.storage.local.get("blockedSites", ({ blockedSites }) => {
    const container = document.getElementById("countdownContainer");
    container.innerHTML = "";

    if (!blockedSites || blockedSites.length === 0) {
      container.innerHTML = "<p>No sites are currently blocked.</p>";
      return;
    }

    const now = Date.now();
    let allExpired = true;

    blockedSites.forEach(site => {
      const timeLeft = site.unblockAt - now;
      const div = document.createElement("div");
      div.className = "countdown-item";

      if (timeLeft > 0) {
        allExpired = false;
        div.textContent = `${site.domain} ⏳ ${formatTimeLeft(timeLeft)}`;
      } else {
        div.textContent = `${site.domain} ✅ Unblocked`;
      }

      container.appendChild(div);
    });

    // If all sites are expired, auto-unblock them
    if (allExpired && blockedSites.length > 0) {
      document.getElementById("unblockAllBtn").click();
    }
  });
}


// ⏱ Update every second
setInterval(updateCountdowns, 1000);
updateCountdowns(); // Initial call


// Call on popup open
document.addEventListener("DOMContentLoaded", loadBlockedSites);
