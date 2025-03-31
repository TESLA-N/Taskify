

// function updateBlockRules() {
//     chrome.storage.sync.get("blockedSites", ({ blockedSites }) => {
//         if (!blockedSites) blockedSites = [];

//         chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
//             const existingRuleIds = existingRules.map(rule => rule.id);

//             chrome.declarativeNetRequest.updateDynamicRules({
//                 removeRuleIds: existingRuleIds,
//                 addRules: blockedSites.map((site, index) => ({
//                     id: index + 1,
//                     priority: 1,
//                     action: { type: "block" },
//                     condition: { urlFilter: `*://${site}/*`, resourceTypes: ["main_frame"] }
//                 }))
//             }, () => {
//                 console.log("Blocking rules updated:", blockedSites);
//             });
//         });
//     });
// }

// // Listen for storage changes to update rules dynamically
// chrome.storage.onChanged.addListener((changes, area) => {
//     if (area === "sync" && changes.blockedSites) {
//         updateBlockRules();
//     }
// });

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get("blockedSites", ({ blockedSites }) => {
        if (!blockedSites) {
            let defaultSites = ["youtube.com", "leetcode.com"];
            chrome.storage.sync.set({ blockedSites: defaultSites }, () => {
                console.log("Default blocked sites set:", defaultSites);
                updateBlockRules();
            });
        } else {
            console.log("Blocked sites already exist:", blockedSites);
            updateBlockRules();
        }
    });
});

// Function to apply blocking rules
function updateBlockRules() {
    chrome.storage.sync.get("blockedSites", ({ blockedSites }) => {
        if (!blockedSites || blockedSites.length === 0) {
            console.warn("No blocked sites found in storage.");
            blockedSites = [];
        }

        console.log("Applying blocking rules for:", blockedSites);

        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1), // Clear old rules
            addRules: blockedSites.map((site, index) => ({
                id: index + 1, // Unique ID for each rule
                priority: 1,
                action: { type: "block" }, // Block request
                condition: { urlFilter: `*://${site}/*`, resourceTypes: ["main_frame"] }
            }))
        }, () => {
            console.log("Blocking rules updated successfully!");

            // Verify that rules are applied
            chrome.declarativeNetRequest.getDynamicRules(rules => {
                console.log("Current active blocking rules:", rules);
            });
        });
    });
}

// Listen for changes in storage and update rules
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.blockedSites) {
        console.log("Blocked sites updated in storage:", changes.blockedSites.newValue);
        updateBlockRules();
    }
});
