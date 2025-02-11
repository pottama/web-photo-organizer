const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { marked } = require('marked');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const port = 3000;

// リクエストの開始時に _startTime を設定するミドルウェア
app.use((req, res, next) => {
    req._startTime = new Date();
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', fileRoutes);

app.get('/', (req, res) => {
    res.render('index');
});
app.get('/readme', async (req, res) => {
    const readmePath = path.join(__dirname, '..', 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    const htmlContent = marked(readmeContent);
    res.render('readme', { htmlContent });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});