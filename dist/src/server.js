"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("../swagger.json"));
const port = 3000;
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.get("/movies", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { genre, language, sort } = req.query;
        //Filtragem por gênero e idioma
        let whereClause = {};
        if (genre) {
            whereClause.genres = {
                some: { genre: { equals: genre, mode: "insensitive" } }
            };
        }
        if (language) {
            whereClause.lang_id = {
                in: yield prisma.language.findMany({
                    where: { language: { equals: language, mode: "insensitive" } },
                    select: { id: true }
                }).then(langs => langs.map(lang => lang.id))
            };
        }
        //Contar o total de filmes
        const totalDeFilmes = yield prisma.movie.count({ where: whereClause });
        //Definir ordenação
        let orderByClause = {};
        if (sort === "title")
            orderByClause.title = "asc";
        else if (sort === "release_date")
            orderByClause.release_date = "asc";
        //Buscar filmes no banco com filtros e ordenação
        const movieList = yield prisma.movie.findMany({
            where: whereClause,
            orderBy: orderByClause,
            include: {
                genres: true,
                languages: true
            }
        });
        //Calcular a média de duração dos filmes
        const totalDuration = movieList.reduce((sum, movie) => sum + movie.minutes, 0);
        const duracaoMedia = totalDeFilmes > 0 ? (totalDuration / totalDeFilmes).toFixed(2) : "0";
        //Retornar resposta JSON
        res.status(200).json({
            totalDeFilmes,
            duracaoMedia: `${duracaoMedia} minutos`,
            filmes: movieList
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Erro ao buscar filmes" });
    }
}));
app.post("/movies", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, genre_id, lang_id, release_date, oscar_count } = req.body;
    try {
        //verificar se o filme que será cadastrado já não existe no banco de dados
        const movieWithTheSameTitle = yield prisma.movie.findFirst({
            where: {
                title: { equals: title, mode: "insensitive" }
            }
        });
        if (movieWithTheSameTitle) {
            return res.status(404).send({ message: "Já existe um filme cadastrado com esse título" });
        }
        yield prisma.movie.create({
            data: {
                title: title,
                genre_id: genre_id,
                lang_id: lang_id,
                oscar_count: oscar_count,
                release_date: new Date(release_date)
            }
        });
    }
    catch (error) {
        return res.status(500).send({ message: "Falha ao cadastrar o filme" });
    }
    res.status(201).send();
}));
app.put("/movies/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    try {
        const movie = yield prisma.movie.findUnique({
            where: {
                id: id
            }
        });
        if (!movie) {
            return res.status(404).send({ message: "Filme não encontrado" });
        }
        const data = Object.assign({}, req.body);
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;
        //após pegar o id, pegar os dados do registro e atualizá-lo no prisma
        yield prisma.movie.update({
            where: {
                id: id
            },
            data: data
        });
    }
    catch (error) {
        res.status(500).send({ message: "Falha ao atualizar o registro do filme." });
    }
    //retornar o status correto informando que o filme foi atualizado
    res.status(200).send();
}));
app.delete("/movies/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    try {
        const movie = yield prisma.movie.findUnique({ where: { id: id } });
        if (!movie) {
            res.status(404).send({ message: "Filme não encontrado." });
        }
        yield prisma.movie.delete({ where: { id: id } });
        res.status(200).send();
    }
    catch (error) {
        res.status(500).send({ message: "Não foi possível remover o filme" });
    }
}));
app.get("/movies/:genreName", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const moviesFilteresByGenreName = yield prisma.movie.findMany({
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
        });
        res.status(200).send(moviesFilteresByGenreName);
    }
    catch (error) {
        res.status(500).send({ message: "Erro ao filtrar filmes por gênero" });
    }
}));
app.get("/genres", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    const genres = yield prisma.genre.findMany({
        orderBy: {
            genre: "asc"
        }
    });
    res.json(genres);
}));
app.put("/genres/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const genreCheck = yield prisma.genre.findUnique({
        where: {
            id: id
        }
    });
    if (!genreCheck) {
        return res.status(404).send({ message: "Gênero não encontrado" });
    }
    try {
        yield prisma.genre.update({
            where: {
                id: id
            },
            data: {
                genre: req.body.genre
            }
        });
        res.status(200).send({ message: "Gênero atualizado com sucesso" });
    }
    catch (error) {
        res.status(500).send({ message: "Falha ao atualizar o gênero" });
    }
}));
app.post("/genres", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { genre } = req.body;
    try {
        const genreWithTheSameTitle = yield prisma.genre.findFirst({
            where: {
                genre: { equals: genre, mode: "insensitive" }
            }
        });
        if (genreWithTheSameTitle) {
            return res.status(404).send({ message: "Esse gênero já se encontra cadastrado." });
        }
        yield prisma.genre.create({
            data: {
                genre: genre
            }
        });
        res.status(201).send({ message: "Gênero cadastrado com sucesso." });
    }
    catch (error) {
        return res.status(500).send({ message: "Falha ao cadastrar o gênero." });
    }
}));
app.delete("/genres/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    try {
        const genre = yield prisma.genre.findUnique({
            where: {
                id: id
            }
        });
        if (!genre) {
            res.status(404).send({ message: "Gênero não encontrado" });
        }
        yield prisma.genre.delete({
            where: {
                id: id
            }
        });
        res.status(200).send({ message: "Gênero deletado com sucesso" });
    }
    catch (error) {
        res.status(500).send({ message: "Falha ao deletar o gênero" });
    }
}));
app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
});
