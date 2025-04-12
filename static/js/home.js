const container = document.getElementById("container");
const roomId = container.dataset.roomId;
const socket = io();

// 방 참가
socket.emit("join_room", roomId);

// 박스 불러오기
socket.on("load_boxes", (boxes) => {
    boxes.forEach(addBox);
});

// 박스 생성
function createBox() {
    const id = Date.now().toString();
    const boxWidth = 150, boxHeight = 150;
    const centerX = window.scrollX + window.innerWidth / 2;
    const centerY = window.scrollY + window.innerHeight / 2;
    const containerRect = container.getBoundingClientRect();

    const left = centerX - containerRect.left - boxWidth / 2;
    const top = centerY - containerRect.top - boxHeight / 2;

    socket.emit("create_box", {
        id, top, left, text: "", room: roomId
    });
}

socket.on("new_box", addBox);

// 박스 추가
function addBox(data) {
    if (data.room !== roomId) return;

    const box = document.createElement("div");
    box.className = "box";
    box.dataset.id = data.id;
    box.style.top = `${data.top}px`;
    box.style.left = `${data.left}px`;

    const textarea = document.createElement("textarea");
    textarea.className = "editable";
    textarea.value = data.text;
    box.appendChild(textarea);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✖";
    deleteBtn.onclick = () => {
        socket.emit("delete_box", { id: data.id, room: roomId });
        box.remove();
    };
    box.appendChild(deleteBtn);

    let isDragging = false, offsetX = 0, offsetY = 0;

    const dragStart = (e) => {
        if (textarea.contains(e.target) || deleteBtn.contains(e.target)) return;

        isDragging = true;
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        offsetX = clientX - box.offsetLeft;
        offsetY = clientY - box.offsetTop;
        box.style.cursor = "grabbing";

        if (e.type === "touchstart") document.body.style.touchAction = "none";
    };

    const dragMove = (e) => {
        if (!isDragging) return;

        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;

        const newLeft = Math.min(container.offsetWidth - box.offsetWidth, Math.max(0, clientX - offsetX));
        const newTop = Math.min(container.offsetHeight - box.offsetHeight, Math.max(0, clientY - offsetY));

        box.style.left = `${newLeft}px`;
        box.style.top = `${newTop}px`;
    };

    const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        box.style.cursor = "grab";
        document.body.style.touchAction = "auto";

        socket.emit("move_box", {
            id: data.id,
            top: box.offsetTop,
            left: box.offsetLeft,
            room: roomId
        });
    };

    box.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragEnd);

    box.addEventListener("touchstart", dragStart, { passive: false });
    document.addEventListener("touchmove", dragMove, { passive: false });
    document.addEventListener("touchend", dragEnd);

    let typing = false;
    textarea.addEventListener("input", () => {
        typing = true;
        clearTimeout(textarea._debounce);
        textarea._debounce = setTimeout(() => {
            socket.emit("update_box", {
                id: data.id,
                text: textarea.value,
                room: roomId
            });
            typing = false;
        }, 400);
    });

    socket.on("update_box", (updateData) => {
        if (updateData.id !== data.id || updateData.room !== roomId) return;
        if (!typing) textarea.value = updateData.text;
    });

    container.appendChild(box);
}

// 박스 위치 이동 반영
socket.on("move_box", (data) => {
    if (data.room !== roomId) return;
    const box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) {
        box.style.top = `${data.top}px`;
        box.style.left = `${data.left}px`;
    }
});

// 박스 제거
socket.on("remove_box", (data) => {
    if (data.room !== roomId) return;
    const box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) box.remove();
});
