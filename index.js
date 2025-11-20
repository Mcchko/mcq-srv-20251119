// Firebase配置
const firebaseConfig = {
    apiKey: "AIzaSyArHHdiYqWFXJu1OQBXucP_5n5cYGvcHic",
    authDomain: "mcq-server-20251119.firebaseapp.com",
    projectId: "mcq-server-20251119",
    storageBucket: "mcq-server-20251119.firebasestorage.app",
    messagingSenderId: "607976163854",
    appId: "1:607976163854:web:4352b12b2455a34eb78a5f"
};
// 初始化Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// DOM元素
const authScreen = document.getElementById('auth-screen');
const scannerScreen = document.getElementById('scanner-screen');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const scanBtn = document.getElementById('scan-btn');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');
const authLoader = document.getElementById('auth-loader');
const scanLoader = document.getElementById('scan-loader');
const scanResult = document.getElementById('scan-result');
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const scannerUserEmail = document.getElementById('scanner-user-email');
const qrContainer = document.getElementById('qr-container');
const cameraError = document.getElementById('camera-error');
const locationGroupSelect = document.getElementById('location-group');

// 地圖相關變數
let map = null;
let markers = [];
let mapInitialized = false;
const markerList = document.getElementById('marker-list');
const markerCount = document.getElementById('marker-count');
const mapCenter = document.getElementById('map-center');
const mapLoading = document.getElementById('map-loading');
const refreshMapBtn = document.getElementById('refresh-map');
const resetMapViewBtn = document.getElementById('reset-map-view');

// 創建自定義問題圖標
const questionIcon = L.icon({
    iconUrl: "圖庫/Question.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// 檢查QR掃描庫是否載入
function isQrScannerAvailable() {
    return typeof Html5QrcodeScanner !== 'undefined';
}

// 切換登入和註冊表單
showSignupBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    clearAuthMessages();
});
showLoginBtn.addEventListener('click', () => {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    clearAuthMessages();
});

// 地點群組選擇處理器
locationGroupSelect.addEventListener('change', function () {
    // 僅當選擇了地點群組時啟用掃描按鈕
    scanBtn.disabled = !this.value;

    Object.values(document.querySelectorAll('[id="location-group"],[for="location-group"]'))
        .forEach(e => e.style.display = "none");

    const e = document.querySelector("#location-group-selected");
    e.parentElement.style.display = "block";
    e.innerText = document.querySelector("#location-group").value;

    // 如果正在掃描且選擇更改為空，則停止掃描
    if (!this.value && isScanning) {
        stopScanning();
    }
});

// 登入功能
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
        showError('請輸入電子郵件和密碼');
        return;
    }
    authLoader.style.display = 'block';
    loginBtn.disabled = true;
    clearAuthMessages();
    auth.signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            sessionStorage.setItem("SESSION_ID", await userCredential.user.getIdToken());
            authLoader.style.display = 'none';
            loginBtn.disabled = false;
            showSuccess('登入成功！');
            setTimeout(() => {
                showScannerScreen(userCredential.user);
            }, 1000);
        })
        .catch((error) => {
            authLoader.style.display = 'none';
            loginBtn.disabled = false;
            showError(error.message);
        });
});

// 註冊功能
signupBtn.addEventListener('click', () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (!email || !password || !confirmPassword) {
        showError('請填寫所有欄位');
        return;
    }
    if (password !== confirmPassword) {
        showError('密碼不一致');
        return;
    }
    if (password.length < 6) {
        showError('密碼至少需要6個字符');
        return;
    }
    authLoader.style.display = 'block';
    signupBtn.disabled = true;
    clearAuthMessages();
    console.log(email, password)
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            authLoader.style.display = 'none';
            signupBtn.disabled = false;
            showSuccess('帳戶創建成功！');
            setTimeout(() => {
                showScannerScreen(userCredential.user);
            }, 1000);
        })
        .catch((error) => {
            authLoader.style.display = 'none';
            signupBtn.disabled = false;
            showError(error.message);
        });
});

// 登出功能
logoutBtn.addEventListener('click', () => {
    stopScanning();
    auth.signOut().then(() => {
        mapInitialized = false;
        showAuthScreen();
    });
});

// 開始/停止掃描
scanBtn.addEventListener('click', () => {
    if (!isScanning) {
        // 僅當選擇了地點群組時允許掃描
        if (!locationGroupSelect.value) {
            showScanResult('請先選擇地點群組');
            return;
        }
        startScanning();
    } else {
        stopScanning();
    }
});

