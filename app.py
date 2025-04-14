import gevent.monkey
gevent.monkey.patch_all()

from flask import Flask, render_template, request, redirect, url_for, session
from flask_socketio import SocketIO, emit, join_room
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
import os
import uuid

# 환경 변수 로드
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")

# Flask 앱 설정
app = Flask(__name__)
app.secret_key = SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 확장 초기화
db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

# 모델 정의
class Room(db.Model):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)
    boxes = db.relationship('Box', backref='room', lazy=True)

class Box(db.Model):
    __tablename__ = 'boxes'
    id = db.Column(db.String, primary_key=True)
    top = db.Column(db.Integer)
    left = db.Column(db.Integer)
    text = db.Column(db.Text)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    color = db.Column(db.String(20))  # 새 필드 추가

# 링크로 접속하면 링크/rooms로
@app.route('/')
def index():
    return redirect(url_for('rooms_page'))

# /rooms에 rooms.html 띄우기
@app.route("/rooms", methods=["GET"])
def rooms_page():
    return render_template("rooms.html")

# 방 접속시 보이는 home
@app.route('/home')
def home():
    if 'room_id' not in session:
        return redirect(url_for('rooms_page'))
    
    room = db.session.get(Room, session['room_id'])
    if not room:
        return redirect(url_for('rooms_page'))

    return render_template('home.html', room_id=room.id, room_name=room.name)

# 방 만들기
@app.route("/create_room", methods=["POST"])
def create_room():
    room_name = request.form["room_name"]
    room_password = request.form["room_password"]
    existing = Room.query.filter_by(name=room_name).first()
    if existing:
        return render_template("rooms.html", error="이미 존재하는 방 이름입니다.", error_type="create")

    new_room = Room(name=room_name, password=room_password)
    db.session.add(new_room)
    db.session.commit()
    session["room_id"] = new_room.id
    return redirect(url_for("home"))

# 방 입장하기
@app.route("/join_room", methods=["POST"])
def join_existing_room():
    room_name = request.form["room_name"]
    room_password = request.form["room_password"]
    room = Room.query.filter_by(name=room_name).first()
    if room and room.password == room_password:
        session["room_id"] = room.id
        return redirect(url_for("home"))
    else:
        return render_template("rooms.html", error="방 이름 또는 비밀번호가 틀렸습니다.", error_type="join")

# 소켓 이벤트
@socketio.on('connect')
def handle_connect(auth=None):
    room_id = session.get("room_id")
    if room_id is None:
        return
    join_room(str(room_id))
    boxes = Box.query.filter_by(room_id=room_id).order_by(Box.id.asc()).all()
    emit('load_boxes', [
        {"id": box.id, "top": box.top, "left": box.left, "text": box.text}
        for box in boxes
    ], to=request.sid)

# 소켓 박스 만들기
@socketio.on("create_box")
def create_box(data):
    room_id = session.get("room_id")
    if room_id is None:
        return
    room_id_str = str(room_id)

    box_id = data.get("id", str(uuid.uuid4()))
    top = data.get("top", data.get("y", 100))
    left = data.get("left", data.get("x", 100))
    text = data.get("text", "")

    new_box = Box(id=box_id, top=top, left=left, text=text, room_id=room_id)
    db.session.add(new_box)
    db.session.commit()

    emit("new_box", {
        "id": box_id,
        "top": top,
        "left": left,
        "text": text
    }, to=room_id_str)

# 소켓 박스 삭제하기
@socketio.on('delete_box')
def delete_box(data):
    room_id = session.get("room_id")
    if room_id is None:
        return
    room_id_str = str(room_id)

    box = db.session.get(Box, data["id"])
    if box and box.room_id == room_id:
        db.session.delete(box)
        db.session.commit()
        emit('remove_box', {"id": data["id"]}, to=room_id_str)

# 소켓 박스 업데이트
@socketio.on('update_box')
def update_box(data):
    room_id = session.get("room_id")
    if room_id is None:
        return
    room_id_str = str(room_id)

    box = db.session.get(Box, data["id"])
    if box and box.room_id == room_id:
        box.text = data["text"]
        db.session.commit()
        emit('update_box', data, to=room_id_str)

#소켓 박스 움직일 때 emit
@socketio.on('move_box')
def move_box(data):
    room_id = session.get("room_id")
    if room_id is None:
        return
    room_id_str = str(room_id)

    box = db.session.get(Box, data["id"])
    if box and box.room_id == room_id:
        box.top = data["top"]
        box.left = data["left"]
        db.session.commit()
        emit('move_box', data, to=room_id_str)



if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
