const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');

const app = express();

// CORS 설정 (모든 도메인 허용, 테스트 목적)
app.use(cors({
    origin: 'https://teddy-9kuu.onrender.com', // 실제 배포 주소로 수정
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // URL 인코딩된 데이터 처리
app.use(cookieParser());
const users = require('./users');

const selectedSquares = {};

// 홈 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 로그인 페이지
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/ticketing.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ticketing.html'));
});

// 로그인 처리
app.post('/login', (req, res) => {
    const { userId, password } = req.body;
    if (users[userId] && users[userId].password === password) {
        res.cookie('userId', userId);
        res.cookie('userName', users[userId].name);
        res.redirect('/ticketing.html');
    } else {
        res.status(401).send('아이디나 비밀번호가 일치하지 않습니다.');
    }
});

// 선택된 사각형 가져오기
app.get('/get-selected-squares', (req, res) => {
    const userId = req.cookies.userId;
    const squaresWithOwnership = Object.entries(selectedSquares).reduce((acc, [squareId, data]) => {
        acc[squareId] = {
            userId: data.userId,
            isOwner: data.userId === userId,
            name: users[data.userId].name
        };
        return acc;
    }, {});
    res.json(squaresWithOwnership);
});

// 사각형 선택 페이지
app.get('/ticket/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'seat.html'));
});

// 사각형 선택 처리
app.post('/select-square', (req, res) => {
    const userId = req.cookies.userId;
    const { squareId } = req.body;

    const existingSquare = Object.entries(selectedSquares).find(
        ([key, value]) => value.userId === userId
    );
    if (existingSquare) {
        return res.status(400).send('이미 선택된 좌석이 있습니다.');
    }

    if (selectedSquares[squareId]) {
        return res.status(400).send('이미 선택된 사각형입니다.');
    }

    selectedSquares[squareId] = { userId: userId };
    res.send('좌석이 성공적으로 선택되었습니다.');
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/seat-info.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'seat-info.html'));
});

// 서버 실행
app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});
