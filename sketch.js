// --- AI 辨識相關變數 ---
let video;
let classifier;
// ⚠️ 請在此處替換成你自己在 Teachable Machine 訓練好的模型網址
let modelURL = 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/'; 
let aiLabel = "等待辨識...";
let aiConfidence = 0;

// --- 遊戲狀態與關卡變數 ---
let gameState = 'START'; 
let currentLevel = 0;
let currentSlotIndex = 0; 

// 顏色與關卡定義
const COLORS = {
  '紅': '#FF4D4D',
  '黃': '#FFD700',
  '綠': '#4CAF50',
  '藍': '#2196F3'
};

const levels = [
  { target: ['紅', '黃', '藍'] },
  { target: ['綠', '紅', '黃', '藍'] },
  { target: ['藍', '綠', '藍', '紅'] }
];

let targetSlots = [];
let detectCooldown = 0; 

function preload() {
  // 載入 AI 模型
  classifier = ml5.imageClassifier(modelURL + 'model.json');
}

function setup() {
  // 💻 手機優化：自動偵測手機螢幕寬高，改成直式畫布
  let canvasW = windowWidth < 500 ? windowWidth : 400;
  let canvasH = windowHeight < 700 ? windowHeight : 680;
  createCanvas(canvasW, canvasH);
  
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  
  // 💻 手機優化：指定使用環境鏡頭 (後置鏡頭 'environment')
  // 如果想用前置鏡頭，可以改成 'user'
  let constraints = {
    video: {
      facingMode: 'environment' 
    },
    audio: false
  };
  
  video = createCapture(constraints);
  video.size(320, 240); 
  video.hide();         
  
  initLevel();
}

function draw() {
  background('#F0F8FF');
  
  if (gameState === 'START') {
    drawStartScreen();
  } else if (gameState === 'PLAY') {
    drawGameScreen();
    handleAIIntelligence(); 
  } else if (gameState === 'WIN') {
    drawWinScreen();
  }
}

// 初始化關卡位置（改為符合手機寬度的間距）
function initLevel() {
  targetSlots = [];
  currentSlotIndex = 0;
  detectCooldown = 0;
  
  let levelData = levels[currentLevel];
  let numSlots = levelData.target.length;
  
  // 💻 手機優化：縮小格子尺寸與間距，確保在窄螢幕不會超出邊界
  let slotSize = width / (numSlots + 1.5); 
  let startX = width / 2 - ((numSlots - 1) * (slotSize + 10)) / 2;
  
  for (let i = 0; i < numSlots; i++) {
    targetSlots.push({
      x: startX + i * (slotSize + 10),
      y: height * 0.25, // 放在螢幕上方 1/4 處
      size: slotSize,
      targetColor: levelData.target[i],
      placedColor: null
    });
  }
}

// --- 畫面繪製邏輯（手機排版） ---

function drawStartScreen() {
  fill('#333');
  textSize(24); // 💻 適合手機的字體大小
  text("🤖 AI 兒童積木挑戰 🧩", width / 2, height * 0.3);
  
  textSize(16);
  text("請準備好【紅黃綠藍】積木\n將後置鏡頭對準積木來闖關！", width / 2, height * 0.4);
  
  // 開始按鈕
  fill('#4CAF50');
  rect(width / 2, height * 0.6, 160, 50, 15);
  fill(255);
  textSize(20);
  text("開始挑戰", width / 2, height * 0.6);
}

