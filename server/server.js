const express = require('express');
const app = express();
const PORT = 3000;

const books = [
    {
        id: 1,
        title: 'Espiritu Salvaje',
        author: 'Adriana Criado',
        description: 'Una novela romántica ambientada en el mundo de las carreras de caballos.',
        coverImage: 'espiritu-salvaje.jpg'
    },
    {
        id: 2,
        title: 'Blood of Hercules',
        author: 'Jasmine Mas',
        description: 'A dark fantasy novel that reimagines Greek mythology.',
        coverImage: 'blood-of-hercules.webp'
    },
]

app.get('/api/books', (req, res) => {
    res.json(books);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});