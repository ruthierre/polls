import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { FastifyInstance } from 'fastify';
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, req) => {
    const voteOnPollBody = z.object({
      pollOptionsId: z.string().uuid(),
    });
    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    });
    const { pollId } = voteOnPollParams.parse(request.params);
    const { pollOptionsId } = voteOnPollBody.parse(request.body);
    let { sessionId } = request.cookies;
    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.votes.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          }
        }
      })
      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionsId !== pollOptionsId) {
        await prisma.votes.delete({
          where: {
            id: userPreviousVoteOnPoll.id,
          }
        })

        const votes = await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionsId)

        voting.publish(pollId, {
          pollOptionsId: userPreviousVoteOnPoll.pollOptionsId,
          votes: Number(votes),
        })
      } else if (userPreviousVoteOnPoll) {
        return req.status(400).send({ message: 'You have already voted on this poll' })
      }
    }
    if (!sessionId) {
      sessionId = randomUUID();
      req.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      });
    }
    await prisma.votes.create({
      data: {
        sessionId,
        pollId,
        pollOptionsId,
      }
    })

    const votes = await redis.zincrby(pollId, 1, pollOptionsId)

    voting.publish(pollId, {
      pollOptionsId,
      votes: Number(votes),
    })

    return req.status(201).send();
  });
}