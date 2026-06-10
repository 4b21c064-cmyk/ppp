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
  classifier = ml5.imageClassifier(modelURL + 'model.json');
}

function setup() {
  // 📱 核心優化：直接讓畫布等於手機螢幕的完整寬高
  createCanvas(windowWidth, windowHeight);
  
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  
  // 設定後置鏡頭
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

function initLevel() {
  targetSlots = [];
  currentSlotIndex = 0;
  detectCooldown = 0;
  
  let levelData = levels[currentLevel];
  let numSlots = levelData.target.length;
  
  // 📱 響應式佈局：依據當前手機寬度動態計算格子大小
  let slotSize = width / (numSlots + 1.8); 
  let startX = width / 2 - ((numSlots - 1) * (slotSize + 12)) / 2;
  
  for (let i = 0; i < numSlots; i++) {
    targetSlots.push({
      x: startX + i * (slotSize + 12),
      y: height * 0.22, // 格子放在螢幕上方 22% 的位置
      size: slotSize,
      targetColor: levelData.target[i],
      placedColor: null
    });
  }
}

// --- 畫面繪製邏輯 ---

function drawStartScreen() {
  fill('#333');
  textSize(width * 0.07); // 📱 字體大小隨螢幕寬度縮放
  text("🤖 AI 兒童積木挑戰 🧩", width / 2, height * 0.3);
  
  textSize(width * 0.045);
  text("請準備好【紅黃綠藍】積木\n將後置鏡頭對準積木來闖關！", width / 2, height * 0.42);
  
  // 開始按鈕
  fill('#4CAF50');
  rect(width / 2, height * 0.65, width * 0.45, 55, 15);
  fill(255);
  textSize(width * 0.05);
  text("開始挑戰", width / 2, height * 0.65);
}

function drawGameScreen() {
  // 1. 關卡標題
  fill('#333');
  noStroke();
  textSize(width * 0.06);
  text(`第 ${currentLevel + 1} 關`, width / 2, height * 0.07);
  
  textSize(width * 0.04);
  let hintText = "目標： " + levels[currentLevel].target.join(' ➔ ');
  text(hintText, width / 2, height * 0.12);
  
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
      textSize(slot.size * 0.25);
      text(slot.targetColor, slot.x, slot.y);
    }
  }
  
  // 3. 鏡頭畫面（高度與寬度比例完美控制，不擋到文字）
  let camW = width * 0.8; 
  let camH = camW * 0.75;
  let camX = width / 2;
  let camY = height * 0.54; 
  
  stroke('#2196F3');
  strokeWeight(4);
  fill(0);
  rect(camX, camY, camW + 8, camH + 8, 10);
  
  image(video, camX - camW/2, camY - camH/2, camW, camH);
  
  // 4. AI 辨識文字狀態與冷卻提示
  noStroke();
  fill('#333');
  textSize(width * 0.045);
  
  if (COLORS[aiLabel]) {
    text(`🤖 偵測到：${aiLabel}色 (${floor(aiConfidence * 100)}%)`, width / 2, height * 0.82);
    fill(COLORS[aiLabel]);
    rect(width / 2, height * 0.86, 60, 15, 5);
  } else {
    fill('#999');
    text("🔍 尋找積木中...", width / 2, height * 0.82);
  }
  
  if (detectCooldown > 0) {
    detectCooldown--;
    fill('#E91E63');
    textSize(width * 0.04);
    text("⏱️ 比對成功！請換下一塊...", width / 2, height * 0.91);
  }
}

function drawWinScreen() {
  fill('#FF9800');
  noStroke();
  textSize(width * 0.07);
  text("🎉 恭喜全數通關！ 🎉", width / 2, height * 0.35);
  
  fill('#333');
  textSize(width * 0.045);
  text("你太棒了！用手機也能玩 AI 喔！", width / 2, height * 0.45);
  
  fill('#2196F3');
  rect(width / 2, height * 0.65, width * 0.45, 55, 15);
  fill(255);
  textSize(width * 0.05);
  text("再玩一次", width / 2, height * 0.65);
}

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
      detectCooldown = 90; 
      
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

function mousePressed() {
  if (gameState === 'START') {
    if (mouseX > width/2 - (width*0.22) && mouseX < width/2 + (width*0.22) && mouseY > height*0.65 - 27 && mouseY < height*0.65 + 27) {
      gameState = 'PLAY';
    }
  } else if (gameState === 'WIN') {
    if (mouseX > width/2 - (width*0.22) && mouseX < width/2 + (width*0.22) && mouseY > height*0.65 - 27 && mouseY < height*0.65 + 27) {
      currentLevel = 0;
      initLevel();
      gameState = 'PLAY';
    }
  }
}

// 📱 當手機轉向或螢幕尺寸改變，自動重新填滿
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initLevel();
}