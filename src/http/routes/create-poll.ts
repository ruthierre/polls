import z from "zod";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";

async function createPoll(app: FastifyInstance) {

    app.post('/polls', async (req, res)=> {
        const createPollBody = z.object({
            tittle: z.string(),
            options: z.array(z.string())
        })
        const { tittle , options } = createPollBody.parse(req.body);
        
        const poll = await prisma.poll.create({
            data:{
                tittle,
                options: {
                    createMany: {
                        data: options.map( options =>{
                            return {tittle: options}
                        }), 
                    }
                },
            }
        })
        return res.status(201).send({pollId: poll.id}) ;
       
    })
}

export { createPoll }