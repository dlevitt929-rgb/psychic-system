import { ManagerTeam, Player } from "@/lib/types";
import { PLAYERS, playerById } from "@/lib/data/players";
import { clubById, CLUBS } from "@/lib/data/clubs";
import { xpForHorizon, HORIZONS } from "@/lib/prediction/xp";
import { buildTransferSuggestions, planTransfers, classifySquad } from "@/lib/engine/transfers";
import { rankCaptainOptions, safeCaptain, differentialCaptain } from "@/lib/engine/captaincy";
import { compareToRival, recommendStrategy } from "@/lib/engine/miniLeague";
import { bestXIFromSquad } from "@/lib/optimizer/milp";

export interface AssistantContext {
  team: ManagerTeam;
  rivals: ManagerTeam[];
}

export interface AssistantAnswer {
  answer: string;
  intent: string;
  groundedOn: string[]; // short list of data points used, shown in the UI so the answer is auditable
}

function squadPlayers(team: ManagerTeam): Player[] {
  return team.picks.map((p) => playerById(p.playerId)!).filter(Boolean);
}

function findMentionedPlayer(question: string): Player | undefined {
  const q = question.toLowerCase();
  return PLAYERS.filter((p) => q.includes(p.webName.toLowerCase())).sort((a, b) => b.webName.length - a.webName.length)[0];
}

function findMentionedRival(question: string, rivals: ManagerTeam[]): ManagerTeam | undefined {
  const q = question.toLowerCase();
  return rivals.find((r) => q.includes(r.managerName.split(" ")[0].toLowerCase()));
}

function findMentionedClub(question: string): number | undefined {
  const q = question.toLowerCase();
  return CLUBS.find((c) => q.includes(c.name.toLowerCase()) || q.includes(c.shortName.toLowerCase()))?.id;
}

/**
 * Deterministic reasoning engine behind the AI Assistant. Every answer is
 * generated from the same xP/optimiser/transfer/mini-league engines that
 * power the rest of the app — the assistant's job is to route a natural-
 * language question to the right engine call and phrase the result, not to
 * invent numbers. This means it works with zero external dependencies; an
 * LLM can optionally be layered on top purely to vary the phrasing (see
 * lib/ai/narrate.ts) without ever being allowed to change the numbers.
 */
