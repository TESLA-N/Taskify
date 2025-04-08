chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get("blockedSites", ({ blockedSites }) => {
        if (!blockedSites) {
            // ⛔️ If you want default blocked sites on install, uncomment below:
            /*
            let defaultSites = [
                { domain: "www.youtube.com", unblockAt: Date.now() + 30 * 60 * 1000 },
                { domain: "www.instagram.com", unblockAt: Date.now() + 30 * 60 * 1000 }
            ];
            chrome.storage.local.set({ blockedSites: defaultSites }, () => {
                console.log("✅ Default blocked sites set:", defaultSites);
                updateBlockRules();
            });
            */
            console.log("🚫 No default sites set. Waiting for user input.");
        } else {
            console.log("ℹ️ Blocked sites already exist:", blockedSites);
            updateBlockRules();
        }

        startAutoUnblockCheck(); // Start time-based unblock check loop
    });
});

// 🔁 Apply blocking rules to Chrome
function updateBlockRules() {
    chrome.storage.local.get("blockedSites", ({ blockedSites }) => {
        if (!blockedSites || blockedSites.length === 0) {
            console.warn("⚠️ No blocked sites found in storage.");
            blockedSites = [];
        }

        console.log("🔒 Applying blocking rules for:", blockedSites);

        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1),
            addRules: blockedSites.map((site, index) => ({
                id: index + 1,
                priority: 1,
                action: { type: "block" },
                condition: {
                    urlFilter: `*://${site.domain}/*`,
                    resourceTypes: ["main_frame", "sub_frame", "script", "xmlhttprequest"]
                }
            }))
        }, () => {
            console.log("✅ Blocking rules updated successfully!");
        });
    });
}

// 📩 Handle messages from popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "BLOCK_DATA") {
        const { websites, duration } = msg.payload;
        const msDuration = parseDuration(duration); // Convert to milliseconds

        chrome.storage.local.get("blockedSites", ({ blockedSites }) => {
            blockedSites = blockedSites || [];

            const now = Date.now();
            const newEntries = websites.map(domain => ({
                domain,
                unblockAt: now + msDuration
            }));

            // Filter out duplicates
            const updatedSites = [
                ...blockedSites.filter(existing => !websites.includes(existing.domain)),
                ...newEntries
            ];

            chrome.storage.local.set({ blockedSites: updatedSites }, () => {
                console.log("🚫 New sites blocked:", updatedSites);
                updateBlockRules();
            });
        });
    }
});

// ⏱ Convert "30 minutes", "2 hours", etc. to milliseconds
function parseDuration(str) {
    const regex = /(\d+)\s*(second|sec|s|minute|min|m|hour|h)/i;
    const match = str.match(regex);
    if (!match) return 30 * 60 * 1000; // Default: 30 minutes

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith("h")) return value * 60 * 60 * 1000;
    if (unit.startsWith("m")) return value * 60 * 1000;
    if (unit.startsWith("s")) return value * 1000;

    return 30 * 60 * 1000;
}

// 🔄 Auto-remove expired block entries every 1 minute
function startAutoUnblockCheck() {
    setInterval(() => {
        chrome.storage.local.get("blockedSites", ({ blockedSites }) => {
            blockedSites = blockedSites || [];

            const now = Date.now();
            const stillActive = blockedSites.filter(site => site.unblockAt > now);
            const expiredSites = blockedSites.filter(site => site.unblockAt <= now);

            if (expiredSites.length > 0) {
                console.log("🕒 Unblocking expired sites:", expiredSites.map(s => s.domain));

                chrome.declarativeNetRequest.getDynamicRules(rules => {
                    const expiredRuleIds = rules
                        .filter(rule =>
                            expiredSites.some(site =>
                                rule.condition?.urlFilter?.includes(site.domain)
                            )
                        )
                        .map(rule => rule.id);

                    chrome.declarativeNetRequest.updateDynamicRules({
                        removeRuleIds: expiredRuleIds
                    }, () => {
                        chrome.storage.local.set({ blockedSites: stillActive }, () => {
                            updateBlockRules(); // Apply updated rules
                        });
                    });
                });
            }
        });
    }, 60 * 1000); // check every minute
}

// 🧠 Update rules if user manually modifies blocked list
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.blockedSites) {
        console.log("🔁 Blocked sites updated:", changes.blockedSites.newValue);
        updateBlockRules();
    }
});
