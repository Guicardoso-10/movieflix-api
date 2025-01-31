import express from "express";
import { PrismaClient } from "@prisma/client";


const port = 3000
const app = express()
const prisma = new PrismaClient()

app.use(express.json())

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc"
        },
        include: {
            genres: true,
            languages: true
        }
    })
    res.json(movies)
})

app.post("/movies", async (req, res) => {
    
    const { title, genre_id, lang_id, release_date, oscar_count } = req.body
    
    try{

        //verificar se o filme que será cadastrado já não existe no banco de dados
        const movieWithTheSameTitle = await prisma.movie.findFirst({
            where: {
                title: {equals: title, mode: "insensitive"}
            }
        })

        if (movieWithTheSameTitle) {
            return res.status(409).send({message: "Já existe um filme cadastrado com esse título"})
        }

        await prisma.movie.create({
            data: {
                title: title,
                genre_id: genre_id,
                lang_id: lang_id,
                oscar_count: oscar_count,
                release_date: new Date(release_date)
            }
        })
    }catch(error){
        return res.status(500).send({message: "Falha ao cadastrar um filme"})
    }

    res.status(201).send()
})

app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`)
})