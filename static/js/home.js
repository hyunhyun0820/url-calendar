const container = document.getElementById("container");
const socket = io();

// 기존 박스 불러오기
socket.on("load_boxes", (boxes) => {
    boxes.forEach((box) => addBox(box));
});

// 중앙에 박스 생성
function createBox() {
    const id = Date.now().toString();
    const boxWidth = 150;
    const boxHeight = 150;

    const centerX = window.scrollX + window.innerWidth / 2;
    const centerY = window.scrollY + window.innerHeight / 2;

    const containerRect = container.getBoundingClientRect();
    const left = centerX - containerRect.left - boxWidth / 2;
    const top = centerY - containerRect.top - boxHeight / 2;

    const boxData = {
        id,
        top,
        left,
        text: ""
    };

    socket.emit("create_box", boxData);
}

// 새 박스 서버에서 수신
socket.on("new_box", (data) => {
    addBox(data);
});

function addBox(data) {
    const box = document.createElement("div");
    box.classList.add("box");
    box.dataset.id = data.id;
    box.style.top = `${data.top}px`;
    box.style.left = `${data.left}px`;

    const textarea = document.createElement("textarea");
    textarea.classList.add("editable");
    textarea.value = data.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.innerText = "✖";

    let isDragging = false;
    let offsetX, offsetY;
    let isTyping = false;

    // 드래그 시작
    const startDrag = (e) => {
        if (textarea.contains(e.target) || deleteBtn.contains(e.target)) return;

        isDragging = true;
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;

        offsetX = clientX - box.offsetLeft;
        offsetY = clientY - box.offsetTop;

        box.style.cursor = "grabbing";

        if (e.type === "touchstart") {
            e.preventDefault();
            document.body.style.touchAction = "none";
        }
    };

    // 드래그 중
    const dragBox = (e) => {
        if (!isDragging) return;

        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;

        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        newX = Math.max(0, Math.min(newX, container.offsetWidth - box.offsetWidth));
        newY = Math.max(0, Math.min(newY, container.offsetHeight - box.offsetHeight));

        box.style.left = `${newX}px`;
        box.style.top = `${newY}px`;
    };

    // 드래그 종료
    const stopDrag = () => {
        if (isDragging) {
            isDragging = false;
            box.style.cursor = "grab";
            document.body.style.touchAction = "auto";

            socket.emit("move_box", {
                id: data.id,
                top: box.offsetTop,
                left: box.offsetLeft
            });
        }
    };

    // 텍스트 동기화
    textarea.addEventListener("input", () => {
        isTyping = true;
        clearTimeout(textarea.debounceTimer);
        textarea.debounceTimer = setTimeout(() => {
            socket.emit("update_box", {
                id: data.id,
                text: textarea.value
            });
            isTyping = false;
        }, 500);
    });

    // 삭제
    deleteBtn.addEventListener("click", () => {
        socket.emit("delete_box", { id: data.id });
        box.remove();
    });

    // 서버에서 받은 텍스트 갱신
    socket.on("update_box", (serverData) => {
        if (serverData.id !== data.id) return;
        if (!isTyping) {
            textarea.value = serverData.text;
        }
    });

    // 이벤트 연결
    box.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", dragBox);
    document.addEventListener("mouseup", stopDrag);
    box.addEventListener("touchstart", startDrag, { passive: false });
    document.addEventListener("touchmove", dragBox, { passive: false });
    document.addEventListener("touchend", stopDrag);

    box.appendChild(textarea);
    box.appendChild(deleteBtn);
    container.appendChild(box);
}

// 박스 위치 이동
socket.on("move_box", (data) => {
    const box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) {
        box.style.top = `${data.top}px`;
        box.style.left = `${data.left}px`;
    }
});

// 박스 제거
socket.on("remove_box", (data) => {
    const box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) {
        box.remove();
    }
});
