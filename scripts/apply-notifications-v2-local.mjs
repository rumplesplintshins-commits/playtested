import fs from "node:fs";

const path = "app/components/SiteHeader.tsx";
let source = fs.readFileSync(path, "utf8");

const importLine = 'import NotificationBell from "./NotificationBell";';
if (!source.includes(importLine)) {
  const anchor = 'import { currentJourney, subscribeJourney, carryJourney } from "@/lib/share-links";';
  if (!source.includes(anchor)) throw new Error("SiteHeader import anchor not found.");
  source = source.replace(anchor, `${anchor}\n${importLine}`);
}

const startMarker = '              <div ref={notificationsRef} className="relative">';
const endMarker = '              <button type="button" onClick={handleLogout}';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start === -1 || end === -1) throw new Error("SiteHeader notification block markers not found.");

source = `${source.slice(0, start)}              <NotificationBell />\n\n${source.slice(end)}`;
fs.writeFileSync(path, source, "utf8");
console.log("Notifications V2 wired into SiteHeader.tsx for local testing.");
