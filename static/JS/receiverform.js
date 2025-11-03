let uploadedImages = {}; // Dictionary to track uploaded images
let receiverFormTxnDetails = {};

// Helper function to display floating messages
function floatingMessageBox(message, color = 'green', redirectPage) {
    const existingBox = document.getElementById('floating-message-box');
    if (existingBox) {
        document.body.removeChild(existingBox);
    }
    
    const messageBox = document.createElement('div');
    messageBox.id = 'floating-message-box';
    messageBox.style.position = 'fixed';
    messageBox.style.top = '20px';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translateX(-50%)';
    messageBox.style.backgroundColor = color === 'red' ? '#f44336' : '#4CAF50';
    messageBox.style.color = 'white';
    messageBox.style.padding = '15px 20px';
    messageBox.style.borderRadius = '5px';
    messageBox.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    messageBox.style.zIndex = '9999';
    messageBox.style.maxWidth = '80%';
    messageBox.style.textAlign = 'center';
    messageBox.style.fontSize = '16px';
    messageBox.textContent = message;
    
    document.body.appendChild(messageBox);
    
    setTimeout(() => {
        if (document.body.contains(messageBox)) {
            document.body.removeChild(messageBox);
            if (redirectPage) {
                window.location.href = redirectPage;
            }
        }
    }, 3000);
}

// Helper function to preload an image and ensure it's fresh
function preloadImage(src, callback) {
    console.log('Preloading image:', src);
    // Create new image element
    const img = new Image();
    
    // Set up handlers
    img.onload = function() {
        console.log('Image preloaded successfully:', src);
        if (callback) callback(true, this);
    };
    
    img.onerror = function() {
        console.error('Failed to preload image:', src);
        if (callback) callback(false, this);
    };
    
    // Add cache busting and set source to trigger loading
    const bustCache = src.includes('?') ? src : `${src}?bust=${new Date().getTime()}`;
    img.src = bustCache;
    
    return img;
}

// Force a hard reload of an image
function hardReloadImage(url) {
    return new Promise((resolve, reject) => {
        console.log('Hard reloading image:', url);
        
        // Use XMLHttpRequest to bypass cache completely
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url + (url.includes('?') ? '&' : '?') + 'nocache=' + new Date().getTime(), true);
        xhr.responseType = 'blob';
        
        xhr.onload = function() {
            if (this.status === 200) {
                const blob = this.response;
                const objectURL = URL.createObjectURL(blob);
                console.log('Image reloaded, created object URL:', objectURL);
                
                // Store the objectURL in a global map so we can revoke it later
                if (!window.blobURLs) window.blobURLs = {};
                window.blobURLs[objectURL] = true;
                
                resolve(objectURL);
            } else {
                console.error('Failed to reload image:', this.status);
                reject(new Error('Failed to reload image: ' + this.status));
            }
        };
        
        xhr.onerror = function() {
            console.error('Network error while reloading image');
            reject(new Error('Network error while reloading image'));
        };
        
        xhr.send();
    });
}

// Safe function to create shared thumbnails and main image
function createImageElementsFromSource(source, productId, isValid, uploadStatus = 'none') {
    // Unified handler for creating both thumbnails and main images
    // Returns an object with containers for both
    console.log('Creating image elements from source:', source);
    
    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.style.position = 'relative';
    mainContainer.style.display = 'inline-block';
    
    // Create main image
    const mainImg = document.createElement('img');
    mainImg.src = source;
    mainImg.className = 'main-image';
    mainImg.style.maxWidth = '100%';
    mainImg.style.maxHeight = '75vh';
    mainImg.style.objectFit = 'contain';
    mainImg.style.transition = 'transform 0.3s';
    mainImg.style.cursor = 'zoom-in';
    
    // Error handling for image
    mainImg.onerror = function() {
        console.error('Failed to load image:', source);
        this.onerror = null;
        this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    };
    
    mainContainer.appendChild(mainImg);
    
    // Create thumbnail container
    const thumbContainer = document.createElement('div');
    thumbContainer.style.position = 'relative';
    thumbContainer.style.width = '60px';
    thumbContainer.style.height = '60px';
    thumbContainer.style.marginRight = '8px';
    thumbContainer.style.borderRadius = '4px';
    
    // Create thumbnail image
    const thumbImg = document.createElement('img');
    thumbImg.src = source;
    thumbImg.style.width = '100%';
    thumbImg.style.height = '100%';
    thumbImg.style.objectFit = 'cover';
    thumbImg.style.borderRadius = '4px';
    thumbImg.style.cursor = 'pointer';
    thumbImg.style.transition = 'all 0.2s ease';
    
    // Error handling for thumbnail
    thumbImg.onerror = function() {
        console.error('Failed to load thumbnail:', source);
        this.onerror = null;
        this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    };
    
    thumbContainer.appendChild(thumbImg);
    
    // Add indicator based on upload status
    if (!isValid) {
        // Use purple color (#8a2be2) for the + sign for not-yet-uploaded images
        const indicatorText = uploadStatus === 'none' ? '+' : '❌';
        const indicatorColor = uploadStatus === 'none' ? 'rgba(138, 43, 226, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        
        const indicator = document.createElement('div');
        indicator.textContent = indicatorText;
        indicator.style.position = 'absolute';
        indicator.style.top = '2px';
        indicator.style.right = '2px';
        indicator.style.backgroundColor = indicatorColor;
        indicator.style.color = 'white';
        indicator.style.borderRadius = '50%';
        indicator.style.padding = '2px';
        indicator.style.fontSize = '10px';
        indicator.style.lineHeight = '10px';
        indicator.style.width = '14px';
        indicator.style.height = '14px';
        indicator.style.textAlign = 'center';
        thumbContainer.appendChild(indicator);
        
        // Add appropriate indicator to main image
        if (uploadStatus === 'none') {
            // For not-yet-uploaded images, show plain text "No Image" without button-like appearance
            const mainNoImageText = document.createElement('div');
            mainNoImageText.innerHTML = 'No Image';
            mainNoImageText.style.position = 'absolute';
            mainNoImageText.style.top = '10px';
            mainNoImageText.style.right = '10px';
            mainNoImageText.style.color = 'white';
            mainNoImageText.style.fontSize = '14px';
            mainNoImageText.style.fontWeight = 'bold';
            mainContainer.appendChild(mainNoImageText);
        } else {
            // For invalid images, show the invalid indicator
            const mainInvalidIndicator = document.createElement('div');
            mainInvalidIndicator.innerHTML = '❌ Invalid Image';
            mainInvalidIndicator.style.position = 'absolute';
            mainInvalidIndicator.style.top = '10px';
            mainInvalidIndicator.style.right = '10px';
            mainInvalidIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            mainInvalidIndicator.style.color = 'white';
            mainInvalidIndicator.style.padding = '5px 10px';
            mainInvalidIndicator.style.borderRadius = '4px';
            mainInvalidIndicator.style.fontSize = '14px';
            mainInvalidIndicator.style.fontWeight = 'bold';
            mainContainer.appendChild(mainInvalidIndicator);
        }
    }
    
    return {
        mainContainer: mainContainer,
        mainImage: mainImg,
        thumbContainer: thumbContainer,
        thumbImage: thumbImg
    };
}

