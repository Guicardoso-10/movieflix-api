// app.get("/movies/sort", async (req, res) => {
//     const { sort } = req.query
    

//     const moviesCounter = await prisma.movie.count()
    
//     //validação do sort
//     const sortOption = sort === "title" || sort === "release_date" ? sort : "title"

//     const orderBy: Prisma.MovieOrderByWithRelationInput = 
//         sortOption === "release_date"
//             ? {release_date: {sort: "asc", nulls: "last"}}
//             : {title: "asc"}
    

//     const movieList = await prisma.movie.findMany({
//         orderBy,
//         include: {
//             genres: true,
//             languages: true
//         }
//     })

//     function calculateAverageDuration () {
//         let total = 0
//         let average = 0

//         for (let i = 0; i < movieList.length; i++) {
//             total += movieList[i].minutes
//         }

//         average = Math.round(total/moviesCounter)

//         return average
//     }

//     const averageDuration = calculateAverageDuration()

//     res.json({
//         totalDeFilmes: moviesCounter,
//         duracaoMedia: `${averageDuration} minutos`,
//         filmes: movieList
//     })
// })