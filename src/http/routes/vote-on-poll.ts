import z from "zod";
import {randomUUID} from "node:crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

async function voteOnPoll(app: FastifyInstance) {

    app.post('/polls/:pollId/votes', async (req, res)=> {
        const voteOnPollBody = z.object({
            pollOptionsId: z.string().uuid(),
        })

        const voteOnPollParams = z.object({
            pollId: z.string().uuid(),
        })

        const { pollId } = voteOnPollParams.parse(req.params);
        const { pollOptionsId } = voteOnPollBody.parse(req.body);
        
        let {sessionId} = req.cookies;

        if(sessionId){
            const userPreviousVoteOnPoll = await prisma.votes.findUnique({
                where: {
                    sessionId_pollId: {
                        sessionId,
                        pollId
                    }
                }
            });

            if(userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionsId != pollOptionsId){
                await prisma.votes.delete({
                    where: {
                        id: userPreviousVoteOnPoll.id
                    }
                })
            } else if(userPreviousVoteOnPoll) { 
                return res.status(400).send({message: "You already voted on this poll."});
            }
        }

        if(!sessionId) {
            sessionId = randomUUID();
        
            res.setCookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days 
                signed:true,
                httpOnly: true,
            });
        }

        await prisma.votes.create({
            data:{
                sessionId,
                pollId,
                pollOptionsId,
            }
        })

        return res.status(201).send() ;
       
    })
}

export { voteOnPoll }