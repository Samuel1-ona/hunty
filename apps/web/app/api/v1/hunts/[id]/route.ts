import { NextResponse } from "next/server";import { getPublicHuntByIdOptimized } from "@/lib/db/queryOptimizer";import { NotFoundError, ValidationError, UnauthorizedError, ForbiddenError } from "@/lib/api/errors";import { withErrorHandling } from "@/lib/api/withErrorHandling";import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";import { getCurrentUser } from "@/lib/auth";import { getHuntById, updateHunt } from "@/lib/db/hunts";import { isPlayerInHunt } from "@/lib/db/participants";import { createReaction } from "@/lib/db/reactions";import { submitToModerationQueue } from "@/lib/moderation";export const GET = withErrorHandling(async (req, {params}) => {const ip = getIP(req);const {success, reset} = await rateLimit(ip, {limit: 100, windowMs: 60000});if(!success)return rateLimitResponse(reset);const {id} = await params;const huntId = parseInt(id, 10);if(isNaN(huntId))throw new ValidationError("Invalid hunt ID", {id});const requestId = req.headers.get("x-request-id")??undefined;const hunt = getPublicHuntByIdOptimized(huntId, requestId);if(!hunt)throw new NotFoundError("Hunt not found", {huntId});return NextResponse.json({data: hunt});});export const POST = withErrorHandling(async (req, {params}) => {const ip = getIP(req);const {success, reset} = await rateLimit(ip, {limit: 20, windowMs: 60000});if(!success)return rateLimitResponse(reset);const {id} = await params;const huntId = parseInt(id, 10);if(isNaN(huntId))throw new ValidationError("Invalid hunt ID", {id});const user = await getCurrentUser(req);if(!user)throw new UnauthorizedError("Authentication required");const hunt = await getHuntById(huntId);if(!hunt)throw new NotFoundError("Hunt not found", {huntId});if(!hunt.reactionsEnabled)throw new ValidationError("Reactions are disabled for this hunt", {huntId});const isParticipant = await isPlayerInHunt(huntId, user.id);if(!isParticipant)throw new ForbiddenError("Only players in the hunt can react");const body = await req.json();const content = body.content;if(typeof content!=="string"||content.trim().length===0||content.length>100)throw new ValidationError("Reaction content must be a non-empty string of at most 100 characters",{content});const reaction = await createReaction({huntId,userId:user.id,content:content.trim()});await submitToModerationQueue({type:"reaction",reactionId:reaction.id,content:reaction.content,authorId:user.id,huntId});return NextResponse.json({data:reaction},{status:201});});export const PATCH = withErrorHandling(async (req, {params}) => {const ip = getIP(req);const {success, reset} = await rateLimit(ip, {limit: 30, windowMs: 60000});if(!success)return rateLimitResponse(reset);const {id} = await params;const huntId = parseInt(id, 10);if(isNaN(huntId))throw new ValidationError("Invalid hunt ID", {id});const user = await getCurrentUser(req);if(!user)throw new UnauthorizedError("Authentication required");const hunt = await getHuntById(huntId);if(!hunt)throw new NotFoundError("Hunt not found", {huntId});if(user.id!==hunt.creatorId)throw new ForbiddenError("Only the hunt creator can change reaction settings");const body = await req.json();if(typeof body.reactionsEnabled!=="boolean")throw new ValidationError("reactionsEnabled must be a boolean",{reactionsEnabled:body.reactionsEnabled});const updatedHunt = await updateHunt(huntId,{reactionsEnabled:body.reactionsEnabled});return NextResponse.json({data:updatedHunt});});
import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublicHuntByIdOptimized } from "@/lib/db/queryOptimizer";
import { createHuntVersion } from "@/lib/db/huntVersions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { withValidation } from "@/lib/api/withValidation";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { huntVersionEditBodySchema } from "@hunty/types/api-schemas";

const paramsSchema = z.object({ id: z.string() });

function assertCreator(snapshot: Record<string, unknown>, actorAddress: string): void {
  const creator = snapshot.creator ?? snapshot.ownerAddress;
  if (typeof creator !== "string" || creator !== actorAddress) {
    throw new ForbiddenError("Only the hunt creator can edit this hunt");
  }
}

/**
 * GET /api/v1/hunts/[id]
 * Get hunt details by ID.
 */
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (isNaN(huntId)) {
    throw new ValidationError("Invalid hunt ID", { id });
  }

  const requestId = req.headers.get("x-request-id") ?? undefined;
  const hunt = getPublicHuntByIdOptimized(huntId, requestId);

  if (!hunt) {
    throw new NotFoundError("Hunt not found", { huntId });
  }

  return NextResponse.json({ data: hunt });
});

/**
 * PATCH /api/v1/hunts/[id]
 * Store the submitted hunt snapshot as the next immutable version.
 */
export const PATCH = withValidation(
  { body: huntVersionEditBodySchema, params: paramsSchema },
  async (_req, _context, { body, params }) => {
    const huntId = Number(params!.id);
    if (!Number.isInteger(huntId) || huntId <= 0 || body!.snapshot.id !== huntId) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    assertCreator(body!.snapshot, body!.actorAddress);
    const version = await createHuntVersion(huntId, body!.snapshot, body!.actorAddress);
    return NextResponse.json({ data: version }, { status: 201 });
  },
);
