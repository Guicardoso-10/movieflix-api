import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from '../swagger.json'


const port = 3000
const app = express()
const prisma = new PrismaClient()

app.use(express.json())
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.get("/movies/sort", async (req, res) => {
    const { sort } = req.query
    console.log(`Sort recebido: ${sort}`)

    const moviesCounter = await prisma.movie.count()
    
    //validação do sort
    const sortOption = sort === "title" || sort === "release_date" ? sort : "title"

    let orderBy: Prisma.MovieOrderByWithRelationInput = 
        sortOption === "release_date"
            ? {release_date: {sort: "asc", nulls: "last"}}
            : {title: "asc"}
    

    const movieList = await prisma.movie.findMany({
        orderBy,
        include: {
            genres: true,
            languages: true
        }
    })

    function calculateAverageDuration () {
        let total = 0
        let average = 0

        for (let i = 0; i < movieList.length; i++) {
            total += movieList[i].minutes
        }

        average = Math.round(total/moviesCounter)

        return average
    }

    const averageDuration = calculateAverageDuration()

    res.json({
        totalDeFilmes: moviesCounter,
        duracaoMedia: `${averageDuration} minutos`,
        filmes: movieList
    })
})

app.post("/movies", async (req, res) => {

    const { title, genre_id, lang_id, release_date, oscar_count } = req.body

    try {

        //verificar se o filme que será cadastrado já não existe no banco de dados
        const movieWithTheSameTitle = await prisma.movie.findFirst({
            where: {
                title: { equals: title, mode: "insensitive" }
            }
        })

        if (movieWithTheSameTitle) {
            return res.status(404).send({ message: "Já existe um filme cadastrado com esse título" })
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
    } catch (error) {
        return res.status(500).send({ message: "Falha ao cadastrar o filme" })
    }

    res.status(201).send()
})

app.put("/movies/:id", async (req, res) => { 
    const id = Number(req.params.id)

    try {
        const movie = await prisma.movie.findUnique({
            where: {
                id: id
            }
        })

        if (!movie) {
            return res.status(404).send({ message: "Filme não encontrado" })
        }


        const data = { ...req.body }
        data.release_date = data.release_date ? new Date(data.release_date) : undefined

        //após pegar o id, pegar os dados do registro e atualizá-lo no prisma
        await prisma.movie.update({
            where: {
                id: id
            },
            data: data
        })
    } catch (error) {
        res.status(500).send({ message: "Falha ao atualizar o registro do filme." })
    }

    //retornar o status correto informando que o filme foi atualizado
    res.status(200).send()
})

app.delete("/movies/:id", async (req, res) => {
    const id = Number(req.params.id)

    try {
        const movie = await prisma.movie.findUnique({ where: { id: id } })

        if (!movie) {
            res.status(404).send({ message: "Filme não encontrado." })
        }

        await prisma.movie.delete({ where: { id: id } })

        res.status(200).send()
    } catch (error) {
        res.status(500).send({ message: "Não foi possível remover o filme" })
    }

})

app.get("/movies/:genreName", async (req, res) => {
    try {
        const moviesFilteresByGenreName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true
            },
            where: {
                genres: {
                    genre: {
                        equals: req.params.genreName,
                        mode: "insensitive"
                    }
                }
            }
        })
        
        res.status(200).send(moviesFilteresByGenreName)
    } catch (error) {
        res.status(500).send({message: "Erro ao filtrar filmes por gênero"})
    }
})

app.get("/genres", async (_, res) => {
    const genres = await prisma.genre.findMany({
        orderBy: {
            genre: "asc"
        }
    })
    res.json(genres)
})

app.put("/genres/:id", async (req, res) => {
    const id = Number(req.params.id)
    const genreCheck = await prisma.genre.findUnique({
        where: { 
            id: id
        }
    })

    if (!genreCheck) {
        return res.status(404).send({message: "Gênero não encontrado"})
    }

    try {
        await prisma.genre.update({
            where: {
                id: id
            },
            data: {
                genre: req.body.genre
            }
        })
    
        res.status(200).send({message: "Gênero atualizado com sucesso"})
    } catch (error) {
        res.status(500).send({message: "Falha ao atualizar o gênero"})
    }

    
})

app.post("/genres", async (req, res) => {
    const { genre } = req.body

    try {
        const genreWithTheSameTitle = await prisma.genre.findFirst({
            where: {
                genre: { equals: genre, mode: "insensitive" }
            }
        })

        if (genreWithTheSameTitle) {
            return res.status(404).send({ message: "Esse gênero já se encontra cadastrado." })
        }
        
        await prisma.genre.create({
            data: {
                genre: genre
            }
        })
    
        res.status(201).send({message: "Gênero cadastrado com sucesso."})
    } catch (error) {
        return res.status(500).send({message: "Falha ao cadastrar o gênero."})
    }
})

app.delete("/genres/:id", async (req, res) => {
    const id = Number(req.params.id)

    try {
        const genre = await prisma.genre.findUnique({
            where: {
                id: id
            }
        })
    
        if (!genre) {
            res.status(404).send({message: "Gênero não encontrado"})
        }
    
        await prisma.genre.delete({
            where: {
                id: id
            }
        })
    
        res.status(200).send({message: "Gênero deletado com sucesso"})
    } catch (error) {
        res.status(500).send({message: "Falha ao deletar o gênero"})
    }
})

app.get("/movies", async (req, res) => {
    try {
        const {language} = req.query

        if (!language) {
            return res.status(400).send({message: "O parâmetro 'language' é obrigatório"})
        }

        //Buscar os IDs dos idiomas correspondentes
        const languagesIds = await prisma.language.findMany ({
            where: {language: {equals: language as string, mode: "insensitive"}},
            select: {id: true}
        })

        //Extrair os IDs corretamente
        const ids = languagesIds.map(lang => lang.id)

        //Buscar os filmes com base nos ids encontrados
        const moviesFilteredByLanguage = await prisma.movie.findMany({
            where: {
                lang_id: {
                    in: ids.length > 0 ? ids : [-1] //se não houver correspondência, evita erro
                }
            },
            include: {
                genres: true,
                languages: true
            }
        })

        res.status(200).send(moviesFilteredByLanguage)
    } catch(error) {
        console.log(error)
        res.status(500).send({message: "Erro ao filtrar os filmes por gênero"})
    }
})


app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`)
})