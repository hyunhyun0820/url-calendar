let container = document.getElementById("container");
let socket = io();  // WebSocket 연결

// 서버에서 기존 박스 불러오기
socket.on("load_boxes", (boxes) => {
    boxes.forEach((box) => addBox(box));
});

// 새 박스 생성 요청
function createBox() {
    let id = Date.now().toString(); // 유니크 ID
    let boxData = {
        id: id,
        top: (container.clientHeight - 150) / 2,
        left: (container.clientWidth - 150) / 2,
        text: ""
    };
    socket.emit("create_box", boxData);
}

// 서버에서 새 박스 받으면 추가
socket.on("new_box", (data) => {
    addBox(data);
});

// 박스를 추가하는 함수 (드래그 기능 포함)
function addBox(data) {
    let box = document.createElement("div");
    let textarea = document.createElement("textarea");
    let deleteBtn = document.createElement("button");

    box.classList.add("box");
    textarea.classList.add("editable");
    deleteBtn.classList.add("delete-btn");

    box.dataset.id = data.id;  // 박스에 ID 속성 추가
    box.style.top = `${data.top}px`;
    box.style.left = `${data.left}px`;
    textarea.value = data.text;
    deleteBtn.innerText = "✖";

    let isDragging = false, offsetX, offsetY;

    const startDrag = (e) => {
        if (e.target !== textarea && e.target !== deleteBtn) {
            isDragging = true;
            offsetX = e.clientX - box.getBoundingClientRect().left;
            offsetY = e.clientY - box.getBoundingClientRect().top;
            box.style.cursor = "grabbing";
        }
    };

    const dragBox = (e) => {
        if (isDragging) {
            let { left, top, right, bottom } = container.getBoundingClientRect();
            let { width, height } = box.getBoundingClientRect();
            let newX = Math.min(Math.max(e.clientX - offsetX, left), right - width);
            let newY = Math.min(Math.max(e.clientY - offsetY, top), bottom - height);
            box.style.left = `${newX - left}px`;
            box.style.top = `${newY - top}px`;
        }
    };

    const stopDrag = () => {
        if (isDragging) {
            socket.emit("move_box", { id: data.id, top: box.offsetTop, left: box.offsetLeft });
            isDragging = false;
            box.style.cursor = "grab";
        }
    };

    deleteBtn.addEventListener("click", () => {
        socket.emit("delete_box", { id: data.id });
        box.remove();
    });

    // 디바운싱 적용 (텍스트 입력 문제 해결)
    textarea.addEventListener("input", () => {
        clearTimeout(textarea.debounceTimer);
        textarea.debounceTimer = setTimeout(() => {
            socket.emit("update_box", { id: data.id, text: textarea.value });
        }, 300);
    });

    box.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", dragBox);
    document.addEventListener("mouseup", stopDrag);

    box.appendChild(textarea);
    box.appendChild(deleteBtn);
    container.appendChild(box);
}

// 박스 삭제 반영
socket.on("remove_box", (data) => {
    let box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) box.remove();
});

// 박스 내용 업데이트 반영
socket.on("update_box", (data) => {
    let box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) {
        let textarea = box.querySelector("textarea");
        if (textarea) textarea.value = data.text;
    }
});

// 박스 이동 반영
socket.on("move_box", (data) => {
    let box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) {
        box.style.top = `${data.top}px`;
        box.style.left = `${data.left}px`;
    }
});
