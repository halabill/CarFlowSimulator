const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const bg = new Image();
bg.src = "Map.png";

bg.onload = () => {
  console.log("地圖載入完成！");
  requestAnimationFrame(draw);
};

const pathCar2 = [
  { x: 220, y: 680 },
  { x: 220, y: 590 },
  { x: 340, y: 340 },
  { x: 585, y: 130 },
  { x: 490, y: 190 }
];

const pathCar1 = [
  { x: 490, y: 190 },
  { x: 585, y: 130 },
  { x: 340, y: 340 },
  { x: 220, y: 590 },
  { x: 220, y: 680 }
];

const lights = [
  { x: 585, y: 130, state: "green" },
  { x: 340, y: 340, state: "green" },
  { x: 220, y: 590, state: "green" }
];

let car1 = { color: "red", progress: 0, speed: 2, active: false };
let car2 = { color: "orange", progress: 0, speed: 2, active: false };

document.getElementById("car1Speed").oninput = e => car1.speed = parseFloat(e.target.value);
document.getElementById("car2Speed").oninput = e => car2.speed = parseFloat(e.target.value);

function draw() {
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  drawPath(pathCar1);
  drawPath(pathCar2);
  drawLights();
  moveCar(car1, pathCar1, "car1");
  moveCar(car2, pathCar2, "car2");

  requestAnimationFrame(draw);
}

function drawPath(path) {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function drawLights() {
  lights.forEach(light => {
    ctx.beginPath();
    ctx.arc(light.x, light.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = light.state === "green" ? "green" : "red";
    ctx.fill();
  });
}

function moveCar(car, path, carId) {
  if (!car.active) return;

  let index = Math.floor(car.progress);
  if (index >= path.length - 1) {
    car.active = false;
    resetLights();
    return;
  }

  let p0 = path[index];
  let p1 = path[index + 1];
  let t = car.progress - index;

  let x = p0.x + (p1.x - p0.x) * t;
  let y = p0.y + (p1.y - p0.y) * t;

  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = car.color;
  ctx.fill();

  car.progress += 0.01 * car.speed;

  if (index === 0 && t >= 0) setLights(carId);
}

function setLights(who) {
  if (who === "car1") {
    lights.forEach(light => light.state = "green");
    car2.active = false;
  } else if (who === "car2") {
    lights.forEach(light => light.state = "green");
    car1.active = false;
  }
}

function resetLights() {
  lights.forEach(light => light.state = "green");
}

canvas.addEventListener("click", e => {
  let x = e.offsetX, y = e.offsetY;
  if (Math.abs(x - 490) < 20 && Math.abs(y - 190) < 20 && !car1.active && !car2.active) {
    car1.progress = 0;
    car1.active = true;
  }
  if (Math.abs(x - 220) < 20 && Math.abs(y - 680) < 20 && !car2.active && !car1.active) {
    car2.progress = 0;
    car2.active = true;
  }
});
