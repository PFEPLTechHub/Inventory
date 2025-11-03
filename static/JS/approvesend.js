let approveSendTxnDetails = {};

// Get the disapprove button
var disapproveButton = document.getElementById("disapproveButton");

// Add event listener to the disapprove button
disapproveButton.addEventListener("click", function(event) {
    // Show the remarks input box and label
    var remarksContainer = document.getElementById("remarksContainer");
    remarksContainer.style.display = "flex";

    // Enable and make the input box required
    var remarksInput = document.getElementById("disapproveremarks");
    remarksInput.required = true;

    // Display the floating message box
    floatingMessageBox('Please provide reason for disapproval');

    // Disable the approve button
    document.getElementById('approvalButton').disabled = true; // Disable the button
    document.getElementById('ewaybillbutton').disabled = true; // Disable the button
    document.getElementById('ewaybill').disabled = true; // Disable the button

    // If already clicked, don't prevent default (for form submission)
    if (disapproveButton.dataset.clicked) {
        return;
    }

    // Add a dataset property to track if the button was clicked
    disapproveButton.dataset.clicked = true;

    // Modify the event listener to handle form submission
    disapproveButton.addEventListener("click", function(event) {
        // Get the remarks input element and its value
        var remarksValue = remarksInput.value.trim();

        if (remarksValue === "") {
            // If the remarks input is empty, show an error message and prevent form submission
            floatingMessageBox('Please provide a reason for disapproval.');
            event.preventDefault(); // Prevent the form from submitting
            return; // Exit the function
        }

        document.getElementById('approvalButton').disabled = true; // Disable the button
        document.getElementById('disapproveButton').disabled = true; // Disable the button
        document.getElementById('ewaybillbutton').disabled = true; // Disable the button

        var transaction_uid = document.getElementById("formNo").textContent.trim();
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/disapprove_send_request", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    // Request was successful
                    console.log("Transaction_uid sent successfully!");
                    console.log(transaction_uid)
                    floatingMessageBox("Form Transaction has been disapproved", 'green', 'approvetable');
                    // ✅ Notify Telegram Bot (Disapproval webhook)
                    console.log("📤 Preparing to notify Telegram bot (Disapproval)");
                    console.log("📦 Payload to Bot:", {
                    Transaction_uid: transaction_uid,
                    remarks: remarksValue
                    });

                    fetch("http://localhost:3000/api/notify/disapprove-send", {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                    Transaction_uid: transaction_uid,
                    remarks: remarksValue
                    })
                    })
                    .then(res => {
                    console.log("📥 Response status from Telegram bot:", res.status);
                    return res.json();
                    })
                    .then(botRes => {
                    console.log("✅ Disapproval webhook sent to Telegram bot:", botRes);
                    })
                    .catch(err => {
                    console.warn("⚠️ Failed to notify Telegram bot (disapproval):", err.message);
                    });

                } else {
                    // There was an error
                    console.error("Error:", xhr.statusText);
                }
            }
        };
        var data = JSON.stringify({"transaction_uid": transaction_uid, "remarks": remarksValue});
        xhr.send(data);
    });
});
//--------------------------------------------------------------------------------------------------------


var submitButton = document.getElementById("approvalButton");

