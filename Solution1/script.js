document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const carRedEl = document.getElementById('car-red');
    const carOrangeEl = document.getElementById('car-orange');
    const startStopBtn = document.getElementById('start-stop-btn');
    const redSpeedSlider = document.getElementById('red-car-speed');
    const orangeSpeedSlider = document.getElementById('orange-car-speed');
    const redSpeedDisplay = document.getElementById('red-speed-display');
    const orangeSpeedDisplay = document.getElementById('orange-speed-display');

    const lights = {
        1: document.querySelectorAll('#traffic-light-1 .light'),
        2: document.querySelectorAll('#traffic-light-2 .light'),
        3: document.querySelectorAll('#traffic-light-3 .light')
    };

    let simulationRunning = false;
    let animationFrameId;

    // --- 【最終修正】基於地圖像素精確校對的路徑 ---
    const pathRed = [
        [490, 190],[490, 250],[490, 300],[490, 350],
        [485, 365],[470, 378],[450, 383],[425, 385],
        [400, 385],[350, 385],[300, 385],[250, 385]
    ];
    const pathOrange = [
        [330, 600],[330, 550],[330, 480],[330, 430],
        [340, 410],[355, 395],[375, 385],
        [405, 380],[428, 370],[445, 350],[457, 325],[460, 300],
        [458, 270],[448, 245],[430, 220],[405, 200],[380, 188],
        [350, 185],[325, 190],[300, 205],[280, 230],[270, 260],
        [268, 290],[275, 315],[290, 335],[315, 350],[340, 358]
    ];

    let carRed = { el: carRedEl, path: pathRed, pathIndex: 0, x: 0, y: 0, speed: 1, stopped: false, angle: 0 };
    let carOrange = { el: carOrangeEl, path: pathOrange, pathIndex: 0, x: 0, y: 0, speed: 1, stopped: false, angle: 0 };
    
    // --- 【最終修正】更穩定、更簡潔的狀態機 ---
    const trafficController = {
        sensorZone: [300, 500, 370, 425], // 精確的感應區
        stopLines: { red: 350, orange: 430 },
        flow: 'cross', // 'cross' (橫向) 或 'main' (主幹道)
        isSwitching: false,
        lightStatus: { 1: 'red', 2: 'red', 3: 'green' } // 單一可靠的狀態來源
    };

    function initialize() {
        carRed.speed = parseFloat(redSpeedSlider.value);
        carOrange.speed = parseFloat(orangeSpeedSlider.value);
        redSpeedDisplay.textContent = parseFloat(redSpeedSlider.value).toFixed(1);
        orangeSpeedDisplay.textContent = parseFloat(orangeSpeedSlider.value).toFixed(1);
        
        resetCar(carRed);
        resetCar(carOrange);
        
        trafficController.flow = 'cross';
        trafficController.isSwitching = false;
        
        setLightStatus(1, 'red');
        setLightStatus(2, 'red');
        setLightStatus(3, 'green');
    }

    function resetCar(car) {
        car.pathIndex = 0;
        const startPoint = car.path[0];
        const nextPoint = car.path[1];
        car.x = startPoint[0];
        car.y = startPoint[1];
        car.stopped = false;
        car.angle = Math.atan2(nextPoint[1] - startPoint[1], nextPoint[0] - startPoint[0]) * 180 / Math.PI;
        updateCarDisplay(car);
    }
    
    function updateCarDisplay(car) {
        car.el.style.left = `${car.x - car.el.offsetWidth / 2}px`;
        car.el.style.top = `${car.y - car.el.offsetHeight / 2}px`;
        car.el.style.transform = `rotate(${car.angle}deg)`;
    }

    function gameLoop() {
        if (!simulationRunning) return;
        updateTrafficLights();
        moveCar(carRed, 'red');
        moveCar(carOrange, 'orange');
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function moveCar(car, carId) {
        const lightId = carId === 'red' ? 1 : 2;
        const isRedLight = trafficController.lightStatus[lightId] === 'red';
        const stopY = trafficController.stopLines[carId];
        
        let isApproachingStopLine = false;
        if (carId === 'red') isApproachingStopLine = car.y >= stopY && car.y < stopY + car.speed * 2;
        else isApproachingStopLine = car.y <= stopY && car.y > stopY - car.speed * 2;
        
        if (isRedLight && isApproachingStopLine && car.pathIndex < 5) {
            car.stopped = true;
        } else {
            car.stopped = false;
        }
        
        if (car.stopped) return;

        let targetPoint = car.path[car.pathIndex];
        if (!targetPoint) { resetCar(car); return; }

        let dx = targetPoint[0] - car.x;
        let dy = targetPoint[1] - car.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) car.angle = Math.atan2(dy, dx) * 180 / Math.PI;

        if (distance < car.speed) {
            car.pathIndex++;
            if (car.pathIndex >= car.path.length) { resetCar(car); return; }
        } else {
            car.x += (dx / distance) * car.speed;
            car.y += (dy / distance) * car.speed;
        }
        updateCarDisplay(car);
    }

    // --- 【最終修正】全新的燈號控制狀態機 ---
    function updateTrafficLights() {
        if (trafficController.isSwitching) return;

        const redInSensor = isCarInSensor(carRed);
        const orangeInSensor = isCarInSensor(carOrange);
        
        // 狀態1: 當前是橫向通行 (綠燈3亮)，主幹道有車請求
        if (trafficController.flow === 'cross' && (redInSensor || orangeInSensor)) {
            switchToMainFlow();
        } 
        // 狀態2: 當前是主幹道通行，且感應區內已無車輛
        else if (trafficController.flow === 'main' && !redInSensor && !orangeInSensor) {
            switchToCrossFlow();
        }
    }
    
    function switchToMainFlow() {
        trafficController.isSwitching = true;
        trafficController.flow = 'main_pending'; // 進入切換中狀態
        setLightStatus(3, 'yellow');
        setTimeout(() => {
            setLightStatus(3, 'red');
            setTimeout(() => {
                setLightStatus(1, 'green');
                setLightStatus(2, 'green');
                trafficController.flow = 'main'; // 切換完成
                trafficController.isSwitching = false;
            }, 500);
        }, 1500);
    }

    function switchToCrossFlow() {
        trafficController.isSwitching = true;
        trafficController.flow = 'cross_pending'; // 進入切換中狀態
        setLightStatus(1, 'yellow');
        setLightStatus(2, 'yellow');
        setTimeout(() => {
            setLightStatus(1, 'red');
            setLightStatus(2, 'red');
            setTimeout(() => {
                setLightStatus(3, 'green');
                trafficController.flow = 'cross'; // 切換完成
                trafficController.isSwitching = false;
            }, 500);
        }, 1500);
    }

    function isCarInSensor(car) {
        const [x1, x2, y1, y2] = trafficController.sensorZone;
        return car.x > x1 && car.x < x2 && car.y > y1 && car.y < y2;
    }

    function setLightStatus(lightId, status) {
        trafficController.lightStatus[lightId] = status;
        const lightElements = lights[lightId];
        lightElements.forEach(l => l.classList.remove('active'));
        if (status === 'red') lightElements[0].classList.add('active');
        else if (status === 'yellow') lightElements[1].classList.add('active');
        else if (status === 'green') lightElements[2].classList.add('active');
    }

    // --- 事件監聽器 ---
    startStopBtn.addEventListener('click', () => {
        simulationRunning = !simulationRunning;
        if (simulationRunning) {
            startStopBtn.textContent = '停止模擬';
            startStopBtn.classList.add('running');
            animationFrameId = requestAnimationFrame(gameLoop);
        } else {
            startStopBtn.textContent = '啟動模擬';
            startStopBtn.classList.remove('running');
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            initialize();
        }
    });

    redSpeedSlider.addEventListener('input', (e) => { carRed.speed = parseFloat(e.target.value); redSpeedDisplay.textContent = parseFloat(e.target.value).toFixed(1); });
    orangeSpeedSlider.addEventListener('input', (e) => { carOrange.speed = parseFloat(e.target.value); orangeSpeedDisplay.textContent = parseFloat(e.target.value).toFixed(1); });

    initialize();
});