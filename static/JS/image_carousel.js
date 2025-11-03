document.addEventListener('DOMContentLoaded', async function () {
  const mode = localStorage.getItem('carouselMode');  // set this before navigating
  const transaction_uid = localStorage.getItem('transaction_uid');
  const productID = localStorage.getItem('productID');

  if (!productID) {
    alert("Missing product ID");
    return;
}

// Only check for transaction_uid in modes that need it
const backendRequiredModes = ['approveSend', 'receive', 'approveReceive'];
if (backendRequiredModes.includes(mode) && !transaction_uid) {
    alert("Missing transaction UID");
    return;
}

  if (mode === 'send') {
      sendImage_carousel(productID);
  } else if (mode === 'approveSend') {
      approveSendImage_carousel(transaction_uid, productID);
  } else if (mode === 'receive') {
      receiveImage_carousel(transaction_uid, productID);
  } else if (mode === 'approveReceive') {
      approveReceiveImage_carousel(transaction_uid, productID);
  }
});

// 1) SEND (LocalStorage images before submission)
function sendImage_carousel(productID) {
  const key = `send_${productID}`;
  const stored = localStorage.getItem(key);
  console.log('🔍 LocalStorage Key:', key, '| Raw Data:', stored);

  const images = JSON.parse(stored || '[]');
  console.log('🖼️ Parsed Images:', images);

  renderCarousel(images, [], 'Sender Images');
}

// 2) APPROVE SEND (Backend images - already submitted)
async function approveSendImage_carousel(transaction_uid, productID) {
  const response = await fetch(`/get_images/send/${transaction_uid}/${productID}`);
  const data = await response.json();
  const senderImages = data.images || [];
  renderCarousel(senderImages, [], 'Sender Images');
}

// 3) RECEIVE (Combine sender images from backend + receiver images from localStorage)
async function receiveImage_carousel(transaction_uid, productID) {
  const response = await fetch(`/get_images/send/${transaction_uid}/${productID}`);
  const senderImages = (await response.json()).images || [];

  const receiverImages = JSON.parse(localStorage.getItem(`receive_${transaction_uid}_${productID}`)) || [];

  renderCarousel(senderImages, receiverImages, 'Sender & Receiver Images');
}

// 4) APPROVE RECEIVE (Sender: backend | Receiver: localStorage)
async function approveReceiveImage_carousel(transaction_uid, productID) {
  const response = await fetch(`/get_images/send/${transaction_uid}/${productID}`);
  const senderImages = (await response.json()).images || [];

  const receiverImages = JSON.parse(localStorage.getItem(`receive_${transaction_uid}_${productID}`)) || [];

  renderCarousel(senderImages, receiverImages, 'Sender & Receiver Images');
}








function renderCarousel(senderImages, receiverImages, title) {
  const previewRow = document.querySelector('.preview-row');
  const thumbnailBar = document.querySelector('.thumbnail-bar');
  const allImages = [];

  console.log('Sender Images:', senderImages);
  console.log('Receiver Images:', receiverImages);

  senderImages.forEach((src, i) => allImages.push({ src, label: 'Sender' }));
  receiverImages.forEach((src, i) => allImages.push({ src, label: 'Receiver' }));

  let currentIndex = 0;

  function updatePreview() {
      previewRow.innerHTML = '';

      if (allImages.length === 0) {
          previewRow.innerHTML = `<div style="padding: 10px; color: red;">No images available to preview.</div>`;
          return;
      }

      const imageData = allImages[currentIndex];
      console.log(`Showing image index ${currentIndex}:`, imageData);

      const img = document.createElement('img');
      img.src = imageData.src;
      img.alt = `${imageData.label} Image ${currentIndex + 1}`;
      img.classList.add('carousel-image');

      const label = document.createElement('div');
      label.innerText = imageData.label;
      label.className = 'image-label';

      const wrapper = document.createElement('div');
      wrapper.appendChild(img);
      wrapper.appendChild(label);
      previewRow.appendChild(wrapper);
  }

  function renderThumbnails() {
      thumbnailBar.innerHTML = '';

      if (allImages.length === 0) {
          thumbnailBar.innerHTML = `<div style="padding: 10px;">No thumbnails</div>`;
          return;
      }

      allImages.forEach((imgData, i) => {
          const thumb = document.createElement('img');
          thumb.src = imgData.src;
          thumb.classList.add('thumbnail');
          thumb.addEventListener('click', () => {
              currentIndex = i;
              updatePreview();
          });
          thumbnailBar.appendChild(thumb);
      });
  }

  document.querySelector('.prev-btn').onclick = () => {
      if (allImages.length === 0) return;
      currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
      updatePreview();
  };

  document.querySelector('.next-btn').onclick = () => {
      if (allImages.length === 0) return;
      currentIndex = (currentIndex + 1) % allImages.length;
      updatePreview();
  };

  document.querySelector('.back-btn').onclick = () => window.history.back();

  updatePreview();
  renderThumbnails();
}