// Function to check if the user is on a mobile device
function isMobileDevice() {
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

// Function to log row values and send them to the server
function logRowValues() {
    // Images are optional; do not block submission based on images
    var hasInvalidImages = false;
    var imagesMissing = false;
    var table = document.getElementById('mainTable');
    var rows = table.querySelectorAll('tr');
    
    rows.forEach(function(row, index) {
        if (index !== 0) { // Skip header row
            // Get checkbox status
            var cells = row.querySelectorAll('td');
            var checkbox = cells[0].querySelector('input[type="checkbox"]');
            const productId = row.getAttribute('data-product-id');
            
            // Only check selected items (checked boxes)
            if (checkbox && checkbox.checked) {
                // Check if this item has an image uploaded
                if (!uploadedImages[productId]) {
                    imagesMissing = true;
                } else if (!uploadedImages[productId].valid) {
                    // Image exists but is invalid
                    hasInvalidImages = true;
                }
            }
        }
    });
    
    // Do not block submission if images are missing or invalid
    
    // Proceed with form submission if all validations pass
    var formObject = [];
    var formNoLabel = document.getElementById('formNo');
    var formNoValue = formNoLabel.innerText;

    var formNoData = {
        Transaction_uid: formNoValue
    };
    formObject.push(formNoData);

    rows.forEach(function(row, index) {
        if (index !== 0) {
            var cells = row.querySelectorAll('td');
            const productId = row.getAttribute('data-product-id');
            var checkbox = cells[0].querySelector('input[type="checkbox"]');

            // Only submit rows that the receiver explicitly selected (approved)
            if (!checkbox || !checkbox.checked) {
                return; // leave unselected items as pending (item_status remains NULL)
            }

            var conditionSelect = cells[11].querySelector('select[name="conditionReceiver"]');
            var selectedCondition = conditionSelect ? conditionSelect.value : '';
            var productSerial = cells[7].innerText;
            var receiverRemarksInput = cells[12].querySelector('input[type="text"]');
            var receiverRemarks = receiverRemarksInput ? receiverRemarksInput.value : '';

            var set = cells[2].innerText;
            var category = cells[3].innerText;
            var productname = cells[4].innerText;
            var make = cells[5].innerText;
            var model = cells[6].innerText;
            var serialNo = cells[1].innerText;

            const imageExt = uploadedImages[productId] ? uploadedImages[productId].ext : "";

            var rowData = {
                SerialNo: serialNo,
                ReceiverCondition: selectedCondition,
                ReceiverRemark: receiverRemarks,
                ItemStatus: '1', // explicitly approved
                Reached: true,
                productname: productname,
                set: set,
                Category: category,
                Make: make,
                Model: model,
                ProductSerial: productSerial,
                ProductID: productId,
                ReceiverImage: imageExt
            };

            formObject.push(rowData);
        }
    });

    console.log("📋 Full formObject with item-level processing:", formObject);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/receive_approval_request", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                console.log("✅ IMS /receive_approval_request success:", xhr.responseText);
                
                // Check if there are any remaining pending items
                var hasPendingItems = false;
                rows.forEach(function(row, index) {
                    if (index !== 0) {
                        var cells = row.querySelectorAll('td');
                        var checkbox = cells[0].querySelector('input[type="checkbox"]');
                        if (checkbox && !checkbox.checked) {
                            hasPendingItems = true;
                        }
                    }
                });
                
                floatingMessageBox("Approval done", "green", "receivertable");

                // ✅ Notify Telegram Bot (Receiver notification - Stage 3.1)
                const transaction_uid = formObject.find(obj => obj.Transaction_uid)?.Transaction_uid || "";
                console.log("🆔 Extracted Transaction_uid:", transaction_uid);

                // Get DestinationName from receiverFormTxnDetails
                const destinationName = receiverFormTxnDetails.DestinationName || "";

                console.log("📤 Preparing to notify Telegram bot (Receiver - Stage 3.1)");
                console.log("📦 Payload to Bot:", { Transaction_uid: transaction_uid, DestinationName: destinationName });

                fetch("http://localhost:3000/api/notify/receiver", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ 
                        Transaction_uid: transaction_uid, 
                        DestinationName: destinationName 
                    })
                })
                    .then(res => {
                        console.log("📥 Response status from Telegram bot:", res.status);
                        return res.json();
                    })
                    .then(botRes => {
                        console.log("✅ Receiver webhook sent to Telegram bot:", botRes);
                    })
                    .catch(err => {
                        console.warn("⚠️ Failed to notify Telegram bot (receiver):", err.message);
                    });

            } else {
                console.error("❌ Error in /receive_approval_request:", xhr.status);
                floatingMessageBox("Failed to send approval request. Please try again later.", "red");
            }
        }
    };
    xhr.onerror = function() {
        console.error('Network Error');
        floatingMessageBox("Network error. Please check your connection and try again.", 'red');
    };

    xhr.send(JSON.stringify(formObject));
}




// Function to initialize the table and event listeners
function initializeTable(data) {
    console.log("[DEBUG] initializeTable called with data:", data);
    var table = document.getElementById("mainTable");
    
    if (!table) {
        console.error("[ERROR] Table with id 'mainTable' not found!");
        return;
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error("[ERROR] No data provided to initializeTable or data is empty");
        return;
    }
    
    console.log("[DEBUG] Initializing table with", data.length, "rows");

    data.forEach(function(row, index) {
        var newRow = table.insertRow();

        var reachedCell = newRow.insertCell(0);
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `checkbox_${index}`;
        reachedCell.appendChild(checkbox);

        var serialNoCell = newRow.insertCell(1);
        serialNoCell.textContent = index + 1;
        

        var productsetCell = newRow.insertCell(2);
        productsetCell.textContent = row['set'];


        var productCategoryCell = newRow.insertCell(3);
        productCategoryCell.textContent = row['Category'];

        var productNameCell = newRow.insertCell(4);
        productNameCell.textContent = row['Name'];

        var makeCell = newRow.insertCell(5);
        makeCell.textContent = row['Make'];

        var modelCell = newRow.insertCell(6);
        modelCell.textContent = row['Model'];

        var productSerialCell = newRow.insertCell(7);
        productSerialCell.textContent = row['ProductSerial'];

        // Add Sender Condition (mapped to text)
        var senderConditionCell = newRow.insertCell(8);
        senderConditionCell.textContent = getConditionText(row['SenderCondition']);

        // Add Sender Remark
        var senderRemarkCell = newRow.insertCell(9);
        senderRemarkCell.textContent = row['SenderRemark'] || '-';

        // Add Sender Image Cell
        var senderImageCell = newRow.insertCell(10);
        var senderExt = row['SenderImage'];
        if (senderExt && senderExt !== "-") {
            senderImageCell.innerHTML = `<span style="color: green; font-size: 20px; cursor: pointer;">✅</span>`;
            senderImageCell.style.cursor = 'pointer';
            senderImageCell.addEventListener('click', () => {
                OpenCarousel(row['ProductID'], 'sender');
            });
        } else {
            senderImageCell.innerHTML = `<span style="color: red; font-size: 20px;">❌</span>`;
        }

        // Shift the rest of the cells (ReceiverCondition, ReceiverRemark, ReceiverImage) to the right
        var conditionReceiverCell = newRow.insertCell(11);
        conditionReceiverCell.innerHTML = ` 
            <select id="conditionReceiver_${index}" name="conditionReceiver">
                <option value="">Select</option>
                <option value="0">Good</option>
                <option value="1">Not OK</option>
                <option value="2">Damaged</option>
            </select>
        `;

        var remarksReceiverCell = newRow.insertCell(12);  
        remarksReceiverCell.innerHTML = `
            <input id="remarksReceiver_${index}" type="text" name="remarksReceiver">
        `;

        
        var imageReceiverCell = newRow.insertCell(13);
        imageReceiverCell.style.cursor = 'pointer'; // Make cell show pointer cursor
        newRow.setAttribute('data-product-id', row['ProductID']);
        var productIdReceiver = row['ProductID'];
        console.log("[DEBUG] Product ID being used for receiver upload:", productIdReceiver);
        
        // Ensure we have a valid product ID
        if (!productIdReceiver) {
            console.error("[ERROR] No ProductID found for row:", row);
            return;
        }
        
        // Create + icon div for triggering upload and showing status
        var clickReceiverPhotoBtn = document.createElement('div');
        clickReceiverPhotoBtn.textContent = uploadedImages[productIdReceiver] && uploadedImages[productIdReceiver].valid ? '✅' : '+';
        clickReceiverPhotoBtn.classList.add('click-photo-icon');
        clickReceiverPhotoBtn.setAttribute('data-product-id', productIdReceiver);
        clickReceiverPhotoBtn.style.cursor = 'pointer';
        clickReceiverPhotoBtn.style.fontSize = '24px';
        clickReceiverPhotoBtn.style.color = uploadedImages[productIdReceiver] ? 
            (uploadedImages[productIdReceiver].valid ? 'green' : 'red') : 
            'rgba(138, 43, 226, 0.8)'; // Purple color for not-yet-uploaded images
        clickReceiverPhotoBtn.style.fontWeight = 'bold';
        clickReceiverPhotoBtn.style.display = 'inline-block';
        clickReceiverPhotoBtn.style.width = '40px';
        clickReceiverPhotoBtn.style.height = '40px';
        clickReceiverPhotoBtn.style.textAlign = 'center';
        clickReceiverPhotoBtn.style.lineHeight = '40px';
        clickReceiverPhotoBtn.style.border = '2px solid rgba(138, 43, 226, 0.3)';
        clickReceiverPhotoBtn.style.borderRadius = '5px';
        clickReceiverPhotoBtn.style.backgroundColor = uploadedImages[productIdReceiver] ? 
            (uploadedImages[productIdReceiver].valid ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)') : 
            'rgba(138, 43, 226, 0.1)';
        
        console.log("[DEBUG] Created receiver upload button for product:", productIdReceiver);
        
        // Add tooltip based on current state
        if (!uploadedImages[productIdReceiver]) {
            clickReceiverPhotoBtn.title = "Click to upload image";
        } else if (uploadedImages[productIdReceiver].valid) {
            clickReceiverPhotoBtn.title = "Image uploaded successfully. Click to view.";
        } else {
            clickReceiverPhotoBtn.title = "Invalid image. Click to view and re-upload.";
        }
        
        // Hidden file input
        var receiverFileInput = document.createElement('input');
        receiverFileInput.type = 'file';
        receiverFileInput.accept = 'image/*';
        receiverFileInput.capture = 'environment';
        receiverFileInput.style.display = 'none';
        receiverFileInput.classList.add('capture-photo-input');
        receiverFileInput.setAttribute('data-product-id', productIdReceiver);
        
        // Append elements
        imageReceiverCell.appendChild(clickReceiverPhotoBtn);
        imageReceiverCell.appendChild(receiverFileInput);
        
        // Check if image has already been uploaded
        if (uploadedImages[productIdReceiver]) {
            // Image already uploaded - clicking will open carousel
            const isValid = uploadedImages[productIdReceiver].valid === true;
            
            // Update the button appearance
            clickReceiverPhotoBtn.textContent = isValid ? '✅' : '❌';
            clickReceiverPhotoBtn.style.color = isValid ? 'green' : 'red';
            clickReceiverPhotoBtn.title = "Click to view image. Re-uploads can only be done from the carousel view.";
            
            // Add click handler to open carousel
            imageReceiverCell.style.cursor = 'pointer';
            imageReceiverCell.addEventListener('click', function() {
                OpenCarousel(productIdReceiver, 'receiver');
            });
            
            // Disable further uploads from main page
            receiverFileInput.disabled = true;
        } else {
            // No image uploaded yet - allow initial upload from main page
            clickReceiverPhotoBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                receiverFileInput.click();
            });

            // Add cell click handler for initial upload
            imageReceiverCell.addEventListener('click', function(e) {
                // Only handle cell clicks, not button clicks
                if (e.target === imageReceiverCell) {
                    receiverFileInput.click();
                }
            });
            
            // Set up file input change handler
            receiverFileInput.addEventListener('change', function (event) {
                const file = event.target.files[0];
                if (!file) return;
                handleImageUpload(productIdReceiver, file);
            });
        }
        
        // Add event listener for checkbox
        checkbox.addEventListener('change', function() {
            var isChecked = checkbox.checked;
            var selectElement = document.getElementById(`conditionReceiver_${index}`);
            var inputElement = document.getElementById(`remarksReceiver_${index}`);
            if (selectElement && inputElement) {
                if (isChecked) {
                    selectElement.removeAttribute('disabled');
                } else {
                    selectElement.setAttribute('disabled', 'disabled');
                }
            } else {
                console.error('Select or input element not found.');
            }
        });
    });
}



