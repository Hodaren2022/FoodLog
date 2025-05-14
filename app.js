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
    date: null
};

let records = [];
let selectedRestaurant = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

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
        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // 保存位置到當前記錄
                currentRecord.location = { latitude, longitude };
                
                // 獲取附近餐廳
                getNearbyRestaurants(latitude, longitude);
            },
            error => {
                console.error('無法獲取位置:', error);
                locationStatus.textContent = '無法獲取位置，請手動輸入餐廳。';
                manualLocationInput.classList.remove('hidden');
            }
        );
    } else {
        locationStatus.textContent = '您的瀏覽器不支持地理位置功能，請手動輸入餐廳。';
        manualLocationInput.classList.remove('hidden');
    }
}

// 獲取附近餐廳
function getNearbyRestaurants(latitude, longitude) {
    // 這裡應該使用 Google Places API 或其他地圖服務
    // 由於這是一個示範，我們使用模擬數據
    
    // 模擬 API 請求延遲
    locationStatus.textContent = '正在搜尋附近餐廳...';
    
    setTimeout(() => {
        const mockRestaurants = [
            { id: 1, name: '好味餐廳', distance: '50公尺' },
            { id: 2, name: '美食天地', distance: '120公尺' },
            { id: 3, name: '家鄉小館', distance: '200公尺' },
            { id: 4, name: '星級牛排館', distance: '350公尺' },
            { id: 5, name: '海鮮樓', distance: '400公尺' }
        ];
        
        displayRestaurants(mockRestaurants);
    }, 1000);
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
    if (name) {
        currentRecord.restaurant = name;
        locationStatus.textContent = `已選擇餐廳: ${name}`;
        manualLocationInput.classList.add('hidden');
        
        // 清除之前的選擇
        const selectedItems = document.querySelectorAll('#restaurantList li.selected');
        selectedItems.forEach(item => {
            item.classList.remove('selected');
        });
    } else {
        alert('請輸入餐廳名稱');
    }
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

// 切換語音輸入
function toggleVoiceInput() {
    if (!isRecording) {
        startVoiceRecording();
    } else {
        stopVoiceRecording();
    }
}

// 開始語音錄製
function startVoiceRecording() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        alert('您的瀏覽器不支持語音識別功能');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'zh-TW';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
        isRecording = true;
        voiceStatus.textContent = '正在聆聽...';
        voiceInputBtn.style.backgroundColor = '#f44336';
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            notesText.value += finalTranscript + ' ';
            currentRecord.notes = notesText.value;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('語音識別錯誤:', event.error);
        stopVoiceRecording();
    };
    
    recognition.onend = () => {
        stopVoiceRecording();
    };
    
    recognition.start();
    mediaRecorder = recognition;
}

// 停止語音錄製
function stopVoiceRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
    
    isRecording = false;
    voiceStatus.textContent = '點擊麥克風開始語音輸入';
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
        stopVoiceRecording();
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
    
    if (!currentRecord.restaurant) {
        alert('請選擇或輸入餐廳名稱');
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
    
    // 添加到記錄列表
    records.push(currentRecord);
    
    // 保存到本地存儲
    saveRecords();
    
    // 更新主頁記錄列表
    updateRecordsList();
    
    // 停止相機流
    stopCameraStream();
    
    // 停止語音錄製
    if (isRecording) {
        stopVoiceRecording();
    }
    
    // 返回主頁
    recordScreen.classList.add('hidden');
    detailScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    
    // 顯示成功消息
    alert('記錄已保存！');
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
    
    // 填充詳情內容
    detailScreen.innerHTML = `
        <div class="detail-header">
            <button id="backToHomeBtn" class="text-btn">
                <i class="fas fa-arrow-left"></i> 返回
            </button>
            <h2>${record.dishName || '美食紀錄'}</h2>
        </div>
        
        <img src="${record.photo}" alt="${record.dishName || '美食照片'}" class="detail-image">
        
        <div class="detail-info">
            <div class="detail-restaurant">
                <h3><i class="fas fa-map-marker-alt"></i> 餐廳</h3>
                <p>${record.restaurant}</p>
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

// 添加CSS樣式
document.head.insertAdjacentHTML('beforeend', `
<style>
/* 記錄卡片樣式 */
.record-card {
    display: flex;
    background-color: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.2s;
}

.record-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.record-image {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
}

.record-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.record-info {
    padding: 1rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.record-info h3 {
    margin: 0 0 0.3rem 0;
    font-size: 1.1rem;
}

.record-info p {
    margin: 0 0 0.5rem 0;
    color: #666;
    font-size: 0.9rem;
}

.record-rating {
    color: #ffc107;
    margin-bottom: 0.5rem;
}

.record-date {
    font-size: 0.8rem !important;
    color: #999 !important;
}

/* 詳情頁面樣式 */
.detail-header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
}

.detail-header h2 {
    margin: 0 0 0 1rem;
    flex-grow: 1;
    font-size: 1.3rem;
}
</style>
`);