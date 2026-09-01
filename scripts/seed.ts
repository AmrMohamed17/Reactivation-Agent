/**
 * Seeds ~50 synthetic closed-lost leads for Greenscape Pro (Phoenix AZ).
 *
 * The set is built so the pipeline's behaviour is visible rather than asserted:
 *   - 4 opt-outs, 6 unqualified, 4 under the budget floor and 2 with no email
 *     exist purely so the deterministic pre-filter has something to drop (16
 *     dropped, 34 eligible).
 *   - 3 "trap" leads have notes that dangle a discount or a delivery date that
 *     was never actually agreed. The drafter is tempted to promise it; the
 *     grounding verifier should catch it.
 *   - Several eligible leads sit in the $8k-$15k band to prove the budget floor
 *     is a floor, not a qualification threshold.
 *
 * Run: npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import type { LossReason } from "../lib/types";

type SeedLead = {
  name: string;
  email: string | null;
  phone: string | null;
  project_type: string;
  budget_estimate: number;
  source: string;
  loss_reason: LossReason;
  had_site_walk: boolean;
  opt_out?: boolean;
  /** months before today the lead first came in */
  created: number;
  /** months before today we last heard from them */
  activity: number;
  notes: string;
};

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
const NOW = Date.now();
const monthsAgo = (n: number) => new Date(NOW - n * MONTH_MS).toISOString();