function handleImageUpload(itemId, imageFile) {
    console.log("handleImageUpload called with itemId:", itemId);
  
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('product_id', itemId);
  
    const statusBtn = document.querySelector(`.click-photo-icon[data-product-id="${itemId}"]`);
    const cell = statusBtn ? statusBtn.closest('td') : null;
    
    if (statusBtn) {
        statusBtn.textContent = '0%';
        statusBtn.style.color = 'blue';
    }
  
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/validate_image', true);
  
    xhr.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable && statusBtn) {
            const percent = Math.round((e.loaded / e.total) * 100);
            statusBtn.textContent = `${percent}%`;
            statusBtn.style.color = 'blue';
        }
    });
  
    xhr.onload = function () {
        if (xhr.status === 200) {
            let result;
            try {
                result = JSON.parse(xhr.responseText);
            } catch (err) {
                console.error('Invalid JSON:', xhr.responseText);
                if (statusBtn) {
                    statusBtn.textContent = '❌';
                    statusBtn.style.color = 'red';
                    statusBtn.style.cursor = 'pointer';
                }
                uploadedImages[itemId] = { 
                    valid: false, 
                    uploadStatus: 'failed',
                    message: 'Invalid server response'
                };
                
                // Add click event to open carousel even for failed uploads
                if (statusBtn) {
                    // Replace with new button to clear event listeners
                    const newStatusBtn = statusBtn.cloneNode(true);
                    statusBtn.parentNode.replaceChild(newStatusBtn, statusBtn);
                    
                    newStatusBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        OpenCarousel(itemId, 'receiver');
                    });
                    
                    // Add tooltip for clarity
                    newStatusBtn.title = "Invalid image. Click to view and re-upload.";
                }
                
                // Disable the file input to prevent re-uploads from main page
                const fileInput = document.querySelector(`.capture-photo-input[data-product-id="${itemId}"]`);
                if (fileInput) {
                    fileInput.disabled = true;
                }
                
                // Add click event to the entire cell for carousel
                if (cell) {
                    // Clear any existing click handlers by cloning and replacing
                    const newCell = cell.cloneNode(true);
                    cell.parentNode.replaceChild(newCell, cell);
                    
                    // Add new click handler
                    newCell.style.cursor = 'pointer';
                    newCell.addEventListener('click', function() {
                        OpenCarousel(itemId, 'receiver');
                    });
                }
                
                return;
            }
  
            if (result.status === 'success') {
                uploadedImages[itemId] = {
                    ext: result.ext,
                    name: result.name,
                    valid: result.is_valid || false,
                    uploadStatus: result.is_valid ? 'success' : 'failed',
                    message: result.message || ''
                };
                
                if (statusBtn) {
                    // Update button appearance based on validation
                    statusBtn.textContent = result.is_valid ? '✅' : '❌';
                    statusBtn.style.color = result.is_valid ? 'green' : 'red';
                    statusBtn.style.cursor = 'pointer';
                    
                    // Replace button to clear event listeners
                    const newStatusBtn = statusBtn.cloneNode(true);
                    statusBtn.parentNode.replaceChild(newStatusBtn, statusBtn);
                    
                    // Add new click event listener for carousel
                    newStatusBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        OpenCarousel(itemId, 'receiver');
                    });
                    
                    // Add tooltip for clarity
                    newStatusBtn.title = result.is_valid ? 
                        "Image uploaded successfully. Click to view." : 
                        "Invalid image. Click to view and re-upload.";
                }
                
                // Disable the file input to prevent re-uploads from main page
                const fileInput = document.querySelector(`.capture-photo-input[data-product-id="${itemId}"]`);
                if (fileInput) {
                    fileInput.disabled = true;
                }
                
                // Add click event to the entire cell for carousel
                if (cell) {
                    // Clear any existing click handlers
                    const newCell = cell.cloneNode(true);
                    cell.parentNode.replaceChild(newCell, cell);
                    
                    // Add new click handler
                    newCell.style.cursor = 'pointer';
                    newCell.addEventListener('click', function() {
                        OpenCarousel(itemId, 'receiver');
                    });
                }
            } else {
                uploadedImages[itemId] = { 
                    ext: result.ext,
                    name: result.name,
                    valid: false,
                    uploadStatus: 'failed',
                    message: result.message || 'Image validation failed'
                };
                
                if (statusBtn) {
                    statusBtn.textContent = '❌';
                    statusBtn.style.color = 'red';
                    statusBtn.style.cursor = 'pointer';
                    
                    // Replace button to clear event listeners
                    const newStatusBtn = statusBtn.cloneNode(true);
                    statusBtn.parentNode.replaceChild(newStatusBtn, statusBtn);
                    
                    // Add new click event listener for carousel
                    newStatusBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        OpenCarousel(itemId, 'receiver');
                    });
                    
                    // Add tooltip for clarity
                    newStatusBtn.title = "Invalid image. Click to view and re-upload.";
                }
                
                // Disable the file input to prevent re-uploads from main page
                const fileInput = document.querySelector(`.capture-photo-input[data-product-id="${itemId}"]`);
                if (fileInput) {
                    fileInput.disabled = true;
                }
                
                // Add click event to the entire cell for carousel
                if (cell) {
                    // Clear any existing click handlers
                    const newCell = cell.cloneNode(true);
                    cell.parentNode.replaceChild(newCell, cell);
                    
                    // Add new click handler
                    newCell.style.cursor = 'pointer';
                    newCell.addEventListener('click', function() {
                        OpenCarousel(itemId, 'receiver');
                    });
                }
            }
        } else {
            console.error('Upload failed with status:', xhr.status);
            uploadedImages[itemId] = { 
                valid: false, 
                uploadStatus: 'failed',
                message: `Server error: ${xhr.status}`
            };
            if (statusBtn) {
                statusBtn.textContent = '❌';
                statusBtn.style.color = 'red';
                statusBtn.style.cursor = 'pointer';
                
                // Replace button to clear event listeners
                const newStatusBtn = statusBtn.cloneNode(true);
                statusBtn.parentNode.replaceChild(newStatusBtn, statusBtn);
                
                // Add new click event listener for carousel
                newStatusBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    OpenCarousel(itemId, 'receiver');
                });
                
                // Add tooltip for clarity
                newStatusBtn.title = "Invalid image. Click to view and re-upload.";
            }
            
            // Disable the file input to prevent re-uploads from main page
            const fileInput = document.querySelector(`.capture-photo-input[data-product-id="${itemId}"]`);
            if (fileInput) {
                fileInput.disabled = true;
            }
            
            // Add click event to the entire cell for carousel
            if (cell) {
                // Clear any existing click handlers
                const newCell = cell.cloneNode(true);
                cell.parentNode.replaceChild(newCell, cell);
                
                // Add new click handler
                newCell.style.cursor = 'pointer';
                newCell.addEventListener('click', function() {
                    OpenCarousel(itemId, 'receiver');
                });
            }
        }
    };
  
    xhr.onerror = function () {
        console.error('Network error during upload');
        uploadedImages[itemId] = { 
            valid: false,
            uploadStatus: 'failed',
            message: 'Network error during upload'
        };
        if (statusBtn) {
            statusBtn.textContent = '❌';
            statusBtn.style.color = 'red';
            statusBtn.style.cursor = 'pointer';
            
            // Replace button to clear event listeners
            const newStatusBtn = statusBtn.cloneNode(true);
            statusBtn.parentNode.replaceChild(newStatusBtn, statusBtn);
            
            // Add new click event listener for carousel
            newStatusBtn.addEventListener('click', function(e) {
                e.preventDefault();
                OpenCarousel(itemId, 'receiver');
            });
            
            // Add tooltip for clarity
            newStatusBtn.title = "Invalid image. Click to view and re-upload.";
        }
        
        // Disable the file input to prevent re-uploads from main page
        const fileInput = document.querySelector(`.capture-photo-input[data-product-id="${itemId}"]`);
        if (fileInput) {
            fileInput.disabled = true;
        }
        
        // Add click event to the entire cell for carousel
        if (cell) {
            // Clear any existing click handlers
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
            
            // Add new click handler
            newCell.style.cursor = 'pointer';
            newCell.addEventListener('click', function() {
                OpenCarousel(itemId, 'receiver');
            });
        }
    };
  
    xhr.send(formData);
}
  
    

