# 📦 Conote - 실시간 협업 메모 웹

Conote는 **Socket 기반의 실시간 협업 메모 웹**입니다.
브라우저에서 메모 박스를 만들고, 이동하고, 삭제하고, 내용을 작성할 수 있습니다.

> ⚙️ Flask + Flask-SocketIO + PostgreSQL 기반으로 만들어졌으며, 모바일 환경에서도 사용 가능합니다.

---

## 🖥️ 주요 기능

- **비밀번호 입력**  
  - 비밀번호를 입력해야 접속할 수 있는 간단한 인증 기능  
  - `.env`에 설정된 `SECRET_PASSWORD` 사용

- **실시간 동기화**  
  - 메모 박스 생성, 이동, 삭제, 텍스트 수정 등이 실시간으로 반영됨  
  - Socket.IO 기반 WebSocket으로 구현됨  

- **메모 박스 기능**  
  - 드래그로 위치 이동 가능  
  - 텍스트 작성 및 수정  
  - 삭제 버튼으로 제거 가능  

- **데이터 영속성**  
  - **PostgreSQL** 데이터베이스에 저장되어, 새로 고침하거나 재접속해도 데이터가 유지됨  
  - **Alembic**을 사용한 DB 마이그레이션 적용  

- **모바일 대응**  
  - 모바일에서도 조작이 가능하도록 스타일 개선  

---

## 🗂️ 프로젝트 구조

```
conote/
│
├── migrations/              # Alembic 마이그레이션 파일
├── static/
│   ├── css/
│   │   ├── home.css
│   │   └── login.css
│   └── js/
│       └── home.js
│
├── templates/
│   ├── home.html
│   └── login.html
│
├── app.py                   # 메인 서버 코드 (Flask + WebSocket)
├── .env                     # 환경 변수 (비밀번호, DB 설정 등)
├── .gitignore
├── LICENSE
├── README.md
├── requirements.txt         # 의존성 패키지 목록
```

---

## 📚 기술 스택

- **Flask** - 웹 프레임워크
- **Flask-SocketIO** - 실시간 양방향 통신 (WebSocket)
- **PostgreSQL** - 데이터 저장
- **Alembic** - DB 마이그레이션 관리
- **gevent** - 비동기 처리를 위한 WSGI 서버
- **dotenv** - 환경 변수 관리
- **HTML/CSS/JavaScript** - 프론트엔드 구현

---

## ✨ 제작 목적

Conote는 **간단한 협업 툴**을 만들고자 하는 목표로 개발되었습니다.  
소규모 팀이나 개인이 **직관적인 방식으로 아이디어를 기록하고 공유**할 수 있도록 설계되었습니다.

