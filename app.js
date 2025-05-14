// 全局變量
let currentRecord = {
    id: null,
    photo: null,
    restaurant: null,
    location: null,
    rating: 0,
    notes: '',
    tags: [],
    dishName: '',
    price: '',
    date: null,
    audioNote: null // 新增錄音筆記
};

let records = [];
let selectedRestaurant = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let isEditing = false; // 標記是否處於編輯模式

// DOM 元素
const homeScreen = document.getElementById('homeScreen');
const recordScreen = document.getElementById('recordScreen');
const detailScreen = document.getElementById('detailScreen');
const newRecordBtn = document.getElementById('newRecordBtn');
const recordsList = document.getElementById('recordsList');
const cameraContainer = document.getElementById('cameraContainer');
const cameraPreview = document.getElementById('cameraPreview');
const photoCanvas = document.getElementById('photoCanvas');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const capturedImage = document.getElementById('capturedImage');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const locationStatus = document.getElementById('locationStatus');
const restaurantSuggestions = document.getElementById('restaurantSuggestions');
const restaurantList = document.getElementById('restaurantList');
const manualLocationBtn = document.getElementById('manualLocationBtn');
const manualLocationInput = document.getElementById('manualLocationInput');
const customRestaurantName = document.getElementById('customRestaurantName');
const confirmCustomRestaurant = document.getElementById('confirmCustomRestaurant');
const ratingContainer = document.getElementById('ratingContainer');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const voiceStatus = document.getElementById('voiceStatus');
const notesText = document.getElementById('notesText');
const tagsContainer = document.getElementById('tagsContainer');
const customTagInput = document.getElementById('customTagInput');
const addCustomTagBtn = document.getElementById('addCustomTagBtn');
const dishName = document.getElementById('dishName');
const price = document.getElementById('price');
const cancelRecordBtn = document.getElementById('cancelRecordBtn');
const saveRecordBtn = document.getElementById('saveRecordBtn');

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    // 載入已保存的記錄
    loadRecords();
    
    // 事件監聽器
    newRecordBtn.addEventListener('click', startNewRecord);
    cameraContainer.addEventListener('click', initCamera);
    captureBtn.addEventListener('click', capturePhoto);
    retakeBtn.addEventListener('click', retakePhoto);
    manualLocationBtn.addEventListener('click', toggleManualLocationInput);
    confirmCustomRestaurant.addEventListener('click', confirmManualLocation);
    voiceInputBtn.addEventListener('click', toggleVoiceInput);
    addCustomTagBtn.addEventListener('click', addCustomTag);
    cancelRecordBtn.addEventListener('click', cancelRecord);
    saveRecordBtn.addEventListener('click', saveRecord);
    
    // 評分星星事件
    const stars = document.querySelectorAll('.stars i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            setRating(rating);
        });
    });
    
    // 預設標籤事件
    const tags = document.querySelectorAll('.tag');
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            toggleTag(tag);
        });
    });
});

// 開始新記錄
function startNewRecord() {
    // 重置當前記錄
    currentRecord = {
        id: Date.now(),
        photo: null,
        restaurant: null,
        location: null,
        rating: 0,
        notes: '',
        tags: [],
        dishName: '',
        price: '',
        date: new Date()
    };
    
    // 重置UI
    capturedImage.classList.add('hidden');
    cameraPreview.classList.add('hidden');
    cameraPlaceholder.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    captureBtn.classList.remove('hidden');
    locationStatus.textContent = '正在獲取位置...';
    restaurantSuggestions.classList.add('hidden');
    manualLocationInput.classList.add('hidden');
    notesText.value = '';
    dishName.value = '';
    price.value = '';
    
    // 重置評分
    setRating(0);
    
    // 重置標籤
    const selectedTags = document.querySelectorAll('.tag.selected');
    selectedTags.forEach(tag => {
        tag.classList.remove('selected');
    });
    
    // 切換到記錄頁面
    homeScreen.classList.add('hidden');
    detailScreen.classList.add('hidden');
    recordScreen.classList.remove('hidden');
    
    // 獲取位置
    getLocation();
}