// Add event listener to the submit button
submitButton.addEventListener("click", function(event) {
    // Get the input element and its value
    const ewaybillInput = document.getElementById('ewaybill');
    const ewaybillValue = ewaybillInput.value.trim();

    // Get the input element and its value
    const emptyewaybill = document.getElementById('emptyewaybill');
    const emptyewaybillValue = emptyewaybill.value.trim();


    // Retrieve source and destination values from HTML labels
    var sourceValue = document.getElementById("Source").textContent.trim();
    console.log('source',sourceValue);
    
    var destinationValue = document.getElementById("Destination").textContent.trim();
    console.log('destination',destinationValue);
    

    // Check if the source and destination are the different and e-way bill is empty
    if (sourceValue !== destinationValue && ewaybillValue.trim() === "") {
        floatingMessageBox('Source and Destination are the different. E-way bill is compulsory.');
        event.preventDefault(); // Prevent the form from submitting
    } else if (ewaybillValue.trim() !== "" && (ewaybillValue.trim().length !== 12 || /\s/.test(ewaybillValue))) {
        floatingMessageBox('Please enter exactly 12 digits for the e-way bill number');
        event.preventDefault(); // Prevent the form from submitting
    }     // Check if the source and destination are the same and e-way bill is empty
    else if (sourceValue === destinationValue && emptyewaybillValue.trim() === "" && ewaybillValue.trim() === "") {
        floatingMessageBox('Please provide reason for no ewaybill');
               // Show the nobillremarksContainer
               document.getElementById('nobillremarksContainer').style.display = 'block';
        event.preventDefault(); // Prevent the form from submitting

    }else {
        console.log("we have reached here guysssssss for different ewaybill")

        logRowValues(); // Call the function to log row values
        // Disable the buttons 
        document.getElementById('disapproveButton').disabled = true;
        document.getElementById('approvalButton').disabled = true;
        document.getElementById('ewaybillbutton').disabled = true; // Disable the button
    }
       
});  


var tableBody = document.querySelector("#mainTable tbody");

function logRowValues() {
    formObject = [];
    // Get the value from the input box
    var ewaybillValue = document.getElementById("ewaybill").value;
    var transaction_uid = document.getElementById("formNo").textContent.trim();

    // Get the input element and its value
    var emptyewaybill = document.getElementById('emptyewaybill');
    var emptyewaybillValue = emptyewaybill.value.trim();


    // Add the input box value to the formObject
    formObject.push({ EwayBill: ewaybillValue }, { Transaction_uid: transaction_uid });
    if (emptyewaybillValue.trim() === ""){
        emptyewaybillValue = "-"
    }

    formObject.push({ ewayreason: emptyewaybillValue });
    console.log("This is the formObject Data", formObject); // Check the collected data in formObject

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/approve_send_request", true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                console.log('Success:', xhr.responseText);
                if (xhr.responseText === "Approval has been successfully given") {
                    floatingMessageBox("Approval has been successfully given.\n The sender may proceed to send the items.", 'green', 'approvetable');
                   // ✅ Notify Telegram Bot: Approval

                    const transaction_uid = formObject.find(obj => obj.Transaction_uid)?.Transaction_uid || "";
                    const txnDetails = approveSendTxnDetails;
                    const destinationName = txnDetails?.DestinationName || "";
                  
                    // 📦 Log full payload to be sent
                    const botPayload = {
                    Transaction_uid: transaction_uid,
                     DestinationName: destinationName,
                   };

                    console.log("📤 Preparing to notify Telegram bot (Approval)");
                    console.log("📦 Payload to Bot:", botPayload);

                    fetch("http://localhost:3000/api/notify/approve-send", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(botPayload)
                    })
                    .then(res => {
                    console.log("📥 Response status from Telegram bot:", res.status);
                    return res.json();
                    })
                    .then(botRes => {
                    console.log("✅ Approval webhook sent to Telegram bot:", botRes);
                    })
                    .catch(err => {
                    console.warn("⚠️ Failed to notify Telegram bot (approval):", err.message);
                    });

                } else if (xhr.responseText === "Eway Bill Exists") {
                    floatingMessageBox('Ewaybill already exists');
                    document.getElementById('approvalButton').disabled = false; // Disable the button
                    document.getElementById('disapproveButton').disabled = false; // Disable the button
                    document.getElementById('ewaybillbutton').disabled = false; // Disable the button

                } else {
                    console.error('Error:', xhr.responseText);
                    alert('An unexpected error occurred: ' + xhr.responseText);
                }
            } else {
                console.error('Error:', xhr.status);
                alert('An error occurred while processing the request. Status code: ' + xhr.status);
            }
        }
    };

    xhr.setRequestHeader("Content-Type", "application/json"); // Set request header
    xhr.send(JSON.stringify(formObject));
}


//-------------------------------------------------------------------------