// Function to load and populate form data
function loadFormData() {
    // Get transaction_uid from URL
    const pathParts = window.location.pathname.split('/');
    const transaction_uid = pathParts[pathParts.length - 1];
    
    // If we're at the base URL without a transaction_uid, redirect to the table
    if (window.location.pathname === '/receive_form_data') {
        window.location.href = '/receive_table';
        return;
    }

    // --- Fix: Always refresh backend data before fetching form data ---
    console.log('[DEBUG] Sending /receive_Transaction_uid to refresh backend data for:', transaction_uid);
    var xhr1 = new XMLHttpRequest();
    xhr1.open("GET", "/receive_Transaction_uid?transaction_uid=" + transaction_uid, true);
    xhr1.onreadystatechange = function() {
        if (xhr1.readyState === XMLHttpRequest.DONE) {
            console.log('[DEBUG] /receive_Transaction_uid response:', xhr1.status, xhr1.responseText);
            // Now fetch the actual form data
            fetchFormData(transaction_uid);
        }
    };
    xhr1.send();
}

function fetchFormData(transaction_uid) {
    console.log("[DEBUG] Loading form data for transaction_uid:", transaction_uid); // Debug log
    
    // Clear any existing table data first
    var table = document.getElementById("mainTable");
    if (table) {
        console.log("[DEBUG] Clearing existing table data");
        // Remove all rows except header
        var rows = table.querySelectorAll('tr');
        for (var i = rows.length - 1; i > 0; i--) {
            table.deleteRow(i);
        }
    } else {
        console.error("[ERROR] Table with id 'mainTable' not found during fetchFormData!");
        return;
    }
    
    var xhr2 = new XMLHttpRequest();
    // Add cache-busting parameter to ensure fresh data
    var cacheBuster = new Date().getTime();
    xhr2.open("GET", "/get_form_data?transaction_uid=" + transaction_uid + "&_t=" + cacheBuster, true);
    // Add headers to prevent caching
    xhr2.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    xhr2.setRequestHeader("Pragma", "no-cache");
    xhr2.setRequestHeader("Expires", "0");
    xhr2.onreadystatechange = function() {
        if (xhr2.readyState === 4) {
            if (xhr2.status === 200) {
                try {
                    var data = JSON.parse(xhr2.responseText);
                    console.log("[DEBUG] Parsed form data:", data);

                    const transactionDetails = data.transaction_details || [];
                    const formMeta = transactionDetails[0] || {};
                    receiverFormTxnDetails = formMeta || {};
                    console.log("[DEBUG] receiverFormTxnDetails set:", receiverFormTxnDetails);

                    // --- Approval status logic for receive form ---
                    const isReceiveStatus = formMeta['IsReceive'];
                    console.log('[DEBUG] IsReceive raw value:', isReceiveStatus, 'Type:', typeof isReceiveStatus);
                    const approveBtn = document.getElementById('ask-approval-button');
                    const disapproveBtn = document.getElementById('disapproveButton');

                    // Normalize isReceiveStatus to integer for robust comparison
                    let isReceiveNormalized = 0;
                    if (isReceiveStatus === undefined || isReceiveStatus === null || isReceiveStatus === '-' || isReceiveStatus === '') {
                        isReceiveNormalized = 0;
                    } else if (typeof isReceiveStatus === 'string' && !isNaN(parseInt(isReceiveStatus))) {
                        isReceiveNormalized = parseInt(isReceiveStatus);
                    } else if (typeof isReceiveStatus === 'number') {
                        isReceiveNormalized = isReceiveStatus;
                    }
                    console.log('[DEBUG] IsReceive normalized value:', isReceiveNormalized, 'Type:', typeof isReceiveNormalized);

                    if (isReceiveNormalized === 1) {
                        console.log('[DEBUG] Form already approved by receiver. Disabling buttons.');
                        approveBtn.disabled = true;
                        disapproveBtn.disabled = true;
                        floatingMessageBox("This form has already been approved by the receiver.", 'green', 'receivertable');
                    } else if (isReceiveNormalized === 2) {
                        console.log('[DEBUG] Form already disapproved by receiver. Disabling buttons.');
                        approveBtn.disabled = true;
                        disapproveBtn.disabled = true;
                        floatingMessageBox("This form has already been disapproved by the receiver.", 'red', 'receivertable');
                    } else {
                        console.log('[DEBUG] Form is pending. Buttons enabled.');
                    }

                    const products = data.transaction_product_details;
                    console.log("[DEBUG] Products returned from server:", products);
                    console.log("[DEBUG] Number of products:", products ? products.length : 0);

                    if (formMeta && products && Array.isArray(products)) {
                        // Check if there are any pending items to process
                        if (products.length === 0) {
                            // No pending items - show message and redirect
                            console.log("[DEBUG] No pending items found - redirecting");
                            floatingMessageBox("No pending items found for this transaction. All items have been processed.", 'brown', 'receivertable');
                            return;
                        }
                        
                        const initiationDateTime = formMeta['InitiationDate'];
                        const initiationDate = initiationDateTime ? initiationDateTime.split(' ')[0] : 'Loading Initiation Date ...';
                        const ewayreason = formMeta['ewayreason'];

                        document.getElementById("formNo").textContent = formMeta['Transaction_uid'] || 'Loading Form ID ...';
                        document.getElementById("ewaybillno").textContent = formMeta['EwayBillNo'] || 'Loading Eway Bill No ...';
                        document.getElementById("Sender").textContent = formMeta['SenderName'] || 'Loading From Person ...';
                        document.getElementById("Source").textContent = formMeta['SourceName'] || '';
                        document.getElementById("Receiver").textContent = formMeta['ReceiverName'] || 'Loading To Person ...';
                        document.getElementById("Destination").textContent = formMeta['DestinationName'] || '';
                        document.getElementById("InitiationDate").textContent = initiationDate;
                        document.getElementById("ewaybillreasondatatd").textContent = ewayreason;
                        // Set Sender Manager and Receiver Manager from project_managers
                        if (data.project_managers && Array.isArray(data.project_managers)) {
                            // Get source and destination values
                            var sourceValue = formMeta['Source'] || '';
                            var destinationValue = formMeta['Destination'] || '';
                            // Find the corresponding manager entries based on source and destination
                            var senderManagerName = '';
                            var receiverManagerName = '';
                            // Look through project_managers to find the manager names directly
                            for (var i = 0; i < data.project_managers.length; i++) {
                                var projectManager = data.project_managers[i];
                                console.log("[DEBUG] Comparing project_id:", projectManager.project_id, "with source:", sourceValue, "and destination:", destinationValue);
                                
                                // Compare using project_id instead of Projects text
                                if (String(projectManager.project_id) === String(sourceValue)) {
                                    senderManagerName = projectManager.ManagerName || projectManager.Manager;
                                    console.log("[DEBUG] Matched sender manager:", senderManagerName);
                                }
                                if (String(projectManager.project_id) === String(destinationValue)) {
                                    receiverManagerName = projectManager.ManagerName || projectManager.Manager;
                                    console.log("[DEBUG] Matched receiver manager:", receiverManagerName);
                                }
                            }
                            // Set the manager names directly
                            document.getElementById("Sender-manager").textContent = senderManagerName || 'Manager not available';
                            document.getElementById("Receiver-manager").textContent = receiverManagerName || 'Manager not available';
                        } else {
                            console.error("No project manager data available");
                        }
                        if (ewayreason === "-") {
                            document.getElementById("ewaybillreason").style.display = "none";
                        }
                        // Load the table with product details
                        initializeTable(products);
                    } else {
                        console.error("Invalid data format received");
                        floatingMessageBox("Failed to load form data. Please try again later.", 'red');
                    }
                } catch (e) {
                    console.error('[DEBUG] Error parsing JSON response:', e);
                    floatingMessageBox("Failed to load form data. Please try again later.", 'red');
                }
            }
        }
    };
    xhr2.onerror = function() {
        console.error('[DEBUG] Network Error');
        floatingMessageBox("Network error. Please check your connection and try again.", 'red');
    };
    xhr2.send();
}

