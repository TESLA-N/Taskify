// document.addEventListener("DOMContentLoaded", () => {
//     document.getElementById("blockBtn").addEventListener("click", () => {
//         let site = document.getElementById("siteInput").value.trim();
//         if (!site) return;

//         chrome.storage.sync.get("blockedSites", ({ blockedSites }) => {
//             if (!blockedSites) blockedSites = [];
//             if (!blockedSites.includes(site)) {
//                 blockedSites.push(site);
//                 chrome.storage.sync.set({ blockedSites }, () => {
//                     updateBlockedList();
//                 });
//             }
//         });
//     });

//     function updateBlockedList() {
//         chrome.storage.sync.get("blockedSites", ({ blockedSites }) => {
//             let list = document.getElementById("blockedList");
//             list.innerHTML = "";
//             if (!blockedSites) return;
//             blockedSites.forEach(site => {
//                 let li = document.createElement("li");
//                 li.textContent = site;
//                 list.appendChild(li);
//             });
//         });
//     }

//     // Load blocked sites on page load
//     updateBlockedList();
// });