// 初始化相機
async function initCamera() {
    if (cameraPlaceholder.classList.contains('hidden')) {
        return; // 相機已經初始化
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        cameraPreview.srcObject = stream;
        cameraPlaceholder.classList.add('hidden');
        cameraPreview.classList.remove('hidden');
    } catch (error) {
        console.error('無法訪問相機:', error);
        alert('無法訪問相機，請確保您已授予相機權限。');
    }
}

// 拍照
function capturePhoto() {
    if (cameraPreview.srcObject) {
        // 設置 canvas 大小與視頻相同
        photoCanvas.width = cameraPreview.videoWidth;
        photoCanvas.height = cameraPreview.videoHeight;
        
        // 在 canvas 上繪製當前視頻幀
        const context = photoCanvas.getContext('2d');
        context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
        
        // 將 canvas 轉換為圖片 URL
        const photoUrl = photoCanvas.toDataURL('image/jpeg', 0.7); // 壓縮圖片，品質設為 0.7
        
        // 顯示拍攝的照片
        capturedImage.src = photoUrl;
        capturedImage.classList.remove('hidden');
        cameraPreview.classList.add('hidden');
        
        // 更新按鈕狀態
        captureBtn.classList.add('hidden');
        retakeBtn.classList.remove('hidden');
        
        // 停止相機流
        stopCameraStream();
        
        // 保存照片到當前記錄
        currentRecord.photo = photoUrl;
    }
}

// 重新拍照
function retakePhoto() {
    // 清除已拍攝的照片
    capturedImage.src = '';
    capturedImage.classList.add('hidden');
    
    // 更新按鈕狀態
    retakeBtn.classList.add('hidden');
    captureBtn.classList.remove('hidden');
    
    // 重新初始化相機
    initCamera();
    
    // 清除當前記錄中的照片
    currentRecord.photo = null;
}

// 停止相機流
function stopCameraStream() {
    if (cameraPreview.srcObject) {
        const tracks = cameraPreview.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        cameraPreview.srcObject = null;
    }
}

// 獲取位置
function getLocation() {
    if (navigator.geolocation) {
        locationStatus.textContent = '正在獲取GPS位置...';
        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // 保存位置到當前記錄
                currentRecord.location = { latitude, longitude };
                
                // 顯示位置信息
                locationStatus.innerHTML = `<strong>已獲取GPS位置</strong><br>緯度: ${latitude.toFixed(6)}<br>經度: ${longitude.toFixed(6)}`;
                
                // 顯示手動輸入餐廳選項
                manualLocationInput.classList.remove('hidden');
                customRestaurantName.placeholder = '輸入餐廳名稱（選填）';
            },
            error => {
                console.error('無法獲取位置:', error);
                locationStatus.textContent = '無法獲取位置，請手動輸入餐廳（選填）。';
                manualLocationInput.classList.remove('hidden');
            }
        );
    } else {
        locationStatus.textContent = '您的瀏覽器不支持地理位置功能，請手動輸入餐廳（選填）。';
        manualLocationInput.classList.remove('hidden');
    }
}

// 獲取附近餐廳 - 此功能已不再使用，但保留函數以避免錯誤
function getNearbyRestaurants(latitude, longitude) {
    // 不再使用模擬餐廳數據
    // 直接顯示手動輸入選項
    locationStatus.innerHTML = `<strong>已獲取GPS位置</strong><br>緯度: ${latitude.toFixed(6)}<br>經度: ${longitude.toFixed(6)}`;
    manualLocationInput.classList.remove('hidden');
    customRestaurantName.placeholder = '輸入餐廳名稱（選填）';
}

// 顯示餐廳列表
function displayRestaurants(restaurants) {
    locationStatus.textContent = '已找到附近餐廳：';
    restaurantList.innerHTML = '';
    
    restaurants.forEach(restaurant => {
        const li = document.createElement('li');
        li.textContent = `${restaurant.name} (${restaurant.distance})`;
        li.dataset.id = restaurant.id;
        li.dataset.name = restaurant.name;
        
        li.addEventListener('click', () => {
            selectRestaurant(restaurant);
        });
        
        restaurantList.appendChild(li);
    });
    
    restaurantSuggestions.classList.remove('hidden');
}