window.onload = function () {
    if (!sessionStorage.getItem('refreshed')) {
        sessionStorage.setItem('refreshed', 'true');
        window.location.reload();
    }

    // Get transaction_uid from URL
    const urlParams = new URLSearchParams(window.location.search);
    const transaction_uid = window.location.pathname.split('/').pop();

    // --- Fix: Always refresh backend data before fetching form data ---
    console.log('[DEBUG] Sending /send_Transaction_uid to refresh backend data for:', transaction_uid);
    var xhr1 = new XMLHttpRequest();
    xhr1.open("GET", "/send_Transaction_uid?transaction_uid=" + transaction_uid, true);
    xhr1.onreadystatechange = function() {
        if (xhr1.readyState === XMLHttpRequest.DONE) {
            console.log('[DEBUG] /send_Transaction_uid response:', xhr1.status, xhr1.responseText);
            // Now fetch the actual form data
            fetchApproveSendFormData(transaction_uid);
        }
    };
    xhr1.send();
};

function fetchApproveSendFormData(transaction_uid) {
    var xhr2 = new XMLHttpRequest();
    xhr2.open("GET", "/get_form_data?transaction_uid=" + encodeURIComponent(transaction_uid), true);
    xhr2.onreadystatechange = function () {
        if (xhr2.readyState == 4 && xhr2.status == 200) {
            console.log("[DEBUG] Received response from /get_form_data");

            var response = JSON.parse(xhr2.responseText);
            console.log("[DEBUG] Parsed response:", response);

            // Extract transaction_details array from response object
            var transactionDetails = response.transaction_details || [];
            var productDetails = response.transaction_product_details || [];
            var projectManagers = response.project_managers || [];

            if (transactionDetails.length > 0) {
                var data = transactionDetails[0];  // first transaction object
                
                const initiationDateTime = data['InitiationDate'];
                const initiationDate = initiationDateTime ? initiationDateTime.split(' ')[0] : 'Loading Initiation Date ...';

                document.getElementById("formNo").textContent = data['Transaction_uid'] || 'Form ID not available';
                document.getElementById("Sender").textContent = data['SenderName'] || 'Sender not available';
                document.getElementById("Source").textContent = data['SourceName'] || data['Source'] || 'Source not available';
                document.getElementById("Receiver").textContent = data['ReceiverName'] || 'Receiver not available';
                document.getElementById("Destination").textContent = data['DestinationName'] || data['Destination'] || 'Destination not available';
                document.getElementById("InitiationDate").textContent = initiationDate;

                // Set Sender Manager and Receiver Manager from project_managers
                if (projectManagers && Array.isArray(projectManagers)) {
                    var sourceValue = data['Source'] || '';
                    var destinationValue = data['Destination'] || '';
                    
                    console.log("[DEBUG] Approve Send - Source:", sourceValue, "Destination:", destinationValue);
                    console.log("[DEBUG] Approve Send - Project managers:", projectManagers);
                    
                    var senderManagerName = '';
                    var receiverManagerName = '';
                    
                    // Find managers by matching project_id
                    for (var i = 0; i < projectManagers.length; i++) {
                        var projectManager = projectManagers[i];
                        console.log("[DEBUG] Approve Send - Comparing project_id:", projectManager.project_id, "with source:", sourceValue);
                        
                        if (String(projectManager.project_id) === String(sourceValue)) {
                            senderManagerName = projectManager.ManagerName || projectManager.Manager;
                            console.log("[DEBUG] Approve Send - Matched sender manager:", senderManagerName);
                        }
                        if (String(projectManager.project_id) === String(destinationValue)) {
                            receiverManagerName = projectManager.ManagerName || projectManager.Manager;
                            console.log("[DEBUG] Approve Send - Matched receiver manager:", receiverManagerName);
                        }
                    }
                    
                    document.getElementById("Sender-manager").textContent = senderManagerName || 'Manager not available';
                    document.getElementById("Receiver-manager").textContent = receiverManagerName || 'Manager not available';
                } else {
                    document.getElementById("Sender-manager").textContent = 'Manager not available';
                    document.getElementById("Receiver-manager").textContent = 'Manager not available';
                }

                // Clear table first if needed
                var table = document.getElementById("mainTable");
                // Remove existing rows except header if any
                while (table.rows.length > 1) {
                    table.deleteRow(1);
                }

                // Insert product details rows
                productDetails.forEach(function (row, index) {
                    var newRow = table.insertRow();

                    newRow.insertCell(0).textContent = index + 1;
                    newRow.insertCell(1).textContent = row['set'] || row['Set'] || '-';
                    newRow.insertCell(2).textContent = row['Category'] || '-';
                    newRow.insertCell(3).textContent = row['Name'] || '-';
                    newRow.insertCell(4).textContent = row['Make'] || '-';
                    newRow.insertCell(5).textContent = row['Model'] || '-';
                    newRow.insertCell(6).textContent = row['ProductSerial'] || '-';
                    newRow.insertCell(7).textContent = displayCondition(row['SenderCondition']);
                    newRow.insertCell(8).textContent = row['SenderRemark'] || '-';

                    var senderImageCell = newRow.insertCell(9);
                    var senderImage = row['SenderImage'];

                    if (senderImage && senderImage.trim() !== "") {
                        const Transaction_uid = data['Transaction_uid'];
                        const ProductID = row['ProductID'];
                        var tickmark = document.createElement("span");
                        tickmark.textContent = '✅';
                        tickmark.style.color = 'green';
                        senderImageCell.style.cursor = 'pointer';
                        senderImageCell.onclick = () => {
                            OpenCarousel(Transaction_uid, ProductID);
                        };
                        senderImageCell.appendChild(tickmark);
                    } else {
                        senderImageCell.textContent = '-';
                    }

                    // Add Receiver Condition
                    newRow.insertCell(10).textContent = displayCondition(row['ReceiverCondition']) || '-';
                    
                    // Add Receiver Remarks
                    newRow.insertCell(11).textContent = row['ReceiverRemark'] || '-';
                    
                    // Add Receiver Image
                    var receiverImageCell = newRow.insertCell(12);
                    var receiverImage = row['ReceiverImage'];

                    if (receiverImage && receiverImage.trim() !== "" && receiverImage !== '-') {
                        const Transaction_uid = data['Transaction_uid'];
                        const ProductID = row['ProductID'];
                        var tickmark = document.createElement("span");
                        tickmark.textContent = '✅';
                        tickmark.style.color = 'green';
                        receiverImageCell.style.cursor = 'pointer';
                        receiverImageCell.onclick = () => {
                            OpenCarousel(Transaction_uid, ProductID, 'receiver');
                        };
                        receiverImageCell.appendChild(tickmark);
                    } else {
                        receiverImageCell.textContent = '-';
                    }
                });

                // After: var transactionDetails = response.transaction_details || [];
                approveSendTxnDetails = transactionDetails[0] || {};

                // --- Approval status logic ---
                const approvalStatus = data['ApprovalToSend'];
                const approveBtn = document.getElementById('approvalButton');
                const disapproveBtn = document.getElementById('disapproveButton');
                const ewaybillBtn = document.getElementById('ewaybillbutton');

                if (approvalStatus == 1) {
                    approveBtn.disabled = true;
                    disapproveBtn.disabled = true;
                    ewaybillBtn.disabled = true;
                    floatingMessageBox("This form has already been approved.", 'green', 'approvetable');
                } else if (approvalStatus == 2) {
                    approveBtn.disabled = true;
                    disapproveBtn.disabled = true;
                    ewaybillBtn.disabled = true;
                    floatingMessageBox("This form has already been disapproved.", 'red', 'approvetable');
                }
            } else {
                console.error("No transaction details found in response");
            }
        }
    };
    xhr2.send();
}