// 顯示錯誤訊息
function showError(message) {
    authError.textContent = message;
    authError.style.display = 'block';
    authSuccess.style.display = 'none';
}

// 顯示成功訊息
function showSuccess(message) {
    authSuccess.textContent = message;
    authSuccess.style.display = 'block';
    authError.style.display = 'none';
}

// 清除驗證訊息
function clearAuthMessages() {
    authError.style.display = 'none';
    authSuccess.style.display = 'none';
}

// 顯示掃描器畫面
function showScannerScreen(user) {
    authScreen.classList.remove('active');
    scannerScreen.classList.add('active');
    scannerUserEmail.textContent = user.email;
    // 重置到掃描器分頁
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector('[data-tab="scanner-tab"]').classList.add('active');
    document.getElementById('scanner-tab').classList.add('active');
    // 顯示掃描器畫面時重置選擇
    locationGroupSelect.value = '';
    scanBtn.disabled = true;
    // 檢查QR掃描器是否可用
    if (!isQrScannerAvailable()) {
        cameraError.innerHTML = '<p>QR掃描器庫載入失敗。</p><p>請檢查您的網路連接。</p>';
        cameraError.style.display = 'block';
        scanBtn.disabled = true;
    }
}

// 顯示驗證畫面
function showAuthScreen() {
    scannerScreen.classList.remove('active');
    authScreen.classList.add('active');
    scanResult.textContent = '掃描QR碼後結果將顯示在此處';
    // 重置地點群組選擇
    locationGroupSelect.value = '';
    scanBtn.disabled = true;
    stopScanning();
}

// 開始QR碼掃描
function startScanning() {
    if (!isQrScannerAvailable()) {
        showScanResult('QR掃描器庫不可用。請檢查控制台錯誤。');
        return;
    }
    scanLoader.style.display = 'block';
    scanBtn.disabled = true;
    try {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            false
        );
        // 使用正確的渲染方法
        html5QrcodeScanner.render(
            (decodedText, decodedResult) => {
                onScanSuccess(decodedText, decodedResult);
            },
            (error) => {
                onScanFailure(error);
            }
        );
        // 如果到達這裡，掃描成功開始
        scanLoader.style.display = 'none';
        scanBtn.textContent = '停止掃描';
        scanBtn.disabled = false;
        isScanning = true;
        cameraError.style.display = 'none';
    } catch (err) {
        // 處理初始化期間的任何錯誤
        scanLoader.style.display = 'none';
        scanBtn.disabled = false;
        cameraError.style.display = 'block';
        cameraError.innerHTML = `<p>啟動掃描器錯誤: ${err.message}</p>`;
        console.error('啟動掃描器錯誤:', err);
    }
}

// 停止QR碼掃描
function stopScanning() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            html5QrcodeScanner = null;
            isScanning = false;
            scanBtn.textContent = '開始掃描';
            scanBtn.disabled = !locationGroupSelect.value; // 如果選擇了地點則重新啟用
        }).catch((err) => {
            console.error('停止掃描器錯誤:', err);
        });
    } else {
        isScanning = false;
        scanBtn.textContent = '開始掃描';
        scanBtn.disabled = !locationGroupSelect.value; // 如果選擇了地點則重新啟用
    }
}