// 選擇餐廳
function selectRestaurant(restaurant) {
    // 清除之前的選擇
    const selectedItems = document.querySelectorAll('#restaurantList li.selected');
    selectedItems.forEach(item => {
        item.classList.remove('selected');
    });
    
    // 標記當前選擇
    const currentItem = document.querySelector(`#restaurantList li[data-id="${restaurant.id}"]`);
    if (currentItem) {
        currentItem.classList.add('selected');
    }
    
    // 保存選擇的餐廳
    selectedRestaurant = restaurant;
    currentRecord.restaurant = restaurant.name;
}

// 切換手動輸入
function toggleManualLocationInput() {
    manualLocationInput.classList.toggle('hidden');
    if (!manualLocationInput.classList.contains('hidden')) {
        customRestaurantName.focus();
    }
}

// 確認手動輸入的餐廳
function confirmManualLocation() {
    const name = customRestaurantName.value.trim();
    // 餐廳名稱現在是選填的
    currentRecord.restaurant = name; // 如果為空，則保存為空值
    
    if (name) {
        locationStatus.innerHTML = locationStatus.innerHTML + `<br>餐廳: ${name}`;
    } else {
        // 如果沒有輸入餐廳名稱，只顯示位置信息
        if (!locationStatus.innerHTML.includes('已獲取GPS位置')) {
            locationStatus.textContent = '已記錄位置（未指定餐廳）';
        }
    }
    
    manualLocationInput.classList.add('hidden');
    
    // 清除之前的選擇
    const selectedItems = document.querySelectorAll('#restaurantList li.selected');
    selectedItems.forEach(item => {
        item.classList.remove('selected');
    });
}

// 設置評分
function setRating(rating) {
    currentRecord.rating = rating;
    
    // 更新星星顯示
    const stars = document.querySelectorAll('.stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// 切換錄音功能
function toggleVoiceInput() {
    if (!isRecording) {
        startAudioRecording();
    } else {
        stopAudioRecording();
    }
}

// 開始錄音
function startAudioRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('您的瀏覽器不支持錄音功能');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            
            mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // 保存錄音到當前記錄
                currentRecord.audioNote = audioUrl;
                
                // 顯示錄音播放器
                const audioPlayer = document.createElement('audio');
                audioPlayer.src = audioUrl;
                audioPlayer.controls = true;
                audioPlayer.style.width = '100%';
                audioPlayer.style.marginTop = '10px';
                
                // 清除之前的播放器
                const oldPlayer = document.querySelector('.audio-player');
                if (oldPlayer) {
                    oldPlayer.remove();
                }
                
                // 添加新播放器
                audioPlayer.classList.add('audio-player');
                voiceStatus.parentNode.appendChild(audioPlayer);
                
                // 釋放媒體流
                stream.getTracks().forEach(track => track.stop());
            });
            
            mediaRecorder.start();
            isRecording = true;
            voiceStatus.textContent = '正在錄音...';
            voiceInputBtn.style.backgroundColor = '#f44336';
        })
        .catch(error => {
            console.error('無法訪問麥克風:', error);
            alert('無法訪問麥克風，請確保您已授予麥克風權限。');
        });
}

// 停止錄音
function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    isRecording = false;
    voiceStatus.textContent = '點擊麥克風開始錄音';
    voiceInputBtn.style.backgroundColor = '';
}

// 切換標籤
function toggleTag(tagElement) {
    const tagName = tagElement.getAttribute('data-tag');
    
    if (tagElement.classList.contains('selected')) {
        // 移除標籤
        tagElement.classList.remove('selected');
        currentRecord.tags = currentRecord.tags.filter(tag => tag !== tagName);
    } else {
        // 添加標籤
        tagElement.classList.add('selected');
        currentRecord.tags.push(tagName);
    }
}