const LEADS: SeedLead[] = [
  // --- canonical happy path: site walk done, budget fits, paused on timing ---
  {
    name: "Danielle Reyes",
    email: "danielle.reyes@example.com",
    phone: "602-555-0148",
    project_type: "pergola + outdoor kitchen",
    budget_estimate: 42000,
    source: "referral",
    loss_reason: "timing",
    had_site_walk: true,
    created: 14,
    activity: 11,
    notes:
      "site walk 3/12 w/ Marcus. pergola over the north patio + built-in grill run along the wall. budget confirmed 40-45k, no pushback. kitchen reno inside ran 6 wks long, said call me when that's done. zero objections on scope or price — purely timing.",
  },

  // --- trap leads: notes dangle something we never actually agreed to ---
  {
    name: "Grant Whitfield",
    email: "gwhitfield@example.com",
    phone: "480-555-0192",
    project_type: "outdoor kitchen",
    budget_estimate: 38000,
    source: "google",
    loss_reason: "price",
    had_site_walk: true,
    created: 16,
    activity: 13,
    notes:
      "asked twice whether we do off-season or winter pricing. told him I'd check w/ Marcus and get back to him. never circled back. no discount was ever quoted or approved.",
  },
  {
    name: "Priya Raman",
    email: "priya.raman@example.com",
    phone: "602-555-0117",
    project_type: "pool deck + shade structure",
    budget_estimate: 55000,
    source: "meta",
    loss_reason: "timing",
    had_site_walk: true,
    created: 12,
    activity: 9,
    notes:
      "wants it done before daughter's grad party. pushed hard for us to commit to a finish date — we never confirmed one, crew was booked out. she went quiet after that call.",
  },
  {
    name: "Curtis Nolan",
    email: "cnolan@example.com",
    phone: "480-555-0163",
    project_type: "ramada + fireplace",
    budget_estimate: 47000,
    source: "google",
    loss_reason: "competitor",
    had_site_walk: true,
    created: 15,
    activity: 12,
    notes:
      "Desert Ridge came in ~15% under us. asked point blank if we'd match. Marcus said he'd think about it — no answer was ever given, no match offered. never heard back.",
  },

  // --- opt-outs: pre-filter must drop these ---
  {
    name: "Rebecca Lindqvist",
    email: "r.lindqvist@example.com",
    phone: "602-555-0134",
    project_type: "pergola",
    budget_estimate: 28000,
    source: "meta",
    loss_reason: "went_cold",
    had_site_walk: false,
    opt_out: true,
    created: 20,
    activity: 18,
    notes: "asked to be taken off the list — 'stop emailing me'. DO NOT CONTACT.",
  },
  {
    name: "Tom Ackerley",
    email: "tackerley@example.com",
    phone: "480-555-0175",
    project_type: "turf + landscape lighting",
    budget_estimate: 19500,
    source: "google",
    loss_reason: "price",
    had_site_walk: false,
    opt_out: true,
    created: 19,
    activity: 17,
    notes: "unsubscribed from the newsletter twice. flagged do-not-email in GHL.",
  },
  {
    name: "Marisol Vega",
    email: "marisol.vega@example.com",
    phone: "623-555-0129",
    project_type: "pool + hardscape",
    budget_estimate: 63000,
    source: "referral",
    loss_reason: "timing",
    had_site_walk: true,
    opt_out: true,
    created: 17,
    activity: 10,
    notes:
      "relocated to Denver mid-project-planning. asked for removal from all lists. house sold.",
  },
  {
    name: "Dale Cranston",
    email: "dcranston@example.com",
    phone: "602-555-0156",
    project_type: "ramada",
    budget_estimate: 31000,
    source: "meta",
    loss_reason: "competitor",
    had_site_walk: false,
    opt_out: true,
    created: 18,
    activity: 15,
    notes: "went w/ another builder. asked us not to follow up again. respect it.",
  },

  // --- unqualified: pre-filter must drop these regardless of budget ---
  {
    name: "Kyle Brennan",
    email: "kbrennan@example.com",
    phone: "480-555-0111",
    project_type: "shade sail",
    budget_estimate: 2000,
    source: "meta",
    loss_reason: "unqualified",
    had_site_walk: false,
    created: 11,
    activity: 11,
    notes:
      "wants a shade sail over an existing patio, nothing else. told him we don't do standalone sails. tire kicker, called 3x asking for ballpark only.",
  },
  {
    name: "Janice Oyelaran",
    email: "joyelaran@example.com",
    phone: "602-555-0188",
    project_type: "pergola repair",
    budget_estimate: 3500,
    source: "google",
    loss_reason: "unqualified",
    had_site_walk: false,
    created: 13,
    activity: 12,
    notes:
      "wanted us to repair a pergola another builder put up. we don't do warranty work on someone else's framing. referred out.",
  },
  {
    name: "Ross Tamblyn",
    email: "rtamblyn@example.com",
    phone: "623-555-0143",
    project_type: "sod install",
    budget_estimate: 1200,
    source: "google",
    loss_reason: "unqualified",
    had_site_walk: false,
    created: 10,
    activity: 10,
    notes: "sod only, front yard. not our scope at all. gave him Verde Lawn's number.",
  },
  {
    name: "Bettina Whorley",
    email: "bwhorley@example.com",
    phone: "480-555-0120",
    project_type: "planter boxes",
    budget_estimate: 6000,
    source: "meta",
    loss_reason: "unqualified",
    had_site_walk: false,
    created: 9,
    activity: 9,
    notes:
      "renter — can't authorize structural work. landlord contacted, not interested in improvements.",
  },
  {
    name: "Sam Delacroix",
    email: "sdelacroix@example.com",
    phone: "602-555-0177",
    project_type: "fire pit kit assembly",
    budget_estimate: 4000,
    source: "google",
    loss_reason: "unqualified",
    had_site_walk: false,
    created: 12,
    activity: 11,
    notes:
      "bought a fire pit kit at a big box store, wanted us to assemble it. declined — not a design-build job.",
  },
  {
    name: "Hollis Pruitt",
    email: "hpruitt@example.com",
    phone: "480-555-0199",
    project_type: "design plans only",
    budget_estimate: 8000,
    source: "referral",
    loss_reason: "unqualified",
    had_site_walk: true,
    created: 14,
    activity: 13,
    notes:
      "wanted drawings only so he could shop them to other builders. no build intent w/ us. Marcus walked the yard then pulled the plug.",
  },

  // --- under the $5k floor but otherwise legitimate ---
  {
    name: "Nadia Fournier",
    email: "nfournier@example.com",
    phone: "623-555-0166",
    project_type: "landscape lighting",
    budget_estimate: 3800,
    source: "meta",
    loss_reason: "went_cold",
    had_site_walk: false,
    created: 15,
    activity: 14,
    notes: "lighting only, path + uplights on the palms. small job. quoted, then silence.",
  },
  {
    name: "Perry Vance",
    email: "pvance@example.com",
    phone: "602-555-0102",
    project_type: "gravel + steel edging",
    budget_estimate: 2500,
    source: "google",
    loss_reason: "price",
    had_site_walk: false,
    created: 13,
    activity: 13,
    notes: "gravel refresh side yard. balked when he heard our project minimum. shopping on price.",
  },
  {
    name: "Imani Sowande",
    email: "isowande@example.com",
    phone: "480-555-0154",
    project_type: "planter run + drip line",
    budget_estimate: 4200,
    source: "meta",
    loss_reason: "went_cold",
    had_site_walk: false,
    created: 16,
    activity: 15,
    notes: "small planter run along the back fence + drip. never replied to two f/u emails.",
  },
  {
    name: "Gus Marchetti",
    email: "gmarchetti@example.com",
    phone: "602-555-0138",
    project_type: "patio repour",
    budget_estimate: 4900,
    source: "google",
    loss_reason: "price",
    had_site_walk: false,
    created: 11,
    activity: 10,
    notes: "wants one patio section torn out + repoured. under our min. said he'd 'think about it'.",
  },

  // --- no email on file ---
  {
    name: "Lorraine Bixby",
    email: null,
    phone: "623-555-0181",
    project_type: "outdoor kitchen",
    budget_estimate: 36000,
    source: "referral",
    loss_reason: "timing",
    had_site_walk: true,
    created: 13,
    activity: 8,
    notes:
      "phone lead off a referral, never gave an email address. site walk done, liked the L-shape layout. wants to revisit in spring.",
  },
  {
    name: "Dwayne Ojo",
    email: null,
    phone: "480-555-0107",
    project_type: "pergola",
    budget_estimate: 22000,
    source: "meta",
    loss_reason: "went_cold",
    had_site_walk: false,
    created: 17,
    activity: 16,
    notes: "no email on file. called twice, VM both times. form only had a phone number.",
  },

  // --- eligible bulk ---
  {
    name: "Sandra Kimbrough",
    email: "skimbrough@example.com",
    phone: "602-555-0125",
    project_type: "fire feature + seating wall",
    budget_estimate: 9200,
    source: "referral",
    loss_reason: "timing",
    had_site_walk: true,
    created: 10,
    activity: 7,
    notes:
      "gas fire feature + curved seating wall off the back slab. walked it w/ Marcus, she loved the sketch. waiting on HOA arch review, said that takes ~90 days.",
  },
  {
    name: "Elliot Marsh",
    email: "emarsh@example.com",
    phone: "480-555-0114",
    project_type: "pergola",
    budget_estimate: 12000,
    source: "google",
    loss_reason: "price",
    had_site_walk: false,
    created: 12,
    activity: 11,
    notes: "cedar pergola 12x16 over the slab. quote landed higher than he expected. no site walk yet.",
  },
  {
    name: "Yolanda Prieto",
    email: "yprieto@example.com",
    phone: "623-555-0172",
    project_type: "turf + putting green",
    budget_estimate: 14500,
    source: "meta",
    loss_reason: "competitor",
    had_site_walk: true,
    created: 14,
    activity: 12,
    notes:
      "turf back yard + 3-hole putting green. another outfit quoted lower on turf sqft. she liked our green design better tho — said so twice.",
  },
  {
    name: "Devon Hargrove",
    email: "dhargrove@example.com",
    phone: "602-555-0190",
    project_type: "shade structure",
    budget_estimate: 8500,
    source: "google",
    loss_reason: "went_cold",
    had_site_walk: false,
    created: 15,
    activity: 14,
    notes: "alumawood shade over the west patio, afternoon sun brutal. engaged early then dropped off.",
  },
  {
    name: "Ana Lucia Ferreira",
    email: "alferreira@example.com",
    phone: "480-555-0133",
    project_type: "pool + outdoor kitchen",
    budget_estimate: 67000,
    source: "referral",
    loss_reason: "timing",
    had_site_walk: true,
    created: 11,
    activity: 6,
    notes:
      "big scope — pool, spa, full kitchen w/ pizza oven. site walk went great. husband deploying til fall, wants to wait til he's back to sign.",
  },
  {
    name: "Brett Sandoval",
    email: "bsandoval@example.com",
    phone: "602-555-0146",
    project_type: "outdoor kitchen",
    budget_estimate: 52000,
    source: "google",
    loss_reason: "price",
    had_site_walk: true,
    created: 16,
    activity: 14,
    notes:
      "wanted full masonry kitchen w/ Hestan appliances. sticker shock at 52k. asked about scaling back to a simpler island — we never re-quoted it.",
  },
  {
    name: "Chandra Bhatt",
    email: "cbhatt@example.com",
    phone: "623-555-0159",
    project_type: "pergola + fireplace",
    budget_estimate: 44000,
    source: "meta",
    loss_reason: "went_cold",
    had_site_walk: true,
    created: 13,
    activity: 11,
    notes: "site walk done, proposal sent. two f/u calls, no answer. no stated objection, just vanished.",
  },
  {
    name: "Wes Falkner",
    email: "wfalkner@example.com",
    phone: "480-555-0168",
    project_type: "hardscape + pavers",
    budget_estimate: 29000,
    source: "google",
    loss_reason: "competitor",
    had_site_walk: false,
    created: 17,
    activity: 15,
    notes: "paver patio + walkway. said a neighbor's guy was doing it cheaper. no walk done on our side.",
  },
  {
    name: "Toby Reinholt",
    email: "treinholt@example.com",
    phone: "602-555-0182",
    project_type: "ramada + kitchen",
    budget_estimate: 38500,
    source: "referral",
    loss_reason: "timing",
    had_site_walk: true,
    created: 12,
    activity: 8,
    notes:
      "ramada w/ tongue+groove ceiling, small kitchen run underneath. walked it in Feb. said budget frees up after they close on the rental property.",
  },
  {
    name: "Nina Castellanos",
    email: "ncastellanos@example.com",
    phone: "480-555-0195",
    project_type: "lighting + turf",
    budget_estimate: 17000,
    source: "meta",
    loss_reason: "went_cold",
    had_site_walk: false,
    created: 14,
    activity: 13,
    notes: "turf back + full lighting package. replied to first email, then nothing.",
  },
  {
    name: "Omar Haddad",
    email: "ohaddad@example.com",
    phone: "623-555-0104",
    project_type: "pool + ramada",
    budget_estimate: 71000,
    source: "referral",
    loss_reason: "price",
    had_site_walk: true,
    created: 18,
    activity: 15,
    notes:
      "pool + detached ramada. loved the design. came in over what he had in mind by about 15k. asked if there was a phased approach — we never sent one.",
  },
  {
    name: "Fiona Brennan-Wu",
    email: "fbrennanwu@example.com",
    phone: "602-555-0151",
    project_type: "pergola",
    budget_estimate: 26000,
    source: "google",
    loss_reason: "timing",
    had_site_walk: true,
    created: 10,
    activity: 7,
    notes: "steel pergola w/ louvered top. walked it. baby due in Aug, said revisit after.",
  },
  {
    name: "Jared Stopplebein",
    email: "jstopplebein@example.com",
    phone: "480-555-0179",
    project_type: "outdoor kitchen + fireplace",
    budget_estimate: 58000,
    source: "meta",
    loss_reason: "competitor",
    had_site_walk: true,
    created: 15,
    activity: 13,
    notes:
      "went with Sonoran Custom in the end. told us their timeline was faster. didn't mention price as the issue.",
  },
  {
    name: "Leticia Moreno",
    email: "lmoreno@example.com",
    phone: "602-555-0186",
    project_type: "fire pit + seating",
    budget_estimate: 11500,
    source: "google",
    loss_reason: "went_cold",
    had_site_walk: false,
    created: 13,
    activity: 12,
    notes: "gas fire pit + built-in bench seating. asked good questions early then went quiet.",
  },
  {
    name: "Kurt Vandermolen",
    email: "kvandermolen@example.com",
    phone: "623-555-0113",
    project_type: "hardscape + drainage",
    budget_estimate: 33000,
    source: "google",
    loss_reason: "price",
    had_site_walk: false,
    created: 16,
    activity: 15,
    notes:
      "yard floods every monsoon. needs real drainage + regrade, not just pavers. price was the sticking point, no walk done.",
  },
  {
    name: "Adaeze Okonkwo",
    email: "aokonkwo@example.com",
    phone: "480-555-0127",
    project_type: "pool deck + shade",
    budget_estimate: 49000,
    source: "referral",
    loss_reason: "timing",
    had_site_walk: true,
    created: 11,
    activity: 7,
    notes:
      "resurface pool deck + add shade over the lounge area. site walk done, everything agreed. waiting on the pool replaster contractor to finish first.",
  },
  {
    name: "Rich Pallandino",
    email: "rpallandino@example.com",
    phone: "602-555-0160",
    project_type: "pergola",
    budget_estimate: 23500,
    source: "meta",
    loss_reason: "went_cold",
    had_site_walk: true,
    created: 14,
    activity: 12,
    notes: "walked it, sent proposal same wk. total silence since. wife was the decision maker, never met her.",
  },
  {
    name: "Simone Tressler",
    email: "stressler@example.com",
    phone: "480-555-0141",
    project_type: "turf",
    budget_estimate: 16000,
    source: "google",
    loss_reason: "competitor",
    had_site_walk: false,
    created: 15,
    activity: 14,
    notes: "turf front + back, dog-friendly infill. got 3 quotes, went w/ the cheapest per her email.",
  },
  {
    name: "Hank Broussard",
    email: "hbroussard@example.com",
    phone: "623-555-0197",
    project_type: "full backyard build",
    budget_estimate: 88000,
    source: "referral",
    loss_reason: "price",
    had_site_walk: true,
    created: 19,
    activity: 16,
    notes:
      "whole yard — pool, ramada, kitchen, turf, lighting. our number came in at 88k, he was thinking 60s. good rapport tho, he was complimentary about the design work.",
  },
  {
    name: "Meiling Zhao",
    email: "mzhao@example.com",
    phone: "602-555-0170",
    project_type: "pergola + lighting",
    budget_estimate: 13000,
    source: "meta",
    loss_reason: "timing",
    had_site_walk: false,
    created: 12,
    activity: 10,
    notes: "pergola over the patio + string lighting. said not til after their remodel wraps.",
  },
  {
    name: "Trevor Iwu",
    email: "tiwu@example.com",
    phone: "480-555-0132",
    project_type: "outdoor kitchen",
    budget_estimate: 41000,
    source: "google",
    loss_reason: "went_cold",
    had_site_walk: true,
    created: 13,
    activity: 10,
    notes: "L-shape kitchen w/ smoker cutout. walked it, very engaged, then stopped replying. odd.",
  },
  {
    name: "Paula Grzybowski",
    email: "pgrzybowski@example.com",
    phone: "602-555-0164",
    project_type: "ramada",
    budget_estimate: 36000,
    source: "referral",
    loss_reason: "competitor",
    had_site_walk: true,
    created: 16,
    activity: 14,
    notes:
      "freestanding ramada w/ fans + heaters. competitor was local to her HOA and already approved. that mattered more than price.",
  },
  {
    name: "Andre Dupont",
    email: "adupont@example.com",
    phone: "623-555-0118",
    project_type: "hardscape",
    budget_estimate: 21000,
    source: "google",
    loss_reason: "price",
    had_site_walk: false,
    created: 14,
    activity: 13,
    notes: "travertine patio extension. asked for a cheaper material option, we sent the same number twice.",
  },
  {
    name: "Keisha Randall",
    email: "krandall@example.com",
    phone: "480-555-0149",
    project_type: "pool + kitchen",
    budget_estimate: 54000,
    source: "meta",
    loss_reason: "timing",
    had_site_walk: true,
    created: 10,
    activity: 6,
    notes:
      "pool + kitchen combo. site walk was great, she's ready in principle. selling her mom's house first to fund it, said that closes late in the year.",
  },
  {
    name: "Vic Amborn",
    email: "vamborn@example.com",
    phone: "602-555-0122",
    project_type: "shade + turf",
    budget_estimate: 10000,
    source: "google",
    loss_reason: "went_cold",
    had_site_walk: false,
    created: 15,
    activity: 14,
    notes: "shade structure + small turf area for the dogs. one call, then nothing.",
  },
  {
    name: "Rosalind Achebe",
    email: "rachebe@example.com",
    phone: "623-555-0157",
    project_type: "full backyard build",
    budget_estimate: 62000,
    source: "referral",
    loss_reason: "competitor",
    had_site_walk: true,
    created: 17,
    activity: 14,
    notes:
      "full build. we were finalists, lost to a firm that could start sooner. she asked us to keep her posted if anything opened up.",
  },
  {
    name: "Dusty McFarland",
    email: "dmcfarland@example.com",
    phone: "480-555-0136",
    project_type: "fire feature",
    budget_estimate: 27500,
    source: "meta",
    loss_reason: "price",
    had_site_walk: true,
    created: 13,
    activity: 12,
    notes: "linear gas fire feature + surround. thought 27.5k was steep for 'a fire pit'. walked it tho.",
  },
  {
    name: "Ingrid Sattler",
    email: "isattler@example.com",
    phone: "602-555-0193",
    project_type: "pergola",
    budget_estimate: 18500,
    source: "google",
    loss_reason: "timing",
    had_site_walk: false,
    created: 11,
    activity: 9,
    notes: "wants shade before next summer. no walk yet. said reach back out when it cools off.",
  },
  {
    name: "Manny Ocasio",
    email: "mocasio@example.com",
    phone: "480-555-0108",
    project_type: "outdoor kitchen + pergola",
    budget_estimate: 46000,
    source: "referral",
    loss_reason: "went_cold",
    had_site_walk: true,
    created: 12,
    activity: 9,
    notes:
      "kitchen + pergola combo, walked it in the spring. proposal sent, he said 'looks good' then nothing for months.",
  },
  {
    name: "Bridget Kealoha",
    email: "bkealoha@example.com",
    phone: "623-555-0175",
    project_type: "turf + lighting",
    budget_estimate: 15500,
    source: "meta",
    loss_reason: "competitor",
    had_site_walk: false,
    created: 14,
    activity: 13,
    notes: "turf + path lighting. mentioned a competitor's promo pricing. no site walk done.",
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Re-runnable: leads cascade to messages and replies.
  const { error: delError } = await supabase
    .from("leads")
    .delete()
    .not("id", "is", null);
  if (delError) throw new Error(`Clearing leads failed: ${delError.message}`);

  const rows = LEADS.map(({ created, activity, notes, ...lead }) => ({
    ...lead,
    opt_out: lead.opt_out ?? false,
    notes,
    original_created_at: monthsAgo(created),
    last_activity_at: monthsAgo(activity),
    ghl_id: null,
  }));

  const { error } = await supabase.from("leads").insert(rows);
  if (error) throw new Error(`Insert failed: ${error.message}`);

  // Categories overlap (several unqualified leads are also under the floor), so
  // the expected drop count is the union, not the sum.
  const dropped = rows.filter(
    (r) =>
      r.opt_out ||
      r.loss_reason === "unqualified" ||
      !r.email ||
      r.budget_estimate < 5000,
  ).length;

  console.log(`Seeded ${rows.length} leads.`);
  console.log(
    `Pre-filter should drop ${dropped}, leaving ${rows.length - dropped} eligible ` +
      `(${rows.filter((r) => r.opt_out).length} opt-out, ` +
      `${rows.filter((r) => r.loss_reason === "unqualified").length} unqualified, ` +
      `${rows.filter((r) => !r.email).length} no email, ` +
      `${rows.filter((r) => r.budget_estimate < 5000).length} under the $5k floor; ` +
      `categories overlap).`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