// Event listener for the approval button
var askApprovalButton = document.getElementById("ask-approval-button");
askApprovalButton.addEventListener('click', function() {
    var checkboxes = document.querySelectorAll('[id^="checkbox_"]');
    var atLeastOneChecked = false;
    var allConditionsSelected = true;

    checkboxes.forEach(function(checkbox, index) {
        var selectElement = document.getElementById(`conditionReceiver_${index}`);
        if (checkbox.checked) {
            atLeastOneChecked = true;
            if (selectElement && selectElement.value === "") {
                floatingMessageBox("Please select a condition for the selected items", 'red');
                allConditionsSelected = false;
                return;
            }
        }
        // Removed validation for unchecked items - they will be automatically disapproved
    });

    if (!atLeastOneChecked) {
        floatingMessageBox("Please select at least one item", 'red');
    } else if (atLeastOneChecked && allConditionsSelected) {
        logRowValues();
    }
});

// Load form data on window load
window.onload = loadFormData;

// Fallback function to manually initialize upload buttons if they're missing
function ensureUploadButtonsVisible() {
    console.log("[DEBUG] Checking for missing upload buttons...");
    
    var table = document.getElementById("mainTable");
    if (!table) {
        console.error("[ERROR] Table not found in ensureUploadButtonsVisible");
        return;
    }
    
    var rows = table.querySelectorAll('tbody tr');
    console.log("[DEBUG] Found", rows.length, "data rows in table");
    
    rows.forEach(function(row, index) {
        var cells = row.querySelectorAll('td');
        if (cells.length >= 14) { // Ensure we have enough columns
            var imageReceiverCell = cells[13]; // 14th column (0-indexed)
            
            // Check if upload button already exists
            var existingButton = imageReceiverCell.querySelector('.click-photo-icon');
            if (!existingButton) {
                console.log("[DEBUG] Adding missing upload button for row", index);
                
                // Get product ID from row
                var productId = row.getAttribute('data-product-id');
                if (!productId) {
                    // Try to extract from other cells if needed
                    var productSerialCell = cells[7]; // Product Serial column
                    productId = productSerialCell ? productSerialCell.textContent.trim() : 'unknown_' + index;
                    row.setAttribute('data-product-id', productId);
                }
                
                // Create upload button
                var clickReceiverPhotoBtn = document.createElement('div');
                clickReceiverPhotoBtn.textContent = '+';
                clickReceiverPhotoBtn.classList.add('click-photo-icon');
                clickReceiverPhotoBtn.setAttribute('data-product-id', productId);
                clickReceiverPhotoBtn.style.cursor = 'pointer';
                clickReceiverPhotoBtn.style.fontSize = '24px';
                clickReceiverPhotoBtn.style.color = 'rgba(138, 43, 226, 0.8)';
                clickReceiverPhotoBtn.style.fontWeight = 'bold';
                clickReceiverPhotoBtn.style.display = 'inline-block';
                clickReceiverPhotoBtn.style.width = '40px';
                clickReceiverPhotoBtn.style.height = '40px';
                clickReceiverPhotoBtn.style.textAlign = 'center';
                clickReceiverPhotoBtn.style.lineHeight = '40px';
                clickReceiverPhotoBtn.style.border = '2px solid rgba(138, 43, 226, 0.3)';
                clickReceiverPhotoBtn.style.borderRadius = '5px';
                clickReceiverPhotoBtn.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                clickReceiverPhotoBtn.title = "Click to upload image";
                
                // Create file input
                var receiverFileInput = document.createElement('input');
                receiverFileInput.type = 'file';
                receiverFileInput.accept = 'image/*';
                receiverFileInput.capture = 'environment';
                receiverFileInput.style.display = 'none';
                receiverFileInput.classList.add('capture-photo-input');
                receiverFileInput.setAttribute('data-product-id', productId);
                
                // Add event listeners
                clickReceiverPhotoBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    receiverFileInput.click();
                });
                
                receiverFileInput.addEventListener('change', function (event) {
                    const file = event.target.files[0];
                    if (!file) return;
                    handleImageUpload(productId, file);
                });
                
                // Append to cell
                imageReceiverCell.innerHTML = '';
                imageReceiverCell.appendChild(clickReceiverPhotoBtn);
                imageReceiverCell.appendChild(receiverFileInput);
                imageReceiverCell.style.cursor = 'pointer';
                
                console.log("[DEBUG] Successfully added upload button for product:", productId);
            }
        }
    });
}

// Call the fallback function after a short delay to ensure DOM is ready
setTimeout(ensureUploadButtonsVisible, 1000);

// Debug function to show current state
function showDebugInfo() {
    var debugPanel = document.getElementById('debugPanel');
    var debugContent = document.getElementById('debugContent');
    
    if (!debugPanel || !debugContent) return;
    
    var table = document.getElementById("mainTable");
    var rows = table ? table.querySelectorAll('tbody tr') : [];
    var uploadButtons = document.querySelectorAll('.click-photo-icon');
    
    var info = `
        <div><strong>Table Status:</strong> ${table ? 'Found' : 'NOT FOUND'}</div>
        <div><strong>Data Rows:</strong> ${rows.length}</div>
        <div><strong>Upload Buttons:</strong> ${uploadButtons.length}</div>
        <div><strong>Window Location:</strong> ${window.location.pathname}</div>
        <div><strong>Current Time:</strong> ${new Date().toLocaleTimeString()}</div>
    `;
    
    debugContent.innerHTML = info;
    debugPanel.style.display = 'block';
}