// 添加自定義標籤
function addCustomTag() {
    const tagName = customTagInput.value.trim();
    
    if (tagName) {
        // 檢查是否已存在
        if (!document.querySelector(`.tag[data-tag="${tagName}"]`)) {
            // 創建新標籤
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag');
            tagElement.setAttribute('data-tag', tagName);
            tagElement.textContent = tagName;
            
            tagElement.addEventListener('click', () => {
                toggleTag(tagElement);
            });
            
            // 添加到預設標籤區域
            document.querySelector('.predefined-tags').appendChild(tagElement);
            
            // 自動選中
            toggleTag(tagElement);
        } else {
            // 如果已存在，選中它
            const existingTag = document.querySelector(`.tag[data-tag="${tagName}"]`);
            if (!existingTag.classList.contains('selected')) {
                toggleTag(existingTag);
            }
        }
        
        // 清空輸入框
        customTagInput.value = '';
    }
}

// 取消記錄
function cancelRecord() {
    // 停止相機流
    stopCameraStream();
    
    // 停止語音錄製
    if (isRecording) {
        stopAudioRecording(); // 更正函數名稱
    }
    
    // 返回主頁
    recordScreen.classList.add('hidden');
    detailScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
}

// 保存記錄
function saveRecord() {
    // 檢查必填項
    if (!currentRecord.photo) {
        alert('請拍攝或上傳一張照片');
        return;
    }
    
    if (currentRecord.rating === 0) {
        alert('請為這道菜評分');
        return;
    }
    
    // 更新選填項
    currentRecord.dishName = dishName.value.trim();
    currentRecord.price = price.value.trim();
    currentRecord.notes = notesText.value.trim();
    
    if (isEditing) {
        // 編輯模式：更新現有記錄
        const index = records.findIndex(r => r.id === currentRecord.id);
        if (index !== -1) {
            records[index] = currentRecord;
        }
        isEditing = false;
    } else {
        // 新增模式：添加到記錄列表
        records.push(currentRecord);
    }
    
    // 保存到本地存儲
    saveRecords();
    
    // 更新主頁記錄列表
    updateRecordsList();
    
    // 停止相機流
    stopCameraStream();
    
    // 停止錄音
    if (isRecording) {
        stopAudioRecording();
    }
    
    // 返回主頁
    recordScreen.classList.add('hidden');
    detailScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    
    // 顯示成功消息
    alert(isEditing ? '記錄已更新！' : '記錄已保存！');
}

// 更新記錄列表
function updateRecordsList() {
    recordsList.innerHTML = '';
    
    if (records.length === 0) {
        // 顯示空狀態
        const emptyState = document.createElement('div');
        emptyState.classList.add('empty-state');
        emptyState.innerHTML = `
            <i class="fas fa-utensils"></i>
            <p>尚無美食紀錄</p>
            <p>點擊上方按鈕開始記錄您的美食體驗</p>
        `;
        recordsList.appendChild(emptyState);
        return;
    }
    
    // 按日期降序排序
    const sortedRecords = [...records].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // 創建記錄卡片
    sortedRecords.forEach(record => {
        const recordCard = document.createElement('div');
        recordCard.classList.add('record-card');
        
        // 格式化日期
        const date = new Date(record.date);
        const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        
        recordCard.innerHTML = `
            <div class="record-image">
                <img src="${record.photo}" alt="${record.dishName || '美食照片'}">
            </div>
            <div class="record-info">
                <h3>${record.dishName || record.restaurant}</h3>
                <p>${record.restaurant}</p>
                <div class="record-rating">
                    ${generateStars(record.rating)}
                </div>
                <p class="record-date">${formattedDate}</p>
            </div>
        `;
        
        // 刪除按鈕
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // 防止觸發 recordCard 的點擊事件
            deleteRecord(record.id);
        });

        const recordActions = document.createElement('div');
        recordActions.classList.add('record-actions');
        recordActions.appendChild(deleteBtn);

        recordCard.appendChild(recordActions); // 將操作按鈕添加到卡片

        // 點擊查看詳情
        recordCard.addEventListener('click', () => {
            showRecordDetail(record);
        });
        
        recordsList.appendChild(recordCard);
    });
}

