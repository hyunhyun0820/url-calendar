from flask import Flask, render_template, request, redirect, url_for
import os
import sqlite3
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit

load_dotenv()

# .env에서 비밀번호 가져오기
PASSWORD = os.getenv("SECRET_PASSWORD")

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# 로그인 상태 변수
logged_in = False

# DB 초기화
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

init_db()  # 서버 실행 시 DB 테이블 생성

@app.route('/', methods=['GET', 'POST'])
def login():
    global logged_in
    if request.method == 'POST':
        password = request.form['password']
        if password == PASSWORD:
            logged_in = True
            return redirect(url_for('home'))
        else:
            return render_template('login.html', error="비밀번호가 틀렸습니다.")
    return render_template('login.html')

@app.route('/home')
def home():
    global logged_in
    if not logged_in:
        return redirect(url_for('login'))
    return render_template('home.html')

# 클라이언트가 접속하면 로그인 상태 확인 후 DB에서 박스 불러오기
@socketio.on('connect')
def send_initial_data():
    global logged_in
    if not logged_in:
        return  # 로그인 안 된 경우 아무것도 보내지 않음
    with sqlite3.connect("database.db") as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM boxes")
        boxes = [{"id": row[0], "top": row[1], "left": row[2], "text": row[3]} for row in cursor.fetchall()]
    emit('load_boxes', boxes)

# 박스 생성 이벤트
@socketio.on('create_box')
def create_box(data):
    with sqlite3.connect("database.db") as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO boxes (id, top, left, text) VALUES (?, ?, ?, ?)", 
                       (data["id"], data["top"], data["left"], data["text"]))
        conn.commit()
    emit('new_box', data, broadcast=True)

# 박스 삭제 이벤트
@socketio.on('delete_box')
def delete_box(data):
    global logged_in
    if not logged_in:
        return
    with sqlite3.connect("database.db") as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM boxes WHERE id = ?", (data["id"],))
        conn.commit()
    emit('remove_box', {"id": data["id"]}, broadcast=True)

# 박스 내용 업데이트 이벤트
@socketio.on('update_box')
def update_box(data):
    global logged_in
    if not logged_in:
        return
    with sqlite3.connect("database.db") as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE boxes SET text = ? WHERE id = ?", (data["text"], data["id"]))
        conn.commit()
    emit('update_box', data, broadcast=True)

# 박스 이동 이벤트
@socketio.on('move_box')
def move_box(data):
    global logged_in
    if not logged_in:
        return
    with sqlite3.connect("database.db") as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE boxes SET top = ?, left = ? WHERE id = ?", (data["top"], data["left"], data["id"]))
        conn.commit()
    emit('move_box', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