export function answerQuestion(question: string, ctx: AssistantContext): AssistantAnswer {
  const q = question.toLowerCase();
  const owned = squadPlayers(ctx.team);

  // 1. "Should I sell X?"
  if (/sell|drop|transfer out/.test(q)) {
    const player = findMentionedPlayer(question);
    if (player && owned.some((p) => p.id === player.id)) {
      const suggestions = buildTransferSuggestions(ctx.team, "next5");
      const suggestion = suggestions.find((s) => s.out.id === player.id);
      if (suggestion) {
        return {
          intent: "sell-check",
          answer: `Sell ${player.webName} for ${suggestion.in.webName} (£${suggestion.in.price}m). Projected gain: +${suggestion.xpGainNext1} pts next GW, +${suggestion.xpGainHorizon} over the next 5. ${suggestion.reasons.join("; ")}.`,
          groundedOn: [`xP(${player.webName}) vs xP(${suggestion.in.webName}) over next 5 GWs`, "custom FDR for both clubs", "current bank + sale price"],
        };
      }
      return {
        intent: "sell-check",
        answer: `Hold ${player.webName}. No affordable same-position replacement beats their projected ${xpForHorizon(player, HORIZONS.next5.from, HORIZONS.next5.to).total} pts over the next 5 gameweeks.`,
        groundedOn: [`xP(${player.webName}) next 5 GWs`, "full player database at current budget"],
      };
    }
  }

  // 2. "Is a -4/-8 worth it?"
  if (/hit|-4|-8|take a hit|worth it/.test(q)) {
    const plan = planTransfers(ctx.team, "next5");
    return { intent: "hit-check", answer: plan.explanation, groundedOn: ["ranked transfer suggestions", "free transfers available", "xP over next 5 GWs"] };
  }

  // 3. "Who should I captain?"
  if (/captain/.test(q)) {
    const { starters } = bestXIFromSquad(owned, "next1");
    const options = rankCaptainOptions(starters, "next1");
    const safe = safeCaptain(options);
    const differential = differentialCaptain(options);
    const top = options[0];
    let answer = `Captain ${top.player.webName} — projected ${top.expectedPoints} pts (ceiling ${top.ceiling}). ${top.reasons.join("; ")}.`;
    if (differential && differential.player.id !== top.player.id) {
      answer += ` If you want a differential swing instead, ${differential.player.webName} (${differential.player.selectedByPercent}% owned) has a ${differential.ceiling}-point ceiling.`;
    }
    void safe;
    return { intent: "captain-check", answer, groundedOn: ["expected points model, next GW", "fixture difficulty", "ownership"] };
  }

  // 4. "How do I catch <rival>?"
  if (/catch|behind|overtake|beat/.test(q)) {
    const rival = findMentionedRival(question, ctx.rivals);
    if (rival) {
      const comparison = compareToRival(ctx.team, rival);
      const strategy = recommendStrategy(comparison.gap);
      const threats = comparison.rivalThreats.slice(0, 3).map((p) => p.webName).join(", ") || "none of note";
      const differentials = comparison.userDifferentials.slice(0, 3).map((p) => p.webName).join(", ") || "none currently";
      return {
        intent: "mini-league-catchup",
        answer: `${rival.managerName} leads by ${comparison.gap} points. Shared players: ${comparison.sharedPlayerIds.length}. Their key threats you don't own: ${threats}. Your differentials against them: ${differentials}. ${strategy.explanation}`,
        groundedOn: ["mini-league standings", "squad overlap", "next-GW xP for both squads"],
      };
    }
  }

  // 5. "Should I wildcard?"
  if (/wildcard/.test(q)) {
    const plan5 = planTransfers(ctx.team, "next5");
    const verdicts = classifySquad(ctx.team, "next5");
    const sellCount = verdicts.filter((v) => v.verdict === "sell").length;
    const wildcardAvailable = ctx.team.chips.find((c) => c.name === "wildcard")?.usedGw == null;
    if (!wildcardAvailable) {
      return { intent: "wildcard-check", answer: "Your wildcard is already played this half of the season.", groundedOn: ["chip usage history"] };
    }
    if (sellCount >= 4 || plan5.hits >= 2) {
      return {
        intent: "wildcard-check",
        answer: `Yes — ${sellCount} of your 15 players grade as "sell" and the single-transfer plan already wants ${plan5.hits} hit(s). A wildcard clears all of that in one go for no points cost.`,
        groundedOn: ["squad-wide hold/sell/rising classification", "5-GW transfer plan"],
      };
    }
    return {
      intent: "wildcard-check",
      answer: `Not yet — only ${sellCount} player(s) grade as "sell" right now. Save it until more of the squad needs replacing or a fixture swing changes that.`,
      groundedOn: ["squad-wide hold/sell/rising classification"],
    };
  }

  // 6. "Which <club> <position> should I buy?"
  const clubId = findMentionedClub(question);
  if (clubId && /def|mid|fwd|forward|striker|goalkeeper|gk/.test(q)) {
    const posMatch = /gk|keeper/.test(q) ? "GK" : /def/.test(q) ? "DEF" : /mid/.test(q) ? "MID" : "FWD";
    const options = PLAYERS.filter((p) => p.clubId === clubId && p.position === posMatch)
      .map((p) => ({ p, xp: xpForHorizon(p, HORIZONS.next5.from, HORIZONS.next5.to).total }))
      .sort((a, b) => b.xp - a.xp);
    const best = options[0];
    if (best) {
      return {
        intent: "position-buy-check",
        answer: `${best.p.webName} (£${best.p.price}m, ${best.p.selectedByPercent}% owned) — projected ${best.xp} pts over the next 5 gameweeks, best of the ${clubById(clubId).name} ${posMatch.toLowerCase()}s.`,
        groundedOn: [`xP for all ${clubById(clubId).name} ${posMatch}s, next 5 GWs`],
      };
    }
  }

  // Fallback: team-state summary
  const { starters, captain } = bestXIFromSquad(owned, "next1");
  const plan = planTransfers(ctx.team, "next5");
  void starters;
  return {
    intent: "general-summary",
    answer: `Your team: ${ctx.team.teamValue}m value, ${ctx.team.bank}m in the bank, ${ctx.team.freeTransfers} free transfer(s). Recommended captain this week: ${captain.webName}. ${plan.explanation}`,
    groundedOn: ["full squad", "expected points model", "transfer engine"],
  };
}
