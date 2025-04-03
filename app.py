from flask import Flask, render_template, request, redirect, url_for, session
import os
import sqlite3
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit

load_dotenv()

# .env에서 비밀번호 가져오기
PASSWORD = os.getenv("SECRET_PASSWORD")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default_secret_key")  # 세션을 위한 키 추가
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")  # ✅ async_mode 추가

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
    if request.method == 'POST':
        password = request.form['password']
        if password == PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('home'))
        else:
            return render_template('login.html', error="비밀번호가 틀렸습니다.")
    return render_template('login.html')

@app.route('/home')
def home():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('home.html')

# 클라이언트가 접속하면 로그인 상태 확인 후 DB에서 박스 불러오기
@socketio.on('connect')
def send_initial_data():
    if not session.get('logged_in'):
        return  # 로그인 안 된 경우 아무것도 보내지 않음
    
    with sqlite3.connect("database.db", check_same_thread=False) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM boxes")
        boxes = [{"id": row[0], "top": row[1], "left": row[2], "text": row[3]} for row in cursor.fetchall()]
    
    emit('load_boxes', boxes, namespace='/')

# 박스 생성 이벤트
@socketio.on('create_box')
def create_box(data):
    with sqlite3.connect("database.db", check_same_thread=False) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO boxes (id, top, left, text) VALUES (?, ?, ?, ?)", 
                       (data["id"], data["top"], data["left"], data["text"]))
        conn.commit()
    emit('new_box', data, broadcast=True, namespace='/')

# 박스 삭제 이벤트
@socketio.on('delete_box')
def delete_box(data):
    if not session.get('logged_in'):
        return
    
    with sqlite3.connect("database.db", check_same_thread=False) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM boxes WHERE id = ?", (data["id"],))
        conn.commit()
    
    emit('remove_box', {"id": data["id"]}, broadcast=True, namespace='/')

# 박스 내용 업데이트 이벤트
@socketio.on('update_box')
def update_box(data):
    if not session.get('logged_in'):
        return
    
    with sqlite3.connect("database.db", check_same_thread=False) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE boxes SET text = ? WHERE id = ?", (data["text"], data["id"]))
        conn.commit()
    
    emit('update_box', data, broadcast=True, namespace='/')

# 박스 이동 이벤트
@socketio.on('move_box')
def move_box(data):
    if not session.get('logged_in'):
        return
    
    with sqlite3.connect("database.db", check_same_thread=False) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE boxes SET top = ?, left = ? WHERE id = ?", (data["top"], data["left"], data["id"]))
        conn.commit()
    
    emit('move_box', data, broadcast=True, namespace='/')

if __name__ == '__main__':
    socketio.run(app, debug=True)  # ✅ socketio.run() 유지