function drawGameScreen() {
  // 1. 關卡標題
  fill('#333');
  noStroke();
  textSize(22);
  text(`第 ${currentLevel + 1} 關`, width / 2, height * 0.08);
  
  textSize(15);
  let hintText = "目標： " + levels[currentLevel].target.join(' ➔ ');
  text(hintText, width / 2, height * 0.14);
  
  // 2. 繪製關卡格子
  for (let i = 0; i < targetSlots.length; i++) {
    let slot = targetSlots[i];
    
    if (i === currentSlotIndex) {
      stroke('#FF9800');
      strokeWeight(4);
    } else {
      stroke('#999');
      strokeWeight(2);
    }
    
    drawingContext.setLineDash(slot.placedColor ? [] : [4, 4]);
    fill(slot.placedColor ? COLORS[slot.placedColor] : '#FFF');
    rect(slot.x, slot.y, slot.size, slot.size, 10);
    drawingContext.setLineDash([]);
    
    if (!slot.placedColor) {
      noStroke();
      fill(100);
      textSize(16);
      text(slot.targetColor, slot.x, slot.y);
    }
  }
  
  // 3. 手機畫面中下段：鏡頭畫面與 AI 狀態
  let camW = width * 0.75; // 根據手機寬度縮放鏡頭
  let camH = camW * 0.75;
  let camX = width / 2;
  let camY = height * 0.55; // 放在螢幕中下段
  
  // 鏡頭外框
  stroke('#2196F3');
  strokeWeight(4);
  fill(0);
  rect(camX, camY, camW + 8, camH + 8, 10);
  
  // 💻 手機優化：因為是後置主鏡頭拍桌上，不需要做鏡像翻轉（直接畫出即可）
  image(video, camX - camW/2, camY - camH/2, camW, camH);
  
  // 4. AI 辨識文字狀態
  noStroke();
  fill('#333');
  textSize(16);
  
  // 顯示下方即時結果
  if (COLORS[aiLabel]) {
    text(`🤖 偵測到：${aiLabel}色 (${floor(aiConfidence * 100)}%)`, width / 2, height * 0.82);
    
    // 畫一個小色條提示
    fill(COLORS[aiLabel]);
    rect(width / 2, height * 0.86, 60, 15, 5);
  } else {
    fill('#999');
    text(" buscando... 尋找積木中...", width / 2, height * 0.82);
  }
  
  // 處理冷卻提示
  if (detectCooldown > 0) {
    detectCooldown--;
    fill('#E91E63');
    textSize(16);
    text("⏱️ 比對成功！請換下一塊...", width / 2, height * 0.92);
  }
}

function drawWinScreen() {
  fill('#FF9800');
  noStroke();
  textSize(28);
  text("🎉 恭喜全數通關！ 🎉", width / 2, height * 0.35);
  
  fill('#333');
  textSize(16);
  text("你太棒了！用手機也能玩 AI 喔！", width / 2, height * 0.45);
  
  fill('#2196F3');
  rect(width / 2, height * 0.6, 160, 50, 15);
  fill(255);
  textSize(20);
  text("再玩一次", width / 2, height * 0.6);
}

// --- AI 控制核心 ---
function handleAIIntelligence() {
  if (classifier && detectCooldown === 0) {
    classifier.classify(video, gotResult);
  }
}

function gotResult(error, results) {
  if (error) return;
  
  aiLabel = results[0].label;
  aiConfidence = results[0].confidence;
  
  if (aiConfidence > 0.85 && gameState === 'PLAY' && currentSlotIndex < targetSlots.length) {
    let currentSlot = targetSlots[currentSlotIndex];
    
    if (aiLabel === currentSlot.targetColor) {
      currentSlot.placedColor = aiLabel;
      currentSlotIndex++; 
      detectCooldown = 90; // 💻 手機版延長冷卻時間至 1.5 秒，方便小朋友拿開積木
      
      if (currentSlotIndex >= targetSlots.length) {
        checkLevelWin();
      }
    }
  }
}

function checkLevelWin() {
  noLoop();
  setTimeout(() => {
    currentLevel++;
    if (currentLevel < levels.length) {
      initLevel();
    } else {
      gameState = 'WIN';
    }
    loop();
  }, 1000);
}

// 基礎點擊（適應手機點擊觸發）
function mousePressed() {
  if (gameState === 'START') {
    if (mouseX > width/2 - 80 && mouseX < width/2 + 80 && mouseY > height*0.6 - 25 && mouseY < height*0.6 + 25) {
      gameState = 'PLAY';
    }
  } else if (gameState === 'WIN') {
    if (mouseX > width/2 - 80 && mouseX < width/2 + 80 && mouseY > height*0.6 - 25 && mouseY < height*0.6 + 25) {
      currentLevel = 0;
      initLevel();
      gameState = 'PLAY';
    }
  }
}

// 💻 手機優化：當手機旋轉或視窗大小改變時，自動重新計算
function windowResized() {
  let canvasW = windowWidth < 500 ? windowWidth : 400;
  let canvasH = windowHeight < 700 ? windowHeight : 680;
  resizeCanvas(canvasW, canvasH);
  initLevel();
}