import { NextRequest } from "next/server";
import { generateUserTeam } from "@/lib/data/userTeam";
import { getRivalTeams } from "@/lib/data/leagues";
import { answerQuestion } from "@/lib/ai/assistant";
import { narrate } from "@/lib/ai/narrate";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question : "";
  const teamId = typeof body?.teamId === "string" ? body.teamId : "1";
  if (!question.trim()) {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  const team = generateUserTeam(teamId);
  const rivals = getRivalTeams();
  const base = answerQuestion(question, { team, rivals });
  const answer = await narrate(base, question);

  return Response.json({ ...base, answer });
}