// 生成星星HTML
function generateStars(rating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHtml += '<i class="fas fa-star"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    return starsHtml;
}

// 編輯記錄
function editRecord(record) {
    // 設置編輯模式
    isEditing = true;
    
    // 將當前記錄設置為要編輯的記錄
    currentRecord = JSON.parse(JSON.stringify(record)); // 深拷貝以避免直接修改原記錄
    
    // 填充表單
    if (currentRecord.photo) {
        capturedImage.src = currentRecord.photo;
        capturedImage.classList.remove('hidden');
        cameraPlaceholder.classList.add('hidden');
        captureBtn.classList.add('hidden');
        retakeBtn.classList.remove('hidden');
    }
    
    // 顯示位置信息
    if (currentRecord.location) {
        locationStatus.innerHTML = `<strong>已獲取GPS位置</strong><br>緯度: ${currentRecord.location.latitude.toFixed(6)}<br>經度: ${currentRecord.location.longitude.toFixed(6)}`;
        if (currentRecord.restaurant) {
            locationStatus.innerHTML += `<br>餐廳: ${currentRecord.restaurant}`;
        }
    } else if (currentRecord.restaurant) {
        locationStatus.textContent = `餐廳: ${currentRecord.restaurant}`;
    }
    
    // 設置評分
    setRating(currentRecord.rating);
    
    // 設置筆記
    notesText.value = currentRecord.notes || '';
    
    // 設置標籤
    const allTags = document.querySelectorAll('.tag');
    allTags.forEach(tag => {
        const tagName = tag.getAttribute('data-tag');
        if (currentRecord.tags.includes(tagName)) {
            tag.classList.add('selected');
        } else {
            tag.classList.remove('selected');
        }
    });
    
    // 設置選填項
    dishName.value = currentRecord.dishName || '';
    price.value = currentRecord.price || '';
    
    // 顯示錄音播放器（如果有）
    if (currentRecord.audioNote) {
        const audioPlayer = document.createElement('audio');
        audioPlayer.src = currentRecord.audioNote;
        audioPlayer.controls = true;
        audioPlayer.style.width = '100%';
        audioPlayer.style.marginTop = '10px';
        
        // 清除之前的播放器
        const oldPlayer = document.querySelector('.audio-player');
        if (oldPlayer) {
            oldPlayer.remove();
        }
        
        // 添加新播放器
        audioPlayer.classList.add('audio-player');
        voiceStatus.parentNode.appendChild(audioPlayer);
    }
    
    // 切換到記錄頁面
    homeScreen.classList.add('hidden');
    detailScreen.classList.add('hidden');
    recordScreen.classList.remove('hidden');
}

