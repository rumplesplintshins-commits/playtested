/**
 * Seed sample games for the multi-platform local preview (localhost:3002).
 *
 * Prerequisites:
 *   1. Copy .env.local.example to .env.local and fill in your isolated local
 *      Supabase values (do NOT use production credentials).
 *   2. Apply the forward-only migrations on this branch to your local DB
 *      (202611080001_platform_submissions.sql, 0002_platform_rpcs.sql,
 *      0003_platform_catalogue.sql).
 *   3. Run: node scripts/preview/seed-platform-games.mjs
 *
 * Seeds game_submissions for all six platforms plus one legacy Steam
 * submission (platform NULL). Existing data is never bulk-rewritten: this only
 * INSERTs new rows.
 */
import {createClient} from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");process.exit(1);}
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

// A developer profile to own the submissions. Create one in your local DB first
// (or sign up a developer and paste their id here).
const DEVELOPER_ID=process.env.PREVIEW_DEVELOPER_ID;
if(!DEVELOPER_ID){console.error("Set PREVIEW_DEVELOPER_ID to a local developer profile id");process.exit(1);}

const now=new Date().toISOString();
const thumbnail="https://example.test/thumbnail.png";
const aiType="No AI disclosed";

const games=[
  {
    title:"Rustbelt Riders (Steam)",
    developer_name:"Ironworks Studio",
    genre:"Action",
    description:"A legacy Steam submission with no platform recorded.",
    game_link:"",
    steam_url:"https://store.steampowered.com/app/1234560/",
    steam_app_id:"1234560",
    platform:null, // legacy → treated as Steam, no badge
    release_status:"Released",
    release_date:"2024-01-15",
    status:"Approved",
  },
  {
    title:"Neon Circuit (PC / Other)",
    developer_name:"Byte Forge",
    genre:"Strategy",
    description:"External download build hosted on itch.io.",
    game_link:"https://byteforge.itch.io/neon-circuit",
    steam_url:null,
    steam_app_id:null,
    platform:"pc",
    release_status:"Released",
    release_date:"2025-06-01",
    status:"Pending Review",
  },
  {
    title:"Cloud Run (Browser)",
    developer_name:"Webplay Labs",
    genre:"Casual",
    description:"Playable directly in the browser over HTTPS.",
    game_link:"https://webplay.example.com/cloud-run",
    steam_url:null,
    steam_app_id:null,
    platform:"browser",
    release_status:"Released",
    release_date:"2025-09-10",
    status:"Pending Review",
  },
  {
    title:"Blocktopia (Roblox)",
    developer_name:"Brick Dev",
    genre:"Simulation",
    description:"A Roblox experience.",
    game_link:"https://www.roblox.com/games/987654321/Blocktopia",
    steam_url:null,
    steam_app_id:null,
    platform:"roblox",
    release_status:"Released",
    release_date:"2025-03-20",
    status:"Pending Review",
  },
  {
    title:"Droid Runner (Android)",
    developer_name:"Apk Works",
    genre:"Action",
    description:"Available on Google Play.",
    game_link:"https://play.google.com/store/apps/details?id=com.apkworks.droidrunner",
    steam_url:null,
    steam_app_id:null,
    platform:"android",
    release_status:"Upcoming",
    release_date:"2026-02-01",
    status:"Pending Review",
  },
  {
    title:"Sky Jump (iPhone / iPad)",
    developer_name:"Apple Dev Co",
    genre:"Sports",
    description:"Available on the App Store.",
    game_link:"https://apps.apple.com/us/app/sky-jump/id111222333",
    steam_url:null,
    steam_app_id:null,
    platform:"ios",
    release_status:"Released",
    release_date:"2025-11-01",
    status:"Pending Review",
  },
];

let ok=true;
for(const g of games){
  const {error}=await supabase.from("game_submissions").insert({
    id:crypto.randomUUID(),
    developer_id:DEVELOPER_ID,
    status:g.status,
    title:g.title,
    developer_name:g.developer_name,
    genre:g.genre,
    description:g.description,
    game_link:g.game_link,
    steam_url:g.steam_url,
    steam_app_id:g.steam_app_id,
    platform:g.platform,
    image_url:thumbnail,
    ai_type:aiType,
    ai_explanation:"No generative AI used in this build.",
    release_status:g.release_status,
    release_date:g.release_date,
    evidence_link:"",
    price:0,
  });
  if(error){console.error(`Failed to insert ${g.title}:`,error.message);ok=false;}
  else console.log(`Seeded: ${g.title} (platform=${g.platform??"legacy steam"})`);
}
process.exit(ok?0:1);
