const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// CORS 설정 (배포 URL만 허용)
app.use(
  cors({
    origin: 'https://teddy-9kuu.onrender.com', // 실제 배포 주소
    methods: ['GET', 'POST'], // 허용할 HTTP 메서드
    credentials: true,
  })
);

const crypto = require('crypto');

app.use((req, res, next) => {
    const nonce = crypto.randomBytes(16).toString('base64'); // 랜덤 nonce 생성
    res.locals.nonce = nonce;  // 렌더링할 때 사용

    res.setHeader("Content-Security-Policy", `script-src 'self' 'nonce-${nonce}' https://unpkg.com;`);
    next();
});

// 보안 헤더 추가
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'https://unpkg.com'], // 외부 스크립트 허용
                styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', "*"], // 외부 스타일 허용
            },
        },
    })
);

app.get('/', (req, res) => {
    const nonce = res.locals.nonce; // nonce 값을 가져옴
    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="style-src 'self' 'unsafe-inline' *; script-src 'self' 'nonce-${nonce}' https://unpkg.com;">
          <link rel="stylesheet" href="/style.css?after" />
          <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
          <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
          <link rel="stylesheet" as="style" crossorigin
              href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
          <link rel="stylesheet" as="style" crossorigin
              href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css" />
          <title>Ticket!</title>
      </head>
      <body>
          <div class="WelcomeContainer">
              <h1 class="Welcome" style="z-index:2" data-aos="fade-up">Meet Teddy</h1>
          </div>
  
          <div class="IntroduceContainerUp" data-aos="fade-up">
              <div class="IntroduceContainer">
                  <div class="IntroducePicUp">
                      <img class="IntroducePic" src="/public/images/1st_introduce_pic.png" alt="Cannot show the pictures" />
                  </div>
                  <div class="InviteContainer">
                      <h1 class="Invite" data-aos="fade-up">We<br>Invite You<br>to Our Concert</h1>
                  </div>
              </div>
          </div>
          <div class="Ultimate" data-aos="fade-up">
              <div class="ReadyContainerUp">
                  <div class="ReadyContainer">
                      <h1 class="Ready" data-aos="fade-up">Ready<br>to<br>Take off?</h1>
                      <div class="btn-hover color-9Up">
                          <a href="login.html"><button data-aos="fade-up" class="btn-hover color-9">Get Started</button></a>
                      </div>
                  </div>
                  <div>
                      <div class="ReadyPicUp" data-aos="fade-up">
                          <img class="ReadyPic" src="/public/images/flight.jpeg" alt="Cannot show the pictures off" />
                      </div>
                  </div>
              </div>
          </div>
  
          <script nonce="${nonce}">
              AOS.init();
          </script>
      </body>
      </html>
    `);
  });
  

// 속도 제한 설정 (IP당 1분에 100개의 요청 허용)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 100, // 최대 100개의 요청
  message: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
});
app.use(limiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// 유저 데이터 (예: 데이터베이스에서 가져오는 코드로 대체 가능)
const users = require('./users');

// 좌석 선택 상태 저장 (Redis 권장)
const selectedSquares = {};

app.use(express.static(__dirname));

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
    res.cookie('userId', userId, {
      httpOnly: true, // JavaScript에서 접근 불가
      secure: true, // HTTPS에서만 전송
      sameSite: 'Strict', // 같은 사이트에서만 쿠키 전송
    });
    res.cookie('userName', users[userId].name, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    });
    res.redirect('/ticketing.html');
  } else {
    res.status(401).send('아이디나 비밀번호가 일치하지 않습니다.');
  }
});

// 선택된 사각형 가져오기
app.get('/get-selected-squares', (req, res) => {
  try {
    const userId = req.cookies.userId;
    const squaresWithOwnership = Object.entries(selectedSquares).reduce(
      (acc, [squareId, data]) => {
        acc[squareId] = {
          userId: data.userId,
          isOwner: data.userId === userId,
          name: users[data.userId].name,
        };
        return acc;
      },
      {}
    );
    res.json(squaresWithOwnership);
  } catch (error) {
    res.status(500).send('좌석 정보를 가져오는 중 오류가 발생했습니다.');
  }
});

// 사각형 선택 처리
app.post('/select-square', (req, res) => {
  try {
    const userId = req.cookies.userId;
    const { squareId } = req.body;

    if (!userId) {
      return res.status(401).send('로그인 후 이용해주세요.');
    }

    // 이미 선택한 좌석 확인
    const existingSquare = Object.entries(selectedSquares).find(
      ([_, value]) => value.userId === userId
    );
    if (existingSquare) {
      return res.status(400).send('이미 선택된 좌석이 있습니다.');
    }

    // 좌석이 이미 선택되었는지 확인
    if (selectedSquares[squareId]) {
      return res.status(400).send('이미 선택된 사각형입니다.');
    }

    // 좌석 선택
    selectedSquares[squareId] = { userId: userId };
    res.send('좌석이 성공적으로 선택되었습니다.');
  } catch (error) {
    res.status(500).send('좌석 선택 중 오류가 발생했습니다.');
  }
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 좌석 정보 페이지
app.get('/seat-info.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'seat-info.html'));
});

// 중앙 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('서버에서 오류가 발생했습니다.');
});

// 서버 실행
const PORT = process.env.PORT || 3000; // 환경 변수 지원
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