// 處理成功掃描 - 第一次成功後停止
function onScanSuccess(decodedText, decodedResult) {
    // 第一次成功掃描後立即停止掃描
    stopScanning();
    const selectedLocationGroup = locationGroupSelect.value;
    getGPSLocation()
        .then(gpsInfo => {
            const gpsText = formatGPSInfo(gpsInfo);
            scanResult.innerHTML = `序號: ${decodedText}<br>${gpsText}`;
            scanResult.style.backgroundColor = '#e8f5e9';
            // 向Heroku伺服器發送POST請求
            const postData = {
                "序號": decodedText,
                "經度": gpsInfo.latitude ? gpsInfo.latitude.toFixed(8) : null,
                "緯度": gpsInfo.longitude ? gpsInfo.longitude.toFixed(8) : null,
                "地點群組": selectedLocationGroup
            };
            fetch("https://mcq-server-20251119-9c75fceb3200.herokuapp.com/action/QrCode/CreateRecord", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(postData)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP錯誤! 狀態: ${response.status}`);
                    }
                    return response.json();
                })
                .then(json => {
                    if (json.data) {
                        scanResult.innerHTML += `<br><span style="color: green;">✓ 記錄創建成功 (群組: ${selectedLocationGroup})</span>`;
                    } else {
                        scanResult.innerHTML += `<br><span style="color: red;">${json.message}</span>`;
                    }
                })
                .catch(error => {
                    console.error("創建記錄錯誤:", error);
                    scanResult.innerHTML += `<br><span style="color: red;">✗ 錯誤: ${error.message}</span>`;
                });
        })
        .catch(error => {
            scanResult.innerHTML = `序號: ${decodedText}<br>GPS: 獲取位置錯誤`;
            scanResult.style.backgroundColor = '#e8f5e9';
            console.error('GPS錯誤:', error);
        });
}

// 獲取GPS位置
function getGPSLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            resolve({ error: "不支援地理位置" });
            return;
        }
        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 增加超時時間至10秒
            maximumAge: 0
        };
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const gpsInfo = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    altitudeAccuracy: position.coords.altitudeAccuracy,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: new Date(position.timestamp).toLocaleString()
                };
                resolve(gpsInfo);
            },
            (error) => {
                console.warn('GPS錯誤:', error);
                const errorInfo = {
                    error: error.message,
                    code: error.code,
                    message:
                        error.code === 1 ? "權限被拒絕" :
                            error.code === 2 ? "位置不可用" :
                                error.code === 3 ? "超時" : "未知錯誤"
                };
                resolve(errorInfo);
            },
            options
        );
    });
}

// 輔助函數格式化GPS數據
function formatGPSInfo(gpsInfo) {
    if (!gpsInfo || gpsInfo.error || !gpsInfo.latitude || !gpsInfo.longitude) {
        return 'GPS: 不可用';
    }
    return `GPS: 緯度: ${gpsInfo.latitude.toFixed(6)}<br/>經度: ${gpsInfo.longitude.toFixed(6)}<br/>準確度: ${gpsInfo.accuracy}m`;
}

// 輔助函數顯示掃描結果訊息
function showScanResult(message, isError = false) {
    scanResult.textContent = message;
    scanResult.style.backgroundColor = isError ? '#ffeaea' : '#f8f9fa';
    scanResult.style.color = isError ? '#e74c3c' : '#333';
}

// 處理掃描失敗
function onScanFailure(error) {
    // 大多數錯誤在掃描期間發生是可以接受的
    console.log('掃描錯誤 (通常沒問題):', error);
}

// 測試QR碼模擬
document.querySelectorAll('.test-qr').forEach(button => {
    button.addEventListener('click', () => {
        const selectedLocationGroup = locationGroupSelect.value;
        const text = button.getAttribute('data-text');
        if (!selectedLocationGroup) {
            showScanResult('請先選擇地點群組');
            return;
        }
        getGPSLocation()
            .then(gpsInfo => {
                const gpsText = formatGPSInfo(gpsInfo);
                scanResult.innerHTML = `序號: ${text}<br>${gpsText}`;
                // 模擬API調用
                scanResult.innerHTML += `<br><span style="color: green;">✓ 記錄創建成功 (群組: ${selectedLocationGroup})</span>`;
            })
            .catch(error => {
                scanResult.innerHTML = `序號: ${text}<br>GPS: (獲取位置錯誤)`;
            });
    });
});

// 頁面載入時檢查身份驗證狀態
auth.onAuthStateChanged((user) => {
    if (user) {
        // 用戶已登入
        userInfo.style.display = 'block';
        userEmail.textContent = user.email;
        showScannerScreen(user);
    } else {
        // 用戶已登出
        userInfo.style.display = 'none';
        showAuthScreen();
    }
});

// 切換登入/註冊時清除表單
showSignupBtn.addEventListener('click', () => {
    authError.style.display = 'none';
    authSuccess.style.display = 'none';
});
showLoginBtn.addEventListener('click', () => {
    authError.style.display = 'none';
    authSuccess.style.display = 'none';
});

// 分頁切換功能
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('nav-link')) {
        e.preventDefault();
        // 從所有分頁和內容中移除active類
        document.querySelectorAll('.nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        // 向點擊的分頁和相應內容添加active類
        e.target.classList.add('active');
        const tabId = e.target.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        Object.values(document.querySelectorAll('[id="location-group"],[for="location-group"]'))
            .forEach(e => e.style.display = "block");
        document.querySelector("#location-group-selected").parentElement.style.display = "none";

        document.querySelector(".location-group-selected").innerText = locationGroupSelect.value;

        // 切換到地圖分頁時停止掃描
        if (tabId === 'map-tab' && isScanning) {
            stopScanning();
        }
        // 切換到地圖分頁時初始化地圖
        if (tabId === 'map-tab' && !mapInitialized) {
            // 僅當選擇了地點群組時允許掃描
            if (!locationGroupSelect.value) {
                showScanResult('請先選擇地點群組', isError = true);
                document.querySelector(`[data-tab="scanner-tab"]`).click()
                return;
            }
            initializeMap();
        }
    }
});

// ========= 地圖功能 =========

// 初始化地圖
function initializeMap() {
    mapLoading.style.display = 'block';

    // 檢查地圖容器是否存在
    if (!document.getElementById('map')) {
        console.error('地圖容器不存在');
        mapLoading.style.display = 'none';
        return;
    }

    // 初始化地圖
    map = L.map('map').setView([22.3193, 114.1694], 12); // 香港中心

    // 添加無標籤瓦片地圖
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 24
    }).addTo(map);

    // 監聽地圖移動事件
    map.on('moveend', updateCenterCoordinates);

    // 載入地理信息
    loadGeoinfo();

    mapInitialized = true;
    mapLoading.style.display = 'none';
}

// 載入地理信息
function loadGeoinfo() {
    getGPSLocation()
        .then(gpsInfo => {
            fetch(
                `https://mcq-server-20251119-9c75fceb3200.herokuapp.com/action/Map/GetDataByLocationGroup?地點群組=${locationGroupSelect.value}&用戶地理資訊=${JSON.stringify({
                    經度: gpsInfo.latitude,
                    緯度: gpsInfo.longitude,
                    誤差: gpsInfo.accuracy
                })
                }`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${sessionStorage.getItem("SESSION_ID")}`  // Add the Authorization header here
                    },
                }
            )
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP錯誤! 狀態: ${response.status}`);
                    }
                    return response.json();
                })
                .then(json => {
                    if (json && json.data.geoinfo) {
                        createMarkers(json.data.geoinfo);
                    } else {
                        console.warn('API返回的數據格式不正確:', json);
                        alert('API返回的數據格式不正確:', json);
                    }
                })
                .catch(error => {
                    console.error('載入地理信息錯誤:', error);
                    alert('載入地理信息錯誤:', error);
                });
        });
}

// 創建標記
function createMarkers(geoinfo) {
    // 清除現有標記
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    markerList.innerHTML = '';

    // 為每個地理信息點創建標記
    console.log(geoinfo)
    geoinfo.forEach((item, index) => {
        const questionKey = Object.keys(item)[0];
        const coords = item[questionKey];

        // 創建標記
        const marker = L.marker([coords.lat, coords.lng], { icon: questionIcon })
            .addTo(map)
            .bindPopup(`<b>${questionKey}</b><br>緯度: ${coords.lat}<br>經度: ${coords.lng}`);

        // 存儲標記
        markers.push({
            marker: marker,
            question: questionKey,
            coords: coords
        });

        // 創建列表項目
        const listItem = document.createElement('div');
        listItem.className = 'marker-item';
        listItem.innerHTML = `
                    <span>${questionKey}</span>
                    <span class="coordinates">${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}</span>
                `;

        // 添加點擊事件
        listItem.addEventListener('click', function () {
            // 移除所有活動類
            document.querySelectorAll('.marker-item').forEach(item => {
                item.classList.remove('active');
            });

            // 添加活動類到當前項目
            listItem.classList.add('active');

            // 打開標記的彈出窗口並居中地圖
            marker.openPopup();
            map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 14), {
                animate: true,
                duration: 0.5
            });
        });

        // 添加到列表
        markerList.appendChild(listItem);
    });

    // 更新標記計數
    markerCount.textContent = `總共 ${markers.length} 個問題標記`;

    // 如果有標記，調整地圖視圖以包含所有標記
    if (markers.length > 0) {
        const group = new L.featureGroup(markers.map(m => m.marker));
        map.fitBounds(group.getBounds().pad(0.1));
    }

    // 更新中心坐標
    updateCenterCoordinates();
}

// 更新地圖中心坐標
function updateCenterCoordinates() {
    if (!map) return;
    const center = map.getCenter();
    mapCenter.textContent = `中心: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
}

// 刷新地圖按鈕
refreshMapBtn.addEventListener('click', function () {
    if (mapInitialized) {
        loadGeoinfo();
    }
});

// 重置地圖視圖按鈕
resetMapViewBtn.addEventListener('click', function () {
    if (map) {
        map.setView([22.3193, 114.1694], 12);
    }
});

// QR掃描相關變數
let html5QrcodeScanner = null;
let isScanning = false;