// 顯示記錄詳情
function showRecordDetail(record) {
    // 切換到詳情頁面
    homeScreen.classList.add('hidden');
    recordScreen.classList.add('hidden');
    detailScreen.classList.remove('hidden');
    
    // 格式化日期
    const date = new Date(record.date);
    const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    // 生成標籤HTML
    let tagsHtml = '';
    if (record.tags.length > 0) {
        record.tags.forEach(tag => {
            tagsHtml += `<span class="tag">${tag}</span>`;
        });
    } else {
        tagsHtml = '<p>無標籤</p>';
    }
    
    // 生成位置信息
    let locationHtml = '';
    if (record.location) {
        locationHtml = `<p>GPS: ${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}</p>`;
        if (record.restaurant) {
            locationHtml += `<p>餐廳: ${record.restaurant}</p>`;
        }
    } else if (record.restaurant) {
        locationHtml = `<p>餐廳: ${record.restaurant}</p>`;
    } else {
        locationHtml = '<p>未記錄位置</p>';
    }
    
    // 生成錄音播放器HTML
    let audioHtml = '';
    if (record.audioNote) {
        audioHtml = `
        <div class="detail-audio">
            <h3><i class="fas fa-microphone"></i> 語音筆記</h3>
            <audio src="${record.audioNote}" controls class="audio-player" style="width:100%"></audio>
        </div>
        `;
    }
    
    // 填充詳情內容
    detailScreen.innerHTML = `
        <div class="detail-header">
            <button id="backToHomeBtn" class="text-btn">
                <i class="fas fa-arrow-left"></i> 返回
            </button>
            <h2>${record.dishName || '美食紀錄'}</h2>
            <button id="editRecordBtn" class="text-btn">
                <i class="fas fa-edit"></i> 編輯
            </button>
        </div>
        
        <img src="${record.photo}" alt="${record.dishName || '美食照片'}" class="detail-image">
        
        <div class="detail-info">
            <div class="detail-restaurant">
                <h3><i class="fas fa-map-marker-alt"></i> 位置</h3>
                ${locationHtml}
            </div>
            
            <div class="detail-rating">
                <h3><i class="fas fa-star"></i> 評分</h3>
                <div class="stars">${generateStars(record.rating)}</div>
            </div>
            
            <div class="detail-date">
                <h3><i class="fas fa-calendar-alt"></i> 日期</h3>
                <p>${formattedDate}</p>
            </div>
            
            ${record.notes ? `
            <div class="detail-notes">
                <h3><i class="fas fa-comment"></i> 筆記</h3>
                <p>${record.notes}</p>
            </div>
            ` : ''}
            
            ${audioHtml}
            
            <div class="detail-tags">
                <h3><i class="fas fa-tags"></i> 標籤</h3>
                <div class="tags">${tagsHtml}</div>
            </div>
            
            ${(record.dishName || record.price) ? `
            <div class="detail-optional">
                <h3><i class="fas fa-info-circle"></i> 其他資訊</h3>
                ${record.dishName ? `<p><strong>菜名:</strong> ${record.dishName}</p>` : ''}
                ${record.price ? `<p><strong>價格:</strong> ${record.price}</p>` : ''}
            </div>
            ` : ''}
        </div>
    `;
    
    // 返回按鈕事件
    document.getElementById('backToHomeBtn').addEventListener('click', () => {
        detailScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    });
    
    // 編輯按鈕事件
    document.getElementById('editRecordBtn').addEventListener('click', () => {
        editRecord(record);
    });

    // 新增刪除按鈕到詳情頁
    const deleteDetailBtn = document.createElement('button');
    deleteDetailBtn.id = 'deleteRecordDetailBtn';
    deleteDetailBtn.classList.add('text-btn', 'danger-btn');
    deleteDetailBtn.innerHTML = '<i class="fas fa-trash"></i> 刪除';
    deleteDetailBtn.addEventListener('click', () => {
        if (confirm('確定要刪除這條記錄嗎？')) {
            deleteRecord(record.id);
            detailScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
        }
    });
    // 將刪除按鈕添加到詳情頁的頭部或底部，這裡添加到頭部旁邊
    const detailHeader = detailScreen.querySelector('.detail-header');
    if (detailHeader) {
        detailHeader.appendChild(deleteDetailBtn);
    }
}

// 保存記錄到本地存儲
function saveRecords() {
    try {
        localStorage.setItem('foodLogRecords', JSON.stringify(records));
    } catch (error) {
        console.error('保存記錄失敗:', error);
        
        // 如果是因為存儲空間不足，嘗試壓縮圖片或清理舊記錄
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            alert('存儲空間不足，請刪除一些舊記錄。');
        }
    }
}

// 刪除記錄
function deleteRecord(recordId) {
    records = records.filter(record => record.id !== recordId);
    saveRecords();
    updateRecordsList();
    // 如果當前在詳情頁面，則返回主頁
    if (!detailScreen.classList.contains('hidden')) {
        detailScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    }
}

// 從本地存儲載入記錄
function loadRecords() {
    try {
        const savedRecords = localStorage.getItem('foodLogRecords');
        if (savedRecords) {
            records = JSON.parse(savedRecords);
            updateRecordsList();
        }
    } catch (error) {
        console.error('載入記錄失敗:', error);
    }
}

// CSS樣式已移至styles.css檔案中