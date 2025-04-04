from flask import Flask, render_template, request, redirect, url_for, session, send_file  # ← send_file 추가
import os
import sqlite3
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit
import gevent
import gevent.monkey

# Gevent 패치 적용 (WebSocket 안정화)
gevent.monkey.patch_all()

load_dotenv()

PASSWORD = os.getenv("SECRET_PASSWORD")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default_secret_key")  # 세션 보안 

# WebSocket 안정성을 위해 gevent 사용
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

# 데이터베이스 초기화
def init_db():
    with sqlite3.connect("database.db") as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS boxes (
            id TEXT PRIMARY KEY,
            top INTEGER,
            left INTEGER,
            text TEXT
        )''')
        conn.commit()

init_db()  # 서버 시작 시 DB 테이블 생성

# 로그인
@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form['password']
        if password == PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('home'))
        else:
            return render_template('login.html', error="비밀번호가 틀렸습니다.")
    return render_template('login.html')

# 홈
@app.route('/home')
def home():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('home.html')

# DB 다운로드 라우트 추가
@app.route('/download-db')
def download_db():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return send_file("database.db", as_attachment=True)

# 서버 실행
if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
