

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
  try {
    const response = await fetch("http://localhost:5001/sessions/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(extracted)
    });
  
    if (response.ok) {
      console.log("✅ Sent to MongoDB API!");
    } else {
      console.error("❌ MongoDB API error:", await response.text());
    }
  } catch (error) {
    console.error("❌ Failed to reach MongoDB API:", error);
  }
  


});
//Loading of previous session
document.getElementById("prevsess").addEventListener("click", async () => {
  const sessionId = document.getElementById("sessionIdInput").value.trim();

  if (!sessionId) {
    alert("Please enter a session ID.");
    return;
  }

  // ⏳ Step 1: Unblock everything first
  document.getElementById("unblockAllBtn").click();

  // ⏳ Step 2: Fetch the previous session data
  const res = await fetch(`http://localhost:5001/sessions/by/${sessionId}`);
  const data = await res.json();

  if (!data || !data.websites || !data.duration) {
    return alert("❌ Could not fetch valid session data");
  }

  // ✅ Step 3: Send data to background for blocking
  const extracted = {
    title: data.title || "Previous Session",
    websites: data.websites,
    duration: data.duration
  };

  document.getElementById("status").textContent = "✅ Sending previous session to background...";

  chrome.runtime.sendMessage({
    type: "BLOCK_DATA",
    payload: extracted
  }, () => {
    loadBlockedSites(); // Refresh list
    updateCountdowns(); // Start the new countdowns
    console.log("🧠 Previous session loaded and applied");
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

-A title based on the prompt's intent (e.g., "block yt", "restrict social media", etc.).

-A list of websites to be blocked, using their correct and complete root domain names exactly as they appear in a browser (e.g., "www.facebook.com", "youtube.com", "x.com").

-The duration for which the websites should be blocked.

Instructions:

-Convert casual or slang names like "insta", "yt", "fb", "x" into real domains like "instagram.com", "youtube.com", "facebook.com", "x.com".

-If a website is mentioned without "www", add it only if it typically appears with it in browser URLs (e.g., "www.youtube.com", "www.facebook.com", but just "leetcode.com").

-Always extract a duration. Accept formats like "5s", "5 sec", "10 minutes", "2 hrs", etc.

-If no duration is mentioned, use the default of 30 minutes.

-Normalize all durations to readable formats:

"1 second", "45 seconds"

"2 minutes", "30 minutes"

"1 hour", "3 hours"
Return the result in the following as a JSON object like :
{
  "title": "block yt",
  "websites": ["www.youtube.com"],
  "duration": "30 minutes"
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
      title: "",
      websites: [],
      duration: "30 minutes"
    };

    return extracted;

  } catch (err) {
    console.error("❌ Gemini extraction failed:", err);
    return { title:"", websites: [], duration: "30 minutes" };
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