document.getElementById('back-button').addEventListener('click', function () {
    window.location.href = '/approvetable';
});

// Add the OpenCarousel function
function OpenCarousel(transactionId, clickedProductId) {
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
    
    // Action buttons container
    const actionBtns = document.createElement('div');
    actionBtns.style.display = 'flex';
    actionBtns.style.gap = '20px';
    actionBtns.style.marginLeft = 'auto';
    actionBtns.style.position = 'absolute';
    actionBtns.style.right = '20px';

    // Save/Download button
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '⬇️';
    saveBtn.style.fontSize = '24px';
    saveBtn.style.color = 'white';
    saveBtn.style.background = 'none';
    saveBtn.style.border = 'none';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.padding = '10px';
    saveBtn.title = "Download image";
    
    // Add download functionality
    saveBtn.onclick = () => {
        // Will be set up properly after images are loaded
    };
    
    actionBtns.appendChild(saveBtn);
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

    // Create main image
    const mainImage = document.createElement('img');
    mainImage.className = 'main-image';
    mainImage.style.maxWidth = '100%';
    mainImage.style.maxHeight = '75vh';
    mainImage.style.objectFit = 'contain';
    mainImage.style.transition = 'transform 0.3s';
    mainImage.style.cursor = 'zoom-in';

    // Add zoom functionality
    let isZoomed = false;
    mainImage.onclick = () => {
        isZoomed = !isZoomed;
        mainImage.style.transform = isZoomed ? 'scale(2)' : 'scale(1)';
        mainImage.style.cursor = isZoomed ? 'zoom-out' : 'zoom-in';
    };

    imageContainer.appendChild(mainImage);
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
    let images = []; // Declare images array in a broader scope

    // Function to update current image and buttons
    const updateCurrentImage = (index, images) => {
        currentImageIndex = index;
        mainImage.src = images[index].path;
        
        // Update thumbnails
        const thumbnails = thumbnailBar.querySelectorAll('img');
        thumbnails.forEach((thumb, idx) => {
            thumb.style.opacity = idx === index ? '1' : '0.6';
            thumb.style.border = idx === index ? '2px solid #fff' : '2px solid transparent';
        });

        // Update navigation button visibility
        prevBtn.style.visibility = index > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = index < images.length - 1 ? 'visible' : 'hidden';

        // Scroll the active thumbnail into view
        const activeThumb = thumbnails[index];
        if (activeThumb) {
            const scrollOffset = activeThumb.offsetLeft - (thumbnailBar.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            thumbnailBar.scrollTo({
                left: scrollOffset,
                behavior: 'smooth'
            });
        }
        
        // Update save button functionality
        saveBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = images[index].path;
            link.download = `image_${images[index].productId}_${Date.now()}.jpg`;
            link.click();
        };
    };

    // Fetch images for the transaction
    fetch(`/get_transaction_images?transaction_id=${transactionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success" && data.images) {
                images = data.images.map(img => ({
                    path: `/static/Images/${transactionId}/${img.productId}_send.jpg`,
                    productId: img.productId
                }));

                // Create thumbnails
                images.forEach((img, idx) => {
                    const thumb = document.createElement('img');
                    thumb.src = img.path;
                    thumb.style.width = '60px';
                    thumb.style.height = '60px';
                    thumb.style.objectFit = 'cover';
                    thumb.style.border = '2px solid transparent';
                    thumb.style.borderRadius = '4px';
                    thumb.style.cursor = 'pointer';
                    thumb.style.transition = 'all 0.2s ease';
                    thumb.style.opacity = '0.6';
                    
                    thumb.onclick = () => {
                        updateCurrentImage(idx, images);
                    };
                    thumbnailBar.appendChild(thumb);
                });

                // Setup navigation
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

                // Find index of clicked image
                const startIndex = images.findIndex(img => img.productId === clickedProductId);
                currentImageIndex = startIndex >= 0 ? startIndex : 0;

                // Initialize with clicked image
                updateCurrentImage(currentImageIndex, images);
            }
        })
        .catch(error => {
            console.error('Error fetching images:', error);
            imageContainer.innerHTML = '<div style="color: white; font-size: 16px;">Error loading images</div>';
        });

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
        } else if (e.key === 'ArrowLeft') {
            // Navigate to previous image
            if (currentImageIndex > 0) {
                updateCurrentImage(currentImageIndex - 1, images);
            }
        } else if (e.key === 'ArrowRight') {
            // Navigate to next image
            if (currentImageIndex < images.length - 1) {
                updateCurrentImage(currentImageIndex + 1, images);
            }
        }
    });
}

function getConditionText(val) {
  const conditions = {
    0: 'Good',
    1: 'Not OK',
    2: 'Damaged'
  };
  return conditions[val] || val;
}

function displayCondition(condition) {
  return getConditionText(parseInt(condition));
}
  