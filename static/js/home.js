let container = document.getElementById("container");
let socket = io();

// 기존 박스 불러오기
socket.on("load_boxes", (boxes) => {
    boxes.forEach((box) => addBox(box));
});

// 중앙에 박스 생성
function createBox() {
    let id = Date.now().toString();
    let boxWidth = 150;
    let boxHeight = 150;

    const centerX = window.scrollX + window.innerWidth / 2;
    const centerY = window.scrollY + window.innerHeight / 2;

    const containerRect = container.getBoundingClientRect();

    const left = centerX - containerRect.left - boxWidth / 2;
    const top = centerY - containerRect.top - boxHeight / 2;

    let boxData = {
        id,
        top,
        left,
        text: ""
    };

    socket.emit("create_box", boxData);
}

// 새 박스 추가
socket.on("new_box", (data) => {
    addBox(data);
});

function addBox(data) {
    let box = document.createElement("div");
    let textarea = document.createElement("textarea");
    let deleteBtn = document.createElement("button");

    box.classList.add("box");
    textarea.classList.add("editable");
    deleteBtn.classList.add("delete-btn");

    box.dataset.id = data.id;
    box.style.top = `${data.top}px`;
    box.style.left = `${data.left}px`;
    textarea.value = data.text;
    deleteBtn.innerText = "✖";

    let isDragging = false;
    let offsetX, offsetY;
    let isTyping = false;

    // 드래그 시작
    const startDrag = (e) => {
        const target = e.target;

        if (box.contains(target) && !textarea.contains(target) && !deleteBtn.contains(target)) {
            isDragging = true;

            const clientX = e.clientX ?? e.touches?.[0]?.clientX;
            const clientY = e.clientY ?? e.touches?.[0]?.clientY;

            offsetX = clientX - box.offsetLeft;
            offsetY = clientY - box.offsetTop;

            box.style.cursor = "grabbing";

            // 터치 드래그 중 스크롤 방지
            if (e.type === "touchstart") {
                // `touch-action: none` should be added to prevent scroll
                e.preventDefault();
                container.style.touchAction = "none";  // Prevent scrolling during drag
            }
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

        if (e.type === "touchmove") {
            e.preventDefault(); // Prevent scroll during drag
        }
    };

    // 드래그 종료
    const stopDrag = () => {
        if (isDragging) {
            isDragging = false;
            box.style.cursor = "grab";
            container.style.touchAction = "auto";  // Allow scrolling after drag

            socket.emit("move_box", {
                id: data.id,
                top: box.offsetTop,
                left: box.offsetLeft
            });
        }
    };

    // 삭제
    deleteBtn.addEventListener("click", () => {
        socket.emit("delete_box", { id: data.id });
        box.remove();
    });

    // 텍스트 입력 동기화
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

    // 이벤트 등록
    box.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", dragBox);
    document.addEventListener("mouseup", stopDrag);

    // 터치 이벤트: box에만 적용
    box.addEventListener("touchstart", startDrag, { passive: false });
    box.addEventListener("touchmove", dragBox, { passive: false });
    box.addEventListener("touchend", stopDrag);

    box.appendChild(textarea);
    box.appendChild(deleteBtn);
    container.appendChild(box);

    // 텍스트 동기화 수신
    socket.on("update_box", (serverData) => {
        if (serverData.id !== data.id) return;
        if (!isTyping) {
            textarea.value = serverData.text;
        }
    });
}

// 박스 제거
socket.on("remove_box", (data) => {
    let box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) box.remove();
});

// 위치 동기화
socket.on("move_box", (data) => {
    let box = document.querySelector(`.box[data-id="${data.id}"]`);
    if (box) {
        box.style.top = `${data.top}px`;
        box.style.left = `${data.left}px`;
    }
});
