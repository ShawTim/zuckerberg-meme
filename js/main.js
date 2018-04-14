import images from "./images";
import tippy from 'tippy.js';
import FileSaver from "file-saver";
import ProgressBar from "progressbar.js";

let progressbar;
let blob;
let blobURL;
let avatar = {};

const WIDTH = 400;
const HEIGHT = 400;

const renderProgressBar = (container) => {
  container.classList.add("converting");
  progressbar = new ProgressBar.SemiCircle(container, {
    strokeWidth: 3,
    color: "black",
    trailColor: "#eee",
    trailWidth: 1,
    svgStyle: null,
    color: "black",
    text: {
      value: "0%",
      alignToBottom: false
    },
  });
};

const setProgressBar = (progress) => {
  if (progressbar) {
    progressbar.set(progress);
    progressbar.setText(`${parseInt(progress*100)}%`);
  }
};

const getSubtitle = (index) => {
  let id;

  if (index <= 44) id = "subtitle01";
  else if (index >= 63 && index <= 82) id = "subtitle02";
  else if (index >= 83) id = "subtitle03";

  if (!!id) {
    const subtitle = document.getElementById(id);
    return subtitle.value || subtitle.placeholder;
  } else {
    return null;
  }
};

const fillSubtitle = (context, subtitle, scale) => {
  if (!!subtitle) {
    context.font = `${20*scale}px Arial`;
    context.textAlign = "center";
    context.shadowColor = "black";
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    const words = subtitle.split(" ");
    const subtitles = [];
    let index = 1;
    let str = words[0];
    while (index < words.length) {
      str += ` ${words[index++]}`;
      if (str.length >= 30) {
        subtitles.push(str);
        str = words[index++];
      }
    }
    if (str) {
      subtitles.push(str);
    }

    for (let i=subtitles.length; i>0; i--) {
      context.shadowBlur = 2 * scale;
      context.lineWidth = 3 * scale;
      context.fillStyle = "black";
      context.strokeText(subtitles[subtitles.length-i], WIDTH * scale / 2, (HEIGHT-20-i*25) * scale);
      context.fillStyle = "#d4d4d4";
      context.shadowBlur = 0;
      context.fillText(subtitles[subtitles.length-i], WIDTH * scale / 2, (HEIGHT-20-i*25) * scale);
    }
  }
};

const convertGif = (encoder, container, rate, scale, renderBtn, downloadBtn) => {
  
  const canvas = document.createElement("canvas");
  canvas.setAttribute("width", WIDTH * scale);
  canvas.setAttribute("height", HEIGHT * scale);
  const context = canvas.getContext("2d");

  encoder.setRepeat(0);
  encoder.setDelay(100 * rate);
  encoder.setSize(canvas.width, canvas.height);
  encoder.setQuality(20);
  encoder.start();

  let index = 0;

  const addFrame = (callback) => {
    const img = new Image();
    img.src = images[index];
    img.onload = () => {
      setProgressBar(index/images.length);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      fillSubtitle(context, getSubtitle(index), scale);
      encoder.addFrame(context);
      index += rate;
      callback();
    };
  };

  const checkFinish = () => {
    if (index < images.length) {
      addFrame(checkFinish);
    } else {
      encoder.finish();

      const img = document.createElement("img");
      // TODO:
      // some browser does not support base64 encoded images with large size.
      // ... at least it doesnt work on my ipad
      //img.setAttribute("src", `data:image/gif;base64,${btoa(encoder.stream().getData())}`);
      const data = new Uint8Array(encoder.stream().bin);
      blob = new Blob([data], { type: "image/gif" });
      blobURL && window.URL.revokeObjectURL(blobURL);
      blobURL = URL.createObjectURL(blob);

      img.setAttribute("src", blobURL);
      img.setAttribute("alt", "Your browser does not support the size of generated GIF, please configure the GIF into smaller size.");
      container.classList.remove("converting");
      container.innerHTML = "";
      container.appendChild(img);

      renderBtn.disabled = false;
      downloadBtn.disabled = false;
    }
  }

  addFrame(checkFinish);
};

const estimateSize = () => {
  const rateInput = document.querySelector(".options-container input[name=rate]:checked");
  const scaleInput = document.querySelector(".options-container input[name=scale]:checked");
  const fileSizeInput = document.getElementById("file-size");

  const rate = (rateInput.value || 1)-0;
  const scale = scaleInput.value || "1";
  const base = scale === "1" ? 9.9 : (scale === "0.7" ? 5.5 : (scale === "0.5" ? 3.1 : 0));

  const filesize = parseInt(base*10 / rate) / 10;
  fileSizeInput.value = `~${filesize}MB`;
};

document.addEventListener("DOMContentLoaded", (e) => {
  const container = document.getElementById("image-container");
  const renderBtn = document.getElementById("render-button");
  const downloadBtn = document.getElementById("download-button");
  const avatarInputs = document.querySelectorAll(".avatar-container input[type=file]");
  const rateInputs = document.querySelectorAll(".options-container input[name=rate]");
  const scaleInputs = document.querySelectorAll(".options-container input[name=scale]");
  const resetBtns = document.querySelectorAll(".avatar-container button");
  const highRateInput = document.getElementById("high-rate");
  const scale70Input = document.getElementById("scale-70");

  downloadBtn.disabled = true;
  highRateInput.checked = true;
  scale70Input.checked = true;

  estimateSize();

  [...rateInputs].forEach((input) => input.addEventListener("change", estimateSize));
  [...scaleInputs].forEach((input) => input.addEventListener("change", estimateSize));
  [...avatarInputs].forEach((input) => input.addEventListener("change", (e) => {
    try {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = ((f) => {
        const id = e.target.id;
        const img = document.querySelector(`label[for=${id}] img`);
        return (e) => {
          img.setAttribute("src", e.target.result);
          avatar[id] = e.target.result;
        };
      })(file);
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
    }
  }));
  [...resetBtns].forEach((btn) => btn.addEventListener("click", (e) => {
    const id = e.target.getAttribute("for-id");
    const img = document.querySelector(`label[for=${id}] img`);
    img.setAttribute("src", img.getAttribute("data-src"));
    avatar[id] = null;
  }));

  renderBtn.addEventListener("click", (e) => {
    const rateInput = document.querySelector(".options-container input[name=rate]:checked");
    const scaleInput = document.querySelector(".options-container input[name=scale]:checked");
    renderBtn.disabled = true;
    renderProgressBar(container);
    convertGif(new GIFEncoder(), container, (rateInput.value || 1)-0, (scaleInput.value || 1)-0, renderBtn, downloadBtn);
  });
  downloadBtn.addEventListener("click", (e) => {
    if (!!blob) {
      FileSaver.saveAs(blob, "zuckerberg-meme.gif");
    }
  });

  tippy(".subtitle-container, .avatar-container, .options-container", {
    placement: "left",
    arrow: true,
    size: "small",
    distance: 20,
  });
});