// Show debug info after 2 seconds
setTimeout(showDebugInfo, 2000);

// Disapprove only selected items
var disapproveButton = document.getElementById("disapproveButton");
disapproveButton.addEventListener("click", function (event) {
	const remarksContainer = document.getElementById("remarksContainer");
	remarksContainer.style.display = "flex";

	const remarksInput = document.getElementById("disapproveremarks");
	remarksInput.required = true;

	// Collect selected ProductIDs
	const rows = document.querySelectorAll('#mainTable tr');
	const selectedProductIds = [];
	rows.forEach((row, idx) => {
		if (idx === 0) return; // header
		const cells = row.querySelectorAll('td');
		const checkbox = cells[0].querySelector('input[type="checkbox"]');
		if (checkbox && checkbox.checked) {
			const pid = row.getAttribute('data-product-id');
			if (pid) selectedProductIds.push(pid);
		}
	});

	if (selectedProductIds.length === 0) {
		floatingMessageBox("Select at least one item to disapprove.", "red");
		return;
	}

	const remarksValue = remarksInput.value.trim();
	if (!remarksValue) {
		floatingMessageBox("Please provide a reason for disapproval.", "red");
		return;
	}

	// Disable approve to avoid conflicts
	const approveBtn = document.getElementById("ask-approval-button");
	approveBtn.disabled = true;
	approveBtn.style.backgroundColor = "#808080";

	const formNo = document.getElementById("formNo").textContent.trim();

	const xhr = new XMLHttpRequest();
	xhr.open("POST", "/disapprove_receive_approval_request", true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				floatingMessageBox("Selected items disapproved", "green", "receivertable");
			} else {
				floatingMessageBox("Failed to disapprove items. Try again.", "red");
			}
		}
	};
	xhr.send(JSON.stringify({
		Transaction_uid: formNo,
		remarks: remarksValue,
		product_ids: selectedProductIds
	}));
});



