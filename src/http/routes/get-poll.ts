import z from "zod";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";
import { redis } from "../../lib/redis";

async function getPoll(app: FastifyInstance) {

    app.get('/polls/:pollId', async (req, res)=> {
        const getPollParams = z.object({
            pollId: z.string().uuid(),
            
        })
        const {pollId} = getPollParams.parse(req.params);
        
        const poll = await prisma.poll.findUnique({
            where: {
                id: pollId,
            },
            include:{
                options: {
                    select:{
                        id: true,
                        tittle: true,
                    }
                }
            }
        })

        if(!poll){
            return res.status(400).send({message: 'poll not found!.'})
        }

        const results = await redis.zrange(pollId, 0 , -1, 'WITHSCORES');
        const votes = results.reduce((obj, line, index) => {
            if(index % 2 === 0){
                const score = results[ index + 1];
                Object.assign(obj, {[line]: Number(score)})
                
            }
            return obj;

        }, {} as Record<string, number>)

        return res.send({
            poll: {
              id:  pollId,
              title: poll.tittle,
              option: poll.options.map( (option) => {
                return {
                    id: option.id,
                    title: option.tittle,
                    score: (option.id in votes) ? votes[option.id] : 0,
                }
              })
            }
        }) ;
        
    })
}

export { getPoll }