// Function to open carousel for sender or receiver images
function OpenCarousel(productId, mode) {
    // Clear any cached images first
    if (typeof caches !== 'undefined') {
        caches.keys().then(function(names) {
            for (let name of names) {
                caches.delete(name);
            }
        });
    }
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'imageCarouselModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    // Get the transaction ID from the form
    const formNo = document.getElementById('formNo').textContent;

    // Initialize images array based on mode
    let images = [];
    if (mode === 'sender') {
        // For sender images - get all product IDs from the table
        const productIds = [];
        const table = document.getElementById('mainTable');
        const rows = table.querySelectorAll('tr');
        
        rows.forEach((row, index) => {
            if (index !== 0) { // Skip header row
                const pid = row.getAttribute('data-product-id');
                if (pid) {
                    productIds.push(pid);
                }
            }
        });

        // Create image objects for all products
        images = productIds.map(pid => ({
            path: `/static/Images/${formNo}/${pid}_send.jpg`,
            productId: pid,
            isValid: true // Sender images are always considered valid
        }));
    } else {
        // For receiver images - get ALL product IDs from the table
        const productIds = [];
        const table = document.getElementById('mainTable');
        const rows = table.querySelectorAll('tr');
        
        rows.forEach((row, index) => {
            if (index !== 0) { // Skip header row
                const pid = row.getAttribute('data-product-id');
                if (pid) {
                    // Include all product IDs, regardless of upload status
                    productIds.push(pid);
                }
            }
        });

        // Create image objects for all products
        images = productIds.map(pid => {
            // Find the status button to check the upload status
            const row = document.querySelector(`tr[data-product-id="${pid}"]`);
            const statusBtn = row ? row.querySelector(`.click-photo-icon[data-product-id="${pid}"]`) : null;
            const statusText = statusBtn ? statusBtn.textContent : '+';
            
            // Determine if this has a successful upload, failed upload, or no upload yet
            let status = 'none'; // Default - no upload yet
            let isValid = false; // Default to invalid
            
            if (statusText === '✅') {
                status = 'success'; // Successful upload
                isValid = true;
            } else if (statusText === '❌') {
                status = 'failed'; // Failed upload
                isValid = false;
            } else {
                status = 'none'; // No upload yet
                isValid = false;
            }
            
            // Always use current timestamp for cache busting
            const timestamp = new Date().getTime();
            
            return {
                path: `/static/Images/Temp/${pid}.jpg?t=${timestamp}`, // Path will only work for valid uploads
                productId: pid,
                uploadStatus: status,
                isValid: isValid
            };
        });
    }

    // Create top bar
    const topBar = document.createElement('div');
    topBar.style.width = '100%';
    topBar.style.height = '60px';
    topBar.style.backgroundColor = 'transparent';
    topBar.style.display = 'flex';
    topBar.style.alignItems = 'center';
    topBar.style.justifyContent = 'space-between';
    topBar.style.padding = '0 20px';
    topBar.style.boxSizing = 'border-box';
    topBar.style.position = 'absolute';
    topBar.style.top = '0';
    topBar.style.zIndex = '2';

    // Close button (X)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.color = 'white';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '10px';
    closeBtn.style.position = 'absolute';
    closeBtn.style.left = '20px';
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    topBar.appendChild(closeBtn);

    // Action buttons container (for both sender and receiver modes)
    const actionBtns = document.createElement('div');
    actionBtns.style.display = 'flex';
    actionBtns.style.gap = '20px';
    actionBtns.style.marginLeft = 'auto';

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '⬇️';
    saveBtn.style.fontSize = '24px';
    saveBtn.style.color = 'white';
    saveBtn.style.background = 'none';
    saveBtn.style.border = 'none';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.padding = '10px';
    saveBtn.title = "Download image";
    actionBtns.appendChild(saveBtn);

    // Add upload button only for receiver mode
    let fileInput = null;
    if (mode === 'receiver') {
        const uploadBtn = document.createElement('button');
        uploadBtn.innerHTML = '➕';
        uploadBtn.style.fontSize = '24px';
        uploadBtn.style.color = 'white';
        uploadBtn.style.background = 'none';
        uploadBtn.style.border = 'none';
        uploadBtn.style.cursor = 'pointer';
        uploadBtn.style.padding = '10px';
        uploadBtn.title = "Replace this image";

        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        if (isMobileDevice()) {
            fileInput.setAttribute('capture', 'environment');
        }
        fileInput.style.display = 'none';

        actionBtns.appendChild(uploadBtn);
        actionBtns.appendChild(fileInput);

        // Create functions for upload progress visualization
        const createUploadingThumbnail = (file, percentage) => {
            const thumbContainer = document.createElement('div');
            thumbContainer.style.position = 'relative';
            thumbContainer.style.width = '60px';
            thumbContainer.style.height = '60px';
            thumbContainer.style.margin = '0 4px';
            thumbContainer.style.borderRadius = '4px';
            thumbContainer.style.overflow = 'hidden';

            // Create image preview
            const thumbImg = document.createElement('img');
            const reader = new FileReader();
            reader.onload = (e) => {
                thumbImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
            thumbImg.style.width = '100%';
            thumbImg.style.height = '100%';
            thumbImg.style.objectFit = 'cover';
            
            // Create percentage overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlay.style.color = 'white';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.fontSize = '14px';
            overlay.textContent = `${percentage}%`;

            thumbContainer.appendChild(thumbImg);
            thumbContainer.appendChild(overlay);
            return { container: thumbContainer, overlay: overlay, image: thumbImg };
        };

        const createUploadingMainImage = (file, percentage) => {
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.maxWidth = '100%';
            container.style.maxHeight = '75vh';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';

            // Create image preview
            const mainImg = document.createElement('img');
            const reader = new FileReader();
            reader.onload = (e) => {
                mainImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
            mainImg.style.maxWidth = '100%';
            mainImg.style.maxHeight = '75vh';
            mainImg.style.objectFit = 'contain';
            
            // Create percentage overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '50%';
            overlay.style.left = '50%';
            overlay.style.transform = 'translate(-50%, -50%)';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlay.style.color = 'white';
            overlay.style.padding = '20px 40px';
            overlay.style.borderRadius = '10px';
            overlay.style.fontSize = '24px';
            overlay.textContent = `${percentage}%`;

            container.appendChild(mainImg);
            container.appendChild(overlay);
            return { container: container, overlay: overlay, image: mainImg };
        };

        // Setup action button functionality for receiver mode - we'll implement this later
        // for now, just setting up the structure
        uploadBtn.onclick = () => {
            // Get the currently active thumbnail
            const activeThumb = thumbnailBar.querySelector('.thumb-container[style*="border: 2px solid rgb(255, 255, 255)"]');
            if (!activeThumb) {
                floatingMessageBox('Please select an image first before uploading a new one', 'red');
                return;
            }

            // Find the active image's data
            const currentIndex = Array.from(thumbnailBar.querySelectorAll('.thumb-container')).indexOf(activeThumb);
            if (currentIndex === -1 || !images[currentIndex]) {
                console.error('Could not find active image data');
                return;
            }

            const activeProductId = images[currentIndex].productId;
            console.log('Re-uploading image for product ID:', activeProductId);

            fileInput.click();
        };
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Get the active product ID
            const activeThumb = thumbnailBar.querySelector('.thumb-container[style*="border: 2px solid rgb(255, 255, 255)"]');
            if (!activeThumb) {
                console.error('No active thumbnail found');
                return;
            }

            const currentIndex = Array.from(thumbnailBar.querySelectorAll('.thumb-container')).indexOf(activeThumb);
            if (currentIndex === -1 || !images[currentIndex]) {
                console.error('Could not find active image data');
                return;
            }

            const activeProductId = images[currentIndex].productId;

            console.log('Starting image re-upload process...');
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
            console.log('Using ProductID from active image:', activeProductId);

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('product_id', activeProductId);

            // Create temporary thumbnail and main image with progress
            console.log('Creating upload preview...');
            const uploadingThumb = createUploadingThumbnail(file, 0);
            thumbnailBar.appendChild(uploadingThumb.container);
            
            const uploadingMain = createUploadingMainImage(file, 0);
            imageContainer.innerHTML = '';
            imageContainer.appendChild(uploadingMain.container);

            // Send upload request
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/validate_image', true);

            // Track upload progress
            xhr.upload.onprogress = function(event) {
                if (event.lengthComputable) {
                    const percentage = Math.round((event.loaded / event.total) * 100);
                    console.log(`Upload progress for ${activeProductId}: ${percentage}%`);
                    uploadingThumb.overlay.textContent = `${percentage}%`;
                    uploadingMain.overlay.textContent = `${percentage}%`;
                }
            };

            xhr.onload = function() {
                console.log('Server response received');
                try {
                    const result = JSON.parse(xhr.responseText);
                    console.log('Parsed server response:', result);
                    
                    if (xhr.status === 200) {
                        console.log('Upload completed, updating UI...');
                        // Update uploadedImages object with the validation status from the server
                        uploadedImages[activeProductId] = { 
                            ext: result.ext, 
                            name: result.name, 
                            valid: result.is_valid || false,
                            uploadStatus: result.is_valid ? 'success' : 'failed',
                            message: result.message || ''
                        };
                        
                        // Remove the uploading placeholder
                        thumbnailBar.removeChild(uploadingThumb.container);
                        
                        // Show brief success/failure notification
                        if (result.is_valid) {
                            // For valid images, show a temporary success overlay
                            uploadingMain.overlay.textContent = '✅';
                            uploadingMain.overlay.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
                            
                            // After a brief delay, remove the overlay and update the image
                            setTimeout(() => {
                                // Base image path
                                const imagePath = `/static/Images/Temp/${activeProductId}.${result.ext}`;
                                
                                // Hard reload the image to bypass browser cache completely
                                hardReloadImage(imagePath).then(objectURL => {
                                    console.log('Created object URL for new image:', objectURL);
                                    
                                    // Update the existing image in the images array with validation status
                                    images[currentIndex] = {
                                        path: objectURL, // Use the fresh blob URL
                                        productId: activeProductId,
                                        uploadStatus: 'success',
                                        isValid: true
                                    };
                                    
                                    // Find the active thumbnail container
                                    const activeThumbContainer = activeThumb;
                                    if (activeThumbContainer) {
                                        // Create consistent image elements using our helper function
                                        const imageElements = createImageElementsFromSource(objectURL, activeProductId, true, 'success');
                                        
                                        // Replace the old thumbnail
                                        thumbnailBar.replaceChild(imageElements.thumbContainer, activeThumbContainer);
                                        
                                        // Set active state for the new thumbnail
                                        imageElements.thumbImage.style.opacity = '1';
                                        imageElements.thumbContainer.style.border = '2px solid #fff';
                                        imageElements.thumbContainer.className = 'thumb-container';
                                        
                                        // Add click handler to the new thumbnail container
                                        imageElements.thumbContainer.onclick = () => {
                                            updateCurrentImage(currentIndex, images);
                                        };
                                    }
                                    
                                    // Update the status icon in the main table
                                    const statusBtn = document.querySelector(`.click-photo-icon[data-product-id="${activeProductId}"]`);
                                    if (statusBtn) {
                                        statusBtn.textContent = '✅';
                                        statusBtn.style.color = 'green';
                                    }
                                    
                                    // Update the main image display
                                    imageContainer.innerHTML = '';
                                    imageContainer.appendChild(createImageElementsFromSource(objectURL, activeProductId, true, 'success').mainContainer);
                                    
                                    // Show success message
                                    floatingMessageBox('Image successfully updated', 'green');
                                }).catch(error => {
                                    console.error('Failed to reload image:', error);
                                    floatingMessageBox('Image uploaded but failed to display. Please try again.', 'red');
                                    
                                    // Update the display anyway with the regular path
                                    images[currentIndex] = {
                                        path: imagePath + '?t=' + new Date().getTime(),
                                        productId: activeProductId,
                                        uploadStatus: 'success',
                                        isValid: true
                                    };
                                    updateCurrentImage(currentIndex, images);
                                });
                            }, 1500);
                        } else {
                            // For invalid images, keep showing the error state
                            uploadingMain.overlay.textContent = '❌ Invalid Image';
                            uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                            
                            // After a brief delay, update the image but keep the invalid indicator
                            setTimeout(() => {
                                // Base image path
                                const imagePath = `/static/Images/Temp/${activeProductId}.${result.ext}`;
                                
                                // Hard reload the image to bypass browser cache completely
                                hardReloadImage(imagePath).then(objectURL => {
                                    // Update the existing image in the images array with validation status
                                    images[currentIndex] = {
                                        path: objectURL,
                                        productId: activeProductId,
                                        uploadStatus: 'failed',
                                        isValid: false
                                    };
                                    
                                    // Find the active thumbnail container
                                    const activeThumbContainer = activeThumb;
                                    if (activeThumbContainer) {
                                        // Create consistent image elements using our helper function
                                        const imageElements = createImageElementsFromSource(objectURL, activeProductId, false, 'failed');
                                        
                                        // Replace the old thumbnail
                                        thumbnailBar.replaceChild(imageElements.thumbContainer, activeThumbContainer);
                                        
                                        // Set active state for the new thumbnail
                                        imageElements.thumbImage.style.opacity = '1';
                                        imageElements.thumbContainer.style.border = '2px solid #fff';
                                        imageElements.thumbContainer.className = 'thumb-container';
                                        
                                        // Add click handler to the new thumbnail container
                                        imageElements.thumbContainer.onclick = () => {
                                            updateCurrentImage(currentIndex, images);
                                        };
                                    }
                                    
                                    // Update the status icon in the main table
                                    const statusBtn = document.querySelector(`.click-photo-icon[data-product-id="${activeProductId}"]`);
                                    if (statusBtn) {
                                        statusBtn.textContent = '❌';
                                        statusBtn.style.color = 'red';
                                    }
                                    
                                    // Update the main image display
                                    imageContainer.innerHTML = '';
                                    imageContainer.appendChild(createImageElementsFromSource(objectURL, activeProductId, false, 'failed').mainContainer);
                                    
                                    // Show failure message
                                    floatingMessageBox(result.message || 'Image validation failed', 'red');
                                }).catch(error => {
                                    console.error('Failed to reload image:', error);
                                    floatingMessageBox('Failed to process image. Please try again.', 'red');
                                });
                            }, 1500);
                        }
                        
                        console.log('Upload process completed successfully');
                    } else {
                        console.error('Upload failed:', result);
                        uploadingThumb.overlay.textContent = '❌';
                        uploadingMain.overlay.textContent = '❌ Upload Failed';
                        uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                        
                        setTimeout(() => {
                            thumbnailBar.removeChild(uploadingThumb.container);
                            imageContainer.removeChild(uploadingMain.container);
                            // Restore the previous image display
                            updateCurrentImage(currentIndex, images);
                            
                            // Show error message
                            floatingMessageBox('Upload failed', 'red');
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error parsing server response:', error);
                    uploadingThumb.overlay.textContent = '❌';
                    uploadingMain.overlay.textContent = '❌ Error';
                    uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                    
                    setTimeout(() => {
                        thumbnailBar.removeChild(uploadingThumb.container);
                        imageContainer.removeChild(uploadingMain.container);
                        // Restore the previous image display
                        updateCurrentImage(currentIndex, images);
                        
                        // Show error message
                        floatingMessageBox('Error processing upload', 'red');
                    }, 2000);
                }
            };

            xhr.onerror = function(error) {
                console.error('Network error during upload:', error);
                uploadingThumb.overlay.textContent = '❌';
                uploadingMain.overlay.textContent = '❌ Network Error';
                uploadingMain.overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                
                setTimeout(() => {
                    thumbnailBar.removeChild(uploadingThumb.container);
                    imageContainer.removeChild(uploadingMain.container);
                    // Restore the previous image display
                    updateCurrentImage(currentIndex, images);
                    
                    // Show error message
                    floatingMessageBox('Network error', 'red');
                }, 2000);
            };

            console.log('Starting upload request...');
            xhr.send(formData);
        };
    }
    
    topBar.appendChild(actionBtns);

    // Create main content area
    const mainContent = document.createElement('div');
    mainContent.style.flex = '1';
    mainContent.style.display = 'flex';
    mainContent.style.alignItems = 'center';
    mainContent.style.justifyContent = 'center';
    mainContent.style.position = 'relative';
    mainContent.style.padding = '20px';

    // Navigation buttons
    const createNavButton = (text, isNext) => {
        const btn = document.createElement('div');
        btn.innerHTML = isNext ? '›' : '‹';
        btn.style.position = 'absolute';
        btn.style[isNext ? 'right' : 'left'] = '10px';
        btn.style.top = '50%';
        btn.style.transform = 'translateY(-50%)';
        btn.style.fontSize = '35px';
        btn.style.fontWeight = '500';
        btn.style.color = '#fff';
        btn.style.background = '#5b5b5b';
        btn.style.border = 'none';
        btn.style.borderRadius = '50%';
        btn.style.width = '32px';
        btn.style.height = '32px';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.transition = 'all 0.2s';
        btn.style.zIndex = '3';
        btn.style.padding = '0';
        btn.style.margin = '0';
        btn.style.lineHeight = '32px';
        btn.style.textAlign = 'center';
        btn.style.userSelect = 'none';
        return btn;
    };

    const prevBtn = createNavButton('‹', false);
    const nextBtn = createNavButton('›', true);

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.style.maxWidth = '65%';
    imageContainer.style.maxHeight = 'calc(100vh - 200px)';
    imageContainer.style.display = 'flex';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.position = 'relative';
    imageContainer.style.margin = '0 auto';
    mainContent.appendChild(imageContainer);

    // Create thumbnail bar
    const thumbnailBar = document.createElement('div');
    thumbnailBar.style.height = '80px';
    thumbnailBar.style.backgroundColor = 'transparent';
    thumbnailBar.style.display = 'flex';
    thumbnailBar.style.alignItems = 'center';
    thumbnailBar.style.justifyContent = 'center';
    thumbnailBar.style.gap = '8px';
    thumbnailBar.style.padding = '10px';
    thumbnailBar.style.position = 'absolute';
    thumbnailBar.style.bottom = '0';
    thumbnailBar.style.left = '0';
    thumbnailBar.style.right = '0';
    thumbnailBar.style.overflowX = 'auto';
    thumbnailBar.style.scrollBehavior = 'smooth';
    thumbnailBar.style.whiteSpace = 'nowrap';

    // Add components to modal
    modal.appendChild(topBar);
    modal.appendChild(mainContent);
    modal.appendChild(thumbnailBar);
    modal.appendChild(prevBtn);
    modal.appendChild(nextBtn);
    document.body.appendChild(modal);

    let currentImageIndex = 0;
    let isZoomed = false;

    // Function to update current image and buttons
    const updateCurrentImage = (index, images) => {
        currentImageIndex = index;
        const img = images[index];
        
        // Create image elements using our helper function
        const imageSrc = img.path;
        const imageElements = createImageElementsFromSource(imageSrc, img.productId, img.isValid, img.uploadStatus);
        
        // Clear the image container and add the new content
        imageContainer.innerHTML = '';
        imageContainer.appendChild(imageElements.mainContainer);
        
        // Reset zoom
        isZoomed = false;
        
        // Check upload status for receiver mode
        if (img.uploadStatus === 'success' || img.isValid) {
            // Successful upload - enable the save button
            saveBtn.style.opacity = '1';
            saveBtn.style.pointerEvents = 'auto';
            
            // Setup save button
            saveBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = img.path;
                link.download = `image_${img.productId}.jpg`;
                link.click();
            };
        } else {
            // Failed or no upload - disable the save button
            saveBtn.style.opacity = '0.5';
            saveBtn.style.pointerEvents = 'none';
        }
        
        // Update thumbnails
        const thumbs = thumbnailBar.querySelectorAll('.thumb-container');
        thumbs.forEach((thumb, idx) => {
            if (idx === index) {
                thumb.style.border = '2px solid #fff';
                thumb.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
            } else {
                thumb.style.border = '2px solid transparent';
                thumb.style.boxShadow = 'none';
            }
        });

        // Update navigation button visibility
        prevBtn.style.visibility = index > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = index < images.length - 1 ? 'visible' : 'hidden';

        // Scroll the active thumbnail into view
        const activeThumb = thumbs[index];
        if (activeThumb) {
            const scrollOffset = activeThumb.offsetLeft - (thumbnailBar.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            thumbnailBar.scrollLeft = scrollOffset;
        }
    };

    // Create thumbnails for all images
    images.forEach((img, idx) => {
        // Create image elements using our helper function
        const imageElements = createImageElementsFromSource(img.path, img.productId, img.isValid, img.uploadStatus);
        
        // Set initial state for thumbnails
        const thumbContainer = imageElements.thumbContainer;
        const thumbImg = imageElements.thumbImage;
        
        thumbContainer.className = 'thumb-container';
        thumbContainer.style.border = idx === 0 ? '2px solid #fff' : '2px solid transparent';
        thumbImg.style.opacity = idx === 0 ? '1' : '0.6';
        
        // Set onclick event for the container
        thumbContainer.onclick = () => {
            updateCurrentImage(idx, images);
        };
        
        thumbnailBar.appendChild(thumbContainer);
    });

    // Find index of clicked product
    const startIndex = images.findIndex(img => img.productId === productId);
    if (startIndex !== -1) {
        updateCurrentImage(startIndex, images);
    } else {
        updateCurrentImage(0, images);
    }

    // Show navigation buttons if there are multiple images
    prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
    nextBtn.style.display = images.length > 1 ? 'flex' : 'none';

    // Setup navigation
    if (images.length > 1) {
        prevBtn.onclick = () => {
            if (currentImageIndex > 0) {
                updateCurrentImage(currentImageIndex - 1, images);
            }
        };

        nextBtn.onclick = () => {
            if (currentImageIndex < images.length - 1) {
                updateCurrentImage(currentImageIndex + 1, images);
            }
        };

        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
                updateCurrentImage(currentImageIndex - 1, images);
            } else if (e.key === 'ArrowRight' && currentImageIndex < images.length - 1) {
                updateCurrentImage(currentImageIndex + 1, images);
            }
        });
    }

    // Close modal on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
        }
    });
}

// Add at the top or near other helpers
function getConditionText(val) {
  const conditions = {
    0: 'Good',
    1: 'Not OK',
    2: 'Damaged'
  };
  return conditions[val] || val;
}

function handleConditionChange(itemId, condition) {
  const item = selectedItems.find(item => item.id === itemId);
  if (item) {
    item.ReceiverCondition = parseInt(condition);
  }